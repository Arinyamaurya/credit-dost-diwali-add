const Lead = require('../models/Lead');

/**
 * Google Sheets admin mirror via an Apps Script web app (see scripts/google-sheets-sync.gs).
 * One row per lead, keyed by Lead ID; every status change re-sends the full current row.
 * Sync is best-effort and never blocks a request: failures are flagged on the lead
 * (sheetSyncPending) and retried by a background sweep.
 */

const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 100;
const RETRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

// Per-lead promise chain so updates for one lead are sent in order
const inFlight = new Map();
let retryIntervalId = null;

function isConfigured() {
  return Boolean(process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_WEBHOOK_SECRET);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatIst(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Human-readable payment status for the admin sheet.
 */
function paymentStatusLabel(lead) {
  if (lead.paymentMismatch) return 'Amount Mismatch - Review';
  switch (lead.status) {
    case 'paid':
      return 'Paid';
    case 'expired':
      return 'Expired (Not Paid)';
    case 'cancelled':
      return 'Cancelled';
    default:
      if (lead.paymentFailedReason) return 'Payment Failed';
      if (lead.razorpayOrderId) return 'Payment Started';
      return 'Registered - Not Paid';
  }
}

function leadToRow(lead) {
  const totalPaise = lead.amountPaise || (lead.amount || 0) * 100;
  return {
    leadId: String(lead._id),
    registeredAt: formatIst(lead.createdAt),
    offer: lead.kind === 'partner' ? 'Franchise Partner' : 'Credit Score Repair',
    name: lead.name,
    mobile: lead.mobile,
    email: lead.email,
    city: lead.city,
    pin: lead.pin,
    amount: totalPaise / 100,
    gst: (lead.gstPaise || 0) / 100,
    paymentStatus: paymentStatusLabel(lead),
    orderId: lead.razorpayOrderId || '',
    paymentId: lead.razorpayPaymentId || lead.paymentRef || '',
    paidAt: formatIst(lead.paidAt),
    failureReason: lead.status === 'paid' ? '' : lead.paymentFailedReason || '',
    paidVia: lead.paymentSource || '',
    source: lead.source || '',
    lastUpdated: formatIst(lead.updatedAt || new Date()),
  };
}

async function postRows(rows) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // text/plain avoids a CORS preflight-style rejection by Apps Script; it reads the raw body
    const res = await fetch(process.env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: process.env.SHEETS_WEBHOOK_SECRET, rows }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Non-JSON response (HTTP ${res.status}). Check the web app is deployed with access "Anyone".`
      );
    }
    if (!data.ok) throw new Error(data.error || 'Apps Script returned ok:false');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function postWithRetry(rows) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await postRows(rows);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function syncNow(leadId) {
  // Always read the latest state so the sheet reflects the database, not the caller's copy
  const lead = await Lead.findById(leadId).lean();
  if (!lead) return;

  try {
    await postWithRetry([leadToRow(lead)]);
    await Lead.updateOne(
      { _id: leadId },
      { $set: { sheetSyncPending: false, sheetSyncedAt: new Date() } },
      { timestamps: false }
    );
  } catch (err) {
    console.error(`[Sheets] Sync failed for lead ${leadId}: ${err.message}`);
    await Lead.updateOne({ _id: leadId }, { $set: { sheetSyncPending: true } }, { timestamps: false });
  }
}

/**
 * Queue a fire-and-forget sync of one lead. Safe to call from any request path.
 */
function syncLead(leadOrId) {
  if (!isConfigured() || !leadOrId) return Promise.resolve();
  const leadId = String(leadOrId._id || leadOrId);

  const previous = inFlight.get(leadId) || Promise.resolve();
  const next = previous
    .then(() => syncNow(leadId))
    .catch((err) => console.error(`[Sheets] Unexpected sync error for ${leadId}:`, err.message))
    .finally(() => {
      if (inFlight.get(leadId) === next) inFlight.delete(leadId);
    });
  inFlight.set(leadId, next);
  return next;
}

/**
 * Re-send leads whose last sync failed (or all leads when full = true), in batches.
 */
async function resyncLeads({ full = false } = {}) {
  if (!isConfigured()) return { ok: false, error: 'Google Sheets sync is not configured' };

  const query = full ? {} : { sheetSyncPending: true };
  const leads = await Lead.find(query).sort({ createdAt: 1 }).lean();
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const ids = batch.map((l) => l._id);
    try {
      await postWithRetry(batch.map(leadToRow));
      await Lead.updateMany(
        { _id: { $in: ids } },
        { $set: { sheetSyncPending: false, sheetSyncedAt: new Date() } },
        { timestamps: false }
      );
      synced += batch.length;
    } catch (err) {
      console.error(`[Sheets] Batch resync failed: ${err.message}`);
      await Lead.updateMany({ _id: { $in: ids } }, { $set: { sheetSyncPending: true } }, { timestamps: false });
      failed += batch.length;
    }
  }

  if (leads.length > 0) console.log(`[Sheets] Resync: ${synced} synced, ${failed} failed`);
  return { ok: failed === 0, total: leads.length, synced, failed };
}

function startSheetSyncJob() {
  if (!isConfigured()) return;
  retryIntervalId = setInterval(() => {
    resyncLeads().catch((err) => console.error('[Sheets] Retry sweep error:', err.message));
  }, RETRY_SWEEP_INTERVAL_MS);
}

function stopSheetSyncJob() {
  if (retryIntervalId) clearInterval(retryIntervalId);
}

module.exports = {
  isConfigured,
  syncLead,
  resyncLeads,
  leadToRow,
  paymentStatusLabel,
  startSheetSyncJob,
  stopSheetSyncJob,
};
