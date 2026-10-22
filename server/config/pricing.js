/**
 * Single source of truth for offer pricing.
 * All amounts are in paise (₹1 = 100 paise), as required by Razorpay.
 */
const PRICING = {
  partner: { label: 'Franchise Partner Offer', basePaise: 150000, gstPaise: 0 },
  customer: { label: 'Credit Score Repair Offer', basePaise: 300000, gstPaise: 54000 }, // 18% GST
};

function getPrice(kind) {
  const p = PRICING[kind];
  if (!p) throw new Error(`Unknown offer kind: ${kind}`);
  return { ...p, totalPaise: p.basePaise + p.gstPaise };
}

function formatInr(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

module.exports = { PRICING, getPrice, formatInr };
