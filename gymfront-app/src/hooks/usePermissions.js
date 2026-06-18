// src/hooks/usePermissions.js
import { useState, useEffect } from 'react';
import api from '../services/api';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyPermissions();
  }, []);

  const fetchMyPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/gym/staff/my-permissions');
      setPermissions(response.data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // If endpoint doesn't exist, default to empty permissions (no access)
      setPermissions([]);
      setError(error.response?.data?.detail || 'Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(p => permissions.includes(p));
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: fetchMyPermissions,
  };
};