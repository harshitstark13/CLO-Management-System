// models/subjectModel.js
const mongoose = require('mongoose');

// Schema for sub-parts of a question
const partSchema = new mongoose.Schema(
  {
    partNo: {
      type: Number,
      required: true,
      min: 1, // Ensure partNo is a positive integer
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for partNo',
      },
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0, // Ensure maxMarks is non-negative
    },
    // Removed cloMappings since mappings are now stored in cloQuestionMappings
  },
  { _id: false }
);

// Schema for questions within an evaluation criterion
const questionSchema = new mongoose.Schema(
  {
    questionNo: {
      type: Number,
      required: true,
      min: 1, // Ensure questionNo is a positive integer
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for questionNo',
      },
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0, // Ensure maxMarks is non-negative
    },
    parts: {
      type: [partSchema],
      default: [], // Default to empty array
    },
    // Removed cloMappings since mappings are now stored in cloQuestionMappings
  },
  { _id: false }
);

// Schema for an evaluation criterion (e.g., MST, EST)
const evaluationCriteriaSchema = new mongoose.Schema(
  {
    totalMarks: {
      type: Number,
      required: true,
      min: 0, // Ensure totalMarks is non-negative
    },
    weightage: {
      type: Number,
      required: true,
      min: 0,
      max: 100, // Weightage should be between 0 and 100
    },
    questions: {
      type: [questionSchema],
      default: [], // Default to empty array
    },
  },
  { _id: false }
);

// Schema for the evaluation schema (dynamic keys like MST, EST)
const evaluationSchema = new mongoose.Schema(
  {
    type: mongoose.Schema.Types.Mixed,
  },
  { strict: false }
);

// Schema for CSV format configuration
const csvFormatSchema = new mongoose.Schema(
  {
    columns: {
      type: Array,
      default: [],
    },
  },
  { _id: false }
);

// Schema for a CLO (Course Learning Outcome)
const cloSchema = new mongoose.Schema(
  {
    cloNumber: {
      type: Number,
      required: true,
      min: 1, // Ensure cloNumber is a positive integer
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for cloNumber',
      },
    },
    cloStatement: {
      type: String,
      required: true,
      trim: true, // Remove leading/trailing whitespace
    },
  },
  { _id: false }
);

// Schema for instructor-student assignments
const instructorStudentSchema = new mongoose.Schema(
  {
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    students: [
      {
        rollNo: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
  },
  { _id: false }
);

// Schema for a single mapping of a CLO to a question (and optionally a sub-part)
const cloMappingSchema = new mongoose.Schema(
  {
    criteria: {
      type: String,
      required: true,
      trim: true, // e.g., "MST", "EST"
    },
    questionNo: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for questionNo',
      },
    },
    partNo: {
      type: Number,
      default: null, // Null if no sub-part is mapped
      min: 1,
      validate: {
        validator: function (value) {
          return value === null || Number.isInteger(value);
        },
        message: '{VALUE} is not an integer value for partNo or null',
      },
    },
  },
  { _id: false }
);

// Schema for mapping a CLO to multiple questions
const cloQuestionMappingSchema = new mongoose.Schema(
  {
    cloNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for cloNumber',
      },
    },
    mappings: {
      type: [cloMappingSchema],
      default: [], // Array of mappings to questions and sub-parts
    },
  },
  { _id: false }
);

// Main Subject schema
const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    subjectCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    instructors: {
      type: [instructorStudentSchema],
      default: [],
    },
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    CLOs: {
      type: [cloSchema],
      default: [],
    },
    evaluationSchema: {
      type: evaluationSchema,
      default: {},
    }, // Stores evaluation criteria (e.g., { MST: { totalMarks, weightage, questions } })
    csvFormat: {
      type: csvFormatSchema,
      default: {},
    },
    cloQuestionMappings: {
      type: [cloQuestionMappingSchema],
      default: [], // Stores mappings from CLO to questions/sub-parts
    },
  },
  { timestamps: true }
);

// Add index on subjectCode for faster lookups
subjectSchema.index({ subjectCode: 1 });

module.exports = mongoose.model('Subject', subjectSchema);