import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext();

// const API_BASE_URL = 'https://api.gymmonitor.in';
const API_BASE_URL = 'http://localhost:8001';

export const useAuth = () => { 
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tempEmail, setTempEmail] = useState('');

  // ─── Restore session on mount ───────────────────────────────────────────────
  // FIX: Previously any error during /me (including network blips) would call
  // localStorage.clear() and log the user out. Now we only clear tokens if the
  // server explicitly returns 401 (invalid/expired token). All other errors
  // (500, network timeout, etc.) leave the tokens intact so the user stays
  // logged in after a page refresh.
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        // No token at all — nothing to restore
        setInitialLoading(false);
        return;
      }

      try {
        const response = await api.get('/me');
        const storedRole = localStorage.getItem('user_role');
        setUser({
          ...response.data,
          role: storedRole || response.data.role,
        });
      } catch (err) {
        const status = err.response?.status;

        if (status === 401) {
          // Token is genuinely invalid / expired — clear everything
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_role');
          localStorage.removeItem('gym_id');
        }
        // For any other error (network down, 500, etc.) we intentionally do
        // NOT clear the tokens. The user's session is preserved and they will
        // remain logged in — the api interceptor will refresh the token if
        // needed on the next real request.
      } finally {
        setInitialLoading(false);
      }
    };

    loadUser();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { email, password });

      if (response.data) {
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        localStorage.setItem('user_role', response.data.user_role);
        if (response.data.gym_id) {
          localStorage.setItem('gym_id', response.data.gym_id);
        }

        const userResponse = await api.get('/me');
        setUser({
          ...userResponse.data,
          role: response.data.user_role,
          gymId: response.data.gym_id,
        });

        toast.success('Login successful!');

        const role = response.data.user_role;

        if (role === 'super_admin') {
          return { success: true, data: response.data, redirect: '/admin' };
        }

        if (role === 'gym_staff') {
          return { success: true, data: response.data, redirect: '/dashboard' };
        }

        if (role === 'gym_owner') {
          try {
            const setupResponse = await api.get('/gym/setup-status');
            const needsSetup = !setupResponse.data.setup_complete;
            return {
              success: true,
              data: response.data,
              redirect: needsSetup ? '/gym-setup' : '/dashboard',
            };
          } catch {
            return { success: true, data: response.data, redirect: '/gym-setup' };
          }
        }

        return { success: true, data: response.data, redirect: '/dashboard' };
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      const payload = {
        email: userData.email,
        username: userData.username,
        full_name: userData.full_name,
        password: userData.password,
        role: 'gym_owner',
        phone: userData.phone || null,
        gym_id: null,
      };
      const response = await axios.post(`${API_BASE_URL}/signup`, payload);
      setTempEmail(userData.email);
      toast.success('Account created! Please check your email for verification OTP.');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Signup failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email, otp) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-email`, { email, otp });
      toast.success('Email verified successfully! You can now login.');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Verification failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
      setTempEmail(email);
      toast.success('OTP sent to your email!');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to send OTP. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, {
        email,
        otp,
        new_password: newPassword,
      });
      toast.success('Password reset successfully!');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reset password. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/logout', { refresh_token: refreshToken });
      }
    } catch { /* ignore */ } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('gym_id');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateCurrencySymbol = async (symbol) => {
    try {
      await api.put('/me/preferences', { currency_symbol: symbol });
      setUser(prev => ({ ...prev, currency_symbol: symbol }));
      toast.success('Currency preference saved!');
      return { success: true };
    } catch (error) {
      toast.error('Failed to save currency preference');
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    initialLoading,
    tempEmail,
    login,
    signup,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    updateCurrencySymbol,
    setTempEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};