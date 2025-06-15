import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  TextField,
  Stack,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from 'src/context/AuthContext';
import Papa from 'papaparse';

export default function InstructorSubmissionsPage() {
  const { token, user } = React.useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [evalCriteria, setEvalCriteria] = useState([]);
  const [selectedEvalCriteria, setSelectedEvalCriteria] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewHeaders, setViewHeaders] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/instructor/subjects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubjects(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setError('Failed to load subjects');
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [token]);

  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    const subject = subjects.find((s) => s._id === subjectId);
    setSelectedSubject(subject);
    // Filter out '_id' from evaluation criteria
    setEvalCriteria(Object.keys(subject?.evaluationSchema || {}).filter((key) => key !== '_id'));
    setSelectedEvalCriteria('');
    setSubmissions([]);
  };

  const handleEvalCriteriaChange = async (e) => {
    const criteria = e.target.value;
    setSelectedEvalCriteria(criteria);
    if (criteria && selectedSubject) {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/cc/instructor-submissions?subjectId=${selectedSubject._id}&evalCriteria=${criteria}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSubmissions(response.data);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        setError('Failed to load submissions');
      }
    } else {
      setSubmissions([]);
    }
  };

  const handleViewSubmission = async (fileUrl) => {
    if (fileUrl) {
      try {
        const response = await axios.get(`http://localhost:5001${fileUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'text',
        });
        console.log('Raw CSV data:', response.data);
        const parsedData = Papa.parse(response.data.trim(), {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          transformHeader: (header) => header.trim(),
          transform: (value, header) => {
            if (value === '' || value === null || value === undefined) {
              return header.includes('CLO') ? 0 : '';
            }
            return value;
          },
        });
        if (parsedData.errors.length > 0) {
          console.error('Parse errors:', parsedData.errors);
          throw new Error('Failed to parse CSV');
        }
        console.log('Parsed CSV data:', parsedData.data);
        const headers = parsedData.meta.fields || [];
        setViewHeaders(headers);
        setViewData(parsedData.data);
        setViewDialogOpen(true);
      } catch (error) {
        console.error('Error viewing submission:', error);
        alert('Failed to load submission data: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleDownloadSubmission = async (fileUrl) => {
    if (fileUrl) {
      try {
        const response = await axios.get(`http://localhost:5001${fileUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${selectedEvalCriteria}_submission.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Error downloading submission:', error);
        alert('Failed to download submission file');
      }
    }
  };

  const handleAggregateLists = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/cc/aggregate-submissions?subjectId=${selectedSubject._id}&evalCriteria=${selectedEvalCriteria}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedEvalCriteria}_aggregated.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error aggregating submissions:', error);
      alert('Failed to aggregate submissions');
    }
  };

  const allSubmitted = submissions.length > 0 && submissions.every((submission) => submission.hasSubmitted);

  const handleCloseDialog = () => {
    setViewDialogOpen(false);
    setViewData(null);
    setViewHeaders([]);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Instructor Submissions
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Select Subject"
          value={selectedSubject?._id || ''}
          onChange={handleSubjectChange}
          fullWidth
          sx={{ maxWidth: 300 }}
        >
          {subjects.length > 0 ? (
            subjects.map((subject) => (
              <MenuItem key={subject._id} value={subject._id}>
                {subject.subjectName} ({subject.subjectCode})
              </MenuItem>
            ))
          ) : (
            <MenuItem value="" disabled>
              No subjects assigned
            </MenuItem>
          )}
        </TextField>
      </Stack>

      {selectedSubject && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            select
            label="Select Evaluation Criteria"
            value={selectedEvalCriteria}
            onChange={handleEvalCriteriaChange}
            fullWidth
            sx={{ maxWidth: 300 }}
          >
            {evalCriteria.length > 0 ? (
              evalCriteria.map((criteria) => (
                <MenuItem key={criteria} value={criteria}>
                  {criteria}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No evaluation criteria defined
              </MenuItem>
            )}
          </TextField>
        </Stack>
      )}

      {selectedEvalCriteria && submissions.length > 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAggregateLists}
              disabled={!allSubmitted}
            >
              Aggregate Lists
            </Button>
          </Stack>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Instructor Name</TableCell>
                  <TableCell>Submission Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.instructorId}>
                    <TableCell>{submission.instructorName}</TableCell>
                    <TableCell>
                      {submission.hasSubmitted ? 'Submitted' : 'Not Submitted'}
                    </TableCell>
                    <TableCell>
                      {submission.hasSubmitted ? (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() => handleViewSubmission(submission.fileUrl)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => handleDownloadSubmission(submission.fileUrl)}
                          >
                            Download
                          </Button>
                        </Stack>
                      ) : (
                        'This instructor has not submitted the file yet'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={viewDialogOpen} onClose={handleCloseDialog} maxWidth="xl" fullWidth>
        <DialogTitle>Submission Details</DialogTitle>
        <DialogContent sx={{ padding: 0 }}>
          {viewData && viewHeaders.length > 0 ? (
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: '70vh', // Limit height for vertical scrolling
                overflowX: 'auto', // Enable horizontal scrolling
                position: 'relative',
                '&::-webkit-scrollbar': {
                  height: '8px', // Customize scrollbar height
                  backgroundColor: '#f5f5f5', // Scrollbar track color
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888', // Scrollbar thumb color
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: '#555', // Scrollbar thumb hover color
                },
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {viewHeaders.map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          whiteSpace: 'nowrap', // Prevent text wrapping
                          backgroundColor: '#f5f5f5',
                          borderRight: '1px solid #e0e0e0', // Add vertical borders between columns
                          fontWeight: 'bold',
                          padding: '8px 16px', // Adjust padding for better spacing
                          minWidth: header.includes('CLO') ? 120 : 100, // Ensure CLO columns are wide enough
                        }}
                      >
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewData.map((row, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: '#fafafa', // Alternating row colors for readability
                        },
                      }}
                    >
                      {viewHeaders.map((header) => (
                        <TableCell
                          key={header}
                          sx={{
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #e0e0e0', // Add vertical borders between cells
                            padding: '8px 16px', // Adjust padding for better spacing
                          }}
                        >
                          {row[header] !== undefined ? row[header] : ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ p: 2 }}>No data available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}