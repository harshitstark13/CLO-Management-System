import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  TextField,
  Stack,
  MenuItem,
  TableContainer,
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from 'src/context/AuthContext';
import { CSVLink } from 'react-csv';
import Papa from 'papaparse';

export default function MarksUploadPage() {
  const { token, user } = React.useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvalCriteria, setSelectedEvalCriteria] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [clos, setClos] = useState([]);
  const [marksColumns, setMarksColumns] = useState([]);

  // **Fetch subjects and students on component mount**
  useEffect(() => {
    const fetchSubjectsAndStudents = async () => {
      setLoading(true);
      try {
        const [subjectsResponse, studentsResponse] = await Promise.all([
          axios.get('http://localhost:5001/api/instructor/subjects', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5001/api/students', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setSubjects(subjectsResponse.data);
        setStudents(studentsResponse.data);
        setLoading(false);
      } catch (error) {
        setError('Failed to load subjects or students');
        setLoading(false);
      }
    };
    fetchSubjectsAndStudents();
  }, [token]);

  // **Fetch marks when subject or evaluation criteria changes**
  useEffect(() => {
    const fetchMarks = async () => {
      if (!selectedSubject || !selectedEvalCriteria) return;
      try {
        const response = await axios.get(
          `http://localhost:5001/api/subjects/${selectedSubject._id}/instructor-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedMarks = response.data.marks.filter(
          (m) => m.instructorId === user.id && m.evalCriteria === selectedEvalCriteria
        );
        const instructorData = selectedSubject.instructors.find(
          (i) => i.instructorId === user.id
        );
        const assignedStudents = instructorData?.students || [];

        const updatedMarks = assignedStudents.map((student) => {
          const existingMark = fetchedMarks.find((m) => m.rollNo === student.rollNo);
          const studentData = students.find((s) => s.rollNo === student.rollNo);
          const initialData = {
            'Student Name': studentData?.name || 'Unknown',
            TotalMarks: existingMark?.totalMarks || '',
            'TotalMarks_Weightage': existingMark?.totalMarksWeightage || '',
            ...marksColumns.reduce((acc, header) => {
              acc[header] = existingMark?.data[header] || '';
              return acc;
            }, {}),
          };
          return { rollNo: student.rollNo, data: initialData };
        });
        setMarks(calculateCLOMarks(updatedMarks));
      } catch (error) {
        setError('Failed to load marks for selected subject');
      }
    };
    fetchMarks();
  }, [selectedSubject, selectedEvalCriteria, token, user.id, students, marksColumns]);

  // **Handle saving marks**
  const handleSave = async () => {
    try {
      await axios.post(
        `http://localhost:5001/api/subjects/${selectedSubject._id}/submit-marks`,
        {
          subjectId: selectedSubject._id,
          marksData: marks.map((mark) => ({
            rollNo: mark.rollNo,
            data: mark.data,
          })),
          evalCriteria: selectedEvalCriteria,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Marks saved successfully');
      const response = await axios.get(
        `http://localhost:5001/api/subjects/${selectedSubject._id}/instructor-data`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fetchedMarks = response.data.marks.filter(
        (m) => m.instructorId === user.id && m.evalCriteria === selectedEvalCriteria
      );
      const updatedMarks = fetchedMarks.map((mark) => ({
        rollNo: mark.rollNo,
        data: {
          ...mark.data,
          TotalMarks: mark.totalMarks?.toString() || '',
          'TotalMarks_Weightage': mark.totalMarksWeightage?.toFixed(2) || '',
        },
      }));
      setMarks(calculateCLOMarks(updatedMarks));
    } catch (error) {
      alert('Error saving marks');
      console.error(error);
    }
  };

  // **Handle subject selection**
  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    const subject = subjects.find((s) => s._id === subjectId);
    setSelectedSubject(subject);
    setSelectedEvalCriteria('');
    setCsvHeaders([]);
    setMarks([]);
    setClos(subject?.CLOs || []);
  };

  // **Handle evaluation criteria selection**
  const handleEvalCriteriaChange = async (e) => {
    const criteria = e.target.value;
    setSelectedEvalCriteria(criteria);
    if (criteria && selectedSubject?.evaluationSchema[criteria]?.questions?.length > 0) {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/subjects/generateTemplate?subjectId=${selectedSubject._id}&evalCriteria=${criteria}`,
          { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
        );
        const text = await response.data.text();
        const templateHeaders = text.split('\n')[0].split(',').map((h) => h.trim());
        const questionHeaders = templateHeaders
          .slice(2)
          .filter((h) => !h.includes('CLO') && !h.includes('TotalMarks') && !h.includes('Weightage'));
        setMarksColumns(questionHeaders);
        const cloHeaders = clos.map((clo) => `CLO${clo.cloNumber}`);
        const uniqueHeaders = [
          'RollNo',
          'Student Name',
          ...questionHeaders,
          ...questionHeaders.map((h) => `${h}_Weightage`),
          'TotalMarks',
          'TotalMarks_Weightage',
          ...cloHeaders,
        ];
        setCsvHeaders(uniqueHeaders);
        const marksResponse = await axios.get(
          `http://localhost:5001/api/subjects/${selectedSubject._id}/instructor-data`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const fetchedMarks = marksResponse.data.marks.filter(
          (m) => m.instructorId === user.id && m.evalCriteria === criteria
        );
        const instructorData = selectedSubject.instructors.find(
          (i) => i.instructorId === user.id
        );
        const assignedStudents = instructorData?.students || [];
        const updatedMarks = assignedStudents.map((student) => {
          const existingMark = fetchedMarks.find((m) => m.rollNo === student.rollNo);
          const studentData = students.find((s) => s.rollNo === student.rollNo);
          const initialData = {
            'Student Name': studentData?.name || 'Unknown',
            TotalMarks: existingMark?.totalMarks || '',
            'TotalMarks_Weightage': existingMark?.totalMarksWeightage || '',
            ...uniqueHeaders.reduce((acc, header) => {
              if (header !== 'RollNo' && header !== 'Student Name') {
                acc[header] = existingMark?.data[header] || '';
              }
              return acc;
            }, {}),
          };
          return { rollNo: student.rollNo, data: initialData };
        });
        setMarks(calculateCLOMarks(updatedMarks));
      } catch (error) {
        setCsvHeaders([]);
        setMarks([]);
      }
    }
  };

  // **Generate readable header labels**
  const getHeaderLabel = (header) => {
    if (
      header === 'RollNo' ||
      header === 'Student Name' ||
      header === 'TotalMarks' ||
      header === 'TotalMarks_Weightage' ||
      header.includes('Weightage') ||
      header.startsWith('CLO')
    ) {
      return header;
    }
    const regex = new RegExp(`^${selectedEvalCriteria}_Q(\\d+)(?:_P(\\d+))?$`);
    const match = header.match(regex);
    if (match && selectedSubject) {
      const questionNo = parseInt(match[1], 10);
      const partNo = match[2] ? parseInt(match[2], 10) : null;
      const questions = selectedSubject.evaluationSchema[selectedEvalCriteria].questions || [];
      const question = questions.find((q) => q.questionNo === questionNo);
      if (question) {
        let maxMarks = 0;
        if (partNo) {
          if (question.parts && question.parts.length > 0) {
            const part = question.parts.find((p) => p.partNo === partNo);
            maxMarks = part ? part.maxMarks : 0;
          }
        } else {
          maxMarks = question.maxMarks;
        }
        return `${header} (max: ${maxMarks})`;
      }
    }
    return header;
  };

  // **Handle input changes with validation**
  const handleInputChange = (index, field, value) => {
    const regex = new RegExp(`^${selectedEvalCriteria}_Q(\\d+)(?:_P(\\d+))?$`);
    const match = field.match(regex);
    if (match) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) return;
      const questionNo = parseInt(match[1], 10);
      const partNo = match[2] ? parseInt(match[2], 10) : null;
      const questions = selectedSubject.evaluationSchema[selectedEvalCriteria].questions || [];
      const question = questions.find((q) => q.questionNo === questionNo);
      if (question) {
        let maxMarks = 0;
        if (partNo) {
          if (question.parts && question.parts.length > 0) {
            const part = question.parts.find((p) => p.partNo === partNo);
            maxMarks = part ? part.maxMarks : 0;
          }
        } else {
          maxMarks = question.maxMarks;
        }
        if (numericValue > maxMarks) {
          alert(`Value cannot exceed maximum marks of ${maxMarks}`);
          return;
        }
      }
    }
    const updatedMarks = [...marks];
    if (field === 'RollNo') {
      updatedMarks[index].rollNo = value;
      const student = students.find((s) => s.rollNo === value);
      updatedMarks[index].data['Student Name'] = student?.name || 'Unknown';
    } else if (!field.includes('CLO') && !field.includes('Weightage') && field !== 'TotalMarks') {
      updatedMarks[index].data[field] = value;
    }
    setMarks(calculateCLOMarks(updatedMarks));
  };

  // **Handle CSV file upload**
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    console.log('Selected Eval Criteria:', selectedEvalCriteria); // Debugging log
    console.log('marksColumns:', marksColumns); // Debugging log

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Normalize headers
      complete: (result) => {
        console.log('Parsed CSV:', result.data); // Debugging log

        const parsedData = result.data.map((row) => {
          const rollNo = row['RollNo'];
          console.log(`Row for ${rollNo}:`, row); // Debugging log

          const student = students.find((s) => s.rollNo === rollNo);
          const data = {
            'Student Name': student?.name || row['Student Name'] || 'Unknown',
          };

          marksColumns.forEach((header) => {
            const value = row[header] !== undefined ? row[header] : '';
            console.log(`Setting ${header} for ${rollNo}: ${value}`); // Debugging log
            data[header] = value;
          });

          return { rollNo, data };
        });

        const updatedMarks = calculateCLOMarks(parsedData);
        setMarks(updatedMarks);
      },
    });
  };

  // **Calculate CLO marks and weightages using cloQuestionMappings**
  const calculateCLOMarks = (marksToCalculate) => {
    const questions = selectedSubject?.evaluationSchema[selectedEvalCriteria]?.questions || [];
    const totalWeightage = selectedSubject?.evaluationSchema[selectedEvalCriteria]?.weightage || 100;
    const totalMarksPossible = questions.reduce(
      (sum, q) => sum + (q.parts ? q.parts.reduce((ps, p) => ps + p.maxMarks, 0) : q.maxMarks),
      0
    );

    return marksToCalculate.map((mark) => {
      const cloMarks = {};
      const weightages = {};
      let totalMarksAchieved = 0;

      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            const key = `${selectedEvalCriteria}_Q${q.questionNo}_P${p.partNo}`;
            const markValue = parseFloat(mark.data[key]) || 0;
            totalMarksAchieved += markValue;
            const questionWeightage = (totalWeightage / totalMarksPossible) * markValue;
            weightages[`${key}_Weightage`] = questionWeightage.toFixed(2);

            // Look up CLO mappings from cloQuestionMappings
            const cloMappings = [];
            selectedSubject.cloQuestionMappings.forEach((cloMapping) => {
              const relevantMappings = cloMapping.mappings.filter(
                (m) =>
                  m.criteria === selectedEvalCriteria &&
                  m.questionNo === q.questionNo &&
                  m.partNo === p.partNo
              );
              relevantMappings.forEach((m) => {
                cloMappings.push(`CLO${cloMapping.cloNumber}`);
              });
            });

            cloMappings.forEach((clo) => {
              const cloNumber = clo.toString().replace('CLO', '');
              const cloKey = `CLO${cloNumber}`;
              cloMarks[cloKey] = (cloMarks[cloKey] || 0) + markValue;
            });
          });
        } else {
          const key = `${selectedEvalCriteria}_Q${q.questionNo}`;
          const markValue = parseFloat(mark.data[key]) || 0;
          totalMarksAchieved += markValue;
          const questionWeightage = (totalWeightage / totalMarksPossible) * markValue;
          weightages[`${key}_Weightage`] = questionWeightage.toFixed(2);

          // Look up CLO mappings from cloQuestionMappings
          const cloMappings = [];
          selectedSubject.cloQuestionMappings.forEach((cloMapping) => {
            const relevantMappings = cloMapping.mappings.filter(
              (m) =>
                m.criteria === selectedEvalCriteria &&
                m.questionNo === q.questionNo &&
                m.partNo === null
            );
            relevantMappings.forEach((m) => {
              cloMappings.push(`CLO${cloMapping.cloNumber}`);
            });
          });

          cloMappings.forEach((clo) => {
            const cloNumber = clo.toString().replace('CLO', '');
            const cloKey = `CLO${cloNumber}`;
            cloMarks[cloKey] = (cloMarks[cloKey] || 0) + markValue;
          });
        }
      });

      if (selectedSubject?.CLOs) {
        selectedSubject.CLOs.forEach((clo) => {
          const key = `CLO${clo.cloNumber}`;
          if (cloMarks[key] === undefined) cloMarks[key] = 0;
        });
      }

      const updatedData = {
        ...mark.data,
        ...weightages,
        ...cloMarks,
        TotalMarks: totalMarksAchieved.toString(),
        TotalMarks_Weightage: ((totalWeightage / totalMarksPossible) * totalMarksAchieved).toFixed(2),
      };
      return { ...mark, data: updatedData };
    });
  };

  // **Handle template download**
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/subjects/generateTemplate?subjectId=${selectedSubject._id}&evalCriteria=${selectedEvalCriteria}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedEvalCriteria}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading template');
    }
  };

  // **Prepare CSV export data**
  const csvExportData = marks.map((mark) => {
    const row = { RollNo: mark.rollNo, 'Student Name': mark.data['Student Name'] };
    csvHeaders.slice(2).forEach((header) => {
      row[header] = mark.data[header] || '';
    });
    return row;
  });

  // **Input styles**
  const inputStyle = {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    width: '100px',
  };

  const disabledInputStyle = {
    ...inputStyle,
    backgroundColor: '#f5f5f5',
    color: '#757575',
    cursor: 'not-allowed',
  };

  // **Loading and error states**
  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  const criteriaKeys = Object.keys(selectedSubject?.evaluationSchema || {}).filter((key) => key !== '_id');

  // **Render UI**
  return (
    <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Marks Upload
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
            {criteriaKeys.length > 0 ? (
              criteriaKeys.map((criteria) => (
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

          {selectedEvalCriteria && csvHeaders.length > 0 && (
            <Button variant="outlined" onClick={handleDownloadTemplate}>
              Download CSV Template
            </Button>
          )}
        </Stack>
      )}

      {selectedEvalCriteria && csvHeaders.length > 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="outlined" component="label">
              Upload CSV
              <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
            </Button>
            <CSVLink
              data={csvExportData}
              headers={csvHeaders}
              filename={`${selectedSubject.subjectCode}_${selectedEvalCriteria}_marks.csv`}
            >
              <Button variant="outlined">Download Filled CSV</Button>
            </CSVLink>
          </Stack>

          <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: 2, maxWidth: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  {csvHeaders.map((col) => (
                    <TableCell key={col} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {getHeaderLabel(col)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {marks.map((mark, index) => (
                  <TableRow key={mark.rollNo || index}>
                    {csvHeaders.map((col) => (
                      <TableCell key={col}>
                        {col === 'RollNo' ? (
                          <input
                            value={mark.rollNo || ''}
                            onChange={(e) => handleInputChange(index, col, e.target.value)}
                            style={{ ...inputStyle, width: '120px' }}
                          />
                        ) : col === 'Student Name' ? (
                          <input value={mark.data[col] || ''} disabled style={{ ...disabledInputStyle, width: '150px' }} />
                        ) : col.includes('CLO') || col.includes('Weightage') || col === 'TotalMarks' ? (
                          <input value={mark.data[col] || ''} disabled style={disabledInputStyle} />
                        ) : (
                          <input
                            type="number"
                            value={mark.data[col] || ''}
                            onChange={(e) => handleInputChange(index, col, e.target.value)}
                            min="0"
                            step="0.1"
                            style={inputStyle}
                          />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button variant="contained" onClick={handleSave} sx={{ mt: 2 }}>
            Save Marks
          </Button>
        </>
      )}
    </Paper>
  );
}