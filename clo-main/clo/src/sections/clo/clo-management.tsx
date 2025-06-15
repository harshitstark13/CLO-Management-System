import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Box,
} from '@mui/material';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { AuthContext } from 'src/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function CLOManagementPage() {
  const { token, user } = React.useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if user is not a coordinator
  useEffect(() => {
    if (!user || !user.coordinatorFor) {
      navigate('/access-denied');
    }
  }, [user, navigate]);

  const [subject, setSubject] = useState(null);
  const [closData, setClosData] = useState([]); // List of CLOs
  const [newCLOStatement, setNewCLOStatement] = useState(''); // For adding new CLOs
  const [loading, setLoading] = useState(true);
  const [evalCriteria, setEvalCriteria] = useState({}); // Evaluation schema from backend
  const [cloMappings, setCloMappings] = useState([]); // Updated state for CLO mappings
  const [csvPreview, setCsvPreview] = useState(null);

  // Fetch subject details including CLOs and evaluation schema
  const fetchSubjectDetails = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5001/api/subjects?subjectCode=${user.coordinatorFor}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fetchedSubject = response.data.find(
        (subj) => subj.subjectCode === user.coordinatorFor
      );
      if (!fetchedSubject) {
        throw new Error(`Subject with code ${user.coordinatorFor} not found`);
      }
      setSubject(fetchedSubject);
      setClosData(fetchedSubject.CLOs || []);
      setEvalCriteria(fetchedSubject.evaluationSchema || {});

      // Initialize cloMappings from cloQuestionMappings
      const initialMappings = (fetchedSubject.CLOs || []).map((clo) => {
        const cloMapping = fetchedSubject.cloQuestionMappings.find(
          (m) => m.cloNumber === clo.cloNumber
        );
        // Extract measurement tools (unique criteria from mappings)
        const measurementTools = cloMapping
          ? [...new Set(cloMapping.mappings.map((m) => m.criteria))]
          : [];
        return {
          cloNumber: clo.cloNumber,
          measurementTools,
          mappings: cloMapping ? cloMapping.mappings.map((m) => ({
            question: { criteria: m.criteria, questionNo: m.questionNo },
            subPart: m.partNo ? { partNo: m.partNo } : null,
          })) : [],
        };
      });
      setCloMappings(initialMappings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subject details:', error);
      setLoading(false);
    }
  }, [token, user?.coordinatorFor]);

  useEffect(() => {
    if (token && user?.coordinatorFor) {
      fetchSubjectDetails();
    }
  }, [token, user?.coordinatorFor, fetchSubjectDetails]);

  // Handle editing of CLO statements in the table
  const handleEditCLOStatement = (cloNumber, newStatement) => {
    setClosData(
      closData.map((clo) =>
        clo.cloNumber === cloNumber ? { ...clo, cloStatement: newStatement } : clo
      )
    );
  };

  // Handle adding a new CLO
  const handleAddCLO = () => {
    if (!newCLOStatement.trim()) return;
    const newCLO = {
      cloNumber: closData.length + 1,
      cloStatement: newCLOStatement,
    };
    setClosData([...closData, newCLO]);
    setCloMappings([
      ...cloMappings,
      { cloNumber: newCLO.cloNumber, measurementTools: [], mappings: [] },
    ]);
    setNewCLOStatement('');
  };

  // Handle changes to measurement tools for a CLO
  const handleMeasurementToolsChange = (cloNumber, selectedTools) => {
    setCloMappings(
      cloMappings.map((mapping) =>
        mapping.cloNumber === cloNumber
          ? { ...mapping, measurementTools: selectedTools, mappings: [] } // Reset mappings when tools change
          : mapping
      )
    );
  };

  // Add a new mapping (question + sub-part) for a CLO
  const handleAddMapping = (cloNumber) => {
    setCloMappings(
      cloMappings.map((mapping) =>
        mapping.cloNumber === cloNumber
          ? {
              ...mapping,
              mappings: [...mapping.mappings, { question: null, subPart: null }],
            }
          : mapping
      )
    );
  };

  // Remove a mapping for a CLO
  const handleRemoveMapping = (cloNumber, mappingIndex) => {
    setCloMappings(
      cloMappings.map((mapping) =>
        mapping.cloNumber === cloNumber
          ? {
              ...mapping,
              mappings: mapping.mappings.filter((_, idx) => idx !== mappingIndex),
            }
          : mapping
      )
    );
  };

  // Handle question selection for a specific mapping
  const handleQuestionChange = (cloNumber, mappingIndex, criteria, questionNo) => {
    setCloMappings(
      cloMappings.map((mapping) =>
        mapping.cloNumber === cloNumber
          ? {
              ...mapping,
              mappings: mapping.mappings.map((m, idx) =>
                idx === mappingIndex
                  ? { ...m, question: { criteria, questionNo }, subPart: null }
                  : m
              ),
            }
          : mapping
      )
    );
  };

  // Handle sub-part selection for a specific mapping
  const handleSubPartChange = (cloNumber, mappingIndex, partNo) => {
    setCloMappings(
      cloMappings.map((mapping) =>
        mapping.cloNumber === cloNumber
          ? {
              ...mapping,
              mappings: mapping.mappings.map((m, idx) =>
                idx === mappingIndex ? { ...m, subPart: partNo ? { partNo } : null } : m
              ),
            }
          : mapping
      )
    );
  };

  // Get available questions for the selected measurement tools
  const getAvailableQuestions = (measurementTools) => {
    const questions = [];
    measurementTools.forEach((criteria) => {
      if (evalCriteria[criteria]?.questions) {
        evalCriteria[criteria].questions.forEach((q) => {
          questions.push({ criteria, questionNo: q.questionNo });
        });
      }
    });
    return questions;
  };

  // Get sub-parts for a selected question
  const getSubParts = (criteria, questionNo) => {
    const questions = evalCriteria[criteria]?.questions || [];
    const question = questions.find((q) => q.questionNo === questionNo);
    return question?.parts || [];
  };

  // Get max marks for a selected question or sub-part
  const getMaxMarks = (criteria, questionNo, subPart) => {
    const questions = evalCriteria[criteria]?.questions || [];
    const question = questions.find((q) => q.questionNo === questionNo);
    if (!question) return 0;
    if (subPart) {
      const part = question.parts.find((p) => p.partNo === subPart.partNo);
      return part?.maxMarks || 0;
    }
    return question.maxMarks || 0;
  };

  // Generate CSV columns (unchanged)
  const generateCSVColumns = () => {
    const criteriaKeys = Object.keys(evalCriteria).filter((key) => key !== '_id');
    if (!criteriaKeys.length) return [];
    const columns = [];
    criteriaKeys.forEach((criteria) => {
      const questions = evalCriteria[criteria]?.questions || [];
      questions.forEach((q) => {
        if (q.parts && q.parts.length > 0) {
          q.parts.forEach((p) => {
            columns.push({
              id: Date.now() + Math.random(),
              name: `${criteria}_Q${q.questionNo}_P${p.partNo}`,
            });
          });
        } else {
          columns.push({
            id: Date.now() + Math.random(),
            name: `${criteria}_Q${q.questionNo}`,
          });
        }
      });
    });
    closData.forEach((clo) => {
      columns.push({ id: Date.now() + Math.random(), name: `CLO${clo.cloNumber}` });
    });
    return columns;
  };

  // Transform cloMappings state into the backend-compatible cloQuestionMappings format
  const transformToCloQuestionMappings = () => {
    return cloMappings.map((mapping) => ({
      cloNumber: mapping.cloNumber,
      mappings: mapping.mappings
        .filter((m) => m.question) // Only include mappings with a selected question
        .map((m) => ({
          criteria: m.question.criteria,
          questionNo: m.question.questionNo,
          partNo: m.subPart ? m.subPart.partNo : null,
        })),
    }));
  };

  // Save the updated CLOs and mappings
  const handleSave = async () => {
    try {
      const cloQuestionMappings = transformToCloQuestionMappings();
      const payload = {
        subjectId: subject._id,
        CLOs: closData,
        evaluationSchema: evalCriteria,
        csvFormat: { columns: generateCSVColumns() },
        cloQuestionMappings, // Send the new field
      };
      const response = await axios.put(
        'http://localhost:5001/api/cc/evaluation',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchSubjectDetails();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert(
        error.response?.status === 403
          ? 'Forbidden: You may not have permission to update this subject.'
          : 'Error saving configuration.'
      );
    }
  };

  // Save and generate CSV
  const handleSaveAndGenerateCSV = async () => {
    try {
      await handleSave();
      const criteriaKeys = Object.keys(evalCriteria).filter((key) => key !== '_id');
      if (!criteriaKeys.length) {
        alert('No evaluation criteria available to generate CSV.');
        return;
      }
      const firstCriteria = criteriaKeys[0];
      const response = await axios.get(
        `http://localhost:5001/api/cc/generateTemplate?subjectId=${subject._id}&evalCriteria=${firstCriteria}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${firstCriteria}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert(
        error.response?.status === 401
          ? 'Not authorized: Please log in again.'
          : 'Error generating CSV.'
      );
    }
  };

  const criteriaKeys = Object.keys(evalCriteria).filter((key) => key !== '_id');

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        CLO Management for {subject?.subjectName || 'Loading...'}
      </Typography>

      {/* Defined CLOs Table with Editable Statements */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Defined CLOs
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>CLO No.</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>CLO Statement</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {closData.map((clo) => (
              <TableRow key={clo.cloNumber}>
                <TableCell>{clo.cloNumber}</TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    value={clo.cloStatement}
                    onChange={(e) =>
                      handleEditCLOStatement(clo.cloNumber, e.target.value)
                    }
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
            {!closData.length && (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No CLOs defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="New CLO Statement"
          variant="outlined"
          value={newCLOStatement}
          onChange={(e) => setNewCLOStatement(e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={handleAddCLO}>
          Add CLO
        </Button>
      </Stack>

      {/* New CLO Mapping Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          CLO Mapping
        </Typography>
        {closData.length > 0 && criteriaKeys.length > 0 ? (
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>CLO with Statement</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Measurement Tools</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Mapped Questions</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Subparts</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Marks</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {closData.map((clo) => {
                  const mapping = cloMappings.find((m) => m.cloNumber === clo.cloNumber) || {
                    measurementTools: [],
                    mappings: [],
                  };
                  const availableQuestions = getAvailableQuestions(mapping.measurementTools);

                  return (
                    <TableRow key={clo.cloNumber}>
                      <TableCell>
                        CLO{clo.cloNumber}: {clo.cloStatement}
                      </TableCell>
                      <TableCell>
                        <Select
                          multiple
                          value={mapping.measurementTools}
                          onChange={(e) =>
                            handleMeasurementToolsChange(clo.cloNumber, e.target.value)
                          }
                          renderValue={(selected) => (
                            <Stack direction="row" spacing={1}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Stack>
                          )}
                          displayEmpty
                          sx={{ minWidth: 200 }}
                        >
                          <MenuItem value="" disabled>
                            Select Measurement Tools
                          </MenuItem>
                          {criteriaKeys.map((criteria) => (
                            <MenuItem key={criteria} value={criteria}>
                              {criteria}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        {mapping.measurementTools.length === 0 ? (
                          <Typography variant="body2">Select measurement tools first</Typography>
                        ) : (
                          mapping.mappings.map((m, idx) => (
                            <Stack
                              key={idx}
                              direction="row"
                              spacing={2}
                              alignItems="center"
                              sx={{ mb: 1 }}
                            >
                              <Select
                                value={
                                  m.question
                                    ? `${m.question.criteria}_Q${m.question.questionNo}`
                                    : ''
                                }
                                onChange={(e) => {
                                  const [criteria, questionNo] = e.target.value.split('_Q');
                                  handleQuestionChange(
                                    clo.cloNumber,
                                    idx,
                                    criteria,
                                    parseInt(questionNo)
                                  );
                                }}
                                displayEmpty
                                sx={{ minWidth: 150 }}
                              >
                                <MenuItem value="" disabled>
                                  Select Question
                                </MenuItem>
                                {availableQuestions.map((q) => (
                                  <MenuItem
                                    key={`${q.criteria}_Q${q.questionNo}`}
                                    value={`${q.criteria}_Q${q.questionNo}`}
                                  >
                                    {q.criteria} Q{q.questionNo}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Stack>
                          ))
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.measurementTools.length === 0 ? (
                          ''
                        ) : (
                          mapping.mappings.map((m, idx) => {
                            const subParts =
                              m.question && mapping.measurementTools.length > 0
                                ? getSubParts(m.question.criteria, m.question.questionNo)
                                : [];
                            return (
                              <Stack
                                key={idx}
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Select
                                  value={m.subPart ? m.subPart.partNo : ''}
                                  onChange={(e) =>
                                    handleSubPartChange(clo.cloNumber, idx, e.target.value || null)
                                  }
                                  displayEmpty
                                  disabled={subParts.length === 0}
                                  sx={{ minWidth: 100 }}
                                >
                                  <MenuItem value="">None</MenuItem>
                                  {subParts.map((p) => (
                                    <MenuItem key={p.partNo} value={p.partNo}>
                                      {String.fromCharCode(97 + (p.partNo - 1))} ({p.maxMarks})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </Stack>
                            );
                          })
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.measurementTools.length === 0 ? (
                          ''
                        ) : (
                          mapping.mappings.map((m, idx) => {
                            const maxMarks =
                              m.question && mapping.measurementTools.length > 0
                                ? getMaxMarks(
                                    m.question.criteria,
                                    m.question.questionNo,
                                    m.subPart
                                  )
                                : 0;
                            return (
                              <Stack
                                key={idx}
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="body2">{maxMarks}</Typography>
                              </Stack>
                            );
                          })
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => handleAddMapping(clo.cloNumber)}
                          disabled={mapping.measurementTools.length === 0}
                        >
                          <Icon icon="mdi:plus" width={24} height={24} />
                        </IconButton>
                        {mapping.mappings.map((_, idx) => (
                          <Stack
                            key={idx}
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <IconButton
                              color="error"
                              onClick={() => handleRemoveMapping(clo.cloNumber, idx)}
                            >
                              <Icon icon="mdi:delete" width={24} height={24} />
                            </IconButton>
                          </Stack>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography>No CLOs or evaluation criteria defined yet.</Typography>
        )}

        {csvPreview && (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  {csvPreview.map((header, idx) => (
                    <TableCell key={idx}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Add sample rows here if needed */}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={handleSave}>
          Save
        </Button>
        <Button variant="contained" onClick={handleSaveAndGenerateCSV}>
          Save and Generate CSV
        </Button>
      </Stack>
    </Paper>
  );
}