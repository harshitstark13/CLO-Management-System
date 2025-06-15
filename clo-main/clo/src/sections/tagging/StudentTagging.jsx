import React, { useState, useEffect, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  MenuItem,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from 'src/context/AuthContext';
import Papa from 'papaparse';

export default function StudentTaggingPage() {
  const { token } = useContext(AuthContext);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]);
  const [filteredInstructors, setFilteredInstructors] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('cse1'); // Default to "cse1"
  const [selectedSubject, setSelectedSubject] = useState('CS101'); // Default to "CS101"
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);
  const [removeInstructor, setRemoveInstructor] = useState('');
  const [removeSubject, setRemoveSubject] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesRes, subjectsRes, instructorsRes, studentsRes] = await Promise.all([
          axios.get('http://localhost:5001/api/students/batches', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5001/api/subjects', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5001/api/admin/instructors', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5001/api/students', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        console.log('Subjects fetched:', subjectsRes.data.map(s => ({ _id: s._id, subjectCode: s.subjectCode })));
        setBatches(batchesRes.data);
        setSubjects(subjectsRes.data);
        setAllInstructors(instructorsRes.data);
        setFilteredInstructors(instructorsRes.data);

        const assignmentPromises = subjectsRes.data.map(subject =>
          axios.get(`http://localhost:5001/api/subjects/${subject._id}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(err => {
            console.log(`Error fetching students for ${subject._id} (${subject.subjectCode}):`, err.response?.status);
            return { data: [] };
          })
        );
        const assignmentResponses = await Promise.all(assignmentPromises);
        const allAssignments = assignmentResponses.flatMap((res, idx) => {
          console.log(`Students for ${subjectsRes.data[idx]._id} (${subjectsRes.data[idx].subjectCode}):`, res.data);
          return res.data.map(student => ({
            rollNo: student.rollNo,
            subjectCode: subjectsRes.data[idx].subjectCode,
            instructorId: student.instructorId || 'Unknown',
            instructorName: instructorsRes.data.find(i => i._id === student.instructorId)?.name || 'Unknown',
          }));
        });
        console.log('All assignments:', allAssignments);
        setAssignments(allAssignments);
        setLoading(false);

        // Set default filtered instructors for "CS101"
        const cs101 = subjectsRes.data.find(s => s.subjectCode === 'CS101');
        if (cs101) {
          const deptInstructors = instructorsRes.data.filter(i =>
            i.department === cs101.department &&
            i.assignedSubjects.some(as => as.subjectCode === cs101.subjectCode)
          );
          setFilteredInstructors(deptInstructors);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrors([error.response?.data?.message || 'Failed to load data']);
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/admin/generate-tagging-template', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_tagging_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors(['Failed to download template']);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const response = await axios.post(
            'http://localhost:5001/api/admin/upload-tagging',
            { csvData: result.data },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSuccessMessage(response.data.message);
          setErrors([]);
          const subjectsRes = await axios.get('http://localhost:5001/api/subjects', { headers: { Authorization: `Bearer ${token}` } });
          const assignmentPromises = subjectsRes.data.map(subject =>
            axios.get(`http://localhost:5001/api/subjects/${subject._id}/students`, { headers: { Authorization: `Bearer ${token}` } })
          );
          const assignmentResponses = await Promise.all(assignmentPromises);
          const updatedAssignments = assignmentResponses.flatMap((res, idx) =>
            res.data.map(student => ({
              rollNo: student.rollNo,
              subjectCode: subjectsRes.data[idx].subjectCode,
              instructorId: student.instructorId || 'Unknown',
              instructorName: allInstructors.find(i => i._id === student.instructorId)?.name || 'Unknown',
            }))
          );
          console.log('Updated assignments after upload:', updatedAssignments);
          setAssignments(updatedAssignments);
        } catch (error) {
          console.error('Error uploading CSV:', error);
          setErrors(error.response?.data?.errors || [error.response?.data?.message || 'Upload failed']);
          setSuccessMessage('');
        }
      },
      error: (err) => {
        setErrors(['Error parsing CSV file']);
        setSuccessMessage('');
      },
    });
  };

  const handleBatchChange = async (e) => {
    const batchId = e.target.value;
    setSelectedBatch(batchId);
    setSelectedStudents([]);
    setSelectedSubject(''); // Reset subject
    setSelectedInstructor('');
    const batch = batches.find(b => b.batchId === batchId);
    if (batch) {
      try {
        const instructorsRes = await axios.get(
          `http://localhost:5001/api/admin/instructors?department=${batch.department}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFilteredInstructors(instructorsRes.data);
      } catch (error) {
        setErrors(['Failed to fetch instructors for department']);
      }
    }
  };

  const handleSubjectChange = (e) => {
    const subjectCode = e.target.value;
    console.log('Selected subject:', subjectCode);
    setSelectedSubject(subjectCode);
    setSelectedInstructor('');
    const subject = subjects.find(s => s.subjectCode === subjectCode);
    if (subject) {
      const deptInstructors = allInstructors.filter(i => 
        i.department === subject.department && 
        i.assignedSubjects.some(as => as.subjectCode === subject.subjectCode)
      );
      setFilteredInstructors(deptInstructors);
    }
  };

  const handleStudentToggle = (rollNo) => {
    setSelectedStudents(prev =>
      prev.includes(rollNo) ? prev.filter(r => r !== rollNo) : [...prev, rollNo]
    );
  };

  const handleSelectAll = (checked) => {
    const filteredStudents = currentBatch && currentBatch.students
      ? currentBatch.students.filter(student =>
          student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];
    setSelectedStudents(checked ? filteredStudents.map(s => s.rollNo) : []);
  };

  const handleAssign = async () => {
    if (!selectedBatch || !selectedSubject || !selectedInstructor || selectedStudents.length === 0) {
      setErrors(['Please select a batch, subject, instructor, and at least one student']);
      return;
    }
    try {
      const subject = subjects.find(s => s.subjectCode === selectedSubject);
      const csvData = selectedStudents.map(rollNo => ({
        RollNo: rollNo,
        SubjectCode: subject.subjectCode,
        InstructorId: selectedInstructor,
      }));
      const response = await axios.post(
        'http://localhost:5001/api/admin/upload-tagging',
        { csvData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message);
      setErrors([]);
      setSelectedStudents([]);
      const subjectStudents = await axios.get(`http://localhost:5001/api/subjects/${subject._id}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newAssignments = subjectStudents.data.map(student => ({
        rollNo: student.rollNo,
        subjectCode: subject.subjectCode,
        instructorId: selectedInstructor,
        instructorName: allInstructors.find(i => i._id === selectedInstructor)?.name || 'Unknown',
      }));
      console.log('New assignments after assign:', newAssignments);
      setAssignments(prev => [
        ...prev.filter(a => a.subjectCode !== subject.subjectCode || !selectedStudents.includes(a.rollNo)),
        ...newAssignments
      ]);
    } catch (error) {
      console.error('Error assigning students:', error);
      setErrors(error.response?.data?.errors || [error.response?.data?.message || 'Assignment failed']);
      setSuccessMessage('');
    }
  };

  const handleOpenRemoveDialog = () => {
    if (selectedStudents.length === 0) {
      setErrors(['Please select at least one student to remove']);
      return;
    }
    setOpenRemoveDialog(true);
    setRemoveInstructor('');
    setRemoveSubject('');
  };

  const handleCloseRemoveDialog = () => {
    setOpenRemoveDialog(false);
    setRemoveInstructor('');
    setRemoveSubject('');
  };

  const handleRemove = async () => {
    if (!removeInstructor || !removeSubject || selectedStudents.length === 0) {
      setErrors(['Please select an instructor and subject to remove']);
      return;
    }
    try {
      const csvData = selectedStudents.map(rollNo => ({
        RollNo: rollNo,
        SubjectCode: removeSubject,
        InstructorId: removeInstructor,
      }));
      const response = await axios.post(
        'http://localhost:5001/api/admin/remove-student',
        { csvData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(response.data.message);
      setErrors([]);
      setAssignments(prev => prev.filter(a => 
        !selectedStudents.includes(a.rollNo) || a.subjectCode !== removeSubject || a.instructorId !== removeInstructor
      ));
      setSelectedStudents([]);
      handleCloseRemoveDialog();
    } catch (error) {
      console.error('Error removing students:', error);
      setErrors(error.response?.data?.errors || [error.response?.data?.message || 'Removal failed']);
      setSuccessMessage('');
    }
  };

  if (loading) return <CircularProgress />;

  const currentBatch = batches.find(b => b.batchId === selectedBatch);
  const filteredStudents = currentBatch && currentBatch.students
    ? currentBatch.students.filter(student =>
        student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Student Tagging</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="outlined" onClick={handleDownloadTemplate}>
          Download CSV Template
        </Button>
        <Button variant="outlined" component="label">
          Upload CSV
          <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
        </Button>
      </Stack>

      {errors.length > 0 && (
        <Stack spacing={1} sx={{ mb: 3 }}>
          {errors.map((error, idx) => (
            <Alert key={idx} severity="error">{error}</Alert>
          ))}
        </Stack>
      )}
      {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Select Batch"
          value={selectedBatch}
          onChange={handleBatchChange}
          sx={{ minWidth: 200 }}
        >
          {batches.length > 0 ? (
            batches.map(b => (
              <MenuItem key={b.batchId} value={b.batchId}>{b.batchId} ({b.department})</MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>No batches available</MenuItem>
          )}
        </TextField>
        <TextField
          select
          label="Select Subject"
          value={selectedSubject}
          onChange={handleSubjectChange}
          sx={{ minWidth: 200 }}
          disabled={!selectedBatch}
        >
          {subjects.length > 0 && currentBatch ? (
            subjects.filter(s => s.department === currentBatch.department).map(s => (
              <MenuItem key={s._id} value={s.subjectCode}>{s.subjectName} ({s.subjectCode})</MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>No subjects available</MenuItem>
          )}
        </TextField>
        <TextField
          select
          label="Select Instructor"
          value={selectedInstructor}
          onChange={(e) => setSelectedInstructor(e.target.value)}
          sx={{ minWidth: 200 }}
          disabled={!selectedSubject}
        >
          {filteredInstructors.length > 0 ? (
            filteredInstructors.map(i => (
              <MenuItem key={i._id} value={i._id}>{i.name} ({i.department})</MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>No instructors available</MenuItem>
          )}
        </TextField>
      </Stack>

      {selectedBatch && currentBatch && currentBatch.students && selectedSubject ? (
        <>
          <TextField
            label="Search Students by Name or Roll No"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ mb: 2, width: '300px' }}
          />
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Checkbox
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.includes(s.rollNo))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      indeterminate={
                        filteredStudents.length > 0 &&
                        filteredStudents.some(s => selectedStudents.includes(s.rollNo)) &&
                        !filteredStudents.every(s => selectedStudents.includes(s.rollNo))
                      }
                    />
                  </TableCell>
                  <TableCell>Roll No</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Assigned Subject</TableCell>
                  <TableCell>Assigned Instructor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map(student => {
                  const assignment = assignments.find(a => a.rollNo === student.rollNo && a.subjectCode === selectedSubject);
                  console.log(`Student ${student.rollNo} for ${selectedSubject}:`, assignment);
                  return (
                    <TableRow key={student.rollNo}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.rollNo)}
                          onChange={() => handleStudentToggle(student.rollNo)}
                        />
                      </TableCell>
                      <TableCell>{student.rollNo}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.department}</TableCell>
                      <TableCell>{assignment ? assignment.subjectCode : 'None'}</TableCell>
                      <TableCell>{assignment ? assignment.instructorName : 'None'}</TableCell>
                    </TableRow>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No students match the search criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleAssign} disabled={selectedStudents.length === 0}>
              Assign Selected Students
            </Button>
            <Button variant="outlined" color="error" onClick={handleOpenRemoveDialog} disabled={selectedStudents.length === 0}>
              Remove Selected Students
            </Button>
          </Stack>
        </>
      ) : selectedBatch ? (
        <Typography>No students found for selected batch or subject not selected</Typography>
      ) : (
        <Typography>Please select a batch</Typography>
      )}

      <Dialog open={openRemoveDialog} onClose={handleCloseRemoveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Remove Assignments</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="remove-instructor-label">Select Instructor</InputLabel>
              <Select
                labelId="remove-instructor-label"
                value={removeInstructor}
                label="Select Instructor"
                onChange={(e) => setRemoveInstructor(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {allInstructors.map(i => (
                  <MenuItem key={i._id} value={i._id}>{i.name} ({i.department})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="remove-subject-label">Select Subject</InputLabel>
              <Select
                labelId="remove-subject-label"
                value={removeSubject}
                label="Select Subject"
                onChange={(e) => setRemoveSubject(e.target.value)}
                disabled={!removeInstructor}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {removeInstructor && subjects
                  .filter(s => allInstructors.find(i => i._id === removeInstructor)?.assignedSubjects.some(as => as.subjectCode === s.subjectCode))
                  .map(s => (
                    <MenuItem key={s._id} value={s.subjectCode}>{s.subjectName} ({s.subjectCode})</MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveDialog}>Cancel</Button>
          <Button onClick={handleRemove} variant="contained" color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}