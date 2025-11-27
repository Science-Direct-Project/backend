const express = require('express');
const { body, param } = require('express-validator');
const {
  submitReview,
  getMyReviews,
  getReviewDetails,
  acceptReviewAssignment,
  declineReviewAssignment,
  getReviewerStatistics,
  getManuscriptReviews,
  updateReview
} = require('../controllers/ReviewController');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// @route   POST /api/reviews/:manuscriptId/submit
// @desc    Submit a review for a manuscript
// @access  Private (Reviewer)
router.post(
  '/:manuscriptId/submit',
  [
    auth,
    authorize('reviewer'),
    param('manuscriptId')
      .isMongoId()
      .withMessage('Valid manuscript ID is required'),
    body('scores.originality')
      .isInt({ min: 1, max: 5 })
      .withMessage('Originality score must be between 1 and 5'),
    body('scores.methodology')
      .isInt({ min: 1, max: 5 })
      .withMessage('Methodology score must be between 1 and 5'),
    body('scores.contribution')
      .isInt({ min: 1, max: 5 })
      .withMessage('Contribution score must be between 1 and 5'),
    body('scores.clarity')
      .isInt({ min: 1, max: 5 })
      .withMessage('Clarity score must be between 1 and 5'),
    body('scores.references')
      .isInt({ min: 1, max: 5 })
      .withMessage('References score must be between 1 and 5'),
    body('commentsToAuthor')
      .notEmpty()
      .withMessage('Comments to author are required')
      .isLength({ min: 50 })
      .withMessage('Comments to author must be at least 50 characters'),
    body('commentsToEditor')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Comments to editor must be at least 10 characters if provided'),
    body('confidentialComments')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Confidential comments must be at least 10 characters if provided'),
    body('recommendation')
      .isIn(['accept', 'minor_revisions', 'major_revisions', 'reject'])
      .withMessage('Valid recommendation is required'),
    validate
  ],
  submitReview
);

// @route   PUT /api/reviews/:assignmentId/accept
// @desc    Accept a review assignment
// @access  Private (Reviewer)
router.put(
  '/:assignmentId/accept',
  [
    auth,
    authorize('reviewer'),
    param('assignmentId')
      .isMongoId()
      .withMessage('Valid assignment ID is required'),
    validate
  ],
  acceptReviewAssignment
);

// @route   PUT /api/reviews/:assignmentId/decline
// @desc    Decline a review assignment
// @access  Private (Reviewer)
router.put(
  '/:assignmentId/decline',
  [
    auth,
    authorize('reviewer'),
    param('assignmentId')
      .isMongoId()
      .withMessage('Valid assignment ID is required'),
    body('reason')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Reason for declining must be at least 10 characters'),
    validate
  ],
  declineReviewAssignment
);

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review (before submission)
// @access  Private (Reviewer)
router.put(
  '/:reviewId',
  [
    auth,
    authorize('reviewer'),
    param('reviewId')
      .isMongoId()
      .withMessage('Valid review ID is required'),
    body('scores.originality')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Originality score must be between 1 and 5'),
    body('scores.methodology')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Methodology score must be between 1 and 5'),
    body('scores.contribution')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Contribution score must be between 1 and 5'),
    body('scores.clarity')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Clarity score must be between 1 and 5'),
    body('scores.references')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('References score must be between 1 and 5'),
    body('commentsToAuthor')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Comments to author must be at least 10 characters'),
    body('commentsToEditor')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Comments to editor must be at least 10 characters'),
    body('confidentialComments')
      .optional()
      .isLength({ min: 10 })
      .withMessage('Confidential comments must be at least 10 characters'),
    body('recommendation')
      .optional()
      .isIn(['accept', 'minor_revisions', 'major_revisions', 'reject'])
      .withMessage('Valid recommendation is required'),
    validate
  ],
  updateReview
);

// @route   GET /api/reviews/my-reviews
// @desc    Get all review assignments for the logged-in reviewer
// @access  Private (Reviewer)
router.get(
  '/my-reviews',
  [
    auth,
    authorize('reviewer'),
    validate
  ],
  getMyReviews
);

// @route   GET /api/reviews/statistics
// @desc    Get reviewer statistics
// @access  Private (Reviewer)
router.get(
  '/statistics',
  [
    auth,
    authorize('reviewer'),
    validate
  ],
  getReviewerStatistics
);

// @route   GET /api/reviews/:reviewId
// @desc    Get specific review details
// @access  Private (Reviewer, Editor, EditorInChief)
router.get(
  '/:reviewId',
  [
    auth,
    authorize('reviewer', 'editor', 'editorInChief'),
    param('reviewId')
      .isMongoId()
      .withMessage('Valid review ID is required'),
    validate
  ],
  getReviewDetails
);

// @route   GET /api/reviews/manuscript/:manuscriptId
// @desc    Get all reviews for a manuscript (for editors)
// @access  Private (Editor, EditorInChief)
router.get(
  '/manuscript/:manuscriptId',
  [
    auth,
    authorize('editor', 'editorInChief'),
    param('manuscriptId')
      .isMongoId()
      .withMessage('Valid manuscript ID is required'),
    validate
  ],
  getManuscriptReviews
);

module.exports = router;