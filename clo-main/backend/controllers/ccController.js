// controllers/ccController.js
const Subject = require('../models/subjectModel');
const Mark = require('../models/markModel');
const StudentMark = require('../models/studentMarkModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// Endpoint: Update CLOs, evaluation settings, CSV format, and CLO question mappings (accessible only by the CC)
exports.updateEvaluationSettings = async (req, res) => {
  try {
    const { subjectId, CLOs, evaluationSchema, csvFormat, cloQuestionMappings } = req.body;
    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.coordinator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: Only the CC can update settings' });
    }

    // Update fields
    subject.CLOs = CLOs || subject.CLOs;
    subject.evaluationSchema = evaluationSchema || subject.evaluationSchema;
    subject.csvFormat = csvFormat || subject.csvFormat;
    subject.cloQuestionMappings = cloQuestionMappings || subject.cloQuestionMappings;

    await subject.save();
    res.status(200).json({ message: 'Evaluation settings updated successfully', subject });
  } catch (error) {
    console.error('Error updating evaluation settings:', error);
    res.status(500).json({ message: error.message });
  }
};

// Endpoint: Upload Integrated Marks (for both mid-semester and end-semester integration)
exports.uploadIntegratedMarks = async (req, res) => {
  try {
    const marksArray = req.body.marks || [];
    for (let record of marksArray) {
      const { rollNo, subjectCode } = record;
      let markDoc = await Mark.findOne({ rollNo, subjectCode });
      if (!markDoc) {
        markDoc = new Mark(record);
      } else {
        Object.assign(markDoc, record);
      }
      await markDoc.save();
    }
    res.status(200).json({ message: 'Marks uploaded and integrated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Endpoint: Generate CSV Template for Instructor
exports.generateCSVTemplate = async (req, res) => {
  try {
    const { subjectId, evalCriteria } = req.query;
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const instructorData = subject.instructors.find((i) =>
      i.instructorId.equals(req.user._id)
    );
    if (!instructorData) {
      return res.status(403).json({ message: 'You are not an instructor for this subject' });
    }
    const students = instructorData.students || [];

    // Build headers: RollNo + question columns + CLO columns + TotalMarks.
    const headers = ['RollNo'];
    if (evalCriteria && subject.evaluationSchema[evalCriteria]) {
      const questions = subject.evaluationSchema[evalCriteria].questions || [];
      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            headers.push(`${evalCriteria}_Q${q.questionNo}_P${p.partNo}`);
          });
        } else {
          headers.push(`${evalCriteria}_Q${q.questionNo}`);
        }
      });
    }
    const cloKeys = subject.CLOs.map((clo) => `CLO${clo.cloNumber}`);
    headers.push(...cloKeys);
    headers.push('TotalMarks');

    let csvContent = headers.join(',') + '\n';
    students.forEach((student) => {
      const row = [student.rollNo, ...Array(headers.length - 1).fill('')];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-disposition', `attachment; filename=${evalCriteria}_template.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ message: error.message });
  }
};

// Endpoint: Get Instructor Submissions (for CC to view)
exports.getInstructorSubmissions = async (req, res) => {
  try {
    const { subjectId, evalCriteria } = req.query;
    const subject = await Subject.findById(subjectId).populate({
      path: 'instructors.instructorId',
      select: 'name',
    });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    if (!subject.coordinator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: Only the CC can view submissions' });
    }

    const submissions = await Promise.all(
      subject.instructors.map(async (instructorData) => {
        const instructorId = instructorData.instructorId._id;
        const instructorName = instructorData.instructorId.name;
        const marks = await StudentMark.find({ subjectId, instructorId, evalCriteria });
        const hasSubmitted = marks.length > 0;
        return {
          instructorId,
          instructorName,
          hasSubmitted,
          fileUrl: hasSubmitted
            ? `/api/cc/view-submission?subjectId=${subjectId}&instructorId=${instructorId}&evalCriteria=${evalCriteria}`
            : null,
        };
      })
    );

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching instructor submissions:', error);
    res.status(500).json({ message: error.message });
  }
};

// Endpoint: View Instructor Submission (for CC to download as CSV)
exports.viewInstructorSubmission = async (req, res) => {
  try {
    const { subjectId, instructorId, evalCriteria } = req.query;
    console.log('Viewing submission:', { subjectId, instructorId, evalCriteria });
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (!subject.coordinator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: Only the CC can view submissions' });
    }

    const marks = await StudentMark.find({
      subjectId,
      instructorId: new mongoose.Types.ObjectId(instructorId),
      evalCriteria,
    });
    console.log('Found marks:', marks.length);
    if (marks.length === 0) {
      return res.status(404).json({ message: 'No submission found for this instructor and criterion' });
    }

    // Build question keys based on the evaluation schema
    const criteria = subject.evaluationSchema[evalCriteria];
    if (!criteria || !criteria.questions) {
      return res.status(400).json({ message: 'Evaluation criterion not defined or has no questions' });
    }
    const questions = criteria.questions;
    const questionKeys = [];
    questions.forEach((q) => {
      if (q.parts && q.parts.length > 0) {
        q.parts.forEach((p) => {
          questionKeys.push(`${evalCriteria}_Q${q.questionNo}_P${p.partNo}`);
        });
      } else {
        questionKeys.push(`${evalCriteria}_Q${q.questionNo}`);
      }
    });
    const weightageKeys = questionKeys.map((key) => `${key}_Weightage`);
    const cloKeys = subject.CLOs.map((clo) => `CLO${clo.cloNumber}`);
    const scaledCloKeys = cloKeys.map((key) => `${key}_scaled`); // Add scaled CLO columns

    // Headers: RollNo, Student Name, questions, weightages, totals, CLOs, scaled CLOs
    const headers = [
      'RollNo',
      'Student Name',
      ...questionKeys,
      ...weightageKeys,
      'TotalMarks',
      'TotalMarks_Weightage',
      ...cloKeys,
      ...scaledCloKeys,
    ];
    let csvContent = headers.join(',') + '\n';

    marks.forEach((mark) => {
      let row = [];
      row.push(mark.rollNo || '');
      row.push(mark.data.get('Student Name') || '');

      // Add question marks
      questionKeys.forEach((key) => {
        const value = mark.data.get(key);
        row.push(value !== undefined && value !== null ? value : '');
      });

      // Add weightage values
      weightageKeys.forEach((wKey) => {
        const value = mark.data.get(wKey);
        row.push(value !== undefined && value !== null ? value : '');
      });

      // Add total marks and weighted total
      row.push(mark.data.get('TotalMarks') !== undefined ? mark.data.get('TotalMarks') : '');
      row.push(
        mark.data.get('TotalMarks_Weightage') !== undefined
          ? mark.data.get('TotalMarks_Weightage')
          : ''
      );

      // Add CLO marks from mark.data
      cloKeys.forEach((cKey) => {
        const value = mark.data.get(cKey);
        row.push(value !== undefined && value !== null ? value : 0);
      });

      // Add scaled CLO marks from mark.cloMarks
      scaledCloKeys.forEach((sKey) => {
        const cloKey = sKey.replace('_scaled', '');
        const value = mark.cloMarks.get(cloKey);
        row.push(value !== undefined && value !== null ? value : 0);
      });

      csvContent += row.join(',') + '\n';
    });

    console.log('Generated CSV:', csvContent);
    res.setHeader(
      'Content-disposition',
      `attachment; filename=${evalCriteria}_submission_${instructorId}.csv`
    );
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error viewing instructor submission:', error);
    res.status(500).json({ message: error.message });
  }
};

// Endpoint: Aggregate Submissions (for CC to download aggregated marks)
exports.aggregateSubmissions = async (req, res) => {
  try {
    const { subjectId, evalCriteria } = req.query;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (!subject.coordinator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: Only the CC can aggregate submissions' });
    }

    // Fetch marks for the given subject and evaluation criteria
    const marks = await StudentMark.find({ subjectId, evalCriteria });
    console.log('Fetched marks for aggregation:', marks);
    if (marks.length === 0)
      return res.status(404).json({ message: 'No submissions found for this criterion' });

    // Extract questions from the evaluation schema
    const criteria = subject.evaluationSchema[evalCriteria] || {};
    const questions = criteria.questions || [];
    const questionKeys = [];
    questions.forEach((q) => {
      if (q.parts && q.parts.length > 0) {
        q.parts.forEach((p) => {
          questionKeys.push(`${evalCriteria}_Q${q.questionNo}_P${p.partNo}`);
        });
      } else {
        questionKeys.push(`${evalCriteria}_Q${q.questionNo}`);
      }
    });
    const weightageKeys = questionKeys.map((key) => `${key}_Weightage`);
    const cloKeys = subject.CLOs.map((clo) => `CLO${clo.cloNumber}`);

    // Define CSV headers
    const headers = [
      'RollNo',
      'Student Name',
      ...questionKeys,
      ...weightageKeys,
      'TotalMarks',
      'TotalMarks_Weightage',
      ...cloKeys,
    ];
    let csvContent = headers.join(',') + '\n';

    // Aggregate marks by roll number
    const aggregatedMarks = new Map();
    marks.forEach((mark) => {
      const dataObj = {};
      dataObj['Student Name'] = mark.data.get('Student Name') || '';
      questionKeys.forEach((key) => {
        dataObj[key] =
          mark.data.get(key) !== undefined && mark.data.get(key) !== null
            ? mark.data.get(key)
            : '';
      });
      weightageKeys.forEach((wKey) => {
        dataObj[wKey] =
          mark.data.get(wKey) !== undefined && mark.data.get(wKey) !== null
            ? mark.data.get(wKey)
            : '';
      });
      dataObj['TotalMarks'] =
        mark.data.get('TotalMarks') !== undefined && mark.data.get('TotalMarks') !== null
          ? mark.data.get('TotalMarks')
          : '';
      dataObj['TotalMarks_Weightage'] =
        mark.data.get('TotalMarks_Weightage') !== undefined &&
        mark.data.get('TotalMarks_Weightage') !== null
          ? mark.data.get('TotalMarks_Weightage')
          : '';
      cloKeys.forEach((cKey) => {
        dataObj[cKey] =
          mark.data.get(cKey) !== undefined && mark.data.get(cKey) !== null
            ? mark.data.get(cKey)
            : 0;
      });

      aggregatedMarks.set(mark.rollNo, {
        rollNo: mark.rollNo,
        data: dataObj,
      });
    });

    // Generate CSV rows from aggregated marks
    aggregatedMarks.forEach((aggMark) => {
      const row = [
        aggMark.rollNo,
        aggMark.data['Student Name'],
        ...questionKeys.map((key) => aggMark.data[key]),
        ...weightageKeys.map((wKey) => aggMark.data[wKey]),
        aggMark.data['TotalMarks'],
        aggMark.data['TotalMarks_Weightage'],
        ...cloKeys.map((cKey) => aggMark.data[cKey]),
      ];
      csvContent += row.join(',') + '\n';
    });

    console.log('Aggregated CSV:', csvContent);
    res.setHeader('Content-disposition', `attachment; filename=${evalCriteria}_aggregated.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error aggregating submissions:', error);
    res.status(500).json({ message: error.message });
  }
};