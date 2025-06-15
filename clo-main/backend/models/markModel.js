// models/markModel.js
const mongoose = require('mongoose');

const markSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true },
    rollNo: { type: String, required: true },

    // Example fields for MST, EST, Lab, Project, etc.
    MSTQ1: { type: Number, default: 0 },
    MSTQ2: { type: Number, default: 0 },
    MSTQ3: { type: Number, default: 0 },
    LABEVAL: { type: Number, default: 0 },
    PROJECT: { type: Number, default: 0 },
    QUIZ: { type: Number, default: 0 },
    ESTQ1: { type: Number, default: 0 },
    ESTQ2: { type: Number, default: 0 },
    ESTQ3: { type: Number, default: 0 },
    ESTQ4: { type: Number, default: 0 },
    ESTQ5: { type: Number, default: 0 },

    // CLO-wise marks
    CLO1: { type: Number, default: 0 },
    CLO2: { type: Number, default: 0 },
    CLO3: { type: Number, default: 0 },
    CLO4: { type: Number, default: 0 },

    totalMarks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mark', markSchema);
