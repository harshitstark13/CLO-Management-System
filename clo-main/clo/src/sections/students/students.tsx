// src/pages/StudentsPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { AuthContext } from 'src/context/AuthContext';

export default function StudentsPage() {
  const { token } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [openRemoveModal, setOpenRemoveModal] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [batches, setBatches] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch students
      const studentsResponse = await axios.get('http://localhost:5001/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentData = studentsResponse.data;
      setStudents(studentData);
      setBatches([...new Set(studentData.map(s => s.batchId))]);

      // Fetch teachers
      const teachersResponse = await axios.get('http://localhost:5001/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(teachersResponse.data);

      // Fetch subjects and assignments in one go
      const subjectsResponse = await axios.get('http://localhost:5001/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subjectData = subjectsResponse.data;
      setSubjects(subjectData);

      // Fetch assignments for all subjects efficiently
      const assignmentPromises = subjectData.map(subject =>
        axios.get(`http://localhost:5001/api/subjects/${subject._id}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })) // Handle individual failures gracefully
      );
      const assignmentResponses = await Promise.all(assignmentPromises);
      const allAssignments = assignmentResponses.flatMap((res, idx) =>
        res.data.map(student => ({
          rollNo: student.rollNo,
          subjectCode: subjectData[idx].subjectCode,
          instructorId: student.instructorId || 'Unknown', // Assuming this comes from backend
          instructorName: teachersResponse.data.find(t => t._id === student.instructorId)?.name || 'Unknown',
        }))
      );
      setAssignments(allAssignments);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const handleSearch = (event) => setSearch(event.target.value);

  const filteredStudents = students.filter(
    (student) =>
      (student.name ? student.name.toLowerCase() : '').includes(search.toLowerCase()) &&
      (filterBatch ? student.batchId === filterBatch : true) &&
      (filterTeacher ? assignments.some(a => a.rollNo === student.rollNo && a.instructorId === filterTeacher) : true)
  );

  const handleOpenAssignModal = (student) => {
    setSelectedStudent(student);
    setOpenAssignModal(true);
    // Pre-populate if student has an assignment
    const existingAssignment = assignments.find(a => a.rollNo === student.rollNo);
    setSelectedTeacher(existingAssignment ? existingAssignment.instructorId : '');
    setSelectedSubject(existingAssignment ? existingAssignment.subjectCode : '');
  };

  const handleCloseAssignModal = () => {
    setOpenAssignModal(false);
    setSelectedStudent(null);
    setSelectedTeacher('');
    setSelectedSubject('');
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent || !selectedTeacher || !selectedSubject) {
      alert('Please select a teacher and subject');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5001/api/admin/assign-student',
        {
          rollNo: selectedStudent.rollNo,
          subjectCode: selectedSubject,
          instructorId: selectedTeacher,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Student assigned successfully');
      const subject = subjects.find(s => s.subjectCode === selectedSubject);
      const response = await axios.get(`http://localhost:5001/api/subjects/${subject._id}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newAssignment = {
        rollNo: selectedStudent.rollNo,
        subjectCode: selectedSubject,
        instructorId: selectedTeacher,
        instructorName: teachers.find(t => t._id === selectedTeacher)?.name || 'Unknown',
      };
      setAssignments(prev => [...prev.filter(a => a.rollNo !== selectedStudent.rollNo || a.subjectCode !== selectedSubject), newAssignment]);
      handleCloseAssignModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign student');
    }
  };

  const handleOpenRemoveModal = (student) => {
    setSelectedStudent(student);
    setOpenRemoveModal(true);
    setSelectedTeacher('');
    setSelectedSubject('');
  };

  const handleCloseRemoveModal = () => {
    setOpenRemoveModal(false);
    setSelectedStudent(null);
    setSelectedTeacher('');
    setSelectedSubject('');
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent || !selectedTeacher || !selectedSubject) {
      alert('Please select a teacher and subject to remove');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5001/api/admin/remove-student',
        {
          rollNo: selectedStudent.rollNo,
          subjectCode: selectedSubject,
          instructorId: selectedTeacher,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Student assignment removed successfully');
      setAssignments(prev => prev.filter(a => 
        !(a.rollNo === selectedStudent.rollNo && a.subjectCode === selectedSubject && a.instructorId === selectedTeacher)
      ));
      handleCloseRemoveModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove assignment');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Students
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search Students"
          variant="outlined"
          value={search}
          onChange={handleSearch}
          size="small"
          sx={{ width: '300px' }}
        />
        <FormControl sx={{ width: '200px' }}>
          <InputLabel id="batch-filter-label">Filter by Batch</InputLabel>
          <Select
            labelId="batch-filter-label"
            value={filterBatch}
            label="Filter by Batch"
            onChange={(e) => setFilterBatch(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {batches.map((batch) => (
              <MenuItem key={batch} value={batch}>{batch}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ width: '200px' }}>
          <InputLabel id="teacher-filter-label">Filter by Teacher</InputLabel>
          <Select
            labelId="teacher-filter-label"
            value={filterTeacher}
            label="Filter by Teacher"
            onChange={(e) => setFilterTeacher(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {teachers.map((teacher) => (
              <MenuItem key={teacher._id} value={teacher._id}>{teacher.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => { setSearch(''); setFilterBatch(''); setFilterTeacher(''); }}>
          Reset
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Roll No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Batch</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Assignments</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.rollNo}>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.department}</TableCell>
                    <TableCell>{student.batchId}</TableCell>
                    <TableCell>
                      {assignments
                        .filter(a => a.rollNo === student.rollNo)
                        .map(a => `${a.subjectCode} (${a.instructorName})`)
                        .join(', ') || 'None'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleOpenAssignModal(student)}
                        >
                          Assign
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleOpenRemoveModal(student)}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No students found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assign Student Modal */}
      <Dialog open={openAssignModal} onClose={handleCloseAssignModal} fullWidth maxWidth="sm">
        <DialogTitle>Assign {selectedStudent?.name} to Teacher</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="teacher-select-label">Select Teacher</InputLabel>
              <Select
                labelId="teacher-select-label"
                value={selectedTeacher}
                label="Select Teacher"
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {teachers
                  .filter(t => t.department === selectedStudent?.department)
                  .map((teacher) => (
                    <MenuItem key={teacher._id} value={teacher._id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="subject-select-label">Select Subject</InputLabel>
              <Select
                labelId="subject-select-label"
                value={selectedSubject}
                label="Select Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedTeacher}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {selectedTeacher &&
                  teachers.find(t => t._id === selectedTeacher)?.assignedSubjects.map((subj) => (
                    <MenuItem key={subj.subjectCode} value={subj.subjectCode}>
                      {subjects.find(s => s.subjectCode === subj.subjectCode)?.subjectName} ({subj.subjectCode})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignModal}>Cancel</Button>
          <Button onClick={handleAssignStudent} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Student Assignment Modal */}
      <Dialog open={openRemoveModal} onClose={handleCloseRemoveModal} fullWidth maxWidth="sm">
        <DialogTitle>Remove Assignment for {selectedStudent?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="teacher-remove-label">Select Teacher</InputLabel>
              <Select
                labelId="teacher-remove-label"
                value={selectedTeacher}
                label="Select Teacher"
                onChange={(e) => setSelectedTeacher(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {assignments
                  .filter(a => a.rollNo === selectedStudent?.rollNo)
                  .map(a => ({
                    id: a.instructorId,
                    name: a.instructorName
                  }))
                  .map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="subject-remove-label">Select Subject</InputLabel>
              <Select
                labelId="subject-remove-label"
                value={selectedSubject}
                label="Select Subject"
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedTeacher}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {selectedTeacher &&
                  assignments
                    .filter(a => a.rollNo === selectedStudent?.rollNo && a.instructorId === selectedTeacher)
                    .map(a => a.subjectCode)
                    .map(subjectCode => (
                      <MenuItem key={subjectCode} value={subjectCode}>
                        {subjects.find(s => s.subjectCode === subjectCode)?.subjectName} ({subjectCode})
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveModal}>Cancel</Button>
          <Button onClick={handleRemoveStudent} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}