// routes/manuscripts.js
const express = require('express');
const { body } = require('express-validator');
const { 
  submitManuscript, 
  getMyManuscripts, 
  getManuscript 
} = require('../controllers/manuscriptController');
const { auth, authorize } = require('../middleware/auth');
const { upload, handleUploadErrors } = require('../middleware/upload'); // Updated import
const { validate } = require('../middleware/validate'); // Add this middleware

const router = express.Router();

router.post('/submit', 
  [
    auth,
    authorize('author'),
    upload.single('manuscript'), // Use the upload middleware
    body('title').notEmpty().withMessage('Title is required'),
    body('abstract').notEmpty().withMessage('Abstract is required'),
    body('domain').notEmpty().withMessage('Domain is required'),
    validate,
    handleUploadErrors // Add error handling
  ],
  submitManuscript
);

router.get('/my-manuscripts', auth, authorize('author'), getMyManuscripts);
router.get('/:id', auth, getManuscript);

module.exports = router;