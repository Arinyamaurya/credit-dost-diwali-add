const mongoose = require('mongoose');

const spotCounterSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ['partner', 'customer'],
      unique: true,
      index: true,
    },
    total: {
      type: Number,
      required: true,
      default: 100,
      min: 0,
    },
    claimed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    collection: 'spotcounters',
    timestamps: true,
  }
);

const SpotCounter = mongoose.model('SpotCounter', spotCounterSchema);

module.exports = SpotCounter;
