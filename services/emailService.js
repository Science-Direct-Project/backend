// services/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config/env');

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: false,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS
  }
});

exports.notifyNewSubmission = async (editorEmail, manuscript) => {
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: editorEmail,
    subject: 'New Manuscript Submission',
    html: `
      <h2>New Manuscript Submitted</h2>
      <p><strong>Title:</strong> ${manuscript.title}</p>
      <p><strong>Domain:</strong> ${manuscript.domain}</p>
      <p><strong>Submitted Date:</strong> ${manuscript.submissionDate}</p>
      <p>Please log in to the editorial system to review this submission.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.notifyReviewAssignment = async (reviewerEmail, manuscript, assignment) => {
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: reviewerEmail,
    subject: 'Review Assignment',
    html: `
      <h2>New Review Assignment</h2>
      <p><strong>Manuscript Title:</strong> ${manuscript.title}</p>
      <p><strong>Due Date:</strong> ${assignment.dueDate.toDateString()}</p>
      <p>Please log in to the editorial system to accept this assignment and submit your review.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.notifyAuthorRevision = async (authorEmail, manuscript, review) => {
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: authorEmail,
    subject: 'Revision Required for Your Manuscript',
    html: `
      <h2>Revision Required</h2>
      <p>Your manuscript "${manuscript.title}" requires revisions.</p>
      <p><strong>Reviewer Comments:</strong></p>
      <p>${review.commentsToAuthor}</p>
      <p>Please log in to submit your revised manuscript.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.notifyReviewAssignmentAccepted = async (editorId, manuscript, reviewer) => {
  const editor = await User.findById(editorId);
  
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: editor.email,
    subject: 'Review Assignment Accepted',
    html: `
      <h2>Review Assignment Accepted</h2>
      <p><strong>Reviewer:</strong> ${reviewer.firstName} ${reviewer.lastName}</p>
      <p><strong>Manuscript:</strong> ${manuscript.title}</p>
      <p>The reviewer has accepted the assignment and will submit their review by the due date.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.notifyReviewAssignmentDeclined = async (editorId, manuscript, reviewer, reason) => {
  const editor = await User.findById(editorId);
  
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: editor.email,
    subject: 'Review Assignment Declined',
    html: `
      <h2>Review Assignment Declined</h2>
      <p><strong>Reviewer:</strong> ${reviewer.firstName} ${reviewer.lastName}</p>
      <p><strong>Manuscript:</strong> ${manuscript.title}</p>
      <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      <p>Please assign another reviewer for this manuscript.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.notifyReviewSubmitted = async (editorId, manuscript, review) => {
  const editor = await User.findById(editorId);
  
  const mailOptions = {
    from: config.FROM_EMAIL,
    to: editor.email,
    subject: 'Review Submitted',
    html: `
      <h2>New Review Submitted</h2>
      <p><strong>Manuscript:</strong> ${manuscript.title}</p>
      <p><strong>Recommendation:</strong> ${review.recommendation}</p>
      <p><strong>Overall Score:</strong> ${review.overallScore.toFixed(2)}/5</p>
      <p>Please log in to view the complete review and make a decision.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};