import { useState, useCallback, useContext } from 'react';
import axios from 'axios';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { AuthContext } from 'src/context/AuthContext';

export function SignInView() {
  const router = useRouter();
  const { login } = useContext(AuthContext);  // from AuthContext

  const [showPassword, setShowPassword] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('teacher@college.edu');
  const [teacherPassword, setTeacherPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = useCallback(async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      // Call your backend /api/auth/login
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email: teacherEmail,
        password: teacherPassword,
      });

      // Example response structure: { token, user, message }
      const { token, user } = response.data;

      // Save token + user in AuthContext
      login(token, user);

      // Navigate to home or wherever
      router.push('/');
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || 'Login failed');
    }

    setLoading(false);
  }, [teacherEmail, teacherPassword, router, login]);

  const renderForm = (
    <Box display="flex" flexDirection="column" alignItems="flex-end">
      <TextField
        fullWidth
        name="teacherEmail"
        label="Teacher Email"
        value={teacherEmail}
        onChange={(e) => setTeacherEmail(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <Link variant="body2" color="inherit" sx={{ mb: 1.5 }}>
        Forgot password?
      </Link>

      <TextField
        fullWidth
        name="teacherPassword"
        label="Password"
        value={teacherPassword}
        onChange={(e) => setTeacherPassword(e.target.value)}
        InputLabelProps={{ shrink: true }}
        type={showPassword ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {errorMsg && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {errorMsg}
        </Typography>
      )}

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        color="inherit"
        variant="contained"
        loading={loading}
        onClick={handleLogin}
      >
        Log In
      </LoadingButton>
    </Box>
  );

  return (
    <>
      <Box gap={1.5} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 5 }}>
        <Typography variant="h5">Teacher Portal Login</Typography>
        <Typography variant="body2" color="text.secondary">
          Don't have an account?
          <Link variant="subtitle2" sx={{ ml: 0.5 }}>
            Contact Admin
          </Link>
        </Typography>
      </Box>

      {renderForm}

      <Divider sx={{ my: 3, '&::before, &::after': { borderTopStyle: 'dashed' } }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 'fontWeightMedium' }}
        >
          OR
        </Typography>
      </Divider>

      <Box gap={1} display="flex" justifyContent="center">
        <IconButton color="inherit">
          <Iconify icon="logos:google-icon" width={24} />
        </IconButton>
        <IconButton color="inherit">
          <Iconify icon="eva:github-fill" width={24} />
        </IconButton>
        <IconButton color="inherit">
          <Iconify icon="ri:twitter-x-fill" width={24} />
        </IconButton>
      </Box>
    </>
  );
}
