const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const SpotCounter = require('../models/SpotCounter');
const { getPrice } = require('../config/pricing');
const { broadcastSpotsUpdate } = require('./spots');
const { sendPaymentConfirmation, sendPaymentAdminAlert } = require('./mailer');
const razorpay = require('./razorpay');
const { syncLead } = require('./sheets');

/**
 * Find the lead a Razorpay payment/order belongs to.
 * Prefers notes.leadId (set by us at order creation), then the stored order id.
 */
async function findLeadForPayment({ notes, orderId }) {
  const leadId = notes?.leadId || notes?.lead_id;
  if (leadId && mongoose.isValidObjectId(leadId)) {
    const lead = await Lead.findById(leadId);
    if (lead) return lead;
  }
  if (orderId) {
    return Lead.findOne({ razorpayOrderId: orderId });
  }
  return null;
}

/**
 * Idempotently mark a lead as paid. Safe to call concurrently from the checkout
 * verify endpoint, the webhook and the reconciliation job: the atomic
 * status != 'paid' guard ensures side effects (spot re-claim, emails, broadcast)
 * run exactly once.
 *
 * Returns { outcome, lead } where outcome is one of:
 * 'paid' | 'already_paid' | 'duplicate_payment' | 'amount_mismatch' | 'lead_not_found'
 */
async function markLeadPaid(lead, { orderId, paymentId, amountPaise, source, strictAmount = true }) {
  if (!lead) return { outcome: 'lead_not_found', lead: null };

  if (lead.status === 'paid') {
    if (paymentId && lead.razorpayPaymentId && lead.razorpayPaymentId !== paymentId) {
      // Same customer paid twice (e.g. two tabs). Needs a manual refund.
      console.warn(`[Payments] Duplicate payment ${paymentId} for already-paid lead ${lead._id}`);
      sendPaymentAdminAlert(lead, {
        subject: 'Duplicate payment received — refund required',
        detail: `Lead already paid with ${lead.razorpayPaymentId}; extra payment ${paymentId} received.`,
      }).catch(() => {});
      return { outcome: 'duplicate_payment', lead };
    }
    return { outcome: 'already_paid', lead };
  }

  const expectedPaise = lead.amountPaise || getPrice(lead.kind).totalPaise;
  if (strictAmount && Number(amountPaise) !== expectedPaise) {
    console.error(
      `[Payments] Amount mismatch for lead ${lead._id}: expected ${expectedPaise}, got ${amountPaise} (payment ${paymentId})`
    );
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { paymentMismatch: true, razorpayPaymentId: paymentId, paymentRef: paymentId } }
    );
    syncLead(lead);
    sendPaymentAdminAlert(lead, {
      subject: 'Payment amount mismatch — manual review',
      detail: `Expected ${expectedPaise} paise, received ${amountPaise} paise (payment ${paymentId}).`,
    }).catch(() => {});
    return { outcome: 'amount_mismatch', lead };
  }

  const previous = await Lead.findOneAndUpdate(
    { _id: lead._id, status: { $ne: 'paid' } },
    {
      $set: {
        status: 'paid',
        paidAt: new Date(),
        paymentRef: paymentId,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId || lead.razorpayOrderId,
        paymentSource: source,
        paymentFailedReason: null,
        paymentMismatch: false,
      },
    },
    { new: false }
  );

  if (!previous) {
    // Another path (webhook vs checkout) won the race
    return { outcome: 'already_paid', lead: await Lead.findById(lead._id) };
  }

  // The expiry job / admin released this lead's spot earlier. Money has been taken,
  // so honour the payment and re-claim the spot (even if that exceeds the total).
  const mode = process.env.SPOT_COUNT_MODE || 'submitted';
  if (mode === 'submitted' && (previous.status === 'expired' || previous.status === 'cancelled')) {
    await SpotCounter.findOneAndUpdate({ kind: previous.kind }, { $inc: { claimed: 1 } });
    sendPaymentAdminAlert(previous, {
      subject: `Payment received for ${previous.status} lead`,
      detail: `Lead was ${previous.status} when payment ${paymentId} arrived; marked paid and spot re-claimed.`,
    }).catch(() => {});
  }

  const updated = await Lead.findById(lead._id);
  broadcastSpotsUpdate().catch(() => {});
  syncLead(updated);
  sendPaymentConfirmation(updated).catch((err) => {
    console.error('Async payment email error:', err.message);
  });

  console.log(`[Payments] Lead ${lead._id} marked paid via ${source} (payment ${paymentId})`);
  return { outcome: 'paid', lead: updated };
}

/**
 * Settle a Razorpay payment entity fetched from the API (never trust client data).
 * Captures it if only authorized, then marks the owning lead paid.
 */
async function settlePayment(payment, { source, expectedOrderId, lead: knownLead } = {}) {
  if (!payment) return { outcome: 'payment_not_found', lead: null };
  if (expectedOrderId && payment.order_id !== expectedOrderId) {
    return { outcome: 'order_mismatch', lead: null };
  }

  const lead = knownLead || (await findLeadForPayment({ notes: payment.notes, orderId: payment.order_id }));
  if (!lead) return { outcome: 'lead_not_found', lead: null };

  let entity = payment;
  if (entity.status === 'authorized') {
    try {
      entity = await razorpay.capturePayment(entity.id, entity.amount);
    } catch (err) {
      // Likely already captured by auto-capture in the meantime; re-fetch to confirm
      console.warn(`[Payments] Capture of ${entity.id} failed: ${err?.error?.description || err.message}`);
      entity = await razorpay.fetchPayment(entity.id);
    }
  }

  if (entity.status !== 'captured') {
    return { outcome: `payment_${entity.status}`, lead };
  }

  return markLeadPaid(lead, {
    orderId: entity.order_id,
    paymentId: entity.id,
    amountPaise: entity.amount,
    source,
  });
}

/**
 * Record a failed attempt so admins can follow up. Never downgrades a paid lead.
 */
async function recordPaymentFailure(lead, reason) {
  if (!lead || lead.status === 'paid') return;
  await Lead.updateOne(
    { _id: lead._id, status: { $ne: 'paid' } },
    { $set: { paymentFailedReason: String(reason || 'unknown').slice(0, 300) } }
  );
  syncLead(lead);
}

module.exports = {
  findLeadForPayment,
  markLeadPaid,
  settlePayment,
  recordPaymentFailure,
};
