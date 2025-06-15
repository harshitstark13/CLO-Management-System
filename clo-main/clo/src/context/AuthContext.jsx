import { createContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the shape of the context value
export const AuthContext = createContext({
  token: null,
  user: null,
  role: null, // Added role
  coordinatorFor: null, // Added coordinatorFor
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  // Initialize state from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const navigate = useNavigate();

  const login = useCallback((jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('jwt', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  // Extract role and coordinatorFor from user object
  const role = user?.role || null;
  const coordinatorFor = user?.coordinatorFor || null;

  const value = {
    token,
    user,
    role, // Explicitly provide role
    coordinatorFor, // Explicitly provide coordinatorFor
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}