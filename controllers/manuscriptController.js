const Manuscript = require('../models/Manuscript');
const User = require('../models/User');
const { uploadToCloudinary } = require('../middleware/upload');
const emailService = require('../services/emailService');
const { validationResult } = require('express-validator');

exports.submitManuscript = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Manuscript file is required'
      });
    }

    const { title, abstract, keywords, domain } = req.body;
    
    let manuscriptFileData;
    
    // Handle file upload - try Cloudinary first, then fallback to local storage
    if (req.file.buffer) {
      // File is in memory (fallback mode)
      try {
        const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
        manuscriptFileData = {
          public_id: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url,
          pages: 1, // You'll need to implement PDF page counting
          size: req.file.size
        };
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed:', cloudinaryError.message);
        // Fallback to storing file info without Cloudinary
        manuscriptFileData = {
          public_id: `local_${Date.now()}`,
          url: `/uploads/${req.file.filename}`,
          pages: 1,
          size: req.file.size
        };
      }
    } else {
      // File was uploaded via Cloudinary storage
      manuscriptFileData = {
        public_id: req.file.filename,
        url: req.file.path,
        pages: 1,
        size: req.file.size
      };
    }

    // Calculate pages and charges
    const pages = manuscriptFileData.pages;
    const baseAmount = pages <= 6 ? 0 : 50;
    const extraPages = pages > 6 ? pages - 6 : 0;
    const totalAmount = baseAmount + (extraPages * 10);

    const manuscript = new Manuscript({
      title,
      abstract,
      keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
      domain,
      authors: [{
        user: req.user.id,
        isCorresponding: true,
        order: 1
      }],
      correspondingAuthor: req.user.id,
      manuscriptFile: manuscriptFileData,
      publicationCharges: {
        baseAmount,
        extraPages,
        totalAmount
      }
    });

    await manuscript.save();

    // Notify editor in chief
    try {
      const editorInChief = await User.findOne({ 'roles.editorInChief': true });
      if (editorInChief) {
        await emailService.notifyNewSubmission(editorInChief.email, manuscript);
      }
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Manuscript submitted successfully',
      data: { manuscript }
    });
  } catch (error) {
    console.error('Submit manuscript error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error submitting manuscript',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

exports.getMyManuscripts = async (req, res) => {
  try {
    const manuscripts = await Manuscript.find({
      correspondingAuthor: req.user.id
    })
    .populate('assignedEditors.editor', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { manuscripts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching manuscripts',
      error: error.message
    });
  }
};

exports.getManuscript = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id)
      .populate('authors.user', 'firstName lastName email profile')
      .populate('correspondingAuthor', 'firstName lastName email')
      .populate('assignedEditors.editor', 'firstName lastName email');

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: 'Manuscript not found'
      });
    }

    // Check if user has access to this manuscript
    const isAuthor = manuscript.authors.some(author => 
      author.user._id.toString() === req.user.id
    );
    const isEditor = req.user.roles.editor || req.user.roles.editorInChief;

    if (!isAuthor && !isEditor) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { manuscript }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching manuscript',
      error: error.message
    });
  }
};

