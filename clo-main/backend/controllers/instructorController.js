const User = require('../models/userModel');
const Mark = require('../models/markModel');
const Subject = require('../models/subjectModel');

exports.getSubjects = async (req, res) => {
  try {
    // req.user is set by protect() middleware
    const user = req.user;
    // Extract subject codes from the assignedSubjects array of the user
    const subjectCodes = user.assignedSubjects.map((s) => s.subjectCode);
    // Find subjects matching these codes and populate the coordinator field
    const subjects = await Subject.find({ subjectCode: { $in: subjectCodes } })
      .populate('coordinator');
    return res.status(200).json(subjects);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.uploadMarks = async (req, res) => {
  try {
    /* 
      Suppose req.body contains an array of marks:
      [
        { rollNo, subjectCode, MSTQ1, MSTQ2, ... },
        ...
      ]
    */
    const marksArray = req.body.marks || [];
    for (let record of marksArray) {
      const { rollNo, subjectCode } = record;
      // Find or create Mark doc
      let markDoc = await Mark.findOne({ rollNo, subjectCode });
      if (!markDoc) {
        markDoc = new Mark(record);
      } else {
        Object.assign(markDoc, record); // update existing fields
      }
      await markDoc.save();
    }
    return res.status(200).json({ message: 'Marks uploaded successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
