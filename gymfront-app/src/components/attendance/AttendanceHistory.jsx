// src/components/attendance/AttendanceHistory.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, ChevronLeft, ChevronRight, User, Loader2, Users, Briefcase, AlertCircle, RefreshCw } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ===== FIXED: Helper function to format time in IST =====
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
    const hasTimezone = timestampStr.includes('Z') || timestampStr.includes('+');
    
    let istDate;
    if (hasTimezone) {
      // If it has timezone info (like member attendance), convert to IST by adding 5:30
      istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    } else {
      // If no timezone info, it might already be in IST
      // Just use it as-is without adding offset
      istDate = new Date(date.getTime());
    }
    
    // Format the IST time
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

const AttendanceHistory = () => {
  const { attendanceApi } = useAttendance();
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'staff'
  const [memberRecords, setMemberRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    member_id: '',
    staff_id: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [members, setMembers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const itemsPerPage = 20;

  const fetchMemberAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.member_id) params.member_id = filters.member_id;
      
      const data = await attendanceApi.getAttendanceRecords(params);
      setMemberRecords(data?.records || []);
      setMemberTotal(data?.total || 0);
    } catch (error) {
      console.error('Error fetching member attendance:', error);
      setError('Failed to load member attendance records');
      toast.error('Failed to load member attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.staff_id) params.staff_id = filters.staff_id;
      
      params.limit = itemsPerPage;
      params.offset = (currentPage - 1) * itemsPerPage;
      
      const response = await api.get('/attendance/staff/attendance', { params });
      
      // FIX: Ensure we're properly handling staff records
      const records = response.data?.records || [];
      
      // Debug: Log the records to see what's coming back
      console.log('Staff attendance records:', records);
      
      setStaffRecords(records);
      setStaffTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Error fetching staff attendance:', error);
      setError('Failed to load staff attendance records');
      toast.error('Failed to load staff attendance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get('/gym/members?limit=1000');
      setMembers(response?.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/gym/staff');
      setStaffList(response?.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    toast.loading('🔄 Syncing attendance from device...', { id: 'attendance-sync' });
    
    try {
        const syncResponse = await api.post('/attendance/sync-attendance');
        
        if (syncResponse.data.success) {
            console.log('✅ Attendance sync triggered:', syncResponse.data);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (activeTab === 'members') {
                await fetchMemberAttendance();
            } else {
                await fetchStaffAttendance();
            }
            
            toast.success('📊 Attendance synced and refreshed!', { id: 'attendance-sync' });
        } else {
            toast.warning(syncResponse.data.message || 'No devices found to sync', { id: 'attendance-sync' });
            if (activeTab === 'members') {
                fetchMemberAttendance();
            } else {
                fetchStaffAttendance();
            }
        }
    } catch (error) {
        console.error('Error syncing attendance:', error);
        toast.error(error.response?.data?.detail || 'Failed to sync attendance', { id: 'attendance-sync' });
        if (activeTab === 'members') {
            fetchMemberAttendance();
        } else {
            fetchStaffAttendance();
        }
    } finally {
        setSyncing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMemberAttendance();
    } else {
      fetchStaffAttendance();
    }
  }, [currentPage, filters, activeTab]);

  useEffect(() => {
    fetchMembers();
    fetchStaff();
  }, []);

  const handleExport = async () => {
    try {
      toast.loading(`Exporting ${activeTab} attendance data...`, { id: 'export' });
      
      let recordsToExport = [];
      if (activeTab === 'members') {
        const params = {};
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.member_id) params.member_id = filters.member_id;
        const data = await attendanceApi.getAttendanceRecords({ limit: 1000, ...params });
        recordsToExport = data?.records || [];
      } else {
        const params = {
          start_date: filters.start_date,
          end_date: filters.end_date,
          staff_id: filters.staff_id,
          limit: 1000,
        };
        const response = await api.get('/attendance/staff/attendance', { params });
        recordsToExport = response.data?.records || [];
      }
      
      if (recordsToExport.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      // Format dates in IST for CSV export
      const formatDateForCSV = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
          const date = new Date(timestamp);
          return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        } catch (e) {
          return timestamp;
        }
      };
      
      const csv = [
        ['Date', 'Time', `${activeTab === 'members' ? 'Member' : 'Staff'} Name`, 'Event Type', 'Verified', 'Device Serial'],
        ...recordsToExport.map(r => {
          const rawType = (r.event_type || '').toLowerCase();
          const isOut = rawType.includes('check_out') || rawType.includes('checkout');
          const ts = activeTab === 'staff'
            ? (r.display_time || r.check_out_time || r.check_in_time || r.created_at)
            : (r.created_at || r.check_in_time);
          const parts = formatDateForCSV(ts).split(',');
          return [
            parts[0] || 'N/A',
            parts[1]?.trim() || 'N/A',
            activeTab === 'members' ? (r.member_name || 'Unknown') : (r.staff_name || 'Unknown'),
            isOut ? 'CHECK_OUT' : 'CHECK_IN',
            r.verified ? 'Yes' : 'No',
            r.device_serial || 'N/A',
          ];
        })
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_attendance_${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export complete!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', { id: 'export' });
    }
  };

  const handleClearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      member_id: '',
      staff_id: '',
    });
    setCurrentPage(1);
  };

  const currentRecords = activeTab === 'members' ? memberRecords : staffRecords;
  const currentTotal = activeTab === 'members' ? memberTotal : staffTotal;
  const totalPages = Math.ceil(currentTotal / itemsPerPage);

  if (loading && currentRecords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => activeTab === 'members' ? fetchMemberAttendance() : fetchStaffAttendance()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
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
            setCurrentPage(1);
            setError(null);
            setFilters(f => ({ ...f, staff_id: '' }));
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
            setCurrentPage(1);
            setError(null);
            setFilters(f => ({ ...f, member_id: '' }));
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

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'members' ? 'Member Attendance History' : 'Staff Attendance History'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and export all {activeTab === 'members' ? 'member' : 'staff'} attendance records
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {syncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync & Refresh'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={handleExport}
            disabled={currentRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === 'members' ? 'Member' : 'Staff'}
              </label>
              <select
                value={activeTab === 'members' ? filters.member_id : filters.staff_id}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  [activeTab === 'members' ? 'member_id' : 'staff_id']: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All {activeTab === 'members' ? 'Members' : 'Staff'}</option>
                {(activeTab === 'members' ? members : staffList).map(item => (
                  <option key={item.id} value={item.id}>
                    {activeTab === 'members' ? item.full_name : (item.user?.full_name || 'Unknown')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{currentTotal}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Showing</p>
            <p className="text-lg font-semibold text-gray-700">
              {Math.min((currentPage - 1) * itemsPerPage + 1, currentTotal)} - {Math.min(currentPage * itemsPerPage, currentTotal)} of {currentTotal}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time (IST)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'members' ? 'Member' : 'Staff'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No {activeTab} attendance records found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try changing filters or click "Sync & Refresh" to fetch from device
                    </p>
                  </td>
                </tr>
              ) : (
                currentRecords.map((record) => {
                  // For staff: prefer the backend-computed display_time which picks
                  // check_in_time or check_out_time based on event_type.
                  // For members: use created_at or check_in_time as before.
                  const timestamp = activeTab === 'staff'
                    ? (record.display_time || record.check_out_time || record.check_in_time || record.created_at)
                    : (record.created_at || record.check_in_time);

                  // Normalize event_type: strip staff_ prefix and check for check_out variants
                  const rawEventType = (record.event_type || '').toLowerCase();
                  const isCheckOut = rawEventType.includes('check_out') || rawEventType.includes('checkout');
                  const eventLabel = isCheckOut ? 'CHECK OUT' : 'CHECK IN';

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatInIST(timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activeTab === 'members' ? 'bg-blue-100' : 'bg-purple-100'
                          }`}>
                            {activeTab === 'members' ? (
                              <User className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Briefcase className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {activeTab === 'members' 
                                ? (record.member_name || 'Unknown')
                                : (record.staff_name || 'Unknown')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {activeTab === 'members' ? `ID: ${record.member_id}` : `Staff ID: ${record.staff_id}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isCheckOut
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {eventLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {record.verified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-red-600">✗ Not verified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.device_serial?.slice(-8) || (record.device_serial === 'MANUAL_ENTRY' ? 'Manual Entry' : 'N/A')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;