// src/components/attendance/StaffHours.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Download, TrendingUp, Users, Briefcase, Loader2 } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import toast from 'react-hot-toast';

const StaffHours = () => {
  const { attendanceApi } = useAttendance();
  const [staffHours, setStaffHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const fetchStaffHours = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getStaffWorkingHours(dateRange.start_date, dateRange.end_date);
      setStaffHours(data || []);
    } catch (error) {
      console.error('Error fetching staff hours:', error);
      toast.error('Failed to load staff working hours');
      setStaffHours([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffHours();
  }, [dateRange]);

  const handleExport = () => {
    if (staffHours.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const csv = [
      ['Staff Name', 'Position', 'Total Hours', 'Total Minutes'],
      ...staffHours.map(s => [s.name, s.position, s.total_hours || 0, s.total_minutes || 0])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_hours_${dateRange.start_date}_to_${dateRange.end_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export complete!');
  };

  const totalHours = staffHours.reduce((sum, s) => sum + (s.total_hours || 0), 0);
  const totalStaff = staffHours.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading staff hours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Working Hours</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage staff attendance and working hours</p>
        </div>
        <button
          onClick={handleExport}
          disabled={staffHours.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Staff</p>
              <p className="text-3xl font-bold mt-1">{totalStaff}</p>
            </div>
            <Users className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Hours Worked</p>
              <p className="text-3xl font-bold mt-1">{totalHours.toFixed(1)}</p>
            </div>
            <Clock className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Average Hours/Staff</p>
              <p className="text-3xl font-bold mt-1">{(totalHours / totalStaff || 0).toFixed(1)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Staff Hours Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Minutes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Average</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffHours.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No staff hours data found for this period</p>
                    <p className="text-sm text-gray-400 mt-1">Make sure staff members are marked as staff in the system</p>
                  </td>
                </tr>
              ) : (
                staffHours.map((staff, index) => {
                  const daysInPeriod = Math.ceil((new Date(dateRange.end_date) - new Date(dateRange.start_date)) / (1000 * 60 * 60 * 24)) || 1;
                  const dailyAvg = (staff.total_hours / daysInPeriod).toFixed(1);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {staff.name?.charAt(0) || 'S'}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {staff.position || 'Staff'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-gray-900">{staff.total_hours?.toFixed(1) || 0}</span>
                        <span className="text-sm text-gray-500 ml-1">hrs</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {staff.total_minutes || 0} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{dailyAvg} hrs/day</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Working hours are calculated based on first check-in and last check-out of each day.
          Breaks are automatically handled by the system. For accurate tracking, ensure staff members check in and out properly.
        </p>
      </div>
    </div>
  );
};

export default StaffHours;