const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSubjectsByDepartment,
  getStudentsBySubject,
  getInstructorSubjectData,
  submitInstructorMarks,
  generateCSVTemplate,
  getInstructorSubjects,
  calculateCLOMarksRealTime, // Add new endpoint
} = require('../controllers/subjectController');

router.get('/', protect, getSubjectsByDepartment);
router.get('/instructor-subjects', protect, getInstructorSubjects);
router.get('/:subjectId/students', protect, getStudentsBySubject);
router.get('/:subjectId/instructor-data', protect, getInstructorSubjectData);
router.post('/:subjectId/submit-marks', protect, submitInstructorMarks);
router.get('/generateTemplate', protect, generateCSVTemplate);
router.post('/:subjectId/calculate-clo-realtime', protect, calculateCLOMarksRealTime); // New route

module.exports = router;