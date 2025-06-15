// models/batchModel.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNo: String,
    name: String,
    department: String
  },
  { _id: false }
);

const batchSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, unique: true }, // e.g. "b1", "b2"
    department: { type: String },
    students: [studentSchema] // 30 students per batch
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
