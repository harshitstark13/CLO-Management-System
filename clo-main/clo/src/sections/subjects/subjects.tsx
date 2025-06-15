import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import {
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Checkbox,
} from '@mui/material';
import { AuthContext } from 'src/context/AuthContext';

interface Subject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  instructors: { instructorId: string }[];
  coordinator: { _id: string; name: string } | null;
}

interface Instructor {
  _id: string;
  name: string;
  department: string;
  coordinatorFor?: string | null;
}

export default function SubjectsPage() {
  const { token } = useContext(AuthContext);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState({
    subjectName: '',
    subjectCode: '',
    department: '',
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]); // For multi-select

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch subjects');
      setLoading(false);
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

  const fetchInstructors = useCallback(
    async (department: string) => {
      try {
        setInstructorsLoading(true);
        const response = await axios.get(
          `http://localhost:5001/api/admin/instructors?department=${department}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAvailableInstructors(response.data);
        setInstructorsLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch instructors', err);
        setInstructorsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchSubjects();
      fetchDepartments();
    }
  }, [fetchSubjects, fetchDepartments, token]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.subjectName.toLowerCase().includes(search.toLowerCase()) ||
      subject.subjectCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedSubjects(filteredSubjects.map((subject) => subject._id));
    } else {
      setSelectedSubjects([]);
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedSubjects.length === 0) {
      alert('No subjects selected for deletion');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedSubjects.length} subject(s)?`)) return;
    try {
      await Promise.all(
        selectedSubjects.map((id) =>
          axios.delete(`http://localhost:5001/api/admin/subjects/${id}`, { // Updated URL
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      setSubjects(subjects.filter((subject) => !selectedSubjects.includes(subject._id)));
      setSelectedSubjects([]);
      alert('Selected subjects deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subjects');
    }
  };

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setOpenEditModal(true);
    fetchInstructors(subject.department);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedSubject(null);
    setAvailableInstructors([]);
  };

  const handleFieldChange = (field: keyof Subject, value: any) => {
    if (selectedSubject) {
      setSelectedSubject({ ...selectedSubject, [field]: value });
    }
  };

  const handleUpdateSubject = async () => {
    if (!selectedSubject) return;
    try {
      await axios.post(
        'http://localhost:5001/api/admin/assign',
        {
          teacherId: selectedSubject.coordinator?._id,
          subjectCode: selectedSubject.subjectCode,
          isCoordinator: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSubjects();
      handleCloseEditModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update subject');
    }
  };

  const handleOpenAddModal = () => {
    setOpenAddModal(true);
    setNewSubject({ subjectName: '', subjectCode: '', department: '' });
  };

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
    setNewSubject({ subjectName: '', subjectCode: '', department: '' });
  };

  const handleNewSubjectChange = (field: string, value: string) => {
    setNewSubject({ ...newSubject, [field]: value });
  };

  const handleAddSubject = async () => {
    if (!newSubject.subjectName || !newSubject.subjectCode || !newSubject.department) {
      alert('All fields are required');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:5001/api/admin/subjects',
        { ...newSubject, instructors: [], coordinator: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubjects([...subjects, response.data]);
      handleCloseAddModal();
      alert('Subject added successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add subject');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Subjects Management
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search Subjects"
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
          Add Subject
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteSelected}
          disabled={selectedSubjects.length === 0}
        >
          Delete Selected
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
                <TableCell>
                  <Checkbox
                    checked={selectedSubjects.length === filteredSubjects.length && filteredSubjects.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Subject ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Subject Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Subject Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Coordinator</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => (
                  <TableRow key={subject._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubjects.includes(subject._id)}
                        onChange={() => handleSelectSubject(subject._id)}
                      />
                    </TableCell>
                    <TableCell>{subject._id}</TableCell>
                    <TableCell>{subject.subjectName}</TableCell>
                    <TableCell>{subject.subjectCode}</TableCell>
                    <TableCell>{subject.department}</TableCell>
                    <TableCell>{subject.coordinator?.name || 'None'}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleEdit(subject)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No subjects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Subject Modal */}
      <Dialog open={openEditModal} onClose={handleCloseEditModal} fullWidth maxWidth="sm">
        <DialogTitle>Edit Subject</DialogTitle>
        <DialogContent>
          {selectedSubject && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Subject Name"
                variant="outlined"
                value={selectedSubject.subjectName}
                onChange={(e) => handleFieldChange('subjectName', e.target.value)}
              />
              <TextField
                label="Subject Code"
                variant="outlined"
                value={selectedSubject.subjectCode}
                onChange={(e) => handleFieldChange('subjectCode', e.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel id="department-select-label">Department</InputLabel>
                <Select
                  labelId="department-select-label"
                  value={selectedSubject.department}
                  label="Department"
                  disabled
                >
                  <MenuItem value={selectedSubject.department}>
                    {selectedSubject.department}
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="coordinator-select-label">Course Coordinator</InputLabel>
                {instructorsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Select
                    labelId="coordinator-select-label"
                    value={selectedSubject.coordinator?._id || ''}
                    label="Course Coordinator"
                    onChange={(e) => handleFieldChange('coordinator', { _id: e.target.value })}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {availableInstructors.map((inst) => (
                      <MenuItem key={inst._id} value={inst._id}>
                        {inst.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button onClick={handleUpdateSubject} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Subject Modal */}
      <Dialog open={openAddModal} onClose={handleCloseAddModal} fullWidth maxWidth="sm">
        <DialogTitle>Add New Subject</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Subject Name"
              variant="outlined"
              value={newSubject.subjectName}
              onChange={(e) => handleNewSubjectChange('subjectName', e.target.value)}
            />
            <TextField
              label="Subject Code"
              variant="outlined"
              value={newSubject.subjectCode}
              onChange={(e) => handleNewSubjectChange('subjectCode', e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel id="department-add-label">Department</InputLabel>
              <Select
                labelId="department-add-label"
                value={newSubject.department}
                label="Department"
                onChange={(e) => handleNewSubjectChange('department', e.target.value)}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModal}>Cancel</Button>
          <Button onClick={handleAddSubject} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}