const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const { getPrice } = require('../config/pricing');
const razorpay = require('../services/razorpay');
const { settlePayment, recordPaymentFailure } = require('../services/payments');
const { sanitizeString } = require('../utils/validate');
const { syncLead } = require('../services/sheets');

const REUSABLE_ORDER_STATES = ['created', 'attempted'];

function gatewayErrorMessage(err) {
  return err?.error?.description || err?.message || 'unknown';
}

async function loadLead(leadId, res) {
  if (!leadId || !mongoose.isValidObjectId(leadId)) {
    res.status(400).json({ ok: false, code: 'VALIDATION_FAILED', error: 'A valid leadId is required' });
    return null;
  }
  const lead = await Lead.findById(leadId);
  if (!lead) {
    res.status(404).json({ ok: false, code: 'NOT_FOUND', error: 'Reservation not found' });
    return null;
  }
  return lead;
}

/**
 * POST /api/payments/order
 * Creates (or reuses) a Razorpay order for a pending lead. The amount is always
 * decided server-side from config/pricing.js.
 */
router.post('/order', async (req, res, next) => {
  try {
    if (!razorpay.isConfigured()) {
      return res.status(503).json({
        ok: false,
        code: 'PAYMENTS_UNAVAILABLE',
        error: 'Online payment is temporarily unavailable. Our team will contact you.',
      });
    }

    const lead = await loadLead(req.body?.leadId, res);
    if (!lead) return;

    if (lead.status === 'paid') {
      return res.status(409).json({ ok: false, code: 'ALREADY_PAID', error: 'This reservation is already paid.' });
    }
    if (lead.status !== 'pending') {
      return res.status(410).json({
        ok: false,
        code: 'LEAD_NOT_PAYABLE',
        error: 'This reservation has expired. Please contact our team to restore your spot.',
      });
    }

    const price = getPrice(lead.kind);
    const amountPaise = lead.amountPaise || price.totalPaise;

    // Reuse the existing order on retries / double clicks so one lead maps to one order
    let order = null;
    if (lead.razorpayOrderId) {
      try {
        const existing = await razorpay.fetchOrder(lead.razorpayOrderId);
        if (existing.status === 'paid') {
          // Paid but not yet recorded (webhook pending) — settle it now
          const payments = await razorpay.fetchOrderPayments(existing.id);
          const captured = payments.find((p) => p.status === 'captured');
          if (captured) await settlePayment(captured, { source: 'reconcile', lead });
          return res.status(409).json({ ok: false, code: 'ALREADY_PAID', error: 'This reservation is already paid.' });
        }
        if (REUSABLE_ORDER_STATES.includes(existing.status) && existing.amount === amountPaise) {
          order = existing;
        }
      } catch (err) {
        console.warn(`[Payments] Could not fetch order ${lead.razorpayOrderId}: ${gatewayErrorMessage(err)}`);
      }
    }

    if (!order) {
      try {
        order = await razorpay.createOrder({
          amountPaise,
          receipt: lead._id.toString(),
          notes: { leadId: lead._id.toString(), kind: lead.kind },
        });
      } catch (err) {
        console.error(`[Payments] Order creation failed for lead ${lead._id}: ${gatewayErrorMessage(err)}`);
        return res.status(502).json({
          ok: false,
          code: 'PAYMENT_GATEWAY_ERROR',
          error: 'Could not start payment. Please try again in a moment.',
        });
      }
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { razorpayOrderId: order.id, amountPaise, gstPaise: lead.gstPaise ?? price.gstPaise } }
      );
      syncLead(lead);
    }

    return res.status(200).json({
      ok: true,
      keyId: razorpay.getKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: price.label,
      prefill: { name: lead.name, email: lead.email, contact: `+91${lead.mobile}` },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/verify
 * Called from Checkout's success handler. Verifies the signature, then confirms
 * the payment against Razorpay's API before marking the lead paid.
 */
router.post('/verify', async (req, res, next) => {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!razorpay.verifyCheckoutSignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ ok: false, code: 'INVALID_SIGNATURE', error: 'Payment verification failed.' });
    }

    let payment;
    try {
      payment = await razorpay.fetchPayment(paymentId);
    } catch (err) {
      console.error(`[Payments] Fetch payment ${paymentId} failed: ${gatewayErrorMessage(err)}`);
      return res.status(502).json({
        ok: false,
        code: 'PAYMENT_GATEWAY_ERROR',
        error: 'We could not confirm your payment yet. It will update automatically shortly.',
      });
    }

    const { outcome } = await settlePayment(payment, { source: 'checkout', expectedOrderId: orderId });

    if (outcome === 'paid' || outcome === 'already_paid') {
      return res.status(200).json({ ok: true, status: 'paid', paymentId });
    }
    if (outcome === 'amount_mismatch' || outcome === 'duplicate_payment') {
      return res.status(409).json({
        ok: false,
        code: 'PAYMENT_REVIEW',
        error: 'Your payment was received and is under review. Our team will contact you.',
      });
    }
    if (outcome === 'order_mismatch' || outcome === 'lead_not_found') {
      return res.status(400).json({ ok: false, code: 'INVALID_PAYMENT', error: 'Payment does not match this reservation.' });
    }
    return res.status(402).json({
      ok: false,
      code: 'PAYMENT_NOT_CAPTURED',
      error: 'Payment is not complete yet. If money was debited, it will update automatically shortly.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/failed
 * Client-reported failure reason (informational only, for admin follow-up).
 */
router.post('/failed', async (req, res, next) => {
  try {
    const { leadId, orderId, reason } = req.body || {};
    if (!leadId || !mongoose.isValidObjectId(leadId) || !orderId) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_FAILED', error: 'leadId and orderId are required' });
    }
    const lead = await Lead.findOne({ _id: leadId, razorpayOrderId: String(orderId) });
    if (lead) {
      await recordPaymentFailure(lead, sanitizeString(String(reason || '')));
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/status/:leadId
 * Lets the client poll for confirmation (e.g. when /verify was interrupted
 * and the webhook completes the payment instead).
 */
router.get('/status/:leadId', async (req, res, next) => {
  try {
    const { leadId } = req.params;
    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ ok: false, code: 'VALIDATION_FAILED', error: 'Invalid leadId' });
    }
    const lead = await Lead.findById(leadId).select('status').lean();
    if (!lead) {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', error: 'Reservation not found' });
    }
    return res.status(200).json({ ok: true, status: lead.status });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
