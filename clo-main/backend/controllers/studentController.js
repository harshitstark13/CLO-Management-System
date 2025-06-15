const Batch = require('../models/batchModel');

exports.getStudents = async (req, res) => {
  try {
    const batches = await Batch.find({});
    const students = batches.reduce((acc, batch) => {
      const batchStudents = batch.students.map(student => ({
        ...student.toObject(), // Convert Mongoose document to plain object
        batchId: batch.batchId // Add batchId to each student
      }));
      return acc.concat(batchStudents);
    }, []);
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// controllers/studentController.js
exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.find({}); // Remove projection to include all fields
    return res.status(200).json(batches);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};