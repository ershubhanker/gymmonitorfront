// src/components/attendance/LiveMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, UserCheck, Users, Wifi, WifiOff, CheckCircle, XCircle, 
  RefreshCw, Trash2, AlertTriangle, X, Filter, Calendar,
  UserPlus, Search, Clock, Briefcase, User
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Helper function to format time in IST - FIXED for staff timestamps
const formatInIST = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const timestampStr = typeof timestamp === 'string' ? timestamp : String(timestamp);
    
    // Create date object from timestamp
    const date = new Date(timestampStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return String(timestamp);
    }
    
    // Check if the timestamp already has timezone info
    // If it contains 'Z' or '+', it's already in UTC or has timezone
    const hasTimezone = timestampStr.includes('Z') || timestampStr.includes('+');
    
    let istDate;
    if (hasTimezone) {
      // If it has timezone info, convert to IST by adding 5:30
      istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    } else {
      // If no timezone info, it might be stored as IST already
      // Just use it as-is without adding offset
      istDate = new Date(date.getTime());
    }
    
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    let hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  } catch (e) {
    console.warn('Error formatting timestamp:', timestamp, e);
    return String(timestamp);
  }
};

// Helper function to format date only in IST
const formatDateOnlyIST = (timestamp) => {
  if (!timestamp) return '';
  try {
    const timestampStr = typeof timestamp === 'string' ? timestamp : String(timestamp);
    const date = new Date(timestampStr);
    if (isNaN(date.getTime())) return '';
    
    const hasTimezone = timestampStr.includes('Z') || timestampStr.includes('+');
    
    let istDate;
    if (hasTimezone) {
      istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    } else {
      istDate = new Date(date.getTime());
    }
    
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

// Helper to format date for display
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
};

const LiveMonitoring = () => {
  const { 
    liveEvents = [], 
    todayStats = {}, 
    devices = [], 
    refreshAllData, 
    lastFetchTime, 
    loading,
    deleteAttendanceEvent,
    clearAllEvents
  } = useAttendance();
  
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'staff'
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  
  // Staff Live Events - Separate state for staff events
  const [staffLiveEvents, setStaffLiveEvents] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  
  // Staff Stats
  const [staffStats, setStaffStats] = useState({ total_checkins: 0, unique_staff: 0 });
  
  // Manual Attendance States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualMembers, setManualMembers] = useState([]);
  const [manualStaff, setManualStaff] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [manualEventType, setManualEventType] = useState('check_in');
  const [manualDateTime, setManualDateTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Sync loading state
  const [syncing, setSyncing] = useState(false);

  // Helper function to safely get user_id as string
  const getUserIdAsString = (event) => {
    if (!event) return '';
    const userId = event.user_id;
    if (userId === null || userId === undefined) return '';
    return String(userId);
  };

  // Helper function to check if event is staff based on user_id prefix
  const isStaffUser = (event) => {
    const userId = getUserIdAsString(event);
    return userId.startsWith('S');
  };

  // Helper function to check if event type is staff event
  const isStaffEventType = (eventType) => {
    return eventType === 'staff_check_in' || eventType === 'staff_check_out';
  };

  // Helper function to check if event is staff (either by user_id or event_type)
  const isStaffEvent = (event) => {
    if (!event) return false;
    if (isStaffUser(event)) return true;
    if (isStaffEventType(event?.event_type)) return true;
    return false;
  };

  // ===== FIXED: Fetch staff live events =====
  const fetchStaffLiveEvents = async () => {
    setStaffLoading(true);
    try {
      const response = await api.get('/attendance/staff/attendance', {
        params: { limit: 100 }
      });
      
      if (response.data) {
        // Convert to live event format - preserve original timestamp
        const events = (response.data.records || []).map(record => ({
          id: record.id,
          user_id: `S${record.staff_id}`,
          user_name: record.staff_name || 'Unknown Staff',
          // Preserve the original timestamp as it came from the server
          timestamp: record.created_at || record.check_in_time || record.timestamp,
          event_type: record.event_type || 'check_in',
          verified: record.verified !== undefined ? record.verified : true,
          device_serial: record.device_serial || 'N/A'
        }));
        setStaffLiveEvents(events);
        
        // Also update staff stats from the response
        if (response.data.total !== undefined) {
          setStaffStats({
            total_checkins: response.data.total || 0,
            unique_staff: response.data.unique_staff || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching staff live events:', error);
      try {
        const statsResponse = await api.get('/attendance/stats/by-type');
        setStaffStats(statsResponse.data?.staff || { total_checkins: 0, unique_staff: 0 });
      } catch (statsError) {
        console.error('Error fetching staff stats:', statsError);
        setStaffStats({ total_checkins: 0, unique_staff: 0 });
      }
      setStaffLiveEvents([]);
    } finally {
      setStaffLoading(false);
    }
  };

  // Fetch staff stats only
  const fetchStaffStatsOnly = async () => {
    try {
      const response = await api.get('/attendance/stats/by-type');
      setStaffStats(response.data?.staff || { total_checkins: 0, unique_staff: 0 });
    } catch (error) {
      console.error('Error fetching staff stats:', error);
      setStaffStats({ total_checkins: 0, unique_staff: 0 });
    }
  };

  // ===== UPDATED: Refresh function that triggers attendance sync =====
  const handleRefresh = async () => {
    setSyncing(true);
    toast.loading('🔄 Syncing attendance from device...', { id: 'attendance-sync' });
    
    try {
      const syncResponse = await api.post('/attendance/sync-attendance');
      
      if (syncResponse.data.success) {
        console.log('✅ Attendance sync triggered:', syncResponse.data);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await refreshAllData();
        await fetchStaffLiveEvents();
        await fetchStaffStatsOnly();
        
        toast.success('📊 Attendance synced and refreshed!', { id: 'attendance-sync' });
      } else {
        toast.warning(syncResponse.data.message || 'No devices found to sync', { id: 'attendance-sync' });
        refreshAllData();
        fetchStaffLiveEvents();
        fetchStaffStatsOnly();
      }
    } catch (error) {
      console.error('Error syncing attendance:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync attendance', { id: 'attendance-sync' });
      refreshAllData();
      fetchStaffLiveEvents();
      fetchStaffStatsOnly();
    } finally {
      setSyncing(false);
    }
  };

  // Handle delete single event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    const isStaff = selectedEvent.user_id?.startsWith('S') || 
                    selectedEvent.event_type?.startsWith('staff_') ||
                    selectedEvent.staff_id;
    
    let result;
    if (isStaff) {
      try {
        await api.delete(`/attendance/staff/attendance/${selectedEvent.id}`);
        result = { success: true };
      } catch (error) {
        result = { success: false, error: error.response?.data?.detail || 'Failed to delete staff event' };
      }
    } else {
      result = await deleteAttendanceEvent(selectedEvent.id);
    }
    
    if (result.success) {
      toast.success('Event deleted successfully');
      setShowDeleteModal(false);
      setSelectedEvent(null);
      refreshAllData();
      fetchStaffLiveEvents();
      fetchStaffStatsOnly();
    } else {
      toast.error(result.error || 'Failed to delete event');
    }
  };

  // Handle clear all events
  const handleClearAllEvents = async () => {
    let success = true;
    let message = '';
    
    try {
      const memberResult = await clearAllEvents(selectedDate || undefined);
      if (!memberResult.success) {
        success = false;
        message = memberResult.error;
      }
    } catch (error) {
      success = false;
      message = error.message || 'Failed to clear member events';
    }
    
    try {
      const params = {};
      if (selectedDate) params.date = selectedDate;
      await api.delete('/attendance/staff/attendance/clear', { params });
    } catch (error) {
      console.error('Error clearing staff events:', error);
      if (success) {
        success = false;
        message = 'Member events cleared but failed to clear staff events';
      }
    }
    
    if (success) {
      toast.success('All events cleared successfully');
      setShowClearAllModal(false);
      setSelectedDate('');
      refreshAllData();
      fetchStaffLiveEvents();
      fetchStaffStatsOnly();
    } else {
      toast.error(message || 'Failed to clear events');
    }
  };

  // Search users (members or staff) for manual attendance
  const searchUsers = async (searchTerm, type) => {
    if (!searchTerm || searchTerm.length < 1) {
      if (type === 'members') setManualMembers([]);
      else setManualStaff([]);
      return;
    }
    
    setLoadingUsers(true);
    try {
      if (type === 'members') {
        const response = await api.get('/gym/members', {
          params: { search: searchTerm, limit: 20 }
        });
        setManualMembers(response.data || []);
      } else {
        const response = await api.get('/gym/staff', {
          params: { search: searchTerm }
        });
        setManualStaff(response.data || []);
      }
    } catch (error) {
      console.error(`Error searching ${type}:`, error);
      toast.error(`Failed to search ${type}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (manualSearch) {
        searchUsers(manualSearch, activeTab === 'members' ? 'members' : 'staff');
      } else {
        if (activeTab === 'members') setManualMembers([]);
        else setManualStaff([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [manualSearch, activeTab]);

  // Submit manual attendance
  const handleSubmitManualAttendance = async () => {
    if (!selectedUser) {
      toast.error(`Please select a ${activeTab === 'members' ? 'member' : 'staff member'}`);
      return;
    }
    
    setSubmitting(true);
    try {
      let timestamp;
      if (manualDateTime) {
        const selectedDate = new Date(manualDateTime);
        timestamp = selectedDate;
      } else {
        timestamp = new Date();
      }
      
      let payload;
      if (activeTab === 'members') {
        payload = {
          user_id: String(selectedUser.id),
          user_name: selectedUser.full_name,
          timestamp: timestamp.toISOString(),
          status: "0",
          event_type: manualEventType,
          device_serial: "MANUAL_ENTRY",
          verified: true
        };
        await api.post('/attendance/live', payload, {
          headers: { 'X-API-Key': 'MANUAL_ENTRY' }
        });
      } else {
        payload = {
          staff_id: selectedUser.id,
          staff_name: selectedUser.user?.full_name || selectedUser.full_name,
          position: selectedUser.position || 'Staff',
          timestamp: timestamp.toISOString(),
          event_type: manualEventType,
          device_serial: "MANUAL_ENTRY",
          verified: true
        };
        await api.post('/attendance/staff/attendance/manual', payload);
      }
      
      toast.success(`Manual ${manualEventType === 'check_in' ? 'check-in' : 'check-out'} recorded for ${selectedUser.user?.full_name || selectedUser.full_name}`);
      
      setShowManualModal(false);
      setManualSearch('');
      setManualMembers([]);
      setManualStaff([]);
      setSelectedUser(null);
      setManualEventType('check_in');
      setManualDateTime('');
      
      setTimeout(() => {
        refreshAllData();
        fetchStaffLiveEvents();
        fetchStaffStatsOnly();
      }, 500);
    } catch (error) {
      console.error('Error submitting manual attendance:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to record manual attendance';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter events by date, type, and user type
  const getFilteredEvents = () => {
    let filtered = [];
    
    if (activeTab === 'members') {
      filtered = [...liveEvents];
    } else {
      filtered = [...staffLiveEvents];
    }
    
    if (filter === 'check_in') {
      filtered = filtered.filter(event => {
        const eventType = event?.event_type;
        return eventType === 'check_in' || eventType === 'staff_check_in';
      });
    } else if (filter === 'check_out') {
      filtered = filtered.filter(event => {
        const eventType = event?.event_type;
        return eventType === 'check_out' || eventType === 'staff_check_out';
      });
    }
    
    if (dateFilter) {
      filtered = filtered.filter(event => {
        if (!event?.timestamp) return false;
        const eventDate = formatDateOnlyIST(event.timestamp);
        return eventDate === dateFilter;
      });
    }
    
    return filtered;
  };

  // Get stats based on active tab
  const getStats = () => {
    if (activeTab === 'members') {
      return {
        total_checkins: todayStats?.total_checkins || 0,
        unique_members: todayStats?.unique_members || 0
      };
    } else {
      return {
        total_checkins: staffStats?.total_checkins || 0,
        unique_members: staffStats?.unique_staff || 0
      };
    }
  };

  // Load staff events when tab changes
  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffLiveEvents();
    }
  }, [activeTab]);

  // Initial load of staff events
  useEffect(() => {
    fetchStaffLiveEvents();
    fetchStaffStatsOnly();
  }, []);

  // Refresh staff events when liveEvents change (if we're in staff tab)
  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffLiveEvents();
    }
  }, [liveEvents]);

  const filteredEvents = getFilteredEvents();
  const stats = getStats();
  const onlineDevices = (devices || []).filter(d => d?.is_online).length || 0;

  // Get unique dates for filter
  const allEvents = activeTab === 'members' ? liveEvents : staffLiveEvents;
  const uniqueDates = [...new Set(
    (allEvents || [])
      .map(event => {
        if (!event?.timestamp) return null;
        return formatDateOnlyIST(event.timestamp);
      })
      .filter(date => date && date !== '')
  )].sort().reverse();

  // Count events for filter buttons
  const getEventCounts = () => {
    const allEventsList = getFilteredEvents();
    const checkIns = allEventsList.filter(e => {
      const type = e?.event_type;
      return type === 'check_in' || type === 'staff_check_in';
    });
    const checkOuts = allEventsList.filter(e => {
      const type = e?.event_type;
      return type === 'check_out' || type === 'staff_check_out';
    });
    return { all: allEventsList.length, checkIns: checkIns.length, checkOuts: checkOuts.length };
  };

  const counts = getEventCounts();

  if (loading && (!liveEvents || liveEvents.length === 0) && activeTab === 'members') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (staffLoading && activeTab === 'staff' && staffLiveEvents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading staff attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => {
            setActiveTab('members');
            setFilter('all');
            setDateFilter('');
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'members'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Users className="h-4 w-4" />
          Member Attendance
        </button>
        <button
          onClick={() => {
            setActiveTab('staff');
            setFilter('all');
            setDateFilter('');
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === 'staff'
              ? 'border-b-2 border-purple-500 text-purple-600'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Staff Attendance
        </button>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Event</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this attendance event?</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">{activeTab === 'members' ? 'Member:' : 'Staff:'}</span>
                <span className="font-medium text-gray-900">{selectedEvent.user_name || selectedEvent.staff_name}</span>
                <span className="text-gray-500">Time:</span>
                <span className="font-medium text-gray-900">
                  {formatInIST(selectedEvent.timestamp)}
                </span>
                <span className="text-gray-500">Event:</span>
                <span className={`font-medium ${selectedEvent.event_type === 'check_in' || selectedEvent.event_type === 'staff_check_in' ? 'text-green-600' : 'text-orange-600'}`}>
                  {selectedEvent.event_type?.replace('staff_', '').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDeleteEvent} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Clear All Events</h3>
              </div>
              <button onClick={() => setShowClearAllModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">This action cannot be undone. Select an option below:</p>
            <div className="space-y-3 mb-6">
              <button onClick={() => { setSelectedDate(''); handleClearAllEvents(); }} className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="font-medium text-gray-900">Clear all events</div>
                <div className="text-sm text-gray-500">Delete every attendance record</div>
              </button>
              <div className="border-t border-gray-200 my-2"></div>
              <div>
                <div className="font-medium text-gray-900 mb-2">Clear events from specific date:</div>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                <button onClick={() => { if (!selectedDate) { toast.error('Please select a date'); return; } handleClearAllEvents(); }} className="w-full text-left px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50">
                  <div className="font-medium text-red-600">Clear events from {selectedDate || 'selected date'}</div>
                  <div className="text-sm text-red-500">Delete only records from this date</div>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowClearAllModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${activeTab === 'members' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    <UserPlus className={`h-5 w-5 ${activeTab === 'members' ? 'text-blue-600' : 'text-purple-600'}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Manual {activeTab === 'members' ? 'Member' : 'Staff'} Attendance
                  </h3>
                </div>
                <button onClick={() => { setShowManualModal(false); setManualSearch(''); setManualMembers([]); setManualStaff([]); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Search User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search {activeTab === 'members' ? 'Member' : 'Staff'} (by Name, Phone, or ID)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search by name, phone, or ${activeTab === 'members' ? 'member' : 'staff'} ID...`}
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                {/* Search results */}
                {manualSearch && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (activeTab === 'members' ? manualMembers : manualStaff).length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No {activeTab === 'members' ? 'members' : 'staff'} found.
                      </div>
                    ) : (
                      (activeTab === 'members' ? manualMembers : manualStaff).map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setManualSearch('');
                            if (activeTab === 'members') setManualMembers([]);
                            else setManualStaff([]);
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            #{user.id} - {activeTab === 'members' ? user.full_name : (user.user?.full_name || 'Unknown')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activeTab === 'members' ? user.phone : (user.user?.phone || 'No phone')}
                          </div>
                          {activeTab === 'members' && user.email && (
                            <div className="text-xs text-gray-400">{user.email}</div>
                          )}
                          {activeTab === 'staff' && user.position && (
                            <div className="text-xs text-gray-400">{user.position}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Selected user display */}
                {selectedUser && (
                  <div className={`mt-3 rounded-lg p-3 ${activeTab === 'members' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          #{selectedUser.id} - {activeTab === 'members' ? selectedUser.full_name : (selectedUser.user?.full_name || 'Unknown')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activeTab === 'members' ? selectedUser.phone : (selectedUser.user?.phone || 'No phone')}
                        </p>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="text-red-500 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setManualEventType('check_in')} className={`px-4 py-3 rounded-lg font-medium transition-all ${manualEventType === 'check_in' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                    Check In
                  </button>
                  <button onClick={() => setManualEventType('check_out')} className={`px-4 py-3 rounded-lg font-medium transition-all ${manualEventType === 'check_out' ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <XCircle className="h-5 w-5 mx-auto mb-1" />
                    Check Out
                  </button>
                </div>
              </div>
              
              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time (IST)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={manualDateTime}
                    onChange={(e) => setManualDateTime(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to use current IST time</p>
              </div>
              
              {/* Info note */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-800 font-medium">Note</p>
                    <p className="text-xs text-yellow-700">
                      Manual entries will appear in {activeTab} attendance records with "MANUAL_ENTRY" as device serial.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <div className="flex gap-3">
                <button onClick={() => { setShowManualModal(false); setManualSearch(''); setManualMembers([]); setManualStaff([]); setSelectedUser(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSubmitManualAttendance} disabled={!selectedUser || submitting} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 ${activeTab === 'members' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <CheckCircle className="h-4 w-4" />}
                  Save Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Polling every 30 seconds
            {lastFetchTime && <span className="text-xs text-green-600 ml-2">Last update: {formatInIST(lastFetchTime)}</span>}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">
            Devices: <strong className={onlineDevices > 0 ? 'text-green-600' : 'text-gray-400'}>{onlineDevices}/{devices?.length || 0} online</strong>
          </span>
          
          <button 
            onClick={() => setShowManualModal(true)} 
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${activeTab === 'members' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Manual Entry
          </button>
          
          <button 
            onClick={handleRefresh} 
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {syncing ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {syncing ? 'Syncing...' : 'Refresh'}
          </button>
          
          <button 
            onClick={() => setShowClearAllModal(true)} 
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" 
            disabled={(activeTab === 'members' ? liveEvents : staffLiveEvents).length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={`rounded-xl p-6 text-white ${activeTab === 'members' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total {activeTab === 'members' ? 'Check-ins' : 'Staff Check-ins'} Today</p>
              <p className="text-3xl font-bold mt-1">{stats.total_checkins || 0}</p>
            </div>
            {activeTab === 'members' ? (
              <UserCheck className="h-8 w-8 text-white/70" />
            ) : (
              <Briefcase className="h-8 w-8 text-white/70" />
            )}
          </div>
        </div>
        
        <div className={`rounded-xl p-6 text-white ${activeTab === 'members' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Unique {activeTab === 'members' ? 'Members' : 'Staff'}</p>
              <p className="text-3xl font-bold mt-1">{stats.unique_members || 0}</p>
            </div>
            {activeTab === 'members' ? (
              <Users className="h-8 w-8 text-white/70" />
            ) : (
              <User className="h-8 w-8 text-white/70" />
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setFilter('all')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? (activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white') : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All Events ({counts.all})
        </button>
        <button 
          onClick={() => setFilter('check_in')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'check_in' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Check-ins ({counts.checkIns})
        </button>
        <button 
          onClick={() => setFilter('check_out')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'check_out' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Check-outs ({counts.checkOuts})
        </button>
        
        <div className="flex-1"></div>
        
        <button 
          onClick={() => setShowDateFilter(!showDateFilter)} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${dateFilter ? (activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white') : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Calendar className="h-4 w-4" />
          {dateFilter ? `Date: ${formatDateDisplay(dateFilter)}` : 'Filter by Date'}
          {dateFilter && <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setDateFilter(''); }} />}
        </button>
      </div>

      {/* Date Filter Panel */}
      {showDateFilter && uniqueDates.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Select Date</h4>
            <button onClick={() => setShowDateFilter(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueDates.map(date => (
              <button 
                key={date} 
                onClick={() => { setDateFilter(date); setShowDateFilter(false); }} 
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300"
              >
                {formatDateDisplay(date)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (IST)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'members' ? 'Member' : 'Staff'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No {activeTab} attendance events found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {dateFilter ? `No events on ${formatDateDisplay(dateFilter)}` : 
                        activeTab === 'members' 
                          ? 'Scan a fingerprint on the device or use "Manual Entry" to add member attendance'
                          : 'Staff member needs to scan fingerprint on device or use "Manual Entry"'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event, index) => {
                  const userName = event.user_name || event.staff_name || 'Unknown';
                  const userId = event.user_id || event.staff_id || '';
                  const eventType = event.event_type || 'check_in';
                  
                  return (
                    <tr key={event?.id || index} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatInIST(event.timestamp || event.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeTab === 'members' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                            {activeTab === 'members' ? (
                              <User className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Briefcase className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{userName}</div>
                            <div className="text-xs text-gray-500">
                              ID: {String(userId).replace('S', '')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          eventType === 'check_in' || eventType === 'staff_check_in'
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {eventType.replace('staff_', '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.verified !== undefined && event.verified !== null ? (
                          event.verified ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.device_serial?.slice(-8) || (event.device_serial === 'MANUAL_ENTRY' ? 'Manual Entry' : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button onClick={() => { setSelectedEvent(event); setShowDeleteModal(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;