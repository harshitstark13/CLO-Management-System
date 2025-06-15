// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const { getStudents, getBatches } = require('../controllers/studentController');

router.get('/', getStudents);
router.get('/batches', getBatches);

module.exports = router;