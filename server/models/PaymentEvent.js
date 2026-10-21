const mongoose = require('mongoose');

/**
 * Log of processed Razorpay webhook events.
 * The unique eventId makes webhook handling idempotent across Razorpay retries.
 */
const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    orderId: { type: String, default: null, index: true },
    paymentId: { type: String, default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, default: null },
    outcome: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  {
    collection: 'payment_events',
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentEvent', paymentEventSchema);
