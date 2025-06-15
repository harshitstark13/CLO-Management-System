// scripts/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/userModel');
const Batch = require('../models/batchModel');
const Subject = require('../models/subjectModel');

const DEPARTMENTS = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT'];
const deptPrefix = { CSE: 'CS', ECE: 'ECE', ME: 'ME', CE: 'CE', EE: 'EE', IT: 'IT' };

// Fixed Indian names for teachers (8 per dept, 48 total)
const teacherNames = [
  // CSE
  'Aarav Sharma', 'Priya Patel', 'Rohan Gupta', 'Neha Verma', 'Vikram Singh', 'Anjali Nair', 'Kiran Rao', 'Pooja Joshi',
  // ECE
  'Suresh Kumar', 'Meera Reddy', 'Rahul Malhotra', 'Kavita Thakur', 'Arjun Das', 'Sneha Bhat', 'Deepak Iyer', 'Shalini Chopra',
  // ME
  'Nikhil Saxena', 'Tara Pillai', 'Amit Kapoor', 'Riya Mehta', 'Sanjay Yadav', 'Divya Bose', 'Manish Jain', 'Jyoti Sen',
  // CE
  'Vivek Rawat', 'Aditya Desai', 'Simran Kaur', 'Prakash Rana', 'Lakshmi Shetty', 'Kunal Shah', 'Amit Sharma', 'Bhavna Patel',
  // EE
  'Chetan Gupta', 'Deepika Verma', 'Esha Singh', 'Farhan Nair', 'Gauri Rao', 'Harsh Joshi', 'Isha Kumar', 'Jatin Reddy',
  // IT
  'Komal Malhotra', 'Lalit Thakur', 'Mansi Das', 'Naveen Bhat', 'Ojas Iyer', 'Poonam Chopra', 'Qasim Saxena', 'Ritu Pillai'
];

// Fixed Indian names for students (90 per batch, truncated for brevity, repeat pattern as needed)
const studentNames = [
  'Amit Sharma', 'Bhavna Patel', 'Chetan Gupta', 'Deepika Verma', 'Esha Singh', 'Farhan Nair', 'Gauri Rao', 'Harsh Joshi',
  'Isha Kumar', 'Jatin Reddy', 'Komal Malhotra', 'Lalit Thakur', 'Mansi Das', 'Naveen Bhat', 'Ojas Iyer', 'Poonam Chopra',
  'Qasim Saxena', 'Ritu Pillai', 'Sameer Kapoor', 'Tanya Mehta', 'Uday Yadav', 'Vinita Bose', 'Wasim Jain', 'Xavier Sen',
  'Yash Rajput', 'Zara Khan', 'Aditi Sharma', 'Bharat Patel', 'Chirag Gupta', 'Divya Verma', 'Ekta Singh', 'Faisal Nair',
  'Geeta Rao', 'Hitesh Joshi', 'Indu Kumar', 'Javed Reddy', 'Kiran Malhotra', 'Lata Thakur', 'Mohit Das', 'Nidhi Bhat',
  'Om Iyer', 'Preeti Chopra', 'Rahim Saxena', 'Sana Pillai', 'Tarun Kapoor', 'Uma Mehta', 'Vijay Yadav', 'Wendy Bose',
  'Xena Jain', 'Yogesh Sen', 'Zain Rawat', 'Ankit Desai', 'Bindu Kaur', 'Chandan Rana', 'Diya Shetty', 'Eshan Shah',
  'Firoz Sharma', 'Gopal Patel', 'Hina Gupta', 'Irfan Verma', 'Juhi Singh', 'Kabir Nair', 'Leela Rao', 'Mahesh Joshi',
  'Nisha Kumar', 'Omar Reddy', 'Padmini Malhotra', 'Qadir Thakur', 'Rekha Das', 'Sachin Bhat', 'Tina Iyer', 'Umesh Chopra',
  'Vani Saxena', 'Waqar Pillai', 'Yamini Kapoor', 'Zaid Mehta', 'Arun Yadav', 'Bina Bose', 'Chitra Jain', 'Dhruv Sen',
  'Eshita Rawat', 'Fahad Desai', 'Gita Kaur', 'Hari Rana', 'Ila Shetty', 'Jai Shah'
];

async function seed() {
  try {
    await connectDB();
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Batch.deleteMany({});
    await Subject.deleteMany({});

    // 1. Create ONE Admin User
    console.log('Seeding Admin User...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'Admin User',
      role: 'admin',
      department: 'Administration',
      coordinatorFor: null,
      assignedSubjects: [],
      email: 'admin@example.com',
      password: adminPassword,
    });
    await adminUser.save();

    // 2. Create Fixed Instructors (8 per department = 48 total)
    console.log('Seeding Instructors...');
    const teachersToInsert = [];
    let teacherCounter = 1;
    for (let i = 0; i < DEPARTMENTS.length * 8; i++) {
      const deptIndex = Math.floor(i / 8);
      const dept = DEPARTMENTS[deptIndex];
      const teacherName = teacherNames[i];
      const teacherEmail = `teacher${teacherCounter}@example.com`;
      const teacherPassword = await bcrypt.hash('teacher123', 10);
      teachersToInsert.push({
        name: teacherName,
        role: 'instructor',
        department: dept,
        coordinatorFor: null,
        assignedSubjects: [],
        email: teacherEmail,
        password: teacherPassword,
      });
      teacherCounter++;
    }
    const teachers = await User.insertMany(teachersToInsert);

    // 3. Create Fixed Subjects (5 per department = 30 total)
    console.log('Seeding Subjects...');
    const subjectsToInsert = [];
    for (const dept of DEPARTMENTS) {
      for (let i = 1; i <= 5; i++) {
        subjectsToInsert.push({
          subjectName: `${dept} Subject ${i}`,
          subjectCode: `${deptPrefix[dept]}${100 + i}`,
          department: dept,
          instructors: [],
          coordinator: null,
          CLOs: [],
          evaluationSchema: {},
        });
      }
    }
    const subjects = await Subject.insertMany(subjectsToInsert);

    // 4. Assign Teachers to Subjects Deterministically
    console.log('Assigning Teachers to Subjects...');
    const teachersByDept = {};
    DEPARTMENTS.forEach((dept) => {
      teachersByDept[dept] = teachers.filter((t) => t.department === dept);
    });

    const ccAssigned = new Set(); // Track teachers assigned as CC

    // Step 1: Assign each subject a CC (first 5 teachers) and initial instructors
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const deptTeachers = teachersByDept[subject.department];
      const ccIndex = i % 5; // Use first 5 teachers as CCs (0-4)

      // Assign coordinator
      const coordinator = deptTeachers[ccIndex];
      if (ccAssigned.has(coordinator._id.toString())) {
        throw new Error(`Coordinator already assigned for ${coordinator.name}`);
      }
      ccAssigned.add(coordinator._id.toString());
      subject.coordinator = coordinator._id;
      coordinator.coordinatorFor = subject.subjectCode;
      coordinator.assignedSubjects.push({ subjectCode: subject.subjectCode, isCoordinator: true });

      // Assign 3 instructors (CC + 2 others, including non-CC teachers)
      const instructorIndices = [
        ccIndex,              // CC
        (ccIndex + 5) % 8,    // First non-CC teacher (5, 6, or 7)
        (ccIndex + 6) % 8,    // Second non-CC teacher (6, 7, or 5)
      ];
      subject.instructors = instructorIndices.map((idx) => ({
        instructorId: deptTeachers[idx]._id,
        students: [], // Students to be tagged via CSV
      }));

      for (const idx of instructorIndices) {
        const teacher = deptTeachers[idx];
        if (!teacher._id.equals(coordinator._id)) {
          teacher.assignedSubjects.push({ subjectCode: subject.subjectCode, isCoordinator: false });
        }
      }

      await subject.save();
    }

    // Step 2: Ensure every teacher has at least 2 subjects
    for (const dept of DEPARTMENTS) {
      const deptTeachers = teachersByDept[dept];
      const deptSubjects = subjects.filter((s) => s.department === dept);

      for (let t = 0; t < deptTeachers.length; t++) {
        const teacher = deptTeachers[t];
        while (teacher.assignedSubjects.length < 2) {
          const availableSubject = deptSubjects.find(
            (s) =>
              !teacher.assignedSubjects.some((as) => as.subjectCode === s.subjectCode) &&
              !s.instructors.some((i) => i.instructorId.equals(teacher._id))
          );
          if (availableSubject) {
            teacher.assignedSubjects.push({
              subjectCode: availableSubject.subjectCode,
              isCoordinator: false,
            });
            availableSubject.instructors.push({
              instructorId: teacher._id,
              students: [],
            });
            await availableSubject.save();
          } else {
            console.warn(`No more subjects available for ${teacher.name} in ${dept}`);
            break;
          }
        }
        await teacher.save();
      }
    }

    // 5. Create Batches with Fixed Students
    console.log('Seeding Batches with Students...');
    const batchesToInsert = [];
    for (const dept of DEPARTMENTS) {
      for (let b = 1; b <= 5; b++) {
        const batchId = `${dept.toLowerCase()}${b}`;
        const students = [];
        const nameOffset = (DEPARTMENTS.indexOf(dept) * 5 + (b - 1)) * 90; // Unique offset per batch
        for (let s = 1; s <= 90; s++) {
          const rollNo = `${batchId}-${s}`;
          const studentName = studentNames[(nameOffset + s - 1) % studentNames.length]; // Cycle through names
          students.push({
            rollNo,
            name: studentName,
            department: dept,
          });
        }
        batchesToInsert.push({
          batchId,
          department: dept,
          students,
        });
      }
    }
    await Batch.insertMany(batchesToInsert);

    // Verification
    console.log('Verifying assignments...');
    for (const teacher of teachers) {
      console.log(
        `${teacher.name} (${teacher.department}): ${teacher.assignedSubjects.length} subjects, CC: ${
          teacher.coordinatorFor || 'None'
        }`
      );
      if (teacher.assignedSubjects.length < 2) {
        console.warn(`${teacher.name} has fewer than 2 subjects!`);
      }
    }

    console.log('Seeding completed successfully!');
    console.log(`Total teachers: ${teachers.length}, Total subjects: ${subjects.length}, Total CCs assigned: ${ccAssigned.size}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();