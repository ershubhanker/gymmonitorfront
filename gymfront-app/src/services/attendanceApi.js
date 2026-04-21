// src/services/attendanceApi.js
import api from './api';

const attendanceApi = {
  // Device Management
  registerDevice: async (deviceData) => {
    const response = await api.post('/attendance/devices/register', deviceData);
    return response.data;
  },

  getDevices: async () => {
    const response = await api.get('/attendance/devices');
    return response.data;
  },

  deleteDevice: async (deviceId) => {
    const response = await api.delete(`/attendance/devices/${deviceId}`);
    return response.data;
  },

  updateDevice: async (deviceId, deviceData) => {
    const response = await api.put(`/attendance/devices/${deviceId}`, deviceData);
    return response.data;
  },

  // API Key Management
  getDeviceApiKey: async (deviceId) => {
    const response = await api.get(`/attendance/devices/${deviceId}/api-key`);
    return response.data;
  },

  regenerateApiKey: async (deviceId) => {
    const response = await api.post(`/attendance/devices/${deviceId}/regenerate-api-key`);
    return response.data;
  },

  validateApiKey: async (apiKey) => {
    const response = await api.post('/attendance/devices/validate-api-key', {}, {
      headers: { 'X-API-Key': apiKey }
    });
    return response.data;
  },

  getBridgeConfig: async (deviceId) => {
    const response = await api.get(`/attendance/devices/${deviceId}/bridge-config`);
    return response.data;
  },

  // Attendance Records
  getAttendanceRecords: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/attendance/records?${queryParams}`);
    return response.data;
  },

  getTodayStats: async () => {
    const response = await api.get('/attendance/stats/today');
    return response.data;
  },

  getMemberAttendance: async (memberId, startDate, endDate) => {
    let url = `/attendance/member/${memberId}`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;
    const response = await api.get(url);
    return response.data;
  },

  getStaffWorkingHours: async (startDate, endDate) => {
    let url = '/attendance/staff-hours';
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += `?${params.join('&')}`;
    const response = await api.get(url);
    return response.data;
  },

  // Device Commands (sent via bridge)
  sendDeviceCommand: async (command, params = {}) => {
    const response = await api.post('/attendance/device/command', { command, params });
    return response.data;
  },

  // Sync Operations
  syncMembersToDevice: async (deviceId) => {
    const response = await api.post(`/attendance/devices/${deviceId}/sync-members`);
    return response.data;
  },

  // Get device info
  getDeviceInfo: async (deviceId) => {
    const response = await api.get(`/attendance/devices/${deviceId}/info`);
    return response.data;
  },

  // ADD THIS METHOD - Fix for Members.jsx
  getMembers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/gym/members?${queryParams}`);
    return response.data;
  },

  // ADD THIS METHOD - Fix for Balance.jsx
  getMembersWithBalance: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/gym/members/balances?${queryParams}`);
    return response.data;
  },

  // ADD THIS METHOD - Fix for Payments.jsx
  getPayments: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/gym/payments?${queryParams}`);
    return response.data;
  },

  getBalanceOverview: async () => {
    const response = await api.get('/gym/balance/overview');
    return response.data;
  },


  // Sync single member to device
  syncMemberToDevice: async (deviceId, memberData) => {
    const response = await api.post(`/attendance/devices/${deviceId}/sync-member`, memberData);
    return response.data;
  },
  
  // Remove member from device
  removeMemberFromDevice: async (deviceId, memberData) => {
    const response = await api.post(`/attendance/devices/${deviceId}/remove-member`, memberData);
    return response.data;
  },
  
  // Bulk sync members to device
  bulkSyncMembersToDevice: async (deviceId, memberIds) => {
    const response = await api.post(`/attendance/devices/${deviceId}/bulk-sync-members`, memberIds);
    return response.data;
  },

  getDeviceApiKey: async (deviceId) => {
    const response = await api.get(`/attendance/devices/${deviceId}/api-key`);
    return response.data;
  },

  
};

export default attendanceApi;