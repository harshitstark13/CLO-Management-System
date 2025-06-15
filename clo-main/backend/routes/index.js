// routes/index.js
const express = require('express');
const router = express.Router();

const adminRoutes = require('./adminRoutes');
const instructorRoutes = require('./instructorRoutes');

router.use('/admin', adminRoutes);
router.use('/instructor', instructorRoutes);

module.exports = router;
