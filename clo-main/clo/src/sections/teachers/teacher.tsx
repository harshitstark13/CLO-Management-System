// TeachersPage.tsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
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

interface AssignedSubject {
  subjectCode: string;
  isCoordinator: boolean;
}

interface Teacher {
  _id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  coordinatorFor?: string | null;
  assignedSubjects: AssignedSubject[];
}

interface Subject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  department: string;
}

interface Batch {
  batchId: string;
  department: string;
}

export default function TeachersPage() {
  const { token } = useContext(AuthContext);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [openBatchModal, setOpenBatchModal] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    role: 'instructor',
    department: '',
    email: '',
    coordinatorFor: '',
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch teachers');
      setLoading(false);
    }
  }, [token]);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uniqueBatches = [...new Set(response.data.map((s) => s.batchId))].map((batchId) => ({
        batchId,
        department: response.data.find((s) => s.batchId === batchId).department,
      }));
      setBatches(uniqueBatches);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    }
  }, [token]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/admin/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, [token]);

  const fetchSubjects = useCallback(
    async (department: string) => {
      try {
        setSubjectsLoading(true);
        const response = await axios.get(
          `http://localhost:5001/api/subjects?department=${department}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAvailableSubjects(response.data);
        setSubjectsLoading(false);
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
        setSubjectsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchTeachers();
      fetchBatches();
      fetchDepartments();
    }
  }, [fetchTeachers, fetchBatches, fetchDepartments, token]);

  useEffect(() => {
    if (selectedTeacher && selectedTeacher.department) {
      fetchSubjects(selectedTeacher.department);
      setSelectedSubjects(selectedTeacher.assignedSubjects.map((s) => s.subjectCode));
    }
  }, [selectedTeacher, fetchSubjects]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      teacher.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedTeacher(null);
    setAvailableSubjects([]);
    setSelectedSubjects([]);
  };

  const handleFieldChange = (field: keyof Teacher, value: any) => {
    if (selectedTeacher) {
      setSelectedTeacher({ ...selectedTeacher, [field]: value });
    }
  };

  const handleUpdateTeacher = async () => {
    if (!selectedTeacher) return;
    try {
      // Update teacher details
      await axios.put(
        `http://localhost:5001/api/admin/teachers/${selectedTeacher._id}`,
        {
          name: selectedTeacher.name,
          department: selectedTeacher.department,
          role: selectedTeacher.role,
          coordinatorFor: selectedTeacher.coordinatorFor || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Get current assigned subjects
      const currentSubjects = selectedTeacher.assignedSubjects.map((s) => s.subjectCode);

      // Assign new subjects or update coordinator status
      for (const subjectCode of selectedSubjects) {
        await axios.post(
          'http://localhost:5001/api/admin/assign',
          {
            teacherId: selectedTeacher._id,
            subjectCode,
            isCoordinator: subjectCode === selectedTeacher.coordinatorFor,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Remove assignments for subjects no longer selected
      for (const subjectCode of currentSubjects) {
        if (!selectedSubjects.includes(subjectCode)) {
          // Optionally implement an endpoint to unassign subjects
          // For now, we'll update with isCoordinator: false to maintain consistency
          await axios.post(
            'http://localhost:5001/api/admin/assign',
            {
              teacherId: selectedTeacher._id,
              subjectCode,
              isCoordinator: false,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      fetchTeachers();
      handleCloseEditModal();
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      alert(err.response?.data?.message || 'Failed to update teacher');
    }
  };

  const handleOpenAddModal = () => {
    setOpenAddModal(true);
    const teacherCount = teachers.length + 1;
    setNewTeacher({ ...newTeacher, email: `teacher${teacherCount + 1}@example.com` });
  };

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
    setNewTeacher({ name: '', role: 'instructor', department: '', email: '', coordinatorFor: '' });
  };

  const handleNewTeacherChange = (field: string, value: string) => {
    setNewTeacher({ ...newTeacher, [field]: value });
    if (field === 'department') {
      fetchSubjects(value);
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.department) {
      alert('Name and Department are required');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:5001/api/admin/teachers',
        { ...newTeacher, assignedSubjects: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeachers([...teachers, response.data]);
      handleCloseAddModal();
      alert('Teacher added successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add teacher');
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/admin/teachers/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(teachers.filter((t) => t._id !== teacherId));
      alert('Teacher deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleOpenBatchModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setOpenBatchModal(true);
    setSelectedBatch('');
    setSelectedSubject('');
  };

  const handleCloseBatchModal = () => {
    setOpenBatchModal(false);
    setSelectedTeacher(null);
    setSelectedBatch('');
    setSelectedSubject('');
  };

  const handleAssignBatch = async () => {
    if (!selectedTeacher || !selectedBatch || !selectedSubject) {
      alert('Please select a batch and subject');
      return;
    }
    try {
      await axios.post(
        'http://localhost:5001/api/admin/assign-batch',
        {
          batchId: selectedBatch,
          subjectCode: selectedSubject,
          instructorId: selectedTeacher._id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Batch assigned successfully');
      handleCloseBatchModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign batch');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Teachers
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search Teachers"
          variant="outlined"
          value={search}
          onChange={handleSearch}
          size="small"
          sx={{ width: '300px' }}
        />
        <Button variant="outlined" onClick={() => setSearch('')}>
          Reset
        </Button>
        <Button variant="contained" color="primary" onClick={handleOpenAddModal}>
          Add Teacher
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
                <TableCell sx={{ fontWeight: 'bold' }}>Sr.No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Teacher ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Course Coordinator</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Subjects</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher, index) => (
                  <TableRow key={teacher._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{teacher._id}</TableCell>
                    <TableCell>{teacher.name}</TableCell>
                    <TableCell>{teacher.department}</TableCell>
                    <TableCell>{teacher.role}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.coordinatorFor || 'No'}</TableCell>
                    <TableCell>
                      {teacher.assignedSubjects && teacher.assignedSubjects.length > 0
                        ? teacher.assignedSubjects
                            .map((subj) => `${subj.subjectCode}${subj.isCoordinator ? ' (CC)' : ''}`)
                            .join(', ')
                        : 'None'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleEdit(teacher)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          size="small"
                          onClick={() => handleOpenBatchModal(teacher)}
                        >
                          Assign Batch
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleDeleteTeacher(teacher._id)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No teachers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Teacher Modal */}
      <Dialog open={openEditModal} onClose={handleCloseEditModal} fullWidth maxWidth="sm">
        <DialogTitle>Edit Teacher</DialogTitle>
        <DialogContent>
          {selectedTeacher && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Name"
                variant="outlined"
                value={selectedTeacher.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel id="department-edit-label">Department</InputLabel>
                <Select
                  labelId="department-edit-label"
                  value={selectedTeacher.department}
                  label="Department"
                  onChange={(e) => handleFieldChange('department', e.target.value)}
                >
                  <MenuItem value="">
                    <em>Select Department</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  value={selectedTeacher.role}
                  label="Role"
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="instructor">Instructor</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="subjects-select-label">Assigned Subjects</InputLabel>
                {subjectsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Select
                    labelId="subjects-select-label"
                    multiple
                    value={selectedSubjects}
                    label="Assigned Subjects"
                    onChange={(e) => setSelectedSubjects(e.target.value as string[])}
                  >
                    {availableSubjects.map((subject) => (
                      <MenuItem key={subject._id} value={subject.subjectCode}>
                        {subject.subjectName} ({subject.subjectCode})
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="cc-subject-label">Course Coordinator Subject</InputLabel>
                {subjectsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Select
                    labelId="cc-subject-label"
                    value={selectedTeacher.coordinatorFor || ''}
                    label="Course Coordinator Subject"
                    onChange={(e) => handleFieldChange('coordinatorFor', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {selectedSubjects.map((code) => {
                      const subject = availableSubjects.find((s) => s.subjectCode === code);
                      return (
                        <MenuItem key={code} value={code}>
                          {subject?.subjectName} ({code})
                        </MenuItem>
                      );
                    })}
                  </Select>
                )}
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button onClick={handleUpdateTeacher} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Teacher Modal */}
      <Dialog open={openAddModal} onClose={handleCloseAddModal} fullWidth maxWidth="sm">
        <DialogTitle>Add New Teacher</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Name"
              variant="outlined"
              value={newTeacher.name}
              onChange={(e) => handleNewTeacherChange('name', e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="department-add-label">Department</InputLabel>
              <Select
                labelId="department-add-label"
                value={newTeacher.department}
                label="Department"
                onChange={(e) => handleNewTeacherChange('department', e.target.value)}
              >
                <MenuItem value="">
                  <em>Select Department</em>
                </MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="role-add-label">Role</InputLabel>
              <Select
                labelId="role-add-label"
                value={newTeacher.role}
                label="Role"
                onChange={(e) => handleNewTeacherChange('role', e.target.value)}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="instructor">Instructor</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Email"
              variant="outlined"
              value={newTeacher.email}
              disabled
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModal}>Cancel</Button>
          <Button onClick={handleAddTeacher} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Assignment Modal */}
      <Dialog open={openBatchModal} onClose={handleCloseBatchModal} fullWidth maxWidth="sm">
        <DialogTitle>Assign Batch to {selectedTeacher?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="batch-select-label">Select Batch</InputLabel>
              <Select
                labelId="batch-select-label"
                value={selectedBatch}
                label="Select Batch"
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {batches
                  .filter((b) => b.department === selectedTeacher?.department)
                  .map((batch) => (
                    <MenuItem key={batch.batchId} value={batch.batchId}>
                      {batch.batchId}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="subject-select-label">Select Subject</InputLabel>
              {subjectsLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Select
                  labelId="subject-select-label"
                  value={selectedSubject}
                  label="Select Subject"
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {availableSubjects.map((subject) => (
                    <MenuItem key={subject._id} value={subject.subjectCode}>
                      {subject.subjectName} ({subject.subjectCode})
                    </MenuItem>
                  ))}
                </Select>
              )}
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBatchModal}>Cancel</Button>
          <Button onClick={handleAssignBatch} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}