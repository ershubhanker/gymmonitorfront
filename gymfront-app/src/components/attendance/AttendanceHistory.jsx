// src/components/attendance/AttendanceHistory.jsx - Updated with Search Input
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, Filter, ChevronLeft, ChevronRight, User, Loader2, Users, Briefcase, AlertCircle, RefreshCw, Clock, Search, X } from 'lucide-react';
import { useAttendance } from '../../context/AttendanceContext';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ===== FIXED: Helper function to format time in IST =====
const formatInIST = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const timestampStr = typeof timestamp === 'string' ? timestamp : String(timestamp);
    
    const date = new Date(timestampStr);
    
    if (isNaN(date.getTime())) {
      return String(timestamp);
    }
    
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

// ===== Helper function to format date only =====
const formatDateOnly = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

// ===== Helper function to get month from date =====
const getMonthYear = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return '';
  }
};

// ===== Helper function to get week number =====
const getWeekNumber = (dateStr) => {
  if (!dateStr) return 0;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = (date - startOfYear + (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60000) / 86400000;
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  } catch (e) {
    return 0;
  }
};

// ===== Helper function to format currency =====
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

// ===== Helper function to calculate working hours for staff =====
const calculateStaffWorkingHours = (records, staffId, dateStr) => {
  if (!records || records.length === 0) return null;
  
  const dayRecords = records.filter(r => {
    if (!r.created_at) return false;
    const recordDate = formatDateOnly(r.created_at);
    return r.staff_id === staffId && recordDate === dateStr;
  });
  
  if (dayRecords.length === 0) return null;
  
  let firstCheckIn = null;
  let lastCheckOut = null;
  let checkInTime = null;
  let checkOutTime = null;
  
  dayRecords.forEach(r => {
    const eventType = (r.event_type || '').toLowerCase();
    if (eventType === 'check_in' || eventType.includes('check_in')) {
      const time = new Date(r.check_in_time || r.created_at);
      if (!firstCheckIn || time < firstCheckIn) {
        firstCheckIn = time;
        checkInTime = r.check_in_time || r.created_at;
      }
    }
    if (eventType === 'check_out' || eventType.includes('check_out')) {
      const time = new Date(r.check_out_time || r.created_at);
      if (!lastCheckOut || time > lastCheckOut) {
        lastCheckOut = time;
        checkOutTime = r.check_out_time || r.created_at;
      }
    }
  });
  
  if (!firstCheckIn && dayRecords.length > 0) {
    const earliest = new Date(Math.min(...dayRecords.map(r => new Date(r.created_at).getTime())));
    firstCheckIn = earliest;
  }
  
  if (!lastCheckOut && dayRecords.length > 0) {
    const latest = new Date(Math.max(...dayRecords.map(r => new Date(r.created_at).getTime())));
    lastCheckOut = latest;
  }
  
  if (firstCheckIn && lastCheckOut && firstCheckIn < lastCheckOut) {
    const diffMs = lastCheckOut - firstCheckIn;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return {
      hours,
      minutes,
      formatted: `${hours}h ${minutes}m`,
      totalHours: diffMs / 3600000,
      checkIn: checkInTime || firstCheckIn,
      checkOut: checkOutTime || lastCheckOut,
      status: 'complete'
    };
  } else if (firstCheckIn && !lastCheckOut) {
    return {
      hours: 0,
      minutes: 0,
      formatted: '⏳ In Progress',
      totalHours: 0,
      checkIn: checkInTime || firstCheckIn,
      checkOut: null,
      status: 'in_progress'
    };
  } else if (!firstCheckIn && lastCheckOut) {
    return {
      hours: 0,
      minutes: 0,
      formatted: '⚠️ Check-out only',
      totalHours: 0,
      checkIn: null,
      checkOut: checkOutTime || lastCheckOut,
      status: 'checkout_only'
    };
  }
  
  return null;
};

// ===== Helper function to calculate staff salary with working hours =====
const calculateStaffSalary = (staff, totalHours, expectedDailyHours = 9, expectedDaysPerMonth = 26) => {
  const monthlySalary = staff?.salary || staff?.salary_amount || staff?.monthly_salary || 0;
  const numericSalary = Number(monthlySalary);
  
  if (numericSalary === 0 || totalHours === 0) {
    return {
      monthlySalary: 0,
      expectedMonthlyHours: expectedDailyHours * expectedDaysPerMonth,
      actualHours: totalHours || 0,
      hoursShortfall: 0,
      deduction: 0,
      netSalary: 0,
      perHourRate: 0,
      status: 'No salary data'
    };
  }
  
  const expectedMonthlyHours = expectedDailyHours * expectedDaysPerMonth;
  const perHourRate = numericSalary / expectedMonthlyHours;
  const hoursShortfall = Math.max(0, expectedMonthlyHours - totalHours);
  const deduction = hoursShortfall * perHourRate;
  const netSalary = Math.max(0, numericSalary - deduction);
  
  return {
    monthlySalary: numericSalary,
    expectedMonthlyHours,
    actualHours: Math.round(totalHours * 100) / 100,
    hoursShortfall: Math.round(hoursShortfall * 100) / 100,
    deduction: Math.round(deduction * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    perHourRate: Math.round(perHourRate * 100) / 100,
    status: deduction > 0 ? 'Deduction Applied' : 'Full Salary'
  };
};

// ===== Component: Staff Working Hours Summary =====
const StaffWorkingHoursSummary = ({ staffId, staffName, records, staffSalary }) => {
  const [todayHours, setTodayHours] = useState(null);
  const [weekHours, setWeekHours] = useState(null);
  const [monthHours, setMonthHours] = useState(null);
  const [salaryCalculation, setSalaryCalculation] = useState(null);

  useEffect(() => {
    if (staffId && records) {
      calculateStaffHours();
    }
  }, [staffId, records]);

  const calculateStaffHours = () => {
    if (!records || records.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const todayResult = calculateStaffWorkingHours(records, staffId, today);
    setTodayHours(todayResult);
    
    const weeklyRecords = records.filter(r => {
      if (!r.created_at) return false;
      const recordDate = formatDateOnly(r.created_at);
      return r.staff_id === staffId && recordDate >= weekAgoStr && recordDate <= today;
    });
    
    const weeklyTotal = calculateTotalHours(weeklyRecords, staffId);
    setWeekHours(weeklyTotal);
    
    const monthlyRecords = records.filter(r => {
      if (!r.created_at) return false;
      const recordDate = formatDateOnly(r.created_at);
      return r.staff_id === staffId && recordDate.startsWith(currentMonth);
    });
    
    const monthlyTotal = calculateTotalHours(monthlyRecords, staffId);
    setMonthHours(monthlyTotal);
    
    if (monthlyTotal && staffSalary > 0) {
      const salaryCalc = calculateStaffSalary(
        { salary: staffSalary },
        monthlyTotal.totalHours
      );
      setSalaryCalculation(salaryCalc);
    }
  };

  const calculateTotalHours = (records, staffId) => {
    const dailyTotals = {};
    records.forEach(r => {
      const dateStr = formatDateOnly(r.created_at);
      if (!dailyTotals[dateStr]) {
        dailyTotals[dateStr] = { checkIn: null, checkOut: null };
      }
      
      const eventType = (r.event_type || '').toLowerCase();
      if (eventType === 'check_in' || eventType.includes('check_in')) {
        const time = new Date(r.check_in_time || r.created_at);
        if (!dailyTotals[dateStr].checkIn || time < dailyTotals[dateStr].checkIn) {
          dailyTotals[dateStr].checkIn = time;
        }
      }
      if (eventType === 'check_out' || eventType.includes('check_out')) {
        const time = new Date(r.check_out_time || r.created_at);
        if (!dailyTotals[dateStr].checkOut || time > dailyTotals[dateStr].checkOut) {
          dailyTotals[dateStr].checkOut = time;
        }
      }
    });
    
    let totalHours = 0;
    let daysWorked = 0;
    let completedDays = 0;
    let incompleteDays = 0;
    
    Object.entries(dailyTotals).forEach(([date, day]) => {
      if (day.checkIn && day.checkOut && day.checkIn < day.checkOut) {
        const diffMs = day.checkOut - day.checkIn;
        totalHours += diffMs / 3600000;
        daysWorked++;
        completedDays++;
      } else if (day.checkIn && !day.checkOut) {
        daysWorked++;
        incompleteDays++;
      }
    });
    
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    
    return {
      formatted: `${h}h ${m}m`,
      totalHours,
      daysWorked,
      completedDays,
      incompleteDays,
      totalDays: daysWorked
    };
  };

  if (!staffId) return null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
      <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-purple-600" />
        Working Hours - {staffName || 'Staff'}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Today</p>
          <p className="text-xl font-bold text-blue-700">
            {todayHours?.formatted || '0h 0m'}
          </p>
          {todayHours?.status === 'complete' && (
            <p className="text-xs text-green-600">✓ Complete</p>
          )}
          {todayHours?.status === 'in_progress' && (
            <p className="text-xs text-yellow-600">⏳ In Progress</p>
          )}
          {todayHours?.status === 'checkout_only' && (
            <p className="text-xs text-orange-600">⚠️ Check-out only</p>
          )}
          {!todayHours && (
            <p className="text-xs text-gray-400">No attendance today</p>
          )}
        </div>
        
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">This Week</p>
          <p className="text-xl font-bold text-green-700">
            {weekHours?.formatted || '0h 0m'}
          </p>
          <p className="text-xs text-gray-400">
            {weekHours?.daysWorked || 0} days worked
          </p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">This Month</p>
          <p className="text-xl font-bold text-purple-700">
            {monthHours?.formatted || '0h 0m'}
          </p>
          <p className="text-xs text-gray-400">
            {monthHours?.daysWorked || 0} days worked
          </p>
        </div>
        
        {salaryCalculation && staffSalary > 0 && (
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Salary (Monthly)</p>
            <p className="text-xl font-bold text-amber-700">
              {formatCurrency(salaryCalculation.netSalary)}
            </p>
            <p className="text-xs text-gray-400">
              {salaryCalculation.status}
              {salaryCalculation.hoursShortfall > 0 && (
                <span className="text-red-500 block">
                  -{formatCurrency(salaryCalculation.deduction)} shortfall
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Main AttendanceHistory Component =====
const AttendanceHistory = () => {
  const { attendanceApi } = useAttendance();
  const [activeTab, setActiveTab] = useState('members');
  const [memberRecords, setMemberRecords] = useState([]);
  const [staffRecords, setStaffRecords] = useState([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    member_search: '',  // Changed from member_id
    staff_search: '',   // Changed from staff_id
    member_id: '',      // Keep for API compatibility
    staff_id: '',       // Keep for API compatibility
  });
  const [showFilters, setShowFilters] = useState(false);
  const [members, setMembers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [staffSalaries, setStaffSalaries] = useState({});
  const [searchInput, setSearchInput] = useState(''); // For search input field
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const itemsPerPage = 20;

  // Fetch member attendance
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

  // Fetch staff attendance
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
      
      const records = response.data?.records || [];
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

  // Fetch members for search
  const fetchMembers = async () => {
    try {
      const response = await api.get('/gym/members?limit=1000');
      setMembers(response?.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  // Fetch staff for search
  const fetchStaff = async () => {
    try {
      const response = await api.get('/gym/staff');
      const staffData = response?.data || [];
      setStaffList(staffData);
      
      const salaryMap = {};
      staffData.forEach(s => {
        const salary = s.salary || s.salary_amount || s.monthly_salary || 0;
        if (salary > 0) {
          salaryMap[s.id] = Number(salary);
        }
      });
      setStaffSalaries(salaryMap);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  // ===== SEARCH FUNCTION =====
  const handleSearch = (searchTerm) => {
    setSearchInput(searchTerm);
    
    if (!searchTerm || searchTerm.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      // Clear the filter
      if (activeTab === 'members') {
        setFilters(prev => ({ ...prev, member_id: '', member_search: '' }));
      } else {
        setFilters(prev => ({ ...prev, staff_id: '', staff_search: '' }));
      }
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    let results = [];

    if (activeTab === 'members') {
      results = members.filter(m => {
        const name = (m.full_name || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const id = String(m.id);
        return name.includes(searchLower) || 
               phone.includes(searchLower) || 
               email.includes(searchLower) || 
               id.includes(searchTerm);
      });
    } else {
      results = staffList.filter(s => {
        const name = (s.user?.full_name || '').toLowerCase();
        const phone = (s.user?.phone || '').toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        const id = String(s.id);
        const position = (s.position || '').toLowerCase();
        return name.includes(searchLower) || 
               phone.includes(searchLower) || 
               email.includes(searchLower) || 
               id.includes(searchTerm) ||
               position.includes(searchLower);
      });
    }

    setSearchResults(results.slice(0, 20)); // Limit results
    setShowResults(results.length > 0);
  };

  // ===== SELECT SEARCH RESULT =====
  const selectSearchResult = (item) => {
    if (activeTab === 'members') {
      setFilters(prev => ({ 
        ...prev, 
        member_id: String(item.id),
        member_search: item.full_name || item.name || item.id
      }));
      setSearchInput(item.full_name || item.name || item.id);
    } else {
      const staffName = item.user?.full_name || item.full_name || `Staff ${item.id}`;
      setFilters(prev => ({ 
        ...prev, 
        staff_id: String(item.id),
        staff_search: staffName
      }));
      setSearchInput(staffName);
    }
    setShowResults(false);
    setCurrentPage(1);
  };

  // ===== CLEAR SEARCH =====
  const clearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
    if (activeTab === 'members') {
      setFilters(prev => ({ ...prev, member_id: '', member_search: '' }));
    } else {
      setFilters(prev => ({ ...prev, staff_id: '', staff_search: '' }));
    }
  };

  // Handle refresh with sync
  const handleRefresh = async () => {
    setSyncing(true);
    toast.loading('🔄 Syncing attendance from device...', { id: 'attendance-sync' });
    
    try {
        const syncResponse = await api.post('/attendance/sync-attendance');
        
        if (syncResponse.data.success) {
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

  // Load data when filters or page changes
  useEffect(() => {
    if (activeTab === 'members') {
      fetchMemberAttendance();
    } else {
      fetchStaffAttendance();
    }
  }, [currentPage, filters.start_date, filters.end_date, filters.member_id, filters.staff_id, activeTab]);

  // Load members and staff lists
  useEffect(() => {
    fetchMembers();
    fetchStaff();
  }, []);

  // ===== Excel styling helpers =====
  const HEADER_FILLS = {
    daily: 'FF1E3A8A',
    weekly: 'FF6D28D9',
    monthly: 'FF047857',
    members: 'FF1E40AF'
  };

  const STATUS_FILLS = {
    complete: 'FFD1FAE5',
    in_progress: 'FFFEF3C7',
    no_data: 'FFF3F4F6',
    'Full Salary': 'FFD1FAE5',
    'Deduction Applied': 'FFFEE2E2',
    'No Salary Set': 'FFF3F4F6'
  };

  const styleHeaderRow = (row, fillColor) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
    });
    row.height = 22;
  };

  const styleDataRow = (row, fillColor) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      cell.alignment = { vertical: 'middle' };
      if (fillColor) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      }
    });
  };

  const autoFitColumns = (worksheet, minWidth = 10, maxWidth = 45) => {
    worksheet.columns.forEach((col) => {
      let maxLen = minWidth;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len + 2 > maxLen) maxLen = len + 2;
      });
      col.width = Math.min(maxLen, maxWidth);
    });
  };

  const addTitleBlock = (worksheet, title, subtitle, numColumns) => {
    worksheet.mergeCells(1, 1, 1, numColumns);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(1).height = 26;

    worksheet.mergeCells(2, 1, 2, numColumns);
    const subtitleCell = worksheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    worksheet.getRow(2).height = 18;

    worksheet.addRow([]);
  };

  // ===== ENHANCED EXPORT WITH WORKING HOURS AND SALARY =====
  const handleExport = async () => {
    try {
      toast.loading(`Exporting ${activeTab} attendance data with working hours...`, { id: 'export' });

      let recordsToExport = [];
      let staffData = [];

      if (activeTab === 'members') {
        const params = {};
        if (filters.start_date) params.start_date = filters.start_date;
        if (filters.end_date) params.end_date = filters.end_date;
        if (filters.member_id) params.member_id = filters.member_id;
        const data = await attendanceApi.getAttendanceRecords({ limit: 10000, ...params });
        recordsToExport = data?.records || [];
      } else {
        const params = {
          start_date: filters.start_date,
          end_date: filters.end_date,
          staff_id: filters.staff_id,
          limit: 10000,
        };
        const response = await api.get('/attendance/staff/attendance', { params });
        recordsToExport = response.data?.records || [];

        const staffResponse = await api.get('/gym/staff');
        staffData = staffResponse?.data || [];
      }

      if (recordsToExport.length === 0) {
        toast.error('No data to export');
        return;
      }

      const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }).replace(/\//g, '-');

      if (activeTab === 'staff') {
        const staffDailyHours = {};

        recordsToExport.forEach(r => {
          const staffId = r.staff_id;
          const staffName = r.staff_name || 'Unknown';
          const dateOnly = formatDateOnly(r.created_at);
          const monthStr = getMonthYear(r.created_at);
          const weekNum = getWeekNumber(r.created_at);

          const key = `${staffId}_${dateOnly}`;
          if (!staffDailyHours[key]) {
            staffDailyHours[key] = {
              staffId,
              staffName,
              date: dateOnly,
              month: monthStr,
              week: weekNum,
              checkIn: null,
              checkOut: null,
              records: []
            };
          }
          staffDailyHours[key].records.push(r);
        });

        Object.keys(staffDailyHours).forEach(key => {
          const day = staffDailyHours[key];
          const result = calculateStaffWorkingHours(day.records, day.staffId, day.date);
          if (result && result.status === 'complete') {
            day.totalHours = result.totalHours;
            day.hoursFormatted = result.formatted;
            day.checkIn = result.checkIn;
            day.checkOut = result.checkOut;
            day.status = 'complete';
            day.statusLabel = 'Complete';
          } else if (result && result.status === 'in_progress') {
            day.totalHours = 0;
            day.hoursFormatted = 'In Progress';
            day.checkIn = result.checkIn;
            day.checkOut = null;
            day.status = 'in_progress';
            day.statusLabel = 'In Progress';
          } else {
            day.totalHours = 0;
            day.hoursFormatted = 'No Data';
            day.status = 'no_data';
            day.statusLabel = 'No Data';
          }
        });

        const monthlyTotals = {};
        Object.values(staffDailyHours).forEach(day => {
          const key = `${day.staffId}_${day.month}`;
          if (!monthlyTotals[key]) {
            monthlyTotals[key] = {
              staffId: day.staffId,
              staffName: day.staffName,
              month: day.month,
              totalHours: 0,
              daysWorked: 0,
              daysWithData: 0
            };
          }
          if (day.totalHours > 0) {
            monthlyTotals[key].totalHours += day.totalHours;
            monthlyTotals[key].daysWorked++;
          }
          monthlyTotals[key].daysWithData++;
        });

        const weeklyTotals = {};
        Object.values(staffDailyHours).forEach(day => {
          const key = `${day.staffId}_${day.week}_${day.month}`;
          if (!weeklyTotals[key]) {
            weeklyTotals[key] = {
              staffId: day.staffId,
              staffName: day.staffName,
              week: day.week,
              month: day.month,
              totalHours: 0,
              daysWorked: 0
            };
          }
          if (day.totalHours > 0) {
            weeklyTotals[key].totalHours += day.totalHours;
            weeklyTotals[key].daysWorked++;
          }
        });

        const expectedDailyHours = 9;
        const expectedDaysPerMonth = 26;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Gym Management System';
        workbook.created = new Date();

        const dailySheet = workbook.addWorksheet('Daily Attendance', {
          views: [{ state: 'frozen', ySplit: 4 }]
        });
        addTitleBlock(
          dailySheet,
          'Staff Attendance Report — Daily Breakdown',
          `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • ${filters.start_date || 'All'} to ${filters.end_date || 'All'}`,
          7
        );
        const dailyHeaderRow = dailySheet.addRow(
          ['Date', 'Staff Name', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Device']
        );
        styleHeaderRow(dailyHeaderRow, HEADER_FILLS.daily);
        dailySheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 7 } };

        Object.values(staffDailyHours)
          .sort((a, b) => a.date.localeCompare(b.date) || a.staffName.localeCompare(b.staffName))
          .forEach(day => {
            const row = dailySheet.addRow([
              day.date ? new Date(day.date) : null,
              day.staffName,
              day.checkIn ? formatInIST(day.checkIn) : '—',
              day.checkOut ? formatInIST(day.checkOut) : '—',
              day.hoursFormatted || '—',
              day.statusLabel || '—',
              day.records[0]?.device_serial || '—'
            ]);
            row.getCell(1).numFmt = 'dd-mmm-yyyy';
            styleDataRow(row, STATUS_FILLS[day.status]);
          });
        autoFitColumns(dailySheet);

        const weeklySheet = workbook.addWorksheet('Weekly Summary', {
          views: [{ state: 'frozen', ySplit: 4 }]
        });
        addTitleBlock(
          weeklySheet,
          'Staff Attendance Report — Weekly Summary',
          `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          6
        );
        const weeklyHeaderRow = weeklySheet.addRow(
          ['Staff Name', 'Week', 'Month', 'Total Hours', 'Days Worked', 'Avg Hours/Day']
        );
        styleHeaderRow(weeklyHeaderRow, HEADER_FILLS.weekly);
        weeklySheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 6 } };

        Object.values(weeklyTotals)
          .sort((a, b) => a.staffName.localeCompare(b.staffName) || a.week - b.week)
          .forEach(week => {
            const avgHours = week.daysWorked > 0 ? (week.totalHours / week.daysWorked) : 0;
            const row = weeklySheet.addRow([
              week.staffName,
              `Week ${week.week}`,
              week.month,
              Number(week.totalHours.toFixed(2)),
              week.daysWorked,
              Number(avgHours.toFixed(2))
            ]);
            styleDataRow(row);
          });
        autoFitColumns(weeklySheet);

        const monthlySheet = workbook.addWorksheet('Monthly Summary & Salary', {
          views: [{ state: 'frozen', ySplit: 4 }]
        });
        addTitleBlock(
          monthlySheet,
          'Staff Attendance Report — Monthly Summary & Salary',
          `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • Expected: ${expectedDailyHours}h/day × ${expectedDaysPerMonth} days`,
          11
        );
        const monthlyHeaderRow = monthlySheet.addRow([
          'Staff Name', 'Month', 'Total Hours', 'Days Worked',
          'Expected Hours', 'Shortfall Hours',
          'Monthly Salary (₹)', 'Hourly Rate (₹)', 'Deduction (₹)', 'Net Salary (₹)', 'Status'
        ]);
        styleHeaderRow(monthlyHeaderRow, HEADER_FILLS.monthly);
        monthlySheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 11 } };

        Object.values(monthlyTotals)
          .sort((a, b) => a.staffName.localeCompare(b.staffName) || a.month.localeCompare(b.month))
          .forEach(month => {
            const staff = staffData.find(s => s.id === month.staffId);
            const monthlySalary = staff?.salary || staff?.salary_amount || staff?.monthly_salary || 0;
            const numericSalary = Number(monthlySalary);

            let row;
            if (numericSalary > 0) {
              const expectedMonthlyHours = expectedDailyHours * expectedDaysPerMonth;
              const perHourRate = numericSalary / expectedMonthlyHours;
              const shortfall = Math.max(0, expectedMonthlyHours - month.totalHours);
              const deduction = shortfall * perHourRate;
              const netSalary = Math.max(0, numericSalary - deduction);
              const statusLabel = deduction > 0 ? 'Deduction Applied' : 'Full Salary';

              row = monthlySheet.addRow([
                month.staffName,
                month.month,
                Number(month.totalHours.toFixed(2)),
                month.daysWorked,
                Number(expectedMonthlyHours.toFixed(2)),
                Number(shortfall.toFixed(2)),
                Number(numericSalary.toFixed(2)),
                Number(perHourRate.toFixed(2)),
                Number(deduction.toFixed(2)),
                Number(netSalary.toFixed(2)),
                statusLabel
              ]);
              [7, 8, 9, 10].forEach(colIdx => { row.getCell(colIdx).numFmt = '₹#,##0.00'; });
              styleDataRow(row, STATUS_FILLS[statusLabel]);
            } else {
              row = monthlySheet.addRow([
                month.staffName, month.month, Number(month.totalHours.toFixed(2)), month.daysWorked,
                '—', '—', 0, '—', '—', 0, 'No Salary Set'
              ]);
              styleDataRow(row, STATUS_FILLS['No Salary Set']);
            }
          });
        autoFitColumns(monthlySheet);

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `staff_attendance_with_hours_${dateStr}.xlsx`);

        toast.success('Staff attendance workbook exported!', { id: 'export' });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Gym Management System';
      workbook.created = new Date();

      const memberSheet = workbook.addWorksheet('Member Attendance', {
        views: [{ state: 'frozen', ySplit: 4 }]
      });
      addTitleBlock(
        memberSheet,
        'Member Attendance Report',
        `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        6
      );
      const memberHeaderRow = memberSheet.addRow(
        ['Date', 'Time', 'Member Name', 'Event Type', 'Verified', 'Device Serial']
      );
      styleHeaderRow(memberHeaderRow, HEADER_FILLS.members);
      memberSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 6 } };

      recordsToExport.forEach(r => {
        const rawType = (r.event_type || '').toLowerCase();
        const isOut = rawType.includes('check_out') || rawType.includes('checkout');
        const ts = r.created_at || r.check_in_time;
        const tsDate = ts ? new Date(ts) : null;
        const timePart = tsDate && !isNaN(tsDate.getTime())
          ? tsDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : 'N/A';

        const row = memberSheet.addRow([
          tsDate && !isNaN(tsDate.getTime()) ? tsDate : null,
          timePart,
          r.member_name || 'Unknown',
          isOut ? 'CHECK OUT' : 'CHECK IN',
          r.verified ? 'Yes' : 'No',
          r.device_serial || 'N/A',
        ]);
        row.getCell(1).numFmt = 'dd-mmm-yyyy';
        styleDataRow(row, isOut ? 'FFFFEDD5' : 'FFD1FAE5');
      });
      autoFitColumns(memberSheet);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `member_attendance_${dateStr}.xlsx`);
      toast.success('Export complete!', { id: 'export' });

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', { id: 'export' });
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      member_search: '',
      staff_search: '',
      member_id: '',
      staff_id: '',
    });
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
    setCurrentPage(1);
  };

  // Toggle working hours visibility for a staff member
  const toggleWorkingHours = (staffId, staffName) => {
    if (expandedStaff === staffId) {
      setExpandedStaff(null);
    } else {
      setExpandedStaff(staffId);
    }
  };

  // Get current records and total
  const currentRecords = activeTab === 'members' ? memberRecords : staffRecords;
  const currentTotal = activeTab === 'members' ? memberTotal : staffTotal;
  const totalPages = Math.ceil(currentTotal / itemsPerPage);

  // Loading state
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

  // Error state
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
            clearSearch();
            setFilters(f => ({ ...f, staff_id: '', staff_search: '' }));
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
            clearSearch();
            setFilters(f => ({ ...f, member_id: '', member_search: '' }));
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

      {/* Header Actions */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'members' ? 'Member Attendance History' : 'Staff Attendance History'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and export all {activeTab === 'members' ? 'member' : 'staff'} attendance records
          </p>
          {activeTab === 'staff' && (
            <p className="text-xs text-purple-600 mt-1">
              💰 Export includes working hours calculation for salary deduction
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
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
            Export Excel
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {activeTab === 'members' ? 'Member' : 'Staff'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={`Search by ID, name, or phone...`}
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                {searchInput && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((item) => {
                    if (activeTab === 'members') {
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectSearchResult(item)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              #{item.id} - {item.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.phone} {item.email && `• ${item.email}`}
                            </div>
                          </div>
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            Member
                          </span>
                        </button>
                      );
                    } else {
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectSearchResult(item)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              #{item.id} - {item.user?.full_name || 'Unknown Staff'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.position || 'Staff'} {item.user?.phone && `• ${item.user.phone}`}
                            </div>
                          </div>
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            Staff
                          </span>
                        </button>
                      );
                    }
                  })}
                </div>
              )}
              
              {/* Selected filter display */}
              {(filters.member_search || filters.staff_search) && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <span className="font-medium">
                    {activeTab === 'members' ? 'Member:' : 'Staff:'}
                  </span>
                  <span>{filters.member_search || filters.staff_search}</span>
                  <button onClick={clearSearch} className="text-blue-500 hover:text-blue-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
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
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{currentTotal}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Showing</p>
            <p className="text-lg font-semibold text-gray-700">
              {currentTotal === 0 ? '0' : `${Math.min((currentPage - 1) * itemsPerPage + 1, currentTotal)} - ${Math.min(currentPage * itemsPerPage, currentTotal)}`} of {currentTotal}
            </p>
          </div>
        </div>
      </div>

      {/* Staff Working Hours Summary (only visible in staff tab) */}
      {activeTab === 'staff' && expandedStaff && (
        <div className="mb-6">
          {(() => {
            const staff = staffList.find(s => s.id === expandedStaff);
            return (
              <StaffWorkingHoursSummary
                staffId={expandedStaff}
                staffName={staff?.user?.full_name || 'Staff'}
                records={staffRecords}
                staffSalary={staffSalaries[expandedStaff] || 0}
              />
            );
          })()}
        </div>
      )}

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
                {activeTab === 'staff' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                {activeTab === 'staff' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'staff' ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No {activeTab} attendance records found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Try changing filters or click "Sync & Refresh" to fetch from device
                    </p>
                  </td>
                </tr>
              ) : (
                currentRecords.map((record, index) => {
                  const timestamp = activeTab === 'staff'
                    ? (record.display_time || record.check_out_time || record.check_in_time || record.created_at)
                    : (record.created_at || record.check_in_time);

                  const rawEventType = (record.event_type || '').toLowerCase();
                  const isCheckOut = rawEventType.includes('check_out') || rawEventType.includes('checkout');
                  const eventLabel = isCheckOut ? 'CHECK OUT' : 'CHECK IN';

                  let workingHours = null;
                  let staffId = null;
                  let staffName = '';
                  
                  if (activeTab === 'staff') {
                    staffId = record.staff_id;
                    staffName = record.staff_name || 'Unknown';
                    const dateStr = formatDateOnly(record.created_at);
                    workingHours = calculateStaffWorkingHours(currentRecords, staffId, dateStr);
                  }

                  const isFirstOfDay = activeTab === 'staff' && (() => {
                    if (!staffId || !record.created_at) return false;
                    const dateStr = formatDateOnly(record.created_at);
                    const dayRecords = currentRecords.filter(r => 
                      r.staff_id === staffId && formatDateOnly(r.created_at) === dateStr
                    );
                    return dayRecords[0]?.id === record.id;
                  })();

                  const showWorkingHours = isFirstOfDay && workingHours;

                  return (
                    <tr key={record.id || index} className="hover:bg-gray-50">
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
                      {activeTab === 'staff' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {showWorkingHours ? (
                            <span className="font-medium text-purple-700">
                              {workingHours.formatted}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      )}
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
                      {activeTab === 'staff' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleWorkingHours(staffId, staffName)}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {expandedStaff === staffId ? 'Hide Hours' : 'View Hours'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3">
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