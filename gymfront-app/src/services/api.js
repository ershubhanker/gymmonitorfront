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
    // Don't show toast for 403 on invoice - handled silently
    console.debug('Permission denied for invoice generation');
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

    // ============================================================
    // FIX: Handle 403 (Permission Denied) - DON'T show toast
    // ============================================================
    if (error.response?.status === 403) {
      // Only log for debugging, don't show toast
      console.debug('Access forbidden (permission denied):', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        detail: error.response?.data?.detail || 'Permission denied'
      });
      
      // Don't show toast - permissions are handled gracefully in UI
      // Just return the error so components can handle it silently
      return Promise.reject(error);
    }

    // Handle 422 (Validation Error) - don't show toast for permissions endpoint
    if (error.response?.status === 422) {
      // Don't show toast for permissions endpoint validation errors
      if (originalRequest?.url?.includes('/my-permissions')) {
        console.debug('Validation error on permissions endpoint (ignoring)');
        return Promise.reject(error);
      }
      // For other 422 errors, log but don't show toast unless it's a user action
      console.debug('Validation error:', error.response?.data);
      // Only show toast for 422 if it's not a permissions endpoint
      if (!originalRequest?.url?.includes('/permissions')) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') {
          toast.error(detail);
        } else if (Array.isArray(detail)) {
          const messages = detail.map(d => d.msg || d.message || 'Invalid input').join(', ');
          toast.error(messages);
        }
      }
      return Promise.reject(error);
    }

    // Handle 500 (Server Error)
    if (error.response?.status === 500) {
      console.error('Server error:', error.response?.data);
      toast.error('Server error. Please try again later.');
      return Promise.reject(error);
    }

    // Handle Network Errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle other errors (non-403, non-401)
    // Only show toast for errors that are not 403 or 401
    if (error.response?.status && error.response.status !== 403 && error.response.status !== 401) {
      const message = error.response?.data?.detail || error.response?.data?.message || error.message || 'Something went wrong';
      if (typeof message === 'string' && !message.startsWith('<!DOCTYPE')) {
        toast.error(message);
      }
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
// In api.js or wherever your API calls are defined

export const fetchMemberStatsOptimized = async () => {
  try {
    const response = await api.get('/gym/dashboard/stats/optimized');
    console.log('📊 Optimized stats response:', response.data);
    
    // Return the data with proper field mapping
    return {
      total_members: response.data.total_members || 0,
      active_members: response.data.active_members || 0,
      new_this_month: response.data.new_members_this_month || 0,  // ✅ Map correctly
      today_checkins: response.data.today_checkins || 0,
      total_revenue: response.data.total_revenue || 0,
      monthly_revenue: response.data.monthly_revenue || 0,
      revenue_growth: response.data.revenue_growth || 0,
      total_expenses: response.data.total_expenses || 0,
      monthly_expenses: response.data.monthly_expenses || 0,
      expense_growth: response.data.expense_growth || 0,
      net_profit: response.data.net_profit || 0,
      profit_margin: response.data.profit_margin || 0,
      expense_by_category: response.data.expense_by_category || {},
      average_attendance: response.data.average_attendance || 0,
      peak_hour: response.data.peak_hour || "5:00 PM - 7:00 PM",
      popular_class: response.data.popular_class || "HIIT Training",
      member_retention: response.data.member_retention || 87,
      trainer_count: response.data.trainer_count || 0,
      upcoming_classes: response.data.upcoming_classes || []
    };
  } catch (error) {
    console.error('Error fetching optimized stats:', error);
    return null;
  }
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


export const resendInvoiceWhatsApp = async (memberId) => {
  try {
    const response = await api.post(`/gym/members/${memberId}/invoice/resend-whatsapp`);
    return response.data;
  } catch (error) {
    console.error('Error resending invoice via WhatsApp:', error);
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