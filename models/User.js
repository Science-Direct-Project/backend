// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  roles: {
    author: { type: Boolean, default: true },
    reviewer: { type: Boolean, default: false },
    editor: { type: Boolean, default: false },
    editorInChief: { type: Boolean, default: false }
  },
  profile: {
    affiliation: String,
    country: String,
    expertise: [String],
    orcid: String,
    bio: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has role
userSchema.methods.hasRole = function(role) {
  return this.roles[role] === true;
};

module.exports = mongoose.model('User', userSchema);