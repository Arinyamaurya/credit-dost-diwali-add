const mongoose = require('mongoose');

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
    amount: {
      type: Number,
      required: true,
      default: function () {
        return this.kind === 'partner' ? 1500 : 3000;
      },
    },
    paymentLinkSentAt: {
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
