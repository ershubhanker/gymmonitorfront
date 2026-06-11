// src/components/attendance/LiveMonitoring.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, UserCheck, Users, Wifi, WifiOff, CheckCircle, XCircle, 
  RefreshCw, Trash2, AlertTriangle, X, Filter, Calendar,
  UserPlus, Search, Clock
} from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
  
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  
  // Manual Attendance States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualMembers, setManualMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [manualEventType, setManualEventType] = useState('check_in');
  const [manualDateTime, setManualDateTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Manual refresh
  const handleRefresh = () => {
    refreshAllData();
    toast.success('Data refreshed');
  };

  // Handle delete single event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    const result = await deleteAttendanceEvent(selectedEvent.id);
    if (result.success) {
      toast.success('Event deleted successfully');
      setShowDeleteModal(false);
      setSelectedEvent(null);
      refreshAllData();
    } else {
      toast.error(result.error || 'Failed to delete event');
    }
  };

  // Handle clear all events
  const handleClearAllEvents = async () => {
    const result = await clearAllEvents(selectedDate || undefined);
    if (result.success) {
      toast.success(result.message || 'Events cleared successfully');
      setShowClearAllModal(false);
      setSelectedDate('');
      refreshAllData();
    } else {
      toast.error(result.error || 'Failed to clear events');
    }
  };

  // Search members for manual attendance - FIXED to search by ID as well
  const searchMembers = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setManualMembers([]);
      return;
    }
    
    setLoadingMembers(true);
    try {
      // Use the same endpoint as members page with search parameter
      const response = await api.get('/gym/members', {
        params: { search: searchTerm, limit: 20 }
      });
      console.log('Search results:', response.data);
      setManualMembers(response.data || []);
    } catch (error) {
      console.error('Error searching members:', error);
      toast.error('Failed to search members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (manualSearch) {
        searchMembers(manualSearch);
      } else {
        setManualMembers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [manualSearch]);

  // Submit manual attendance - FIXED to work without API key
  const handleSubmitManualAttendance = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }
    
    setSubmitting(true);
    try {
      const timestamp = manualDateTime ? new Date(manualDateTime) : new Date();
      
      const payload = {
        user_id: String(selectedMember.id),  // Use member ID as user_id
        user_name: selectedMember.full_name,
        timestamp: timestamp.toISOString(),
        status: "0",
        event_type: manualEventType,
        device_serial: "MANUAL_ENTRY",
        verified: true
      };
      
      console.log('Sending manual attendance:', payload);
      
      // Send to backend with special header for manual entry
      const response = await api.post('/attendance/live', payload, {
        headers: { 'X-API-Key': 'MANUAL_ENTRY' }
      });
      
      if (response.status === 200) {
        toast.success(`Manual ${manualEventType === 'check_in' ? 'check-in' : 'check-out'} recorded for ${selectedMember.full_name}`);
        
        // Reset form
        setShowManualModal(false);
        setManualSearch('');
        setManualMembers([]);
        setSelectedMember(null);
        setManualEventType('check_in');
        setManualDateTime('');
        
        // Refresh data after a short delay
        setTimeout(() => {
          refreshAllData();
        }, 500);
      } else {
        toast.error('Failed to record attendance');
      }
    } catch (error) {
      console.error('Error submitting manual attendance:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to record manual attendance';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter events by date and type
  const getFilteredEvents = () => {
    let filtered = [...liveEvents];
    
    if (filter === 'check_in') {
      filtered = filtered.filter(event => event?.event_type === 'check_in');
    } else if (filter === 'check_out') {
      filtered = filtered.filter(event => event?.event_type === 'check_out');
    }
    
    if (dateFilter) {
      filtered = filtered.filter(event => {
        const eventDate = event?.timestamp?.split('T')[0];
        return eventDate === dateFilter;
      });
    }
    
    return filtered;
  };

  const filteredEvents = getFilteredEvents();
  const onlineDevices = (devices || []).filter(d => d?.is_online).length || 0;

  const uniqueDates = [...new Set(
    (liveEvents || [])
      .map(event => event?.timestamp?.split('T')[0])
      .filter(date => date)
  )].sort().reverse();

  if (loading && (!liveEvents || liveEvents.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
                <span className="text-gray-500">Member:</span>
                <span className="font-medium text-gray-900">{selectedEvent.user_name}</span>
                <span className="text-gray-500">Time:</span>
                <span className="font-medium text-gray-900">
                  {selectedEvent.timestamp ? new Date(selectedEvent.timestamp).toLocaleString() : 'N/A'}
                </span>
                <span className="text-gray-500">Event:</span>
                <span className={`font-medium ${selectedEvent.event_type === 'check_in' ? 'text-green-600' : 'text-orange-600'}`}>
                  {selectedEvent.event_type?.toUpperCase()}
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

      {/* Manual Attendance Modal - FIXED */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Manual Attendance Entry</h3>
                </div>
                <button onClick={() => { setShowManualModal(false); setManualSearch(''); setManualMembers([]); setSelectedMember(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Search Member */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Member (by Name, Phone, or ID)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or member ID..."
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                {/* Member search results */}
                {manualSearch && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {loadingMembers ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : manualMembers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No members found. Try searching by ID (e.g., "1") or name.
                      </div>
                    ) : (
                      manualMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            setSelectedMember(member);
                            setManualSearch('');
                            setManualMembers([]);
                          }}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">#{member.id} - {member.full_name}</div>
                          <div className="text-sm text-gray-500">{member.phone}</div>
                          {member.email && <div className="text-xs text-gray-400">{member.email}</div>}
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Selected member display */}
                {selectedMember && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">#{selectedMember.id} - {selectedMember.full_name}</p>
                        <p className="text-sm text-gray-600">{selectedMember.phone}</p>
                      </div>
                      <button onClick={() => setSelectedMember(null)} className="text-red-500 hover:text-red-700">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={manualDateTime}
                    onChange={(e) => setManualDateTime(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to use current date and time</p>
              </div>
              
              {/* Info note */}
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-800 font-medium">Note</p>
                    <p className="text-xs text-yellow-700">
                      Manual entries will appear in attendance records with "MANUAL_ENTRY" as device serial.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <div className="flex gap-3">
                <button onClick={() => { setShowManualModal(false); setManualSearch(''); setManualMembers([]); setSelectedMember(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSubmitManualAttendance} disabled={!selectedMember || submitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
            {lastFetchTime && <span className="text-xs text-green-600 ml-2">Last update: {new Date(lastFetchTime).toLocaleTimeString()}</span>}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">
            Devices: <strong className={onlineDevices > 0 ? 'text-green-600' : 'text-gray-400'}>{onlineDevices}/{devices?.length || 0} online</strong>
          </span>
          <button onClick={() => setShowManualModal(true)} className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
            <UserPlus className="h-3.5 w-3.5" />
            Manual Entry
          </button>
          <button onClick={handleRefresh} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button onClick={() => setShowClearAllModal(true)} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" disabled={liveEvents.length === 0}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Check-ins Today</p>
              <p className="text-3xl font-bold mt-1">{todayStats?.total_checkins || 0}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Unique Members</p>
              <p className="text-3xl font-bold mt-1">{todayStats?.unique_members || 0}</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Recent Events</p>
              <p className="text-3xl font-bold mt-1">{filteredEvents.length}</p>
            </div>
            <Bell className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          All Events ({liveEvents?.length || 0})
        </button>
        <button onClick={() => setFilter('check_in')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'check_in' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Check-ins ({(liveEvents || []).filter(e => e?.event_type === 'check_in').length})
        </button>
        <button onClick={() => setFilter('check_out')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'check_out' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Check-outs ({(liveEvents || []).filter(e => e?.event_type === 'check_out').length})
        </button>
        
        <div className="flex-1"></div>
        
        <button onClick={() => setShowDateFilter(!showDateFilter)} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${dateFilter ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          <Calendar className="h-4 w-4" />
          {dateFilter ? `Date: ${dateFilter}` : 'Filter by Date'}
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
              <button key={date} onClick={() => { setDateFilter(date); setShowDateFilter(false); }} className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300">
                {new Date(date).toLocaleDateString()}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
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
                    <p>No attendance events found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {dateFilter ? `No events on ${new Date(dateFilter).toLocaleDateString()}` : 'Scan a fingerprint on the device or use "Manual Entry" to add attendance'}
                    </p>
                   </td>
                 </tr>
              ) : (
                filteredEvents.map((event, index) => (
                  <tr key={event?.id || index} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event?.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event?.user_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">ID: {event?.user_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event?.event_type === 'check_in' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {event?.event_type === 'check_in' ? 'CHECK IN' : 'CHECK OUT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {event?.verified ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event?.device_serial?.slice(-8) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => { setSelectedEvent(event); setShowDeleteModal(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;