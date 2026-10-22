const crypto = require('crypto');
const Razorpay = require('razorpay');

let client = null;

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Lazily construct the Razorpay SDK client so the server can boot without keys.
 */
function getClient() {
  if (client) return client;
  if (!isConfigured()) {
    throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)');
  }
  client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return client;
}

function getKeyId() {
  return process.env.RAZORPAY_KEY_ID;
}

/**
 * Constant-time comparison of two hex HMAC strings.
 */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

function hmacHex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

async function createOrder({ amountPaise, receipt, notes }) {
  return getClient().orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes,
  });
}

async function fetchOrder(orderId) {
  return getClient().orders.fetch(orderId);
}

async function fetchOrderPayments(orderId) {
  const res = await getClient().orders.fetchPayments(orderId);
  return res?.items || [];
}

async function fetchPayment(paymentId) {
  return getClient().payments.fetch(paymentId);
}

/**
 * Capture an authorized payment (only needed if auto-capture is off in the dashboard
 * or hasn't kicked in yet). Returns the updated payment entity.
 */
async function capturePayment(paymentId, amountPaise) {
  return getClient().payments.capture(paymentId, amountPaise, 'INR');
}

/**
 * Verifies the signature returned to Checkout's handler:
 * HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqualHex(signature, hmacHex(secret, `${orderId}|${paymentId}`));
}

/**
 * Verifies the x-razorpay-signature header against the raw webhook body.
 */
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(signature, hmacHex(secret, rawBody));
}

module.exports = {
  isConfigured,
  getKeyId,
  createOrder,
  fetchOrder,
  fetchOrderPayments,
  fetchPayment,
  capturePayment,
  verifyCheckoutSignature,
  verifyWebhookSignature,
};
