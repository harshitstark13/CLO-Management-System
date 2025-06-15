// src/pages/OverviewAnalyticsView.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Unstable_Grid2';
import {
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Icon } from '@iconify/react';
import axios from 'axios';

import { DashboardContent } from 'src/layouts/dashboard';
import { AuthContext } from 'src/context/AuthContext';
import { AnalyticsWidgetSummary } from '../analytics-widget-summary';

// Helper Component: StudentList
const StudentList = ({ subjectId, subjectName }) => {
  const { token } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`http://localhost:5001/api/subjects/${subjectId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log('Fetched students:', res.data);
        setStudents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch students', err);
        setLoading(false);
      });
  }, [subjectId, token]);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Students for {subjectName}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Roll No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.rollNo}>
                <TableCell>{student.rollNo}</TableCell>
                <TableCell>{student.name || 'N/A'}</TableCell> {/* Use 'name' field */}
                <TableCell>{student.department || 'N/A'}</TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

// Course Coordinator Dashboard
const CourseCoordinatorDashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [clos, setClos] = useState([]);
  const [newCLO, setNewCLO] = useState('');
  const [evaluationSettings, setEvaluationSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/subjects/instructor-subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchSubjects();
  }, [token, fetchSubjects]);

  const addCLO = () => {
    if (newCLO.trim() !== '') {
      const newCLOObj = { cloNumber: clos.length + 1, cloStatement: newCLO };
      const updatedCLOs = [...clos, newCLOObj];
      setClos(updatedCLOs);
      setNewCLO('');
    }
  };

  const handleEvaluationChange = (section, index, field, value) => {
    const sectionData = evaluationSettings[section] || { questions: [] };
    const updatedQuestions = [...sectionData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setEvaluationSettings({
      ...evaluationSettings,
      [section]: { questions: updatedQuestions },
    });
  };

  const submitEvaluationSettings = async () => {
    try {
      const payload = {
        subjectId: selectedSubject._id,
        CLOs: clos,
        evaluationSchema: evaluationSettings,
      };
      const response = await axios.put(
        'http://localhost:5001/api/cc/evaluation',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Evaluation settings updated successfully');
      setSelectedSubject(response.data.subject);
      setClos(response.data.subject.CLOs || []);
      setEvaluationSettings(response.data.subject.evaluationSchema || {});
    } catch (error) {
      console.error(error);
      alert('Failed to update evaluation settings');
    }
  };

  const downloadTemplate = () => {
    window.open(
      `http://localhost:5001/api/subjects/generateTemplate?subjectId=${selectedSubject._id}&evalCriteria=MST`,
      '_blank'
    );
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    if (subject.subjectCode === user.coordinatorFor) {
      setClos(subject.CLOs || []);
      setEvaluationSettings(subject.evaluationSchema || {});
    } else {
      setClos([]);
      setEvaluationSettings({});
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Course Coordinator Dashboard
      </Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        View your assigned subjects, manage marks entry, and configure evaluations for your CC subject.
      </Typography>
      <Grid container spacing={3}>
        {subjects.map((subject) => (
          <Grid item xs={12} sm={6} md={4} key={subject._id}>
            <Paper
              sx={{
                p: 2,
                cursor: 'pointer',
                backgroundColor: subject.subjectCode === user.coordinatorFor ? '#e3f2fd' : 'inherit',
                border: subject.subjectCode === user.coordinatorFor ? '2px solid #1976d2' : 'none',
              }}
              onClick={() => handleSubjectClick(subject)}
            >
              <Typography variant="h6">{subject.subjectName}</Typography>
              <Typography variant="body2">
                {subject.subjectCode} | {subject.department}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {subject.coordinator && subject.coordinator.toString() === user.id
                  ? 'Course Coordinator'
                  : 'Instructor'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                Students: {subject.studentsCount || 0}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

    
    </>
  );
};

// Admin Dashboard (unchanged)
const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTeachers = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchTeachers();
  }, [token, fetchTeachers]);

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      teacher.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Teachers"
            percent={3.2}
            total={teachers.length}
            icon={<Icon icon="mdi:teacher" width={48} height={48} />}
            chart={{ categories: ['W1', 'W2', 'W3', 'W4'], series: [10, 11, 12, 12] }}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Students"
            percent={1.8}
            total={1200}
            color="secondary"
            icon={<Icon icon="mdi:account-group" width={48} height={48} />}
            chart={{ categories: ['W1', 'W2', 'W3', 'W4'], series: [300, 310, 290, 300] }}
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Active Subjects"
            percent={2.5}
            total={25}
            color="warning"
            icon={<Icon icon="mdi:book-open-variant" width={48} height={48} />}
            chart={{ categories: ['W1', 'W2', 'W3', 'W4'], series: [5, 6, 7, 7] }}
          />
        </Grid>
        {/* <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Pending Evaluations"
            percent={-1.2}
            total={8}
            color="error"
            icon={<Icon icon="mdi:clipboard-alert-outline" width={48} height={48} />}
            chart={{ categories: ['W1', 'W2', 'W3', 'W4'], series: [2, 2, 2, 2] }}
          />
        </Grid> */}
      </Grid>

      <Paper sx={{ p: 3, mb: 5 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Manage Teachers
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
        </Stack>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Teacher ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Teacher Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>{teacher._id}</TableCell>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.department}</TableCell>
                      <TableCell>
                        <Button variant="contained" size="small">
                          Tag Students
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No teachers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
};

// Instructor Dashboard (unchanged)
const InstructorDashboard = () => {
  const { token, user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/subjects/instructor-subjects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubjects(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchSubjects();
  }, [token, fetchSubjects]);

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Instructor Dashboard
      </Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        View your assigned subjects, manage marks entry, and see the number of students per subject.
      </Typography>
      <TextField
        label="Search Subjects"
        variant="outlined"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        sx={{ mb: 3, width: '300px' }}
      />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          {subjects
            .filter((subject) =>
              subject.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
            .map((subject) => (
              <Grid item xs={12} sm={6} md={4} key={subject._id}>
                <Paper
                  sx={{ p: 2, cursor: 'pointer' }}
                  onClick={() => setSelectedSubject(subject)}
                >
                  <Typography variant="h6">{subject.subjectName}</Typography>
                  <Typography variant="body2">
                    {subject.subjectCode} | {subject.department}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {subject.coordinator && subject.coordinator.toString() === user.id
                      ? 'Course Coordinator'
                      : 'Instructor'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Students: {subject.studentsCount || 0}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="outlined" size="small">
                      Download CSV
                    </Button>
                    <Button variant="contained" size="small">
                      Upload Marks
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
        </Grid>
      )}
      {selectedSubject && (
        <StudentList
          subjectId={selectedSubject._id}
          subjectName={selectedSubject.subjectName}
        />
      )}
    </>
  );
};

// MAIN COMPONENT: OverviewAnalyticsView
export function OverviewAnalyticsView() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <DashboardContent maxWidth="xl">
        <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
          Loading...
        </Typography>
      </DashboardContent>
    );
  }

  let renderedDashboard = null;
  if (user.role === 'admin') {
    renderedDashboard = <AdminDashboard />;
  } else if (user.role === 'instructor') {
    renderedDashboard = <CourseCoordinatorDashboard />;
  }

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        Hi, Welcome back 👋
      </Typography>
      {renderedDashboard}
    </DashboardContent>
  );
}