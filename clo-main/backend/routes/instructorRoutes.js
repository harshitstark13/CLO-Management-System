// routes/instructorRoutes.js
const express = require('express');
const router = express.Router();
const { getSubjects, uploadMarks } = require('../controllers/instructorController');
const { protect, instructorOnly } = require('../middleware/authMiddleware');

// Instructor routes
router.get('/subjects', protect, instructorOnly, getSubjects);
router.post('/uploadMarks', protect, instructorOnly, uploadMarks);

module.exports = router;
