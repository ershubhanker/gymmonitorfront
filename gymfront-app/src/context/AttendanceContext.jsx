// src/context/AttendanceContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import attendanceApi from '../services/attendanceApi';
import api from '../services/api';
import toast from 'react-hot-toast';

const AttendanceContext = createContext();

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within AttendanceProvider');
  }
  return context;
};

export const AttendanceProvider = ({ children }) => {
  const [devices, setDevices] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [todayStats, setTodayStats] = useState({
    total_checkins: 0,
    unique_members: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [hasAttendancePermission, setHasAttendancePermission] = useState(true);
  
  const intervalRef = useRef(null);
  const isInitialized = useRef(false);
  const isActive = useRef(true);

  // Helper to check if error is 403 (permission denied)
  const isPermissionDenied = (error) => {
    return error?.response?.status === 403 || error?.status === 403;
  };

  // Helper to safely get error message
  const getErrorMessage = (error) => {
    return error?.response?.data?.detail || error?.message || 'An error occurred';
  };

  // Fetch devices - SILENT on 403
  const fetchDevices = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getDevices();
      setDevices(data);
      return data;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.debug('Permission denied for fetching devices');
        setDevices([]);
        return [];
      }
      console.error('Failed to fetch devices:', error);
      return [];
    }
  }, []);

  // Fetch today's stats - SILENT on 403
  const fetchTodayStats = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getTodayStats();
      setTodayStats(data || { total_checkins: 0, unique_members: 0, recent_activity: [] });
      setHasAttendancePermission(true);
      return data;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.debug('Permission denied for attendance stats');
        setTodayStats({ total_checkins: 0, unique_members: 0, recent_activity: [] });
        setHasAttendancePermission(false);
        return null;
      }
      console.error('Failed to fetch stats:', error);
      setTodayStats({ total_checkins: 0, unique_members: 0, recent_activity: [] });
      return null;
    }
  }, []);

  // Fetch recent attendance - SILENT on 403
  const fetchRecentAttendance = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getAttendanceRecords({ limit: 50 });
      setRecentAttendance(data.records || []);
      setLastFetchTime(new Date());
      setHasAttendancePermission(true);
      return data;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.debug('Permission denied for attendance records');
        setRecentAttendance([]);
        setHasAttendancePermission(false);
        return { records: [] };
      }
      console.error('Failed to fetch attendance:', error);
      setRecentAttendance([]);
      return { records: [] };
    }
  }, []);

  // Fetch new events - SILENT on 403
  const fetchNewEvents = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const data = await attendanceApi.getAttendanceRecords({ 
        limit: 20,
        start_date: oneHourAgo.toISOString().split('T')[0]
      });
      
      if (data.records && data.records.length > 0) {
        const newEvents = data.records.map(record => ({
          id: record.id,
          user_id: record.member_id,
          user_name: record.member_name,
          timestamp: record.created_at,
          event_type: record.event_type,
          verified: record.verified,
          device_serial: record.device_serial
        }));
        
        setLiveEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id));
          return [...uniqueNewEvents, ...prev].slice(0, 100);
        });
        setHasAttendancePermission(true);
      }
      return data;
    } catch (error) {
      if (isPermissionDenied(error)) {
        console.debug('Permission denied for new events');
        setHasAttendancePermission(false);
        return { records: [] };
      }
      console.error('Failed to fetch new events:', error);
      return { records: [] };
    }
  }, []);

  // Register new device - SHOW ERROR on 403
  const registerDevice = async (deviceData) => {
    setLoading(true);
    try {
      const device = await attendanceApi.registerDevice(deviceData);
      setDevices(prev => [...prev, device]);
      toast.success('Device registered successfully!');
      return { success: true, device };
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to register devices');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Delete device - SHOW ERROR on 403
  const deleteDevice = async (deviceId) => {
    setLoading(true);
    try {
      console.log('Deleting device:', deviceId);
      const result = await attendanceApi.deleteDevice(deviceId);
      console.log('Delete result:', result);
      
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      toast.success(result.message || 'Device deleted successfully');
      return { success: true, data: result };
    } catch (error) {
      console.error('Delete device error:', error);
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to delete devices');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Send command to device - SHOW ERROR on 403
  const sendCommand = async (command, params = {}) => {
    try {
      const result = await attendanceApi.sendDeviceCommand(command, params);
      toast.success(`Command sent: ${command}`);
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to send device commands');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    }
  };

  // Sync members to device - SHOW ERROR on 403
  const syncMembersToDevice = async (deviceId) => {
    toast.loading('Syncing members to device...', { id: 'sync' });
    try {
      const result = await attendanceApi.syncMembersToDevice(deviceId);
      toast.dismiss('sync');
      toast.success(`Sync initiated: ${result?.user_count || 0} members will be synced`);
      return { success: true, data: result };
    } catch (error) {
      toast.dismiss('sync');
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to sync members to devices');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    }
  };

  // Delete single attendance event - SHOW ERROR on 403
  const deleteAttendanceEvent = async (eventId) => {
    try {
      setLoading(true);
      const response = await api.delete(`/attendance/events/${eventId}`);
      
      if (response.status === 200) {
        setLiveEvents(prev => prev.filter(e => e.id !== eventId));
        setRecentAttendance(prev => prev.filter(r => r.id !== eventId));
        toast.success('Event deleted successfully');
        return { success: true };
      }
      return { success: false, error: 'Failed to delete event' };
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to delete attendance events');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Clear all events - SHOW ERROR on 403
  const clearAllEvents = async (date = null) => {
    try {
      setLoading(true);
      let url = '/attendance/events/clear/all';
      if (date) {
        url = `/attendance/events/clear?date=${date}`;
      }
      
      const response = await api.delete(url);
      
      if (response.status === 200) {
        if (date) {
          setLiveEvents(prev => prev.filter(e => {
            const eventDate = e?.timestamp?.split('T')[0];
            return eventDate !== date;
          }));
          setRecentAttendance(prev => prev.filter(r => {
            const recordDate = r?.created_at?.split('T')[0];
            return recordDate !== date;
          }));
          toast.success(`Cleared events from ${date}`);
        } else {
          setLiveEvents([]);
          setRecentAttendance([]);
          toast.success('All events cleared successfully');
        }
        return { success: true, message: response.data?.message || 'Events cleared' };
      }
      return { success: false, error: 'Failed to clear events' };
    } catch (error) {
      console.error('Error clearing events:', error);
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to clear attendance events');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Sync member to device - SHOW ERROR on 403
  const syncMemberToDevice = async (deviceId, member) => {
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/sync-member`, {
        id: member.id,
        full_name: member.full_name,
        phone: member.phone || '',
        email: member.email || '',
      });
      
      console.log('Sync response:', response.data);
      
      return {
        success: true,
        device_user_id: response.data.device_user_id || String(member.id),
        member: response.data.member,
        command_id: response.data.command_id,
        ...response.data
      };
    } catch (error) {
      console.error('Error syncing member to device:', error);
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to sync members to devices');
      } else {
        toast.error(errorMsg);
      }
      return {
        success: false,
        error: errorMsg
      };
    }
  };
  
  // Remove member from device - SHOW ERROR on 403
  const removeMemberFromDevice = async (deviceId, memberData) => {
    setLoading(true);
    try {
      const result = await attendanceApi.removeMemberFromDevice(deviceId, memberData);
      toast.success(`Member removed from device`);
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      if (isPermissionDenied(error)) {
        toast.error('You don\'t have permission to remove members from devices');
      } else {
        toast.error(errorMsg);
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh all data - SILENT on 403
  const refreshAllData = useCallback(async () => {
    // Don't show toast for refresh - it's automatic
    await Promise.allSettled([
      fetchDevices(),
      fetchTodayStats(),
      fetchRecentAttendance(),
      fetchNewEvents()
    ]);
    // Only show toast if user initiated refresh (not automatic)
  }, [fetchDevices, fetchTodayStats, fetchRecentAttendance, fetchNewEvents]);

  // Manual refresh with toast (user initiated)
  const manualRefresh = useCallback(async () => {
    await refreshAllData();
    toast.success('Attendance data refreshed');
  }, [refreshAllData]);

  // Start/Stop polling based on page visibility and authentication
  useEffect(() => {
    const shouldPoll = () => {
      const token = localStorage.getItem('access_token');
      const isLoginPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/signup' ||
                          window.location.pathname === '/' ||
                          window.location.pathname === '/forgot-password';
      return token && !isLoginPage;
    };

    if (!shouldPoll() || isInitialized.current) return;
    
    isInitialized.current = true;
    isActive.current = true;
    
    // Initial data load - silent
    refreshAllData();
    
    // Set up polling only if not on login page
    if (shouldPoll()) {
      intervalRef.current = setInterval(() => {
        if (isActive.current && shouldPoll()) {
          fetchNewEvents();
          fetchTodayStats();
        }
      }, 30000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isInitialized.current = false;
    };
  }, [refreshAllData, fetchNewEvents, fetchTodayStats]);

  // Listen for route changes to stop polling on login page
  useEffect(() => {
    const handleRouteChange = () => {
      const token = localStorage.getItem('access_token');
      const isLoginPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/signup' ||
                          window.location.pathname === '/' ||
                          window.location.pathname === '/forgot-password';
      
      if (isLoginPage || !token) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isActive.current = false;
      } else if (!intervalRef.current && token) {
        isActive.current = true;
        intervalRef.current = setInterval(() => {
          if (isActive.current) {
            fetchNewEvents();
            fetchTodayStats();
          }
        }, 30000);
      }
    };

    // Watch for pathname changes
    const observer = new MutationObserver(() => {
      handleRouteChange();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    handleRouteChange();
    
    return () => observer.disconnect();
  }, [fetchNewEvents, fetchTodayStats]);

  const value = {
    devices,
    recentAttendance,
    liveEvents,
    todayStats,
    loading,
    lastFetchTime,
    hasAttendancePermission,
    registerDevice,
    deleteDevice,
    sendCommand,
    syncMembersToDevice,
    refreshAllData: manualRefresh,
    fetchDevices,
    fetchTodayStats,
    fetchRecentAttendance,
    deleteAttendanceEvent,
    clearAllEvents,
    attendanceApi,
    syncMemberToDevice,
    removeMemberFromDevice,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};