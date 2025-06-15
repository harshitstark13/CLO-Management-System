// models/studentMarkModel.js
const mongoose = require('mongoose');

const studentMarkSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  rollNo: { type: String, required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  evalCriteria: { type: String, required: true },
  data: { type: Map, of: String }, // Question marks (e.g., { "MST_Q1": "8", "MST_Q2": "12" })
  cloMarks: { type: Map, of: Number, default: () => new Map() }, // Student’s achieved marks per CLO (e.g., { "CLO1": 20, "CLO2": 23 })
  cloTotals: { type: Map, of: Number, default: () => new Map() }, // Total possible marks per CLO (e.g., { "CLO1": 25, "CLO2": 30 })
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudentMark', studentMarkSchema);