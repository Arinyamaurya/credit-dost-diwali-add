const mongoose = require('mongoose');
const { getPrice } = require('../config/pricing');

const leadSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ['partner', 'customer'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },
    // Total payable in whole rupees (incl. GST). Kept for admin/CSV compatibility.
    amount: {
      type: Number,
      required: true,
      default: function () {
        return getPrice(this.kind).totalPaise / 100;
      },
    },
    // Authoritative amounts in paise (what Razorpay charges)
    amountPaise: {
      type: Number,
      default: function () {
        return getPrice(this.kind).totalPaise;
      },
    },
    gstPaise: {
      type: Number,
      default: function () {
        return getPrice(this.kind).gstPaise;
      },
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    paymentSource: {
      type: String,
      enum: [null, 'checkout', 'webhook', 'reconcile', 'admin'],
      default: null,
    },
    // Set when a captured payment did not match the expected amount; needs manual review
    paymentMismatch: {
      type: Boolean,
      default: false,
    },
    paymentFailedReason: {
      type: String,
      default: null,
      trim: true,
    },
    // Google Sheets admin mirror: true when the last sync failed and needs a retry
    sheetSyncPending: {
      type: Boolean,
      default: false,
      index: true,
    },
    sheetSyncedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paymentRef: {
      type: String,
      default: null,
      trim: true,
    },
    ip: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    source: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    collection: 'leads',
    timestamps: true,
    strict: true,
  }
);

// Compound unique indexes: one spot per mobile and per email per offer kind
leadSchema.index({ kind: 1, mobile: 1 }, { unique: true });
leadSchema.index({ kind: 1, email: 1 }, { unique: true });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
