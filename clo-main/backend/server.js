require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const adminRoutes = require('./routes/adminRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes'); // New subject routes
const studentRoutes = require('./routes/studentRoutes');
const ccRoutes = require('./routes/ccRoutes'); // Added course coordinator routes

const app = express();

// Connect to MongoDB
connectDB();

// Middleware to parse JSON bodies
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:3039', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options(/(.*)/, cors(corsOptions));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/cc', ccRoutes); // Mount CC routes

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
