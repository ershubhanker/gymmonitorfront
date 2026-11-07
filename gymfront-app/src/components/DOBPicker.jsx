import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, X, CalendarDays } from 'lucide-react';

const MONTHS = [
  { value: 1, label: '01 - Jan', short: 'Jan', name: 'January' },
  { value: 2, label: '02 - Feb', short: 'Feb', name: 'February' },
  { value: 3, label: '03 - Mar', short: 'Mar', name: 'March' },
  { value: 4, label: '04 - Apr', short: 'Apr', name: 'April' },
  { value: 5, label: '05 - May', short: 'May', name: 'May' },
  { value: 6, label: '06 - Jun', short: 'Jun', name: 'June' },
  { value: 7, label: '07 - Jul', short: 'Jul', name: 'July' },
  { value: 8, label: '08 - Aug', short: 'Aug', name: 'August' },
  { value: 9, label: '09 - Sep', short: 'Sep', name: 'September' },
  { value: 10, label: '10 - Oct', short: 'Oct', name: 'October' },
  { value: 11, label: '11 - Nov', short: 'Nov', name: 'November' },
  { value: 12, label: '12 - Dec', short: 'Dec', name: 'December' },
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * DOBPicker - A robust, accessible Date of Birth selector.
 * Provides clean Day, Month, and Year dropdowns (never clips or hides 1 or 31)
 * with an optional toggle to switch to native calendar input.
 */
const DOBPicker = ({ 
  value = '', 
  onChange, 
  maxDate, 
  minYear = 1930,
  showAge = true,
  className = '' 
}) => {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [inputMode, setInputMode] = useState('dropdowns'); // 'dropdowns' | 'calendar'

  // Calculate maximum allowed year (defaults to current year)
  const currentYear = useMemo(() => {
    if (maxDate) {
      const parsedYear = parseInt(maxDate.split('-')[0], 10);
      if (!isNaN(parsedYear)) return parsedYear;
    }
    return new Date().getFullYear();
  }, [maxDate]);

  // Generate years list descending (e.g. 2026, 2025 ... 1930)
  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear, minYear]);

  // Synchronize internal state when prop `value` changes
  useEffect(() => {
    if (value && typeof value === 'string' && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          setYear(String(y));
          setMonth(String(m));
          setDay(String(d));
          return;
        }
      }
    }
    // If empty or invalid, clear selections
    if (!value) {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  // Dynamically compute days in month depending on selected year and month
  const maxDays = useMemo(() => {
    const y = year ? parseInt(year, 10) : 2024; // 2024 is leap year as safe default
    const m = month ? parseInt(month, 10) : 1;
    return new Date(y, m, 0).getDate();
  }, [year, month]);

  const days = useMemo(() => {
    const list = [];
    for (let d = 1; d <= maxDays; d++) {
      list.push(d);
    }
    return list;
  }, [maxDays]);

  // Helper to emit date when day, month, and year are set
  const tryEmit = (newDay, newMonth, newYear) => {
    if (!newDay || !newMonth || !newYear) {
      // Incomplete date, don't emit a full ISO date yet
      return;
    }
    const safeDay = Math.min(parseInt(newDay, 10), new Date(parseInt(newYear, 10), parseInt(newMonth, 10), 0).getDate());
    const formattedDate = `${newYear}-${pad(newMonth)}-${pad(safeDay)}`;
    if (formattedDate !== value && onChange) {
      onChange(formattedDate);
    }
  };

  const handleDayChange = (e) => {
    const newDay = e.target.value;
    setDay(newDay);
    tryEmit(newDay, month, year);
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    // If existing day exceeds the new month's max days (e.g. 31 in Feb), clamp it
    let adjustedDay = day;
    if (day && newMonth) {
      const y = year ? parseInt(year, 10) : 2024;
      const mDays = new Date(y, parseInt(newMonth, 10), 0).getDate();
      if (parseInt(day, 10) > mDays) {
        adjustedDay = String(mDays);
        setDay(adjustedDay);
      }
    }
    tryEmit(adjustedDay, newMonth, year);
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    // Handle leap year adjustment if February 29 is selected
    let adjustedDay = day;
    if (day && month && newYear) {
      const mDays = new Date(parseInt(newYear, 10), parseInt(month, 10), 0).getDate();
      if (parseInt(day, 10) > mDays) {
        adjustedDay = String(mDays);
        setDay(adjustedDay);
      }
    }
    tryEmit(adjustedDay, month, newYear);
  };

  const handleClear = () => {
    setDay('');
    setMonth('');
    setYear('');
    if (onChange) {
      onChange('');
    }
  };

  // Real-time Age calculation
  const age = useMemo(() => {
    if (!value) return null;
    try {
      const dob = new Date(value + 'T00:00:00');
      if (isNaN(dob.getTime())) return null;
      const now = new Date();
      let calculatedAge = now.getFullYear() - dob.getFullYear();
      const mDiff = now.getMonth() - dob.getMonth();
      if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) {
        calculatedAge--;
      }
      return calculatedAge >= 0 ? calculatedAge : null;
    } catch {
      return null;
    }
  }, [value]);

  const formattedDisplay = useMemo(() => {
    if (!value) return '';
    try {
      const dob = new Date(value + 'T00:00:00');
      if (isNaN(dob.getTime())) return value;
      return dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return value;
    }
  }, [value]);

  const selectCls = "w-full py-2 px-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition appearance-none cursor-pointer hover:border-gray-400";

  return (
    <div className={`space-y-1 ${className}`}>
      {inputMode === 'dropdowns' ? (
        <div className="flex items-center gap-1.5 w-full">
          {/* Day Dropdown */}
          <div className="relative flex-1 min-w-[72px]">
            <select
              value={day}
              onChange={handleDayChange}
              aria-label="Date of Birth Day"
              className={`${selectCls} ${!day ? 'text-gray-400 font-normal' : 'font-medium'}`}
            >
              <option value="" disabled className="text-gray-400">Day</option>
              {days.map((d) => (
                <option key={d} value={d} className="text-gray-900">
                  {pad(d)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Month Dropdown */}
          <div className="relative flex-[1.3] min-w-[100px]">
            <select
              value={month}
              onChange={handleMonthChange}
              aria-label="Date of Birth Month"
              className={`${selectCls} ${!month ? 'text-gray-400 font-normal' : 'font-medium'}`}
            >
              <option value="" disabled className="text-gray-400">Month</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className="text-gray-900">
                  {m.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="relative flex-1 min-w-[82px]">
            <select
              value={year}
              onChange={handleYearChange}
              aria-label="Date of Birth Year"
              className={`${selectCls} ${!year ? 'text-gray-400 font-normal' : 'font-medium'}`}
            >
              <option value="" disabled className="text-gray-400">Year</option>
              {years.map((y) => (
                <option key={y} value={y} className="text-gray-900">
                  {y}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Clear Button (only shown if something is selected) */}
          {(day || month || year || value) && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date of birth"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Toggle to Calendar View */}
          <button
            type="button"
            onClick={() => setInputMode('calendar')}
            title="Switch to calendar / date picker"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Alternative: Standard Date Input */
        <div className="flex items-center gap-1.5 w-full">
          <div className="relative flex-1">
            <input
              type="date"
              value={value || ''}
              max={maxDate}
              onChange={(e) => onChange && onChange(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          {(value) && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date of birth"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Toggle back to Dropdowns View */}
          <button
            type="button"
            onClick={() => setInputMode('dropdowns')}
            title="Switch to Day / Month / Year dropdowns"
            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1 text-xs font-medium"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">D / M / Y</span>
          </button>
        </div>
      )}

      {/* Helpful Age Summary Badge (if value is complete) */}
      {showAge && value && age !== null && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {age} years old
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600 font-medium">{formattedDisplay}</span>
        </div>
      )}
    </div>
  );
};

export default DOBPicker;

