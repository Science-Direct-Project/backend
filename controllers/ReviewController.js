// controllers/reviewController.js
const Review = require('../models/Review');
const Manuscript = require('../models/Manuscript');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

exports.submitReview = async (req, res) => {
  try {
    const { manuscriptId } = req.params;
    const {
      scores,
      commentsToAuthor,
      commentsToEditor,
      confidentialComments,
      recommendation
    } = req.body;

    // Check if assignment exists and reviewer is assigned
    const assignment = await Assignment.findOne({
      manuscript: manuscriptId,
      reviewer: req.user.id,
      status: 'accepted'
    }).populate('manuscript');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Review assignment not found or not accepted'
      });
    }

    // Check if review already exists for this round
    const existingReview = await Review.findOne({
      manuscript: manuscriptId,
      reviewer: req.user.id,
      round: assignment.manuscript.currentRound
    });

    if (existingReview && existingReview.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Review already submitted for this round'
      });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores);
    const overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;

    let review;
    if (existingReview) {
      // Update existing review
      review = await Review.findByIdAndUpdate(
        existingReview._id,
        {
          scores,
          overallScore,
          commentsToAuthor,
          commentsToEditor,
          confidentialComments,
          recommendation,
          submittedDate: new Date(),
          status: 'submitted'
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new review
      review = new Review({
        manuscript: manuscriptId,
        reviewer: req.user.id,
        round: assignment.manuscript.currentRound,
        scores,
        overallScore,
        commentsToAuthor,
        commentsToEditor,
        confidentialComments,
        recommendation,
        submittedDate: new Date(),
        status: 'submitted'
      });
      await review.save();
    }

    // Update assignment status
    assignment.status = 'completed';
    assignment.review = review._id;
    await assignment.save();

    // Update manuscript status based on reviews
    await updateManuscriptStatus(manuscriptId);

    // Notify editor and author
    await emailService.notifyReviewSubmitted(
      assignment.editor,
      assignment.manuscript,
      review
    );

    // If revisions required, notify author
    if (['minor_revisions', 'major_revisions'].includes(recommendation)) {
      await emailService.notifyAuthorRevision(
        assignment.manuscript.correspondingAuthor,
        assignment.manuscript,
        review
      );
    }

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: { review }
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting review',
      error: error.message
    });
  }
};

/**
 * @desc    Accept a review assignment
 * @route   PUT /api/reviews/:assignmentId/accept
 * @access  Private (Reviewer)
 */
exports.acceptReviewAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      reviewer: req.user.id,
      status: 'pending'
    }).populate('manuscript');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or already processed'
      });
    }

    assignment.status = 'accepted';
    await assignment.save();

    // Notify editor
    await emailService.notifyReviewAssignmentAccepted(
      assignment.editor,
      assignment.manuscript,
      req.user
    );

    res.json({
      success: true,
      message: 'Review assignment accepted successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Accept assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting review assignment',
      error: error.message
    });
  }
};

/**
 * @desc    Decline a review assignment
 * @route   PUT /api/reviews/:assignmentId/decline
 * @access  Private (Reviewer)
 */
exports.declineReviewAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      reviewer: req.user.id,
      status: 'pending'
    }).populate('manuscript');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found or already processed'
      });
    }

    assignment.status = 'declined';
    await assignment.save();

    // Notify editor
    await emailService.notifyReviewAssignmentDeclined(
      assignment.editor,
      assignment.manuscript,
      req.user,
      reason
    );

    res.json({
      success: true,
      message: 'Review assignment declined successfully',
      data: { assignment }
    });
  } catch (error) {
    console.error('Decline assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error declining review assignment',
      error: error.message
    });
  }
};

/**
 * @desc    Update a review (before submission)
 * @route   PUT /api/reviews/:reviewId
 * @access  Private (Reviewer)
 */
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const updateData = req.body;

    // Check if review exists and belongs to the user
    const review = await Review.findOne({
      _id: reviewId,
      reviewer: req.user.id,
      status: { $ne: 'submitted' } // Can only update if not submitted
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or already submitted'
      });
    }

    // Recalculate overall score if scores are updated
    if (updateData.scores) {
      const scoreValues = Object.values(updateData.scores);
      updateData.overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    }

    // Update review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { ...updateData, status: 'in_progress' },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating review',
      error: error.message
    });
  }
};

/**
 * @desc    Get all review assignments for the logged-in reviewer
 * @route   GET /api/reviews/my-reviews
 * @access  Private (Reviewer)
 */
exports.getMyReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { reviewer: req.user.id };
    if (status) {
      query.status = status;
    }

    const assignments = await Assignment.find(query)
      .populate({
        path: 'manuscript',
        select: 'title abstract domain status submissionDate manuscriptFile',
        populate: {
          path: 'correspondingAuthor',
          select: 'firstName lastName email profile.affiliation'
        }
      })
      .populate('editor', 'firstName lastName email')
      .populate('review', 'overallScore recommendation submittedDate status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review assignments',
      error: error.message
    });
  }
};

/**
 * @desc    Get reviewer statistics
 * @route   GET /api/reviews/statistics
 * @access  Private (Reviewer)
 */
exports.getReviewerStatistics = async (req, res) => {
  try {
    const reviewerId = req.user.id;

    const [
      totalAssignments,
      pendingAssignments,
      completedAssignments,
      averageScore,
      responseTime
    ] = await Promise.all([
      Assignment.countDocuments({ reviewer: reviewerId }),
      Assignment.countDocuments({ reviewer: reviewerId, status: 'pending' }),
      Assignment.countDocuments({ reviewer: reviewerId, status: 'completed' }),
      Review.aggregate([
        { $match: { reviewer: reviewerId } },
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
      ]),
      calculateAverageResponseTime(reviewerId)
    ]);

    const stats = {
      totalAssignments,
      pendingAssignments,
      completedAssignments,
      acceptanceRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
      averageScore: averageScore.length > 0 ? averageScore[0].avgScore : 0,
      averageResponseTime: responseTime
    };

    res.json({
      success: true,
      data: { statistics: stats }
    });
  } catch (error) {
    console.error('Get reviewer statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reviewer statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get specific review details
 * @route   GET /api/reviews/:reviewId
 * @access  Private (Reviewer, Editor, EditorInChief)
 */
exports.getReviewDetails = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate({
        path: 'manuscript',
        select: 'title abstract domain keywords manuscriptFile'
      })
      .populate('reviewer', 'firstName lastName email profile.expertise');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check access permissions
    const isOwner = review.reviewer._id.toString() === req.user.id;
    const isEditor = req.user.roles.editor || req.user.roles.editorInChief;

    if (!isOwner && !isEditor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this review'
      });
    }

    // Hide confidential comments from non-editors
    if (!isEditor) {
      review.confidentialComments = undefined;
    }

    res.json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('Get review details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching review details',
      error: error.message
    });
  }
};

/**
 * @desc    Get all reviews for a manuscript
 * @route   GET /api/reviews/manuscript/:manuscriptId
 * @access  Private (Editor, EditorInChief)
 */
exports.getManuscriptReviews = async (req, res) => {
  try {
    const { manuscriptId } = req.params;

    const reviews = await Review.find({ manuscript: manuscriptId })
      .populate('reviewer', 'firstName lastName email profile.expertise profile.affiliation')
      .sort({ submittedDate: -1 });

    // Calculate overall decision
    const decision = calculateOverallDecision(reviews);

    res.json({
      success: true,
      data: {
        reviews,
        decision,
        totalReviews: reviews.length,
        submittedReviews: reviews.filter(r => r.status === 'submitted').length
      }
    });
  } catch (error) {
    console.error('Get manuscript reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching manuscript reviews',
      error: error.message
    });
  }
};

// Helper function to update manuscript status based on reviews
const updateManuscriptStatus = async (manuscriptId) => {
  const reviews = await Review.find({
    manuscript: manuscriptId,
    status: 'submitted',
    round: { $exists: true }
  });

  const manuscript = await Manuscript.findById(manuscriptId);
  
  if (reviews.length >= 2) { // Assuming minimum 2 reviews required
    const recommendations = reviews.map(r => r.recommendation);
    
    if (recommendations.every(rec => rec === 'accept')) {
      manuscript.status = 'accepted';
    } else if (recommendations.some(rec => rec === 'reject')) {
      manuscript.status = 'rejected';
    } else if (recommendations.some(rec => ['minor_revisions', 'major_revisions'].includes(rec))) {
      manuscript.status = 'revisions_required';
    }
    
    await manuscript.save();
  }
};

// Helper function to calculate average response time
const calculateAverageResponseTime = async (reviewerId) => {
  const assignments = await Assignment.find({
    reviewer: reviewerId,
    status: 'completed'
  }).populate('review');

  if (assignments.length === 0) return 0;

  const totalResponseTime = assignments.reduce((total, assignment) => {
    if (assignment.review && assignment.review.submittedDate) {
      const responseTime = assignment.review.submittedDate - assignment.createdAt;
      return total + responseTime;
    }
    return total;
  }, 0);

  return totalResponseTime / assignments.length / (1000 * 60 * 60 * 24); // Convert to days
};

// Helper function to calculate overall decision
const calculateOverallDecision = (reviews) => {
  const submittedReviews = reviews.filter(r => r.status === 'submitted');
  
  if (submittedReviews.length === 0) return 'pending';
  
  const recommendations = submittedReviews.map(r => r.recommendation);
  
  // Simple majority voting
  const counts = {};
  recommendations.forEach(rec => {
    counts[rec] = (counts[rec] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(counts));
  const decision = Object.keys(counts).find(rec => counts[rec] === maxCount);

  return decision || 'pending';
};

module.exports = exports;