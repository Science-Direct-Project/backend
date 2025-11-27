// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const config = require('./env');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

// Test Cloudinary configuration (skip in test environment to keep Jest clean)
if (process.env.NODE_ENV !== 'test') {
  cloudinary.api.ping()
    .then(result => {
      console.log('✅ Cloudinary configured successfully');
    })
    .catch(error => {
      console.error('❌ Cloudinary configuration failed:', error.message);
    });
}

module.exports = cloudinary;