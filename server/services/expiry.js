const Lead = require('../models/Lead');
const { rollbackSpotAtomic } = require('./spots');
const razorpay = require('./razorpay');
const { settlePayment } = require('./payments');
const { syncLead } = require('./sheets');

let expiryIntervalId = null;

/**
 * Ask Razorpay whether a lead's order has a successful payment.
 * Returns true if the lead ended up paid.
 */
async function reconcileLeadPayment(lead) {
  if (!lead.razorpayOrderId || !razorpay.isConfigured()) return false;

  try {
    const payments = await razorpay.fetchOrderPayments(lead.razorpayOrderId);
    const successful = payments.find((p) => p.status === 'captured' || p.status === 'authorized');
    if (!successful) return false;

    const { outcome } = await settlePayment(successful, { source: 'reconcile', lead });
    console.log(`[ExpiryJob] Reconciled lead ${lead._id}: ${outcome}`);
    return outcome === 'paid' || outcome === 'already_paid';
  } catch (err) {
    // Gateway unreachable: don't expire a lead that might be paid; retry next sweep
    console.error(`[ExpiryJob] Reconcile failed for lead ${lead._id}:`, err?.error?.description || err.message);
    return true;
  }
}

/**
 * Sweeps pending leads older than PENDING_EXPIRY_MINUTES.
 * Sets status to 'expired' and decrements the atomic counter if mode is 'submitted'.
 */
async function expirePendingLeads() {
  const mode = process.env.SPOT_COUNT_MODE || 'submitted';
  const expiryMinutes = parseInt(process.env.PENDING_EXPIRY_MINUTES, 10) || 1440; // 24h default

  const cutoffDate = new Date(Date.now() - expiryMinutes * 60 * 1000);

  try {
    const expiredLeads = await Lead.find({
      status: 'pending',
      createdAt: { $lt: cutoffDate },
    });

    if (expiredLeads.length === 0) return;

    let expiredCount = 0;
    for (const lead of expiredLeads) {
      // A payment may have succeeded without the verify call or webhook reaching us
      if (await reconcileLeadPayment(lead)) continue;

      // Atomic guard so a payment landing mid-sweep is never overwritten
      const updated = await Lead.findOneAndUpdate(
        { _id: lead._id, status: 'pending' },
        { $set: { status: 'expired' } }
      );
      if (!updated) continue;
      expiredCount++;
      syncLead(lead);

      if (mode === 'submitted') {
        await rollbackSpotAtomic(lead.kind);
      }
    }

    if (expiredCount > 0) {
      console.log(`[ExpiryJob] Expired ${expiredCount} stale pending lead(s)`);
    }
  } catch (err) {
    console.error('[ExpiryJob] Error running lead expiry job:', err.message);
  }
}

function startExpiryJob() {
  // Run every 10 minutes
  const INTERVAL_MS = 10 * 60 * 1000;
  expiryIntervalId = setInterval(expirePendingLeads, INTERVAL_MS);
}

function stopExpiryJob() {
  if (expiryIntervalId) {
    clearInterval(expiryIntervalId);
  }
}

module.exports = {
  expirePendingLeads,
  startExpiryJob,
  stopExpiryJob,
};
