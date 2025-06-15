// controllers/subjectController.js
const Subject = require('../models/subjectModel');
const Batch = require('../models/batchModel');
const StudentMark = require('../models/studentMarkModel');

exports.getSubjectsByDepartment = async (req, res) => {
  try {
    const { department, subjectCode } = req.query;
    let query = {};
    if (subjectCode) query.subjectCode = subjectCode;
    else if (department) query.department = department;

    const subjects = await Subject.find(query).populate('coordinator');
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStudentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const isInstructor = subject.instructors.some((i) =>
      i.instructorId.equals(req.user._id)
    );
    const isCoordinator = subject.coordinator && subject.coordinator.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isCoordinator && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this subject' });
    }

    const students = isAdmin
      ? subject.instructors.flatMap((i) =>
          i.students.map((s) => ({ ...s, instructorId: i.instructorId }))
        )
      : subject.instructors.find((i) => i.instructorId.equals(req.user._id))?.students || [];

    const batches = await Batch.find({});
    const allStudents = batches.reduce((acc, batch) => {
      return acc.concat(
        batch.students.map((student) => ({
          ...student.toObject(),
          batchId: batch.batchId,
        }))
      );
    }, []);

    const detailedStudents = students.map((student) => {
      const fullStudent = allStudents.find((s) => s.rollNo === student.rollNo);
      return {
        ...fullStudent || { rollNo: student.rollNo, name: 'Unknown', department: 'Unknown' },
        instructorId: student.instructorId,
      };
    });

    res.status(200).json(detailedStudents);
  } catch (error) {
    console.error('Error fetching subject students:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getInstructorSubjectData = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId).populate('coordinator');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const isInstructor = subject.instructors.some((i) =>
      i.instructorId.equals(req.user._id)
    );
    if (!isInstructor) return res.status(403).json({ message: 'Not authorized to view this subject' });

    const marks = await StudentMark.find({ subjectId, instructorId: req.user._id });
    res.status(200).json({ subject, marks });
  } catch (error) {
    console.error('Error in getInstructorSubjectData:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.submitInstructorMarks = async (req, res) => {
  try {
    const { subjectId, marksData, evalCriteria } = req.body;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const instructorData = subject.instructors.find((i) =>
      i.instructorId.equals(req.user._id)
    );
    if (!instructorData) return res.status(403).json({ message: 'Not authorized to submit marks' });

    const assignedRollNos = instructorData.students.map((s) => s.rollNo);
    const validMarksData = marksData.filter((mark) => assignedRollNos.includes(mark.rollNo));

    for (const entry of validMarksData) {
      const { rollNo, data } = entry;
      console.log(`Saving marks for ${rollNo}:`, data); // Log data being saved
      const cloMarks = {};
      const cloTotals = {};

      if (!subject.evaluationSchema[evalCriteria]) {
        console.error(`Evaluation criterion ${evalCriteria} not found in schema`);
        continue;
      }

      const criteria = subject.evaluationSchema[evalCriteria];
      const weightage = (criteria.weightage || 100) / 100;
      const questions = criteria.questions || [];

      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            const key = `${evalCriteria}_Q${q.questionNo}_P${p.partNo}`;
            const mark = parseFloat(data[key]) || 0;
            const scaledMark = mark * weightage;

            // Look up CLO mappings from cloQuestionMappings
            const cloMappings = [];
            subject.cloQuestionMappings.forEach((cloMapping) => {
              const relevantMappings = cloMapping.mappings.filter(
                (m) =>
                  m.criteria === evalCriteria &&
                  m.questionNo === q.questionNo &&
                  m.partNo === p.partNo
              );
              relevantMappings.forEach((m) => {
                cloMappings.push(`CLO${cloMapping.cloNumber}`);
              });
            });

            cloMappings.forEach((clo) => {
              cloMarks[clo] = (cloMarks[clo] || 0) + scaledMark;
              cloTotals[clo] = (cloTotals[clo] || 0) + p.maxMarks * weightage;
            });
          });
        } else {
          const key = `${evalCriteria}_Q${q.questionNo}`;
          const mark = parseFloat(data[key]) || 0;
          const scaledMark = mark * weightage;

          // Look up CLO mappings from cloQuestionMappings
          const cloMappings = [];
          subject.cloQuestionMappings.forEach((cloMapping) => {
            const relevantMappings = cloMapping.mappings.filter(
              (m) =>
                m.criteria === evalCriteria &&
                m.questionNo === q.questionNo &&
                m.partNo === null
            );
            relevantMappings.forEach((m) => {
              cloMappings.push(`CLO${cloMapping.cloNumber}`);
            });
          });

          cloMappings.forEach((clo) => {
            cloMarks[clo] = (cloMarks[clo] || 0) + scaledMark;
            cloTotals[clo] = (cloTotals[clo] || 0) + q.maxMarks * weightage;
          });
        }
      });

      await StudentMark.updateOne(
        { subjectId, rollNo, instructorId: req.user._id, evalCriteria },
        {
          $set: {
            data,
            cloMarks,
            cloTotals,
            updatedAt: Date.now(),
          },
        },
        { upsert: true }
      );

      // Verify save by fetching back
      const savedMark = await StudentMark.findOne({
        subjectId,
        rollNo,
        instructorId: req.user._id,
        evalCriteria,
      });
      console.log(`Saved mark for ${rollNo}:`, savedMark);
    }
    res.status(200).json({ message: 'Marks submitted successfully' });
  } catch (error) {
    console.error('Error submitting marks:', error);
    res.status(500).json({ message: error.message });
  }
};

// New endpoint for real-time CLO calculation
exports.calculateCLOMarksRealTime = async (req, res) => {
  try {
    const { subjectId, marksData, evalCriteria } = req.body;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const instructorData = subject.instructors.find((i) =>
      i.instructorId.equals(req.user._id)
    );
    if (!instructorData) return res.status(403).json({ message: 'Not authorized' });

    if (!subject.evaluationSchema[evalCriteria]) {
      return res.status(400).json({ message: `Evaluation criterion ${evalCriteria} not found` });
    }

    const criteria = subject.evaluationSchema[evalCriteria];
    const weightage = (criteria.weightage || 100) / 100;
    const questions = criteria.questions || [];

    const calculatedMarks = marksData.map((entry) => {
      const { rollNo, data } = entry;
      const cloMarks = {};
      const cloTotals = {};
      let totalMarksAchieved = 0;

      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            const key = `${evalCriteria}_Q${q.questionNo}_P${p.partNo}`;
            const mark = parseFloat(data[key]) || 0;
            totalMarksAchieved += mark;
            const scaledMark = mark * weightage;

            // Look up CLO mappings from cloQuestionMappings
            const cloMappings = [];
            subject.cloQuestionMappings.forEach((cloMapping) => {
              const relevantMappings = cloMapping.mappings.filter(
                (m) =>
                  m.criteria === evalCriteria &&
                  m.questionNo === q.questionNo &&
                  m.partNo === p.partNo
              );
              relevantMappings.forEach((m) => {
                cloMappings.push(`CLO${cloMapping.cloNumber}`);
              });
            });

            cloMappings.forEach((clo) => {
              cloMarks[clo] = (cloMarks[clo] || 0) + scaledMark;
              cloTotals[clo] = (cloTotals[clo] || 0) + p.maxMarks * weightage;
            });
          });
        } else {
          const key = `${evalCriteria}_Q${q.questionNo}`;
          const mark = parseFloat(data[key]) || 0;
          totalMarksAchieved += mark;
          const scaledMark = mark * weightage;

          // Look up CLO mappings from cloQuestionMappings
          const cloMappings = [];
          subject.cloQuestionMappings.forEach((cloMapping) => {
            const relevantMappings = cloMapping.mappings.filter(
              (m) =>
                m.criteria === evalCriteria &&
                m.questionNo === q.questionNo &&
                m.partNo === null
            );
            relevantMappings.forEach((m) => {
              cloMappings.push(`CLO${cloMapping.cloNumber}`);
            });
          });

          cloMappings.forEach((clo) => {
            cloMarks[clo] = (cloMarks[clo] || 0) + scaledMark;
            cloTotals[clo] = (cloTotals[clo] || 0) + q.maxMarks * weightage;
          });
        }
      });

      // Ensure every CLO defined in the subject is returned, even if zero.
      if (subject.CLOs && subject.CLOs.length > 0) {
        subject.CLOs.forEach((clo) => {
          const key = `CLO${clo.cloNumber}`;
          if (cloMarks[key] === undefined) {
            cloMarks[key] = 0;
            cloTotals[key] = 0;
          }
        });
      }

      return {
        rollNo,
        data,
        cloMarks,
        cloTotals,
        totalMarks: totalMarksAchieved,
        totalMarksWeightage: totalMarksAchieved * weightage,
      };
    });

    res.status(200).json(calculatedMarks);
  } catch (error) {
    console.error('Error calculating CLO marks in real-time:', error);
    res.status(500).json({ message: error.message });
  }
};

// controllers/subjectController.js (updated generateCSVTemplate)
exports.generateCSVTemplate = async (req, res) => {
  try {
    const { subjectId, evalCriteria } = req.query;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const isInstructor = subject.instructors.some((i) =>
      i.instructorId.equals(req.user._id)
    );
    const isCoordinator = subject.coordinator && subject.coordinator.equals(req.user._id);
    if (!isInstructor && !isCoordinator) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const instructorData = subject.instructors.find((i) =>
      i.instructorId.equals(req.user._id)
    );
    const students = instructorData ? instructorData.students : [];

    // Build headers without appending the max marks in parentheses.
    const headers = ['RollNo', 'Student Name'];
    if (evalCriteria && subject.evaluationSchema[evalCriteria]) {
      const questions = subject.evaluationSchema[evalCriteria].questions || [];
      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            // Use a consistent key format without (maxMarks)
            headers.push(`${evalCriteria}_Q${q.questionNo}_P${p.partNo}`);
          });
        } else {
          headers.push(`${evalCriteria}_Q${q.questionNo}`);
        }
      });
    }
    // Append weightage columns, totals, and CLO headers.
    const cloHeaders = subject.CLOs.map((clo) => `CLO${clo.cloNumber}`);
    headers.push(
      ...headers.slice(2).map((h) => `${h}_Weightage`),
      'TotalMarks',
      'TotalMarks_Weightage',
      ...cloHeaders
    );

    let csvContent = headers.join(',') + '\n';
    students.forEach((student) => {
      const row = [student.rollNo, student.name || 'Unknown', ...Array(headers.length - 2).fill('')];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-disposition', `attachment; filename=${evalCriteria}_template.csv`);
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getInstructorSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({
      $or: [{ coordinator: req.user._id }, { 'instructors.instructorId': req.user._id }],
    }).populate('coordinator');

    const subjectsWithCount = subjects.map((subject) => {
      const instructorData = subject.instructors.find((i) =>
        i.instructorId.equals(req.user._id)
      );
      const studentsCount = instructorData ? instructorData.students.length : 0;
      return { ...subject.toObject(), studentsCount };
    });

    res.status(200).json(subjectsWithCount);
  } catch (error) {
    console.error('Error fetching instructor subjects:', error);
    res.status(500).json({ message: error.message });
  }
};