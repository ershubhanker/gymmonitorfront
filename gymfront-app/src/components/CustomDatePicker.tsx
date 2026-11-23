import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X,
  Check
} from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  minDate,
  maxDate,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize input value (handle YYYY-MM-DD or ISO datetime strings)
  const cleanValue = useMemo(() => {
    if (!value) return '';
    const s = String(value).trim();
    return s.split('T')[0].split(' ')[0];
  }, [value]);

  // Today in local YYYY-MM-DD
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const [currentYear, currentMonth] = useMemo(() => {
    if (cleanValue && /^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
      const [y, m] = cleanValue.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return [y, m - 1];
      }
    }
    const now = new Date();
    return [now.getFullYear(), now.getMonth()];
  }, [cleanValue]);

  const [viewYear, setViewYear] = useState<number>(currentYear);
  const [viewMonth, setViewMonth] = useState<number>(currentMonth);

  // Keep view in sync when value changes from outside
  useEffect(() => {
    if (cleanValue && /^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
      const [y, m] = cleanValue.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [cleanValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Year list for dropdown: ensure viewYear is always included
  const todayYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    const minYear = Math.min(viewYear, todayYear - 15);
    const maxYear = Math.max(viewYear, todayYear + 3);
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [todayYear, viewYear]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const prevYear = () => setViewYear(prev => prev - 1);
  const nextYear = () => setViewYear(prev => prev + 1);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${pad(prevM + 1)}-${pad(d)}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
        isSelected: dateStr === cleanValue,
        isToday: dateStr === today
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
        isSelected: dateStr === cleanValue,
        isToday: dateStr === today
      });
    }

    // Next month padding to fill out 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${pad(nextM + 1)}-${pad(d)}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
        isSelected: dateStr === cleanValue,
        isToday: dateStr === today
      });
    }

    return days;
  }, [viewYear, viewMonth, cleanValue, today, minDate, maxDate]);

  // Format display text for input button
  const displayLabel = useMemo(() => {
    if (!cleanValue) return '';
    try {
      const parts = cleanValue.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12) {
          const monthText = MONTH_SHORT[m - 1] || '';
          return `${d} ${monthText} ${y}`.trim();
        }
      }
    } catch {
      // fallback
    }
    return cleanValue;
  }, [cleanValue]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleSelectToday = () => {
    handleSelectDate(today);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Trigger Box */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-xl text-sm font-medium cursor-pointer transition-all shadow-sm select-none ${
          isOpen 
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
        }`}
      >
        <CalendarIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
        
        <span className={`flex-1 truncate ${displayLabel ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
          {displayLabel || placeholder}
        </span>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-[330px] transition-all animate-in fade-in duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Month & Year Selectors + Nav buttons */}
          <div className="flex items-center justify-between gap-1 mb-3">
            {/* Year backward & Month backward buttons */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={prevYear}
                title="Previous Year (Jump 1 year back)"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Direct Month & Year Dropdowns */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer hover:bg-gray-100"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer hover:bg-gray-100"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month forward & Year forward buttons */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextYear}
                title="Next Year (Jump 1 year forward)"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div key={idx} className="text-[11px] font-bold text-gray-400 py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d, idx) => {
              const isSelected = d.isSelected;
              const isToday = d.isToday && !isSelected;
              
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={d.isDisabled}
                  onClick={() => handleSelectDate(d.dateStr)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-lg transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md scale-105'
                      : isToday
                      ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50'
                      : d.isCurrentMonth
                      ? 'text-gray-800 font-medium hover:bg-blue-50 hover:text-blue-700'
                      : 'text-gray-300 hover:text-gray-500'
                  } ${d.isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}`}
                >
                  {d.day}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
