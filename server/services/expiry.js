const Lead = require('../models/Lead');
const { rollbackSpotAtomic } = require('./spots');

let expiryIntervalId = null;

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

    for (const lead of expiredLeads) {
      lead.status = 'expired';
      await lead.save();

      if (mode === 'submitted') {
        await rollbackSpotAtomic(lead.kind);
      }
    }

    console.log(`[ExpiryJob] Expired ${expiredLeads.length} stale pending lead(s)`);
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
