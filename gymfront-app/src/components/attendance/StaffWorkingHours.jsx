// src/components/attendance/StaffWorkingHours.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, User, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StaffWorkingHours = ({ staffId, staffName, onClose }) => {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const fetchWorkingHours = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      };
      if (staffId) params.staff_id = staffId;
      
      const response = await api.get('/gym/attendance/staff/working-hours', { params });
      setRecords(response.data.records || []);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching working hours:', error);
      toast.error('Failed to load working hours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkingHours();
  }, [staffId, dateRange]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'complete': { label: 'Complete', color: 'bg-green-100 text-green-800' },
      'check_in_only': { label: 'Checked In', color: 'bg-yellow-100 text-yellow-800' },
      'check_out_only': { label: 'Checked Out', color: 'bg-orange-100 text-orange-800' },
      'no_attendance': { label: 'No Attendance', color: 'bg-gray-100 text-gray-400' },
      'incomplete': { label: 'Incomplete', color: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || statusMap['no_attendance'];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {staffName ? `${staffName}'s Working Hours` : 'Staff Working Hours'}
            </h3>
            <p className="text-sm text-gray-500">
              {dateRange.start_date} to {dateRange.end_date}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Working Hours</p>
            <p className="text-2xl font-bold text-blue-700">{summary.total_hours_formatted}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">Days Worked</p>
            <p className="text-2xl font-bold text-green-700">{summary.total_days}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-500">Average Daily Hours</p>
            <p className="text-2xl font-bold text-purple-700">
              {summary.average_hours > 0 ? `${summary.average_hours.toFixed(1)}h` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="p-4 border-b flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={fetchWorkingHours}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Apply
        </button>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>No working hours records found</p>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const statusBadge = getStatusBadge(record.status);
                return (
                  <tr key={`${record.staff_id}_${record.date}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {record.staff_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.check_in_formatted || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.check_out_formatted || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-blue-700">
                        {record.hours_worked_formatted || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffWorkingHours;