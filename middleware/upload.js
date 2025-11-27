// middleware/upload.js
const multer = require('multer');
const cloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const config = require('../config/env');

// Simple memory storage as fallback (for development)
const memoryStorage = multer.memoryStorage();

// Cloudinary storage configuration
let storage;
try {
  storage = cloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'manuscripts',
      resource_type: 'auto',
      allowed_formats: ['pdf'],
      public_id: (req, file) => {
        return `manuscript_${Date.now()}`;
      }
    },
  });
} catch (error) {
  console.warn('Cloudinary storage failed, using memory storage:', error.message);
  storage = memoryStorage;
}

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Manual upload to Cloudinary function
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'manuscripts',
        allowed_formats: ['pdf']
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = { 
  upload, 
  handleUploadErrors, 
  uploadToCloudinary,
  memoryStorage: multer({ storage: memoryStorage })
};