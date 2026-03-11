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

  // Check for existing session on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.get('/me');
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setInitialLoading(false);
    };
    
    loadUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log('Attempting login with:', { email });
      
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data) {
        // Store tokens
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        localStorage.setItem('user_role', response.data.user_role);
        if (response.data.gym_id) {
          localStorage.setItem('gym_id', response.data.gym_id);
        }
        
        // Get user details
        const userResponse = await api.get('/me');
        console.log('User details:', userResponse.data);
        
        setUser({
          ...userResponse.data,
          role: response.data.user_role,
          gymId: response.data.gym_id
        });
        
        toast.success('Login successful!');

        // Staff doesn't need setup, go directly to dashboard
        if (response.data.user_role === 'gym_staff') {
          return { success: true, data: response.data, needsSetup: false };
        }
        
        // Check if gym owner needs to complete setup
        if (response.data.user_role === 'gym_owner') {
          try {
            const setupResponse = await api.get('/gym/setup-status');
            // Return setup status along with success
            return { 
              success: true, 
              data: response.data,
              needsSetup: !setupResponse.data.setup_complete
            };
          } catch (error) {
            console.error('Error checking setup status:', error);
          }
        }
        
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
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
      console.log('Sending signup data:', userData);
      
      const payload = {
        email: userData.email,
        username: userData.username,
        full_name: userData.full_name,
        password: userData.password,
        role: "gym_owner", // Default role
        phone: userData.phone || null,
        gym_id: null
      };
      
      console.log('Signup payload:', payload);
      
      const response = await axios.post(`${API_BASE_URL}/signup`, payload);
      
      console.log('Signup response:', response.data);
      
      setTempEmail(userData.email);
      toast.success('Account created! Please check your email for verification OTP.');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
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
      const response = await axios.post(`${API_BASE_URL}/verify-email`, {
        email,
        otp
      });
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
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
        email
      });
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
        new_password: newPassword
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
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      toast.success('Logged out successfully');
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
    setTempEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};