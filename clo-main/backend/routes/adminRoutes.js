const express = require('express');
const router = express.Router();
const {
  getAllTeachers,
  assignSubjects,
  updateTeacher,
  getInstructorsByDepartment,
  assignStudentsToInstructor,
  uploadStudentTagging,
  assignBatchToTeacher,
  assignStudentToTeacher,
  removeStudentAssignment,
  generateTaggingTemplate,
  addTeacher,
  deleteTeacher,
  getDepartments,
  addDepartment,
  deleteDepartment,
  addSubject,
  deleteSubject, // Add this
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/teachers', protect, adminOnly, getAllTeachers);
router.put('/teachers/:id', protect, adminOnly, updateTeacher);
router.post('/teachers', protect, adminOnly, addTeacher);
router.delete('/teachers/:id', protect, adminOnly, deleteTeacher);
router.post('/assign', protect, adminOnly, assignSubjects);
router.get('/instructors', protect, adminOnly, getInstructorsByDepartment);
router.post('/assign-students', protect, adminOnly, assignStudentsToInstructor);
router.post('/upload-tagging', protect, adminOnly, uploadStudentTagging);
router.post('/assign-batch', protect, adminOnly, assignBatchToTeacher);
router.post('/assign-student', protect, adminOnly, assignStudentToTeacher);
router.post('/remove-student', protect, adminOnly, removeStudentAssignment);
router.get('/generate-tagging-template', protect, adminOnly, generateTaggingTemplate);
router.get('/departments', protect, adminOnly, getDepartments);
router.post('/departments', protect, adminOnly, addDepartment);
router.delete('/departments/:id', protect, adminOnly, deleteDepartment);
router.post('/subjects', protect, adminOnly, addSubject);
router.delete('/subjects/:id', protect, adminOnly, deleteSubject); // New route

module.exports = router;