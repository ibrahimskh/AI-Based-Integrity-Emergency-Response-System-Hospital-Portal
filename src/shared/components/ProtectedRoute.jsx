import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './States';

export default function ProtectedRoute({ role, children, loginPath }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="min-h-screen flex items-center justify-center bg-lifeline-bg"><Spinner label="Checking session…" /></div>;
  }
  if (!user || user.role !== role) {
    return <Navigate to={loginPath} replace />;
  }
  return children;
}
