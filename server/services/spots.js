const SpotCounter = require('../models/SpotCounter');
const Lead = require('../models/Lead');

// In-memory set of SSE client responses
const sseClients = new Set();

/**
 * Seed the spot counter documents if they do not exist.
 */
async function seedSpotCounters() {
  const totalPartner = parseInt(process.env.TOTAL_SPOTS_PARTNER, 10) || 100;
  const totalCustomer = parseInt(process.env.TOTAL_SPOTS_CUSTOMER, 10) || 100;

  await SpotCounter.findOneAndUpdate(
    { kind: 'partner' },
    { $setOnInsert: { kind: 'partner', total: totalPartner, claimed: 0 } },
    { upsert: true, new: true }
  );

  await SpotCounter.findOneAndUpdate(
    { kind: 'customer' },
    { $setOnInsert: { kind: 'customer', total: totalCustomer, claimed: 0 } },
    { upsert: true, new: true }
  );
}

/**
 * Helper to get the claimed count for a kind, respecting SPOT_COUNT_MODE.
 * - "submitted" (default): reads directly from atomic SpotCounter document.
 * - "paid": counts leads with status "paid".
 */
async function getClaimedCount(kind) {
  const mode = process.env.SPOT_COUNT_MODE || 'submitted';

  if (mode === 'paid') {
    return await Lead.countDocuments({ kind, status: 'paid' });
  }

  const counter = await SpotCounter.findOne({ kind });
  return counter ? counter.claimed : 0;
}

/**
 * Returns full spots statistics for both kinds.
 */
async function getSpotsSummary() {
  const mode = process.env.SPOT_COUNT_MODE || 'submitted';

  const [partnerCounter, customerCounter] = await Promise.all([
    SpotCounter.findOne({ kind: 'partner' }),
    SpotCounter.findOne({ kind: 'customer' }),
  ]);

  const partnerTotal = partnerCounter ? partnerCounter.total : (parseInt(process.env.TOTAL_SPOTS_PARTNER, 10) || 100);
  const customerTotal = customerCounter ? customerCounter.total : (parseInt(process.env.TOTAL_SPOTS_CUSTOMER, 10) || 100);

  let partnerClaimed, customerClaimed;

  if (mode === 'paid') {
    [partnerClaimed, customerClaimed] = await Promise.all([
      Lead.countDocuments({ kind: 'partner', status: 'paid' }),
      Lead.countDocuments({ kind: 'customer', status: 'paid' }),
    ]);
  } else {
    partnerClaimed = partnerCounter ? partnerCounter.claimed : 0;
    customerClaimed = customerCounter ? customerCounter.claimed : 0;
  }

  const partnerRemaining = Math.max(0, partnerTotal - partnerClaimed);
  const customerRemaining = Math.max(0, customerTotal - customerClaimed);

  return {
    partner: {
      claimed: partnerClaimed,
      total: partnerTotal,
      remaining: partnerRemaining,
      soldOut: partnerRemaining <= 0,
    },
    customer: {
      claimed: customerClaimed,
      total: customerTotal,
      remaining: customerRemaining,
      soldOut: customerRemaining <= 0,
    },
    serverTime: new Date().toISOString(),
  };
}

/**
 * Register an SSE client connection.
 */
function addSSEClient(res) {
  sseClients.add(res);
}

/**
 * Remove an SSE client connection.
 */
function removeSSEClient(res) {
  sseClients.delete(res);
}

/**
 * Broadcast updated spots summary to all connected SSE clients.
 */
async function broadcastSpotsUpdate() {
  if (sseClients.size === 0) return;

  try {
    const summary = await getSpotsSummary();
    const data = `data: ${JSON.stringify(summary)}\n\n`;

    for (const client of sseClients) {
      try {
        client.write(data);
      } catch {
        sseClients.delete(client);
      }
    }
  } catch (err) {
    console.error('SSE broadcast error:', err.message);
  }
}

/**
 * Atomically reserve 1 spot.
 * Returns counter document if reserved, or null if sold out.
 */
async function claimSpotAtomic(kind) {
  const counter = await SpotCounter.findOneAndUpdate(
    { kind, $expr: { $lt: ['$claimed', '$total'] } },
    { $inc: { claimed: 1 } },
    { new: true }
  );

  if (counter) {
    // Notify clients of updated spots asynchronously
    broadcastSpotsUpdate().catch(() => {});
  }

  return counter;
}

/**
 * Roll back spot reservation by 1 if lead creation fails or is cancelled.
 */
async function rollbackSpotAtomic(kind) {
  await SpotCounter.findOneAndUpdate(
    { kind, claimed: { $gt: 0 } },
    { $inc: { claimed: -1 } },
    { new: true }
  );
  broadcastSpotsUpdate().catch(() => {});
}

module.exports = {
  seedSpotCounters,
  getClaimedCount,
  getSpotsSummary,
  claimSpotAtomic,
  rollbackSpotAtomic,
  addSSEClient,
  removeSSEClient,
  broadcastSpotsUpdate,
};
