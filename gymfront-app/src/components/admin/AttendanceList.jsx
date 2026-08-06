// src/components/admin/AttendanceList.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Trash2, Download, RefreshCw, 
  User, Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  X, FileText, Wifi, WifiOff, Shield, Eye
} from 'lucide-react';
import { formatDate, formatDateTime, statusBadge } from '../../services/adminHelpers';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AttendanceList = ({ gymId, onBulkDelete }) => {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const itemsPerPage = 50;

  const fetchAttendance = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.append('limit', '10000');
      params.append('skip', (currentPage - 1) * itemsPerPage);
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      
      if (filterDate) {
        params.append('date', filterDate);
      }
      
      let url = `/gym/attendance?${params.toString()}`;
      
      // If we have a gymId, fetch attendance for that specific gym
      if (gymId) {
        url = `/admin/gyms/${gymId}/attendance?${params.toString()}`;
      } else {
        // For super admin, use the admin attendance endpoint
        url = `/admin/attendance?${params.toString()}`;
      }
      
      console.log('Fetching attendance from:', url);
      const response = await api.get(url);
      console.log('Attendance response:', response.data);
      
      // Handle different response structures
      let records = [];
      let total = 0;
      
      if (response.data.records) {
        records = response.data.records;
        total = response.data.total || records.length;
      } else if (Array.isArray(response.data)) {
        records = response.data;
        total = records.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        records = response.data.data;
        total = response.data.total || records.length;
      } else {
        records = response.data || [];
        total = records.length;
      }
      
      setAttendanceRecords(records);
      setTotalPages(Math.ceil(total / itemsPerPage));
      setSelectedRecords([]);
      setSelectAll(false);
      
      if (showToast) {
        toast.success(`Loaded ${records.length} attendance records`);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.response?.data?.detail || 'Failed to load attendance records');
      setAttendanceRecords([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentPage, filterType, filterDate]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAttendance();
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(attendanceRecords.map(r => r.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRecord = (id) => {
    setSelectedRecords(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      toast.error('Please select records to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedRecords.length} selected attendance records?`)) {
      return;
    }
    
    setDeleting(true);
    try {
      // Call bulk delete endpoint
      const endpoint = gymId 
        ? `/admin/gyms/${gymId}/attendance/bulk-delete`
        : '/gym/attendance/bulk-delete';
      
      await api.post(endpoint, { record_ids: selectedRecords });
      
      toast.success(`${selectedRecords.length} attendance records deleted successfully!`);
      setSelectedRecords([]);
      setSelectAll(false);
      
      // Refresh the list
      fetchAttendance();
      
      if (onBulkDelete) {
        onBulkDelete(selectedRecords);
      }
    } catch (error) {
      console.error('Error deleting attendance records:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete attendance records');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id, memberName) => {
    if (!window.confirm(`Are you sure you want to delete attendance record for ${memberName}?`)) {
      return;
    }
    
    try {
      const endpoint = gymId 
        ? `/admin/gyms/${gymId}/attendance/${id}`
        : `/gym/attendance/${id}`;
      
      await api.delete(endpoint);
      toast.success('Attendance record deleted successfully!');
      fetchAttendance();
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete attendance record');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'check_in') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-900/60 text-green-300 border border-green-700">Check In</span>;
    } else if (status === 'check_out') {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-900/60 text-orange-300 border border-orange-700">Check Out</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">{status}</span>;
  };

  const getDeviceStatus = (isOnline) => {
    if (isOnline) {
      return <span className="flex items-center gap-1 text-xs text-green-400"><Wifi className="h-3 w-3" /> Online</span>;
    }
    return <span className="flex items-center gap-1 text-xs text-red-400"><WifiOff className="h-3 w-3" /> Offline</span>;
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.member_name?.toLowerCase().includes(search) ||
      record.staff_name?.toLowerCase().includes(search) ||
      record.device_serial?.toLowerCase().includes(search) ||
      record.check_in_time?.toLowerCase().includes(search) ||
      record.check_out_time?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
        <p className="text-gray-400 mt-3 text-sm">Loading attendance records...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by member name, staff, device..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
            />
          </div>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRecords.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete ({selectedRecords.length})
            </button>
          )}
          <button
            onClick={() => fetchAttendance(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-xs text-gray-500">
            {attendanceRecords.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800/80 border-b border-gray-700">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectAll && attendanceRecords.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Check In</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Check Out</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Device</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No attendance records found</p>
                  <p className="text-xs text-gray-600 mt-1">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    #{record.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {record.member_name?.charAt(0) || record.staff_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {record.member_name || record.staff_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.member_id ? 'Member' : record.staff_id ? 'Staff' : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.event_type || record.type)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                    {record.check_in_time ? formatDateTime(record.check_in_time) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap">
                    {record.check_out_time ? formatDateTime(record.check_out_time) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {record.duration_minutes ? (
                      <span>
                        {Math.floor(record.duration_minutes / 60)}h {record.duration_minutes % 60}m
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-400">
                      <p>{record.device_serial || '—'}</p>
                      {record.device_name && (
                        <p className="text-gray-500 text-xs">{record.device_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      record.status === 'verified' 
                        ? 'bg-green-900/60 text-green-300 border border-green-700'
                        : record.status === 'pending'
                        ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {record.status || 'Verified'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDeleteSingle(record.id, record.member_name || record.staff_name)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg border border-red-800/50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;