const User = require('../models/userModel');
const Subject = require('../models/subjectModel');
const Batch = require('../models/batchModel');
const bcrypt = require('bcryptjs');
const Department = require('../models/departmentModel');
const mongoose = require('mongoose');
exports.getAllTeachers = async (req, res) => {
  try {
    // Fetch all users with the instructor role
    const teachers = await User.find({ role: 'instructor' });
    return res.status(200).json(teachers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Update teacher fields from the request body
    teacher.name = req.body.name || teacher.name;
    teacher.department = req.body.department || teacher.department;
    teacher.role = req.body.role || teacher.role;
    // coordinatorFor holds the subject code if the teacher is assigned as CC for a subject.
    teacher.coordinatorFor = req.body.coordinatorFor || null;

    await teacher.save();

    res.status(200).json({ message: 'Teacher updated successfully', teacher });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// controllers/adminController.js
exports.assignSubjects = async (req, res) => {
  try {
    const { teacherId, subjectCode, isCoordinator } = req.body;

    // Validate input
    if (!teacherId || !subjectCode) {
      return res.status(400).json({ message: 'Teacher ID and Subject Code are required' });
    }

    // Validate teacherId as a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: 'Invalid Teacher ID' });
    }

    // Find the teacher
    const user = await User.findById(teacherId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user's assignedSubjects if not already assigned
    if (!user.assignedSubjects.some((s) => s.subjectCode === subjectCode)) {
      user.assignedSubjects.push({ subjectCode, isCoordinator: !!isCoordinator });
    } else if (isCoordinator !== undefined) {
      // Update coordinator status if already assigned
      user.assignedSubjects = user.assignedSubjects.map((s) =>
        s.subjectCode === subjectCode ? { ...s, isCoordinator: !!isCoordinator } : s
      );
    }
    await user.save();

    // Update Subject's instructors array
    const subject = await Subject.findOne({ subjectCode });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Add instructor if not already included
    if (!subject.instructors.some((i) => i.instructorId.toString() === teacherId)) {
      subject.instructors.push({
        instructorId: teacherId, // Explicitly set instructorId
        students: [], // Initialize empty students array
      });
    } else if (isCoordinator !== undefined) {
      // Update existing instructor entry if coordinator status changes
      subject.instructors = subject.instructors.map((i) =>
        i.instructorId.toString() === teacherId ? { ...i, isCoordinator: !!isCoordinator } : i
      );
    }

    // Update coordinator if isCoordinator is true
    if (isCoordinator) {
      subject.coordinator = teacherId;
    } else if (subject.coordinator && subject.coordinator.toString() === teacherId && !isCoordinator) {
      subject.coordinator = null; // Remove coordinator if isCoordinator is false
    }

    await subject.save();

    return res.status(200).json({ message: 'Subject assigned successfully.' });
  } catch (error) {
    console.error('Error in assignSubjects:', error);
    return res.status(500).json({ message: error.message });
  }
};

// NEW: Get instructors by department
// controllers/adminController.js
exports.getInstructorsByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    const query = { role: 'instructor' };
    if (department) query.department = department;
    const instructors = await User.find(query);
    return res.status(200).json(instructors);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
exports.assignStudentsToInstructor = async (req, res) => {
  try {
    const { subjectId, instructorId, rollNos } = req.body;
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    let instructorData = subject.instructors.find(i => i.instructorId.equals(instructorId));
    if (!instructorData) {
      instructorData = { instructorId, students: [] };
      subject.instructors.push(instructorData);
    }

    instructorData.students = rollNos.map(rollNo => ({ rollNo }));
    await subject.save();
    res.status(200).json({ message: 'Students assigned successfully', subject });
  } catch (error) {
    console.error('Error assigning students:', error);
    res.status(500).json({ message: error.message });
  }
};


// controllers/adminController.js
exports.uploadStudentTagging = async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty CSV data' });
    }

    const errors = [];
    const validAssignments = [];

    for (const [index, row] of csvData.entries()) {
      const { RollNo, SubjectCode, InstructorId } = row;

      // Validate required fields
      if (!RollNo || !SubjectCode || !InstructorId) {
        errors.push(`Row ${index + 1}: Missing required fields (RollNo, SubjectCode, InstructorId)`);
        continue;
      }

      // Validate student existence
      const batch = await Batch.findOne({ 'students.rollNo': RollNo });
      if (!batch) {
        errors.push(`Row ${index + 1}: Student ${RollNo} not found`);
        continue;
      }

      // Validate subject existence
      const subject = await Subject.findOne({ subjectCode: SubjectCode });
      if (!subject) {
        errors.push(`Row ${index + 1}: Subject ${SubjectCode} not found`);
        continue;
      }

      // Validate instructor existence and role
      const instructor = await User.findById(InstructorId);
      if (!instructor || instructor.role !== 'instructor') {
        errors.push(`Row ${index + 1}: Instructor ${InstructorId} not found or invalid`);
        continue;
      }

      // Check if instructor is assigned to the subject
      if (!instructor.assignedSubjects.some(s => s.subjectCode === SubjectCode)) {
        errors.push(`Row ${index + 1}: Instructor ${instructor.name} not assigned to ${SubjectCode}`);
        continue;
      }

      // Check for duplicate assignment in the same subject
      const existingAssignment = subject.instructors.find(i => 
        i.students.some(s => s.rollNo === RollNo) && i.instructorId.toString() !== InstructorId
      );
      if (existingAssignment) {
        errors.push(`Row ${index + 1}: Student ${RollNo} already assigned to another instructor for ${SubjectCode}`);
        continue;
      }

      validAssignments.push({ RollNo, SubjectCode, InstructorId });
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: 'CSV contains errors', errors });
    }

    // Process valid assignments
    for (const { RollNo, SubjectCode, InstructorId } of validAssignments) {
      const subject = await Subject.findOne({ subjectCode: SubjectCode });
      let instructorData = subject.instructors.find(i => i.instructorId.toString() === InstructorId);
      if (!instructorData) {
        instructorData = { instructorId: InstructorId, students: [] };
        subject.instructors.push(instructorData);
      }
      if (!instructorData.students.some(s => s.rollNo === RollNo)) {
        instructorData.students.push({ rollNo: RollNo });
      }
      await subject.save();
    }

    res.status(200).json({ message: 'Students tagged successfully' });
  } catch (error) {
    console.error('Error uploading student tagging:', error);
    res.status(500).json({ message: error.message });
  }
};

// NEW: Generate CSV Template for Tagging
exports.generateTaggingTemplate = async (req, res) => {
  try {
    const batches = await Batch.find({});
    const subjects = await Subject.find({});
    const instructors = await User.find({ role: 'instructor' });

    const headers = ['RollNo', 'SubjectCode', 'InstructorId'];
    let csvContent = headers.join(',') + '\n';

    // Optionally pre-fill with sample data or leave blank for admins to fill
    batches.forEach(batch => {
      batch.students.forEach(student => {
        csvContent += `${student.rollNo},,\n`; // Leave SubjectCode and InstructorId blank
      });
    });

    res.setHeader('Content-disposition', 'attachment; filename=student_tagging_template.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating tagging template:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.assignBatchToTeacher = async (req, res) => {
  try {
    const { batchId, subjectCode, instructorId } = req.body;
    if (!batchId || !subjectCode || !instructorId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      return res.status(404).json({ message: `Batch ${batchId} not found` });
    }

    const subject = await Subject.findOne({ subjectCode });
    if (!subject) {
      return res.status(404).json({ message: `Subject ${subjectCode} not found` });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ message: `Instructor ${instructorId} not found or invalid` });
    }

    if (!instructor.assignedSubjects.some(s => s.subjectCode === subjectCode)) {
      return res.status(403).json({ message: `Instructor ${instructor.name} not assigned to ${subjectCode}` });
    }

    let instructorData = subject.instructors.find(i => i.instructorId.toString() === instructorId);
    if (!instructorData) {
      instructorData = { instructorId, students: [] };
      subject.instructors.push(instructorData);
    }

    batch.students.forEach(student => {
      if (!instructorData.students.some(s => s.rollNo === student.rollNo)) {
        instructorData.students.push({ rollNo: student.rollNo });
      }
    });

    await subject.save();
    res.status(200).json({ message: `Batch ${batchId} assigned to ${instructor.name} for ${subjectCode}` });
  } catch (error) {
    console.error('Error assigning batch:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.assignStudentToTeacher = async (req, res) => {
  try {
    const { rollNo, subjectCode, instructorId } = req.body;
    if (!rollNo || !subjectCode || !instructorId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const subject = await Subject.findOne({ subjectCode });
    if (!subject) {
      return res.status(404).json({ message: `Subject ${subjectCode} not found` });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      return res.status(404).json({ message: `Instructor ${instructorId} not found or invalid` });
    }

    if (!instructor.assignedSubjects.some(s => s.subjectCode === subjectCode)) {
      return res.status(403).json({ message: `Instructor ${instructor.name} not assigned to ${subjectCode}` });
    }

    const existingAssignment = subject.instructors.find(i => 
      i.students.some(s => s.rollNo === rollNo) && i.instructorId.toString() !== instructorId
    );
    if (existingAssignment) {
      return res.status(400).json({ message: `Student ${rollNo} already assigned to another instructor for ${subjectCode}` });
    }

    let instructorData = subject.instructors.find(i => i.instructorId.toString() === instructorId);
    if (!instructorData) {
      instructorData = { instructorId, students: [] };
      subject.instructors.push(instructorData);
    }

    if (!instructorData.students.some(s => s.rollNo === rollNo)) {
      instructorData.students.push({ rollNo });
    }

    await subject.save();
    res.status(200).json({ message: `Student ${rollNo} assigned to ${instructor.name} for ${subjectCode}` });
  } catch (error) {
    console.error('Error assigning student:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.removeStudentAssignment = async (req, res) => {
  try {
    const { rollNo, subjectCode, instructorId } = req.body;
    if (!rollNo || !subjectCode || !instructorId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const subject = await Subject.findOne({ subjectCode });
    if (!subject) {
      return res.status(404).json({ message: `Subject ${subjectCode} not found` });
    }

    const instructorData = subject.instructors.find(i => i.instructorId.toString() === instructorId);
    if (!instructorData) {
      return res.status(404).json({ message: `Instructor ${instructorId} not assigned to ${subjectCode}` });
    }

    const studentIndex = instructorData.students.findIndex(s => s.rollNo === rollNo);
    if (studentIndex === -1) {
      return res.status(404).json({ message: `Student ${rollNo} not assigned to this instructor for ${subjectCode}` });
    }

    instructorData.students.splice(studentIndex, 1);
    await subject.save();
    res.status(200).json({ message: `Student ${rollNo} removed from ${subjectCode} under instructor ${instructorId}` });
  } catch (error) {
    console.error('Error removing student assignment:', error);
    res.status(500).json({ message: error.message });
  }
};


// Add Teacher
exports.addTeacher = async (req, res) => {
  try {
    const { name, role, department, email, coordinatorFor, assignedSubjects } = req.body;
    if (!name || !role || !department || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingTeacher = await User.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const teacher = new User({
      name,
      role,
      department,
      email,
      coordinatorFor: coordinatorFor || null,
      assignedSubjects: assignedSubjects || [],
      password: await bcrypt.hash('default123', 10), // Default password, should be changed by user
    });

    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await User.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await User.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}, 'name'); // Fetch only names
    res.status(200).json(departments.map(d => d.name));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const existingDept = await Department.findOne({ name });
    if (existingDept) {
      return res.status(400).json({ message: 'Department already exists' });
    }
    const department = new Department({ name });
    await department.save();
    res.status(201).json({ name });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params; // Expecting department name as ID
    const department = await Department.findOne({ name: id });
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    await Department.deleteOne({ name: id });
    await Subject.deleteMany({ department: id });
    await User.updateMany({ department: id }, { $set: { department: null } });
    res.status(200).json({ message: 'Department and its subjects deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add Subject (New endpoint)
exports.addSubject = async (req, res) => {
  try {
    const { subjectName, subjectCode, department } = req.body;
    if (!subjectName || !subjectCode || !department) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingSubject = await Subject.findOne({ subjectCode });
    if (existingSubject) {
      return res.status(400).json({ message: 'Subject code already exists' });
    }
    const subject = new Subject({
      subjectName,
      subjectCode,
      department,
      instructors: [],
      coordinator: null,
    });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Delete Department (Updated to cascade delete subjects)
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params; // Expecting department name as ID
    // Delete all subjects in this department
    await Subject.deleteMany({ department: id });
    // Optionally, update users to remove department reference
    await User.updateMany({ department: id }, { $set: { department: null } });
    res.status(200).json({ message: 'Department and its subjects deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Subject (New endpoint)
exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    await Subject.deleteOne({ _id: id });
    // Clean up references in User model
    await User.updateMany(
      { 'assignedSubjects.subjectCode': subject.subjectCode },
      { $pull: { assignedSubjects: { subjectCode: subject.subjectCode } } }
    );
    await User.updateMany(
      { coordinatorFor: subject.subjectCode },
      { $set: { coordinatorFor: null } }
    );
    res.status(200).json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: error.message });
  }
};