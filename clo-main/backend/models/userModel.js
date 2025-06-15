// models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'instructor'], default: 'instructor' },
    department: { type: String },
    coordinatorFor: { type: String, default: null }, // If instructor is CC of a subject
    assignedSubjects: [
      {
        subjectCode: String,
        isCoordinator: { type: Boolean, default: false }
      }
    ],
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Store hashed password in production
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
