const express = require('express');
const router = express.Router();
const { protect, courseCoordinatorOnly } = require('../middleware/authMiddleware');
const {
  updateEvaluationSettings,
  uploadIntegratedMarks,
  generateCSVTemplate,
  getInstructorSubmissions,    // New endpoint
  viewInstructorSubmission, 
  aggregateSubmissions  // New endpoint
} = require('../controllers/ccController');

// Use courseCoordinatorOnly to restrict access to CC endpoints
router.put('/evaluation', protect, courseCoordinatorOnly, updateEvaluationSettings);
router.post('/uploadIntegratedMarks', protect, courseCoordinatorOnly, uploadIntegratedMarks);
router.get('/generateTemplate', protect, courseCoordinatorOnly, generateCSVTemplate);

// New routes for instructor submissions and viewing files
router.get('/instructor-submissions', protect, courseCoordinatorOnly, getInstructorSubmissions);
router.get('/view-submission', protect, courseCoordinatorOnly, viewInstructorSubmission);
// routes/ccRoutes.js
router.get('/aggregate-submissions', protect, courseCoordinatorOnly, aggregateSubmissions);
module.exports = router;