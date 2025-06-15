// src/pages/EvaluationSetupPage.jsx
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
  MenuItem,
} from '@mui/material';
import axios from 'axios';
import { AuthContext } from 'src/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function EvaluationSetupPage() {
  const { token, user } = React.useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.coordinatorFor) {
      navigate('/access-denied');
    }
  }, [user, navigate]);

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evalCriteria, setEvalCriteria] = useState({});
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState('');
  const [newQuestion, setNewQuestion] = useState({ maxMarks: '', numParts: '', partMarks: [] });
  const [error, setError] = useState('');

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
      setEvalCriteria(fetchedSubject.evaluationSchema || {});
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

  const handleAddCriteria = () => {
    if (!newCriteriaName.trim() || newCriteriaName === '_id') {
      setError('Criteria name cannot be empty or "_id"');
      return;
    }
    setEvalCriteria({
      ...evalCriteria,
      [newCriteriaName]: { totalMarks: 0, weightage: 0, questions: [] },
    });
    setSelectedCriteria(newCriteriaName);
    setNewCriteriaName('');
    setError('');
  };

  const handleEvalCriteriaChange = (field, value) => {
    if (selectedCriteria) {
      const numValue = parseFloat(value);
      if (!/^\d*\.?\d*$/.test(value) || numValue < 0) {
        setError(`${field} must be a positive number`);
        return;
      }
      if (field === 'weightage' && numValue > 100) {
        setError('Weightage cannot exceed 100%');
        return;
      }
      setEvalCriteria({
        ...evalCriteria,
        [selectedCriteria]: {
          ...evalCriteria[selectedCriteria],
          [field]: numValue || 0,
        },
      });
      setError('');
    }
  };

  const handleNumPartsChange = (value) => {
    const numParts = parseInt(value) || 0;
    if (!/^\d*$/.test(value) || numParts < 0) {
      setError('Number of parts must be a non-negative integer');
      return;
    }
    setNewQuestion({
      ...newQuestion,
      numParts: value,
      partMarks: Array(numParts).fill(''),
    });
    setError('');
  };

  const handlePartMarkChange = (index, value) => {
    if (!/^\d*\.?\d*$/.test(value)) {
      setError('Part marks must be a positive number');
      return;
    }
    const partMarks = parseFloat(value);
    if (partMarks < 0) {
      setError('Part marks must be non-negative');
      return;
    }
    const updatedPartMarks = [...newQuestion.partMarks];
    updatedPartMarks[index] = value;
    setNewQuestion({ ...newQuestion, partMarks: updatedPartMarks });
    setError('');
  };

  const handleAddQuestion = () => {
    if (!selectedCriteria || !newQuestion.maxMarks) {
      setError('Please enter max marks for the question');
      return;
    }

    const maxMarks = parseFloat(newQuestion.maxMarks);
    if (!/^\d*\.?\d*$/.test(newQuestion.maxMarks) || maxMarks <= 0) {
      setError('Max marks must be a positive number');
      return;
    }

    const numParts = parseInt(newQuestion.numParts) || 0;
    if (numParts > 0) {
      const partsSum = newQuestion.partMarks.reduce((sum, mark) => sum + (parseFloat(mark) || 0), 0);
      if (partsSum !== maxMarks) {
        setError('Sum of sub-part marks must equal question max marks');
        return;
      }
      if (newQuestion.partMarks.some(mark => !mark || parseFloat(mark) <= 0)) {
        setError('All part marks must be positive numbers');
        return;
      }
    }

    const currentQuestions = evalCriteria[selectedCriteria].questions;
    const totalMarks = parseFloat(evalCriteria[selectedCriteria].totalMarks) || 0;
    const currentTotal = currentQuestions.reduce((sum, q) => sum + q.maxMarks, 0);

    if (currentTotal + maxMarks > totalMarks) {
      setError(`Total question marks (${currentTotal + maxMarks}) cannot exceed total marks (${totalMarks})`);
      return;
    }

    const question = {
      questionNo: currentQuestions.length + 1,
      maxMarks,
      parts: numParts > 0 ? newQuestion.partMarks.map((mark, idx) => ({
        partNo: idx + 1,
        maxMarks: parseFloat(mark),
      })) : [],
      weightage: totalMarks > 0 
        ? ((maxMarks / totalMarks) * (evalCriteria[selectedCriteria].weightage || 0)).toFixed(2) 
        : 0,
    };

    setEvalCriteria({
      ...evalCriteria,
      [selectedCriteria]: {
        ...evalCriteria[selectedCriteria],
        questions: [...currentQuestions, question],
      },
    });
    setNewQuestion({ maxMarks: '', numParts: '', partMarks: [] });
    setError('');
  };

  const handleSave = async () => {
    if (!selectedCriteria) {
      setError('Please select an evaluation criteria');
      return;
    }

    const criteria = evalCriteria[selectedCriteria];
    const totalMarks = parseFloat(criteria.totalMarks) || 0;
    const currentTotal = criteria.questions.reduce((sum, q) => sum + q.maxMarks, 0);

    if (totalMarks <= 0) {
      setError('Total marks must be greater than 0');
      return;
    }

    if (currentTotal !== totalMarks) {
      setError(`Total question marks (${currentTotal}) must equal total marks (${totalMarks})`);
      return;
    }

    if (!criteria.weightage || criteria.weightage <= 0) {
      setError('Weightage must be greater than 0');
      return;
    }

    try {
      const payload = {
        subjectId: subject._id,
        CLOs: subject.CLOs || [],
        evaluationSchema: evalCriteria,
        csvFormat: subject.csvFormat || { columns: [] },
      };
      const response = await axios.put(
        'http://localhost:5001/api/cc/evaluation',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchSubjectDetails();
      setError('');
    } catch (error) {
      console.error('Error saving evaluation settings:', error);
      alert(error.response?.status === 403
        ? 'Forbidden: You may not have permission to update this subject.'
        : 'Error saving evaluation settings.');
    }
  };

  const criteriaKeys = Object.keys(evalCriteria).filter(key => key !== '_id');

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
        Evaluation Setup for {subject?.subjectName || 'Loading...'}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="New Evaluation Criteria Name"
          value={newCriteriaName}
          onChange={(e) => setNewCriteriaName(e.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={handleAddCriteria}>Add Criteria</Button>
      </Stack>

      {criteriaKeys.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            label="Select Evaluation Criteria"
            value={selectedCriteria}
            onChange={(e) => setSelectedCriteria(e.target.value)}
            fullWidth
          >
            {criteriaKeys.map((criteria) => (
              <MenuItem key={criteria} value={criteria}>{criteria}</MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      {selectedCriteria && (
        <>
          <TextField
            label="Total Marks"
            type="number"
            value={evalCriteria[selectedCriteria].totalMarks || ''}
            onChange={(e) => handleEvalCriteriaChange('totalMarks', e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Weightage (%)"
            type="number"
            value={evalCriteria[selectedCriteria].weightage || ''}
            onChange={(e) => handleEvalCriteriaChange('weightage', e.target.value)}
            inputProps={{ min: 0, max: 100, step: 1 }}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Questions</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Question No.</TableCell>
                  <TableCell>Max Marks</TableCell>
                  <TableCell>Parts</TableCell>
                  <TableCell>Weightage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evalCriteria[selectedCriteria].questions.map((q) => (
                  <TableRow key={q.questionNo}>
                    <TableCell>{q.questionNo}</TableCell>
                    <TableCell>{q.maxMarks}</TableCell>
                    <TableCell>
                      {q.parts.length > 0
                        ? q.parts.map((p) => `P${p.partNo} (${p.maxMarks})`).join(', ')
                        : 'None'}
                    </TableCell>
                    <TableCell>{q.weightage}</TableCell>
                  </TableRow>
                ))}
                {!evalCriteria[selectedCriteria].questions.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No questions defined.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Question Max Marks"
              type="number"
              value={newQuestion.maxMarks}
              onChange={(e) => setNewQuestion({ ...newQuestion, maxMarks: e.target.value })}
              inputProps={{ min: 0, step: 1 }}
            />
            <TextField
              label="Number of Parts"
              type="number"
              value={newQuestion.numParts}
              onChange={(e) => handleNumPartsChange(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
            />
            <Button variant="contained" onClick={handleAddQuestion}>Add Question</Button>
          </Stack>
          {newQuestion.numParts > 0 && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              {newQuestion.partMarks.map((mark, idx) => (
                <TextField
                  key={idx}
                  label={`Part ${idx + 1} Marks`}
                  type="number"
                  value={mark}
                  onChange={(e) => handlePartMarkChange(idx, e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  sx={{ width: '200px' }}
                />
              ))}
              <Typography variant="body2">
                Parts: {newQuestion.partMarks.join(', ')}
              </Typography>
            </Stack>
          )}
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
        </>
      )}

      <Button variant="contained" onClick={handleSave}>Save Evaluation Settings</Button>
    </Paper>
  );
}