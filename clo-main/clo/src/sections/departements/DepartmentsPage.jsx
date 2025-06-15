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
  CircularProgress,
} from '@mui/material';
import { AuthContext } from 'src/context/AuthContext';

export default function DepartmentsPage() {
  const { token } = useContext(AuthContext);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5001/api/admin/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Map the array of strings to objects with _id for table rendering
      setDepartments(response.data.map((name, index) => ({ _id: `${index}`, name })));
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch departments');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchDepartments();
    }
  }, [fetchDepartments, token]);

  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setOpenAddModal(true);
    setNewDepartment('');
  };

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
    setNewDepartment('');
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) {
      alert('Department name is required');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:5001/api/admin/departments',
        { name: newDepartment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Add Department Response:', response.data); // Debug log
      await fetchDepartments(); // Fetch updated list
      handleCloseAddModal();
      alert('Department added successfully');
    } catch (err) {
      console.error('Error adding department:', err.response?.data || err);
      alert(err.response?.data?.message || 'Failed to add department');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    const deptName = departments.find((d) => d._id === deptId)?.name;
    if (!window.confirm(`Are you sure you want to delete ${deptName} and all its subjects?`)) return;
    try {
      await axios.delete(`http://localhost:5001/api/admin/departments/${deptName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(departments.filter((d) => d._id !== deptId));
      alert('Department and its subjects deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Departments Management
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search Departments"
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
          Add Department
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
                <TableCell sx={{ fontWeight: 'bold' }}>Department ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => (
                  <TableRow key={dept._id}>
                    <TableCell>{dept._id}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteDepartment(dept._id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Department Modal */}
      <Dialog open={openAddModal} onClose={handleCloseAddModal} fullWidth maxWidth="sm">
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Department Name"
              variant="outlined"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddModal}>Cancel</Button>
          <Button onClick={handleAddDepartment} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}