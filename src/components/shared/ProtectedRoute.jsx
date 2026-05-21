// src/components/shared/ProtectedRoute.jsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui';

// Any authenticated user (staff or customer)
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner message="Authenticating…" />;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

// Staff only (teller / manager / admin)
export const StaffRoute = ({ children }) => {
  const { isStaff, loading } = useAuth();
  if (loading)  return <LoadingSpinner />;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return children;
};

// Manager or admin only
export const ManagerRoute = ({ children }) => {
  const { isManager, loading } = useAuth();
  if (loading)    return <LoadingSpinner />;
  if (!isManager) return <Navigate to="/dashboard" replace />;
  return children;
};

// Admin only
export const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading)  return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};
