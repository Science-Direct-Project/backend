// controllers/adminController.js
const User = require('../models/User');
const Manuscript = require('../models/Manuscript');
const Assignment = require('../models/Assignment');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAuthors,
      totalReviewers,
      totalEditors,
      totalManuscripts,
      pendingManuscripts,
      underReviewManuscripts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'roles.author': true }),
      User.countDocuments({ 'roles.reviewer': true }),
      User.countDocuments({ 'roles.editor': true }),
      Manuscript.countDocuments(),
      Manuscript.countDocuments({ status: 'submitted' }),
      Manuscript.countDocuments({ status: 'under_review' })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalAuthors,
          totalReviewers,
          totalEditors,
          totalManuscripts,
          pendingManuscripts,
          underReviewManuscripts
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

exports.assignReviewer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { manuscriptId, reviewerId, dueDate } = req.body;

    const manuscript = await Manuscript.findById(manuscriptId);
    const reviewer = await User.findById(reviewerId);
    const editor = req.user.id;

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: 'Manuscript not found'
      });
    }

    if (!reviewer || !reviewer.roles.reviewer) {
      return res.status(400).json({
        success: false,
        message: 'User is not a reviewer'
      });
    }

    // Check if already assigned
    const existingAssignment = await Assignment.findOne({
      manuscript: manuscriptId,
      reviewer: reviewerId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Reviewer already assigned to this manuscript'
      });
    }

    const assignment = new Assignment({
      manuscript: manuscriptId,
      reviewer: reviewerId,
      editor,
      assignedBy: editor,
      dueDate: new Date(dueDate)
    });

    await assignment.save();

    // Update manuscript status
    manuscript.status = 'under_review';
    await manuscript.save();

    // Notify reviewer
    await emailService.notifyReviewAssignment(reviewer.email, manuscript, assignment);

    res.status(201).json({
      success: true,
      message: 'Reviewer assigned successfully',
      data: { assignment }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning reviewer',
      error: error.message
    });
  }
};

exports.updateUserRoles = async (req, res) => {
  try {
    const { userId, roles } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update roles
    user.roles = { ...user.roles, ...roles };
    await user.save();

    res.json({
      success: true,
      message: 'User roles updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user roles',
      error: error.message
    });
  }
};