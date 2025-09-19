// src/components/RequireAdmin.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // while auth is loading, don't flicker
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-400">
        Checking permissions…
      </div>
    );
  }

  // not logged in ⇒ send to login (or home)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // logged in but not admin ⇒ block
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
