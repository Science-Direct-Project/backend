// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  manuscript: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manuscript',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  round: {
    type: Number,
    default: 1
  },
  scores: {
    originality: { type: Number, min: 1, max: 5 },
    methodology: { type: Number, min: 1, max: 5 },
    contribution: { type: Number, min: 1, max: 5 },
    clarity: { type: Number, min: 1, max: 5 },
    references: { type: Number, min: 1, max: 5 }
  },
  overallScore: {
    type: Number,
    min: 1,
    max: 5
  },
  commentsToAuthor: {
    type: String,
    required: true
  },
  commentsToEditor: String,
  confidentialComments: String,
  recommendation: {
    type: String,
    enum: ['accept', 'minor_revisions', 'major_revisions', 'reject'],
    required: true
  },
  submittedDate: Date,
  dueDate: Date,
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'submitted'],
    default: 'assigned'
  }
}, {
  timestamps: true
});

reviewSchema.index({ manuscript: 1, reviewer: 1, round: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);