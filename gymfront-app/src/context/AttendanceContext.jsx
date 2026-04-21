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
  
  const intervalRef = useRef(null);
  const isInitialized = useRef(false);
  const isActive = useRef(true); // ✅ Track if component is active

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  }, []);

  // Fetch today's stats
  const fetchTodayStats = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getTodayStats();
      setTodayStats(data || { total_checkins: 0, unique_members: 0, recent_activity: [] });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setTodayStats({ total_checkins: 0, unique_members: 0, recent_activity: [] });
    }
  }, []);

  // Fetch recent attendance
  const fetchRecentAttendance = useCallback(async () => {
    if (!isActive.current) return;
    try {
      const data = await attendanceApi.getAttendanceRecords({ limit: 50 });
      setRecentAttendance(data.records || []);
      setLastFetchTime(new Date());
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setRecentAttendance([]);
    }
  }, []);

  // Fetch new events
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
      }
    } catch (error) {
      console.error('Failed to fetch new events:', error);
    }
  }, []);

  // Register new device
  const registerDevice = async (deviceData) => {
    setLoading(true);
    try {
      const device = await attendanceApi.registerDevice(deviceData);
      setDevices(prev => [...prev, device]);
      toast.success('Device registered successfully!');
      return { success: true, device };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Registration failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Delete device
  const deleteDevice = async (deviceId) => {
    setLoading(true);
    try {
      console.log('Deleting device:', deviceId);
      const result = await attendanceApi.deleteDevice(deviceId);
      console.log('Delete result:', result);
      
      // Update local state
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      toast.success(result.message || 'Device deleted successfully');
      return { success: true, data: result };
    } catch (error) {
      console.error('Delete device error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Delete failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Send command to device
  const sendCommand = async (command, params = {}) => {
    try {
      const result = await attendanceApi.sendDeviceCommand(command, params);
      toast.success(`Command sent: ${command}`);
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Command failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Sync members to device
  const syncMembersToDevice = async (deviceId) => {
    toast.loading('Syncing members to device...', { id: 'sync' });
    try {
      const result = await attendanceApi.syncMembersToDevice(deviceId);
      toast.dismiss('sync');
      toast.success(`Sync initiated: ${result?.user_count || 0} members will be synced`);
      return { success: true, data: result };
    } catch (error) {
      toast.dismiss('sync');
      const errorMsg = error.response?.data?.detail || 'Sync failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Delete single attendance event
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
      const errorMsg = error.response?.data?.detail || 'Delete failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Clear all events
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
      const errorMsg = error.response?.data?.detail || 'Clear failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const syncMemberToDevice = async (deviceId, member) => {
    try {
      const response = await api.post(`/attendance/devices/${deviceId}/sync-member`, {
        id: member.id,
        full_name: member.full_name,
        phone: member.phone || '',
        email: member.email || '',
      });
      
      // Log the response to see what's coming back
      console.log('Sync response:', response.data);
      
      // Return the full response including device_user_id
      return {
        success: true,
        device_user_id: response.data.device_user_id || String(member.id),
        member: response.data.member,
        command_id: response.data.command_id,
        ...response.data
      };
    } catch (error) {
      console.error('Error syncing member to device:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to sync member'
      };
    }
  };
  
  // Remove member from device
  const removeMemberFromDevice = async (deviceId, memberData) => {
    setLoading(true);
    try {
      const result = await attendanceApi.removeMemberFromDevice(deviceId, memberData);
      toast.success(`Member removed from device`);
      return { success: true, data: result };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Removal failed';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };
  

  // Manual refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchDevices(),
      fetchTodayStats(),
      fetchRecentAttendance(),
      fetchNewEvents()
    ]);
    toast.success('Data refreshed');
  }, [fetchDevices, fetchTodayStats, fetchRecentAttendance, fetchNewEvents]);

  // ✅ Start/Stop polling based on page visibility and authentication
  useEffect(() => {
    // Don't start polling on login page or if not authenticated
    const shouldPoll = () => {
      const token = localStorage.getItem('access_token');
      const isLoginPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/signup' ||
                          window.location.pathname === '/';
      return token && !isLoginPage;
    };

    if (!shouldPoll() || isInitialized.current) return;
    
    isInitialized.current = true;
    isActive.current = true;
    
    // Initial data load
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

  // ✅ Listen for route changes to stop polling on login page
  useEffect(() => {
    const handleRouteChange = () => {
      const token = localStorage.getItem('access_token');
      const isLoginPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/signup' ||
                          window.location.pathname === '/' ||
                          window.location.pathname === '/forgot-password';
      
      if (isLoginPage || !token) {
        // Stop polling on login/unauthorized pages
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isActive.current = false;
      } else if (!intervalRef.current && token) {
        // Restart polling on protected pages
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
    
    // Initial check
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
    registerDevice,
    deleteDevice,
    sendCommand,
    syncMembersToDevice,
    refreshAllData,
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