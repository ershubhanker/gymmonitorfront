// src/components/staff/StaffSalaryCalculator.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calculator, Download, Calendar, User, Briefcase, 
  Loader2, TrendingDown, TrendingUp, Clock, X, FileSpreadsheet
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StaffSalaryCalculator = ({ staffId, staffName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [salaryData, setSalaryData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [monthlySalary, setMonthlySalary] = useState('');
  const [expectedHours, setExpectedHours] = useState(9);
  const [expectedDays, setExpectedDays] = useState(26);

  const calculateSalary = async () => {
    if (!staffId) {
      toast.error('Please select a staff member');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        staff_id: staffId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        monthly_salary: monthlySalary ? parseFloat(monthlySalary) : undefined,
        expected_shift_hours: expectedHours,
        expected_days_per_month: expectedDays
      };

      const response = await api.post('/gym/staff/salary-calculate', payload);
      setSalaryData(response.data);
      toast.success('Salary calculation complete!');
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast.error(error.response?.data?.detail || 'Failed to calculate salary');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!salaryData) {
      toast.error('Please calculate salary first');
      return;
    }

    setExporting(true);
    try {
      const response = await api.get(`/gym/staff/${staffId}/salary-export`, {
        params: {
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary_${salaryData.staff_name.replace(' ', '_')}_${dateRange.start_date}_${dateRange.end_date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Salary report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export salary report');
    } finally {
      setExporting(false);
    }
  };

  // Auto-calculate when staff or date changes
  useEffect(() => {
    if (staffId) {
      calculateSalary();
    }
  }, [staffId]);

  const totalDays = Math.ceil(
    (new Date(dateRange.end_date) - new Date(dateRange.start_date)) / (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {staffName ? `${staffName}'s Salary Calculator` : 'Staff Salary Calculator'}
            </h3>
            <p className="text-sm text-gray-500">
              Calculate salary with shift-based deductions
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (₹)</label>
            <input
              type="number"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
              placeholder="Auto-detect"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={calculateSalary}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calculate
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !salaryData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Export
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500">Calculating salary...</span>
        </div>
      ) : salaryData ? (
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Monthly Salary</p>
              <p className="text-xl font-bold text-blue-700">₹{salaryData.monthly_salary.toLocaleString()}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium">Expected Hours</p>
              <p className="text-xl font-bold text-purple-700">{salaryData.expected_monthly_hours.toFixed(1)}h</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs text-green-600 font-medium">Actual Hours</p>
              <p className="text-xl font-bold text-green-700">{salaryData.actual_hours.toFixed(1)}h</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-xs text-red-600 font-medium">Shortfall</p>
              <p className="text-xl font-bold text-red-600">{salaryData.shortfall_hours.toFixed(1)}h</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              salaryData.deduction > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-100'
            }`}>
              <p className="text-xs text-gray-600 font-medium">Net Salary</p>
              <p className={`text-xl font-bold ${salaryData.deduction > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ₹{salaryData.net_salary.toLocaleString()}
              </p>
              {salaryData.deduction > 0 && (
                <p className="text-xs text-red-500">-₹{salaryData.deduction.toLocaleString()} deducted</p>
              )}
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Daily Breakdown ({salaryData.days_worked} days worked, {salaryData.days_with_shortfall} days with shortfall)
            </h4>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected Shift</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual Hrs</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Shortfall</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salaryData.daily_breakdown.map((day, index) => (
                    <tr key={index} className={
                      day.late_minutes > 0 || day.early_leave_minutes > 0 ? 'bg-red-50' : 
                      day.status.includes('Complete') ? 'bg-green-50' : ''
                    }>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">{day.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">{day.day_of_week}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600 text-xs">{day.expected_shift}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {day.check_in_times.length > 0 ? day.check_in_times.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                        {day.check_out_times.length > 0 ? day.check_out_times.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                        {day.actual_hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-red-600">
                        {day.shortfall_hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{day.status}</span>
                          {day.late_minutes > 0 && (
                            <span className="text-xs text-red-500">⏰ +{Math.round(day.late_minutes)}m late</span>
                          )}
                          {day.early_leave_minutes > 0 && (
                            <span className="text-xs text-orange-500">🚶 -{Math.round(day.early_leave_minutes)}m early</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deduction Details */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2">Deduction Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Per Hour Rate</p>
                <p className="font-bold text-gray-900">₹{salaryData.per_hour_rate.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Shortfall</p>
                <p className="font-bold text-red-600">{salaryData.shortfall_hours.toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-gray-500">Total Deduction</p>
                <p className="font-bold text-red-600">₹{salaryData.deduction.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Net Payable</p>
                <p className="font-bold text-green-600">₹{salaryData.net_salary.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400">
          <Calculator className="h-12 w-12 mb-3 text-gray-300" />
          <p>No salary data calculated</p>
          <p className="text-sm">Click "Calculate" to generate salary breakdown</p>
        </div>
      )}
    </div>
  );
};

export default StaffSalaryCalculator;