// routes/admin.js
const express = require('express');
const { body } = require('express-validator');
const { 
  getDashboardStats, 
  assignReviewer, 
  updateUserRoles 
} = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth, authorize('editorInChief'));

router.get('/dashboard', getDashboardStats);
router.post('/assign-reviewer', [
  body('manuscriptId').isMongoId().withMessage('Valid manuscript ID is required'),
  body('reviewerId').isMongoId().withMessage('Valid reviewer ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], assignReviewer);
router.patch('/user-roles', updateUserRoles);

module.exports = router;