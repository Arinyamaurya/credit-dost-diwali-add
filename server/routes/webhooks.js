const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const PaymentEvent = require('../models/PaymentEvent');
const { verifyWebhookSignature } = require('../services/razorpay');
const {
  findLeadForPayment,
  markLeadPaid,
  settlePayment,
  recordPaymentFailure,
} = require('../services/payments');

/**
 * Legacy: payments made through the old fixed payment links carry no lead id,
 * so fall back to matching an unpaid lead by phone/email.
 */
async function handleLegacyPaymentLink(payment) {
  let lead = await findLeadForPayment({ notes: payment.notes, orderId: null });
  if (!lead) {
    const contact = payment.contact ? payment.contact.replace(/\D/g, '').slice(-10) : null;
    const email = payment.email?.toLowerCase();
    const unpaid = { status: { $in: ['pending', 'expired'] } };
    if (contact) lead = await Lead.findOne({ mobile: contact, ...unpaid }).sort({ createdAt: -1 });
    if (!lead && email) lead = await Lead.findOne({ email, ...unpaid }).sort({ createdAt: -1 });
  }
  // Old links had dashboard-defined amounts, so don't enforce the new pricing here
  return markLeadPaid(lead, {
    orderId: payment.order_id,
    paymentId: payment.id,
    amountPaise: payment.amount,
    source: 'webhook',
    strictAmount: false,
  });
}

async function processEvent(event, payload) {
  const payment = payload?.payment?.entity;

  switch (event) {
    case 'payment.authorized':
    case 'payment.captured':
    case 'order.paid':
      // Entity comes from a signature-verified body, so it is trusted as-is
      return settlePayment(payment, { source: 'webhook' });

    case 'payment.failed': {
      const lead = await findLeadForPayment({ notes: payment?.notes, orderId: payment?.order_id });
      await recordPaymentFailure(lead, payment?.error_description || payment?.error_reason);
      return { outcome: 'failure_recorded', lead };
    }

    case 'payment_link.paid':
      return handleLegacyPaymentLink(payment);

    default:
      return { outcome: 'ignored', lead: null };
  }
}

/**
 * POST /api/webhooks/payment
 * Razorpay webhook handler. Expects express.raw() body to verify the HMAC signature.
 * Returns 2xx only after the event has been processed, so failures are retried by Razorpay.
 */
router.post('/', async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured; cannot verify webhook.');
    // In production, fail so Razorpay retries once the secret is set
    const statusCode = process.env.NODE_ENV === 'production' ? 500 : 200;
    return res.status(statusCode).json({ ok: false, error: 'Webhook secret not set' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ ok: false, error: 'Missing webhook signature' });
  }

  const rawBody = req.body; // Buffer from express.raw()
  if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ ok: false, error: 'Invalid webhook signature' });
  }

  try {
    const body = JSON.parse(rawBody.toString('utf-8'));
    const event = body.event;
    const eventId = req.headers['x-razorpay-event-id'];

    if (eventId && (await PaymentEvent.exists({ eventId }))) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    const { outcome, lead } = await processEvent(event, body.payload);
    const payment = body.payload?.payment?.entity;

    if (eventId) {
      try {
        await PaymentEvent.create({
          eventId,
          event,
          orderId: payment?.order_id || body.payload?.order?.entity?.id || null,
          paymentId: payment?.id || null,
          leadId: lead?._id || null,
          outcome,
          payload: body.payload,
        });
      } catch (err) {
        if (err.code !== 11000) throw err; // concurrent retry already logged it
      }
    }

    console.log(`[Webhook] ${event} → ${outcome}${lead ? ` (lead ${lead._id})` : ''}`);
    return res.status(200).json({ ok: true, received: true });
  } catch (err) {
    console.error('[Webhook] Error processing payment webhook:', err.message);
    return res.status(500).json({ ok: false, error: 'Webhook processing error' });
  }
});

module.exports = router;
