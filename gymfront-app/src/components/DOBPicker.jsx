import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, X, CalendarDays, ChevronDown, Check, Search } from 'lucide-react';

const MONTHS = [
  { value: '1', short: 'Jan', name: 'January' },
  { value: '2', short: 'Feb', name: 'February' },
  { value: '3', short: 'Mar', name: 'March' },
  { value: '4', short: 'Apr', name: 'April' },
  { value: '5', short: 'May', name: 'May' },
  { value: '6', short: 'Jun', name: 'June' },
  { value: '7', short: 'Jul', name: 'July' },
  { value: '8', short: 'Aug', name: 'August' },
  { value: '9', short: 'Sep', name: 'September' },
  { value: '10', short: 'Oct', name: 'October' },
  { value: '11', short: 'Nov', name: 'November' },
  { value: '12', short: 'Dec', name: 'December' },
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * CustomScrollDropdown - A professional, scrollable dropdown menu.
 * Supports auto-scrolling to selected/default values, search filtering,
 * checkmarks, smooth animations, and click-outside dismissal.
 */
const CustomScrollDropdown = ({
  isOpen,
  onToggle,
  onClose,
  selectedValue,
  onSelect,
  placeholder,
  displayLabel,
  options,
  widthClass = 'flex-1',
  menuWidthClass = 'w-full min-w-full',
  menuAlign = 'left',
  defaultScrollValue,
  showSearch = false,
  searchPlaceholder = 'Search...',
  ariaLabel
}) => {
  const listRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-scroll to selected or default value when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        if (showSearch && searchInputRef.current) {
          searchInputRef.current.focus();
        }
        if (listRef.current) {
          const target = String(selectedValue || defaultScrollValue || '');
          if (target) {
            const el = listRef.current.querySelector(`[data-val="${target}"]`);
            if (el) {
              el.scrollIntoView({ block: 'nearest' });
            }
          }
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedValue, defaultScrollValue, showSearch]);

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => 
      String(opt.label).toLowerCase().includes(q) || 
      (opt.subLabel && String(opt.subLabel).toLowerCase().includes(q))
    );
  }, [options, showSearch, searchQuery]);

  return (
    <div className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        className={`w-full py-2 px-2.5 bg-white border rounded-lg text-sm transition-all duration-150 flex items-center justify-between text-left cursor-pointer outline-none ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50/50'
        } ${selectedValue ? 'text-gray-900 font-medium' : 'text-gray-400 font-normal'}`}
      >
        <span className="truncate pr-1">
          {displayLabel || (selectedValue ? selectedValue : placeholder)}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-[75] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden ${menuWidthClass} ${
            menuAlign === 'right'
              ? 'right-0'
              : menuAlign === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : 'left-0'
          }`}
          style={{ minWidth: '100%' }}
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs px-2 py-1 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none text-gray-700"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 transparent'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-gray-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(selectedValue) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-val={String(opt.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(opt.value);
                      onClose();
                    }}
                    className={`w-full px-3 py-2 text-sm flex items-center justify-between text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-700 hover:bg-blue-50/60 hover:text-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 pr-1">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span
                          className={`text-xs ${
                            isSelected ? 'text-blue-500 font-medium' : 'text-gray-400'
                          }`}
                        >
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * DOBPicker - A robust, accessible Date of Birth selector with custom scrollable dropdowns.
 * Provides Day, Month (displaying clear month names), and Year scrollable dropdowns.
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
  const [openDropdown, setOpenDropdown] = useState(null); // 'day' | 'month' | 'year' | null
  const [inputMode, setInputMode] = useState('dropdowns'); // 'dropdowns' | 'calendar'
  const containerRef = useRef(null);

  // Close dropdowns on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    const y = year ? parseInt(year, 10) : 2024; // 2024 is safe leap year default
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
      return;
    }
    const safeDay = Math.min(
      parseInt(newDay, 10),
      new Date(parseInt(newYear, 10), parseInt(newMonth, 10), 0).getDate()
    );
    const formattedDate = `${newYear}-${pad(newMonth)}-${pad(safeDay)}`;
    if (formattedDate !== value && onChange) {
      onChange(formattedDate);
    }
  };

  const handleDaySelect = (selectedDayVal) => {
    const newDay = String(selectedDayVal);
    setDay(newDay);
    tryEmit(newDay, month, year);
  };

  const handleMonthSelect = (selectedMonthVal) => {
    const newMonth = String(selectedMonthVal);
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

  const handleYearSelect = (selectedYearVal) => {
    const newYear = String(selectedYearVal);
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
    setOpenDropdown(null);
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

  // Options formatting
  const dayOptions = useMemo(() => {
    return days.map((d) => ({
      value: String(d),
      label: pad(d),
      subLabel: null
    }));
  }, [days]);

  const monthOptions = useMemo(() => {
    return MONTHS.map((m) => ({
      value: m.value,
      label: m.name,
      subLabel: `(${m.short})`
    }));
  }, []);

  const selectedMonthObj = useMemo(() => {
    return MONTHS.find((m) => String(m.value) === String(month));
  }, [month]);

  const monthDisplayLabel = useMemo(() => {
    if (!selectedMonthObj) return null;
    return (
      <span className="truncate">
        <span className="hidden sm:inline">{selectedMonthObj.name}</span>
        <span className="sm:hidden">{selectedMonthObj.short}</span>
      </span>
    );
  }, [selectedMonthObj]);

  const yearOptions = useMemo(() => {
    return years.map((y) => ({
      value: String(y),
      label: String(y),
      subLabel: null
    }));
  }, [years]);

  return (
    <div ref={containerRef} className={`space-y-1 ${className}`}>
      {inputMode === 'dropdowns' ? (
        <div className="flex items-center gap-1.5 w-full">
          {/* Day Dropdown */}
          <CustomScrollDropdown
            isOpen={openDropdown === 'day'}
            onToggle={() => setOpenDropdown((prev) => (prev === 'day' ? null : 'day'))}
            onClose={() => setOpenDropdown(null)}
            selectedValue={day ? pad(day) : ''}
            onSelect={handleDaySelect}
            placeholder="Day"
            displayLabel={day ? pad(day) : null}
            options={dayOptions}
            widthClass="flex-1 min-w-[68px]"
            menuWidthClass="w-24 sm:w-28"
            menuAlign="left"
            ariaLabel="Date of Birth Day"
          />

          {/* Month Dropdown (Shows names like January, February, etc.) */}
          <CustomScrollDropdown
            isOpen={openDropdown === 'month'}
            onToggle={() => setOpenDropdown((prev) => (prev === 'month' ? null : 'month'))}
            onClose={() => setOpenDropdown(null)}
            selectedValue={month}
            onSelect={handleMonthSelect}
            placeholder="Month"
            displayLabel={monthDisplayLabel}
            options={monthOptions}
            widthClass="flex-[1.4] min-w-[105px]"
            menuWidthClass="w-44 sm:w-48"
            menuAlign="center"
            ariaLabel="Date of Birth Month"
          />

          {/* Year Dropdown */}
          <CustomScrollDropdown
            isOpen={openDropdown === 'year'}
            onToggle={() => setOpenDropdown((prev) => (prev === 'year' ? null : 'year'))}
            onClose={() => setOpenDropdown(null)}
            selectedValue={year}
            onSelect={handleYearSelect}
            placeholder="Year"
            displayLabel={year || null}
            options={yearOptions}
            widthClass="flex-1 min-w-[78px]"
            menuWidthClass="w-36"
            menuAlign="right"
            defaultScrollValue={String(Math.max(minYear, currentYear - 25))}
            showSearch={true}
            searchPlaceholder="Type year..."
            ariaLabel="Date of Birth Year"
          />

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
            onClick={() => {
              setOpenDropdown(null);
              setInputMode('calendar');
            }}
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

          {value && (
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
