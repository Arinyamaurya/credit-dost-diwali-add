const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Lead = require('../models/Lead');
const SpotCounter = require('../models/SpotCounter');
const { broadcastSpotsUpdate } = require('../services/spots');

/**
 * POST /api/webhooks/payment
 * Razorpay / Payment Gateway Webhook handler.
 * Expects express.raw() body to compute and verify HMAC SHA256 signature.
 */
router.post('/', async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not configured; ignoring webhook.');
    return res.status(200).json({ ok: true, message: 'Webhook secret not set' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ ok: false, error: 'Missing webhook signature' });
  }

  try {
    const rawBody = req.body; // Buffer from express.raw()
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return res.status(400).json({ ok: false, error: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf-8'));
    const event = payload.event;

    // Handle payment successful events
    if (event === 'payment_link.paid' || event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_link?.entity;
      const notes = paymentEntity?.notes || {};
      const leadId = notes.leadId || notes.lead_id;
      const contact = paymentEntity?.contact ? paymentEntity.contact.replace(/\D/g, '').slice(-10) : null;
      const email = paymentEntity?.email?.toLowerCase();
      const paymentRef = paymentEntity?.id || 'manual_webhook';

      let lead = null;
      if (leadId) {
        lead = await Lead.findById(leadId);
      } else if (contact) {
        lead = await Lead.findOne({ mobile: contact, status: 'pending' });
      } else if (email) {
        lead = await Lead.findOne({ email, status: 'pending' });
      }

      if (lead && lead.status !== 'paid') {
        lead.status = 'paid';
        lead.paidAt = new Date();
        lead.paymentRef = paymentRef;
        await lead.save();

        // If mode is "paid", increment the spot counter on confirmed payment
        const mode = process.env.SPOT_COUNT_MODE || 'submitted';
        if (mode === 'paid') {
          await SpotCounter.findOneAndUpdate(
            { kind: lead.kind },
            { $inc: { claimed: 1 } },
            { new: true }
          );
        }

        broadcastSpotsUpdate().catch(() => {});
        console.log(`[Webhook] Marked lead ${lead._id} as paid (ref: ${paymentRef})`);
      }
    }

    return res.status(200).json({ ok: true, received: true });
  } catch (err) {
    console.error('[Webhook] Error processing payment webhook:', err.message);
    return res.status(500).json({ ok: false, error: 'Webhook processing error' });
  }
});

module.exports = router;
