// src/components/admin/AttendanceList.jsx
import React, { useState, useEffect, useCallback } from 'react';
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
  const [totalRecords, setTotalRecords] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const itemsPerPage = 50;

  const fetchAttendance = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams();
      params.append('limit', String(itemsPerPage));
      params.append('skip', String((currentPage - 1) * itemsPerPage));
      
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
      setTotalRecords(total);
      setTotalPages(Math.ceil(total / itemsPerPage));
      setSelectedRecords([]);
      setSelectAll(false);
      
      if (showToast) {
        toast.success(`Loaded ${records.length} of ${total} attendance records`);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error(error.response?.data?.detail || 'Failed to load attendance records');
      setAttendanceRecords([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filterType, filterDate, searchTerm, gymId, itemsPerPage]);

  // Fetch on page change or filter change
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchAttendance();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAttendance();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
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
        : '/admin/attendance/bulk-delete';
      
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
        : `/admin/attendance/${id}`;
      
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
            onChange={e => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => {
              setFilterDate(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
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
            {totalRecords} total records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800/80 border-b border-gray-700">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectAll && attendanceRecords.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
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
            {attendanceRecords.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No attendance records found</p>
                  <p className="text-xs text-gray-600 mt-1">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              attendanceRecords.map((record, index) => (
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
                        {(record.member_name || record.staff_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {record.member_name || record.staff_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.member_id ? 'Member' : record.staff_id ? 'Staff' : 'Unknown'}
                          {record.gym_name && ` • ${record.gym_name}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(record.event_type)}
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
        <div className="px-5 py-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-900/50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              Showing <span className="text-white font-medium">{attendanceRecords.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> 
              {' - '}
              <span className="text-white font-medium">
                {Math.min(currentPage * itemsPerPage, totalRecords)}
              </span>
              {' of '}
              <span className="text-white font-medium">{totalRecords}</span> records
            </span>
            <span className="text-gray-600">|</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-gray-500 text-xs">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Records per page info */}
      <div className="px-5 py-2 border-t border-gray-800/50 bg-gray-900/30 text-xs text-gray-500 flex justify-end">
        Showing {itemsPerPage} records per page
      </div>
    </div>
  );
};

export default AttendanceList;