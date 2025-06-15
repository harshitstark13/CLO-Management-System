import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from 'src/context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }
  
  return children;
}
