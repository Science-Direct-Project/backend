// models/Manuscript.js
const mongoose = require('mongoose');

const manuscriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  abstract: {
    type: String,
    required: true
  },
  keywords: [String],
  domain: {
    type: String,
    required: true
  },
  authors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isCorresponding: {
      type: Boolean,
      default: false
    },
    order: Number
  }],
  correspondingAuthor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manuscriptFile: {
    public_id: String,
    url: String,
    pages: Number,
    size: Number
  },
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'revisions_required',
      'accepted',
      'rejected',
      'published'
    ],
    default: 'submitted'
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  currentRound: {
    type: Number,
    default: 1
  },
  assignedEditors: [{
    editor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  publicationCharges: {
    baseAmount: { type: Number, default: 0 },
    extraPages: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index for better query performance
manuscriptSchema.index({ status: 1, domain: 1 });
manuscriptSchema.index({ correspondingAuthor: 1 });

module.exports = mongoose.model('Manuscript', manuscriptSchema);