// src/services/api.js

import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'https://api.gymmonitor.in';
// const API_BASE_URL = 'http://localhost:8001'; // for local host

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to extract filename from Content-Disposition header
function getFilename(response, defaultName) {
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      let filename = filenameMatch[1].replace(/['"]/g, '');
      // Ensure .pdf extension
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }
      return filename;
    }
  }
  return `invoice_${defaultName || Date.now()}.pdf`;
}

// Helper function to handle invoice errors
function handleInvoiceError(error) {
  if (error.response?.status === 404) {
    toast.error('Member not found');
  } else if (error.response?.status === 403) {
    toast.error('You do not have permission to generate this invoice');
  } else if (error.response?.status === 500) {
    toast.error('Server error while generating PDF. Please try again later.');
  } else if (error.message) {
    toast.error(error.message);
  } else {
    toast.error('Failed to generate invoice. Please try again.');
  }
}

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isRefreshCall = originalRequest.url?.includes('/refresh');
    const isLoginCall = originalRequest.url?.includes('/login');

    if (is401 && !alreadyRetried && !isRefreshCall && !isLoginCall) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/refresh`, {
          refresh_token: refreshToken,
        });

        if (response.data?.access_token) {
          localStorage.setItem('access_token', response.data.access_token);
          if (response.data.refresh_token) {
            localStorage.setItem('refresh_token', response.data.refresh_token);
          }
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response?.data);
      toast.error('You do not have permission to perform this action');
    }

    if (error.response?.status === 422) {
      console.error('Validation error:', error.response.data);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// ============================================================
// NEW OPTIMIZED ENDPOINTS - ADD THESE WITHOUT CHANGING ANYTHING ELSE
// ============================================================

/**
 * OPTIMIZED: Fetch members with pagination, search, and status filter
 * Uses the new optimized endpoint that reduces database queries
 */
export const fetchMembersOptimized = async (params = {}) => {
  const { search = '', status = 'all', page = 1, limit = 50 } = params;
  
  const queryParams = new URLSearchParams({
    skip: (page - 1) * limit,
    limit: Math.min(limit, 100),
    ...(search && search.trim() && { search: search.trim() }),
    ...(status !== 'all' && { status }),
  });

  const response = await api.get(`/gym/members/optimized?${queryParams}`);
  return response.data;
};

/**
 * OPTIMIZED: Fetch member statistics (total, active, new this month)
 */
export const fetchMemberStatsOptimized = async () => {
  const response = await api.get('/gym/dashboard/stats/optimized');
  return response.data;
};

/**
 * OPTIMIZED: Fetch balance overview with single aggregated query
 */
export const fetchBalanceOverviewOptimized = async () => {
  const response = await api.get('/gym/balance/overview');
  return response.data;
};

// ============================================================
// ORIGINAL ENDPOINTS - KEPT EXACTLY AS THEY WERE
// ============================================================

// FIXED: Working PDF download function
export const generateInvoicePDF = async (memberId) => {
  try {
    console.log('Generating invoice for member:', memberId);
    
    const response = await api.post(`/gym/members/${memberId}/invoice`, {}, {
      responseType: 'blob',
      timeout: 30000
    });
    
    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty response from server');
    }
    
    // Validate PDF BEFORE creating download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobText = await blob.slice(0, 4).text();
    
    if (blobText !== '%PDF') {
      console.error('Not a valid PDF. First 4 bytes:', blobText);
      // Try to parse as JSON error
      try {
        const errorText = await blob.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.detail || 'Server returned error instead of PDF');
      } catch (jsonError) {
        throw new Error('Server returned invalid PDF format');
      }
    }
    
    // Only create download link if PDF is valid
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFilename(response, memberId);
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    toast.success('Invoice downloaded successfully');
    return { success: true, filename: link.download };
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    handleInvoiceError(error);
    throw error;
  }
};

// Bulk invoice download
export const generateBulkInvoices = async (memberIds) => {
  try {
    console.log('Generating bulk invoices for members:', memberIds);
    
    const response = await api.post('/gym/members/invoices/bulk', memberIds, {
      responseType: 'blob',
      timeout: 60000 // 60 second timeout for bulk
    });
    
    let filename = `invoices_${new Date().toISOString().split('T')[0]}.zip`;
    const contentDisposition = response.headers['content-disposition'];
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    const blob = new Blob([response.data], { type: 'application/zip' });
    
    // Validate it's a zip file (starts with PK)
    const blobText = await blob.slice(0, 2).text();
    if (blobText !== 'PK') {
      console.error('Not a valid ZIP file. First 2 bytes:', blobText);
      try {
        const errorText = await blob.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.detail || 'Server returned error instead of ZIP');
      } catch (jsonError) {
        throw new Error('Server returned invalid ZIP format');
      }
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    toast.success('Bulk invoices downloaded successfully');
    return { success: true, filename };
    
  } catch (error) {
    console.error('Error generating bulk invoices:', error);
    toast.error(error.message || 'Failed to generate bulk invoices');
    throw error;
  }
};

// ============================================================
// KEEP ALL YOUR EXISTING EXPORTS AS THEY WERE
// ============================================================

// Default export - keep this as it was in your working version
export default api;

// Also export the api instance for direct use if needed
export { api };