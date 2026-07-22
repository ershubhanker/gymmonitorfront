// src/pages/Staff.jsx - FIXED SHIFT DISPLAY WITH SALARY CALCULATOR
import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, Edit, Trash2, Phone, Mail,
  Briefcase, ChevronLeft, ChevronRight, X, RefreshCw, Calendar,
  ChevronUp, ChevronDown, AlertCircle, Crown, Clock, Coffee,
  Wifi, WifiOff, Database, Smartphone, CheckCircle, XCircle,
  Loader2, Cloud, Server, Eye, User, MapPin, Award, BookOpen,
  DollarSign, Calendar as CalendarIcon, Users, Settings, Copy,
  Shield, Menu, MoreVertical, Plus, Trash2 as TrashIcon,
  Calculator, TrendingDown, TrendingUp, FileSpreadsheet
} from 'lucide-react';
import { X as CloseIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import StaffUserSetup from '../components/StaffUserSetup';
import StaffPermissionsModal from '../components/StaffPermissionsModal';
import { usePermissions } from '../hooks/usePermissions';
import StaffSalaryCalculator from '../components/staff/StaffSalaryCalculator';

// ─── ALL POSITIONS CONSTANT ─────────────────────────────────────────────────────
const ALL_POSITIONS = [
  'Head Trainer',
  'Trainer', 
  'Personal Trainer', 
  'Yoga Instructor', 
  'Spin Instructor',
  'Group Fitness Instructor', 
  'Nutritionist', 
  'Physiotherapist',
  'Manager',
  'Floor Manager',
  'Sales Manager',
  'Gym Manager',
  'Club Manager',
  'Receptionist', 
  'Cleanliness Staff', 
  'Zumba Instructor',
  'Martial Arts Coach', 
  'Swimming Coach',
  'Sales Executive',
];

// ─── DOB Scroll Picker Component ─────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_H = 40;

const ScrollColumn = ({ items, selectedIndex, onChange, label }) => {
  const listRef = React.useRef(null);
  const isDragging = React.useRef(false);
  const startY = React.useRef(0);
  const startScroll = React.useRef(0);

  const scrollToIndex = React.useCallback((idx, smooth = true) => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  React.useEffect(() => { scrollToIndex(selectedIndex, false); }, [selectedIndex, scrollToIndex]);

  const handleScroll = () => {
    if (!listRef.current || isDragging.current) return;
    const rawIdx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(rawIdx, items.length - 1));
    if (clamped !== selectedIndex) onChange(clamped);
  };

  const onPointerDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY ?? e.touches?.[0]?.clientY;
    startScroll.current = listRef.current?.scrollTop ?? 0;
  };
  const onPointerMove = (e) => {
    if (!isDragging.current || !listRef.current) return;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    listRef.current.scrollTop = startScroll.current + (startY.current - y);
  };
  const onPointerUp = () => {
    if (!isDragging.current || !listRef.current) return;
    isDragging.current = false;
    const rawIdx = Math.round(listRef.current.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(rawIdx, items.length - 1));
    scrollToIndex(clamped);
    if (clamped !== selectedIndex) onChange(clamped);
  };

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 72 }}>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
      <button type="button" className="text-gray-300 hover:text-blue-500 transition-colors p-1"
        onClick={() => { const ni = Math.max(0, selectedIndex - 1); scrollToIndex(ni); onChange(ni); }}>
        <ChevronUp className="h-4 w-4" />
      </button>
      <div className="relative overflow-hidden rounded-xl" style={{ height: ITEM_H * 3, width: 72 }}>
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-x-0 z-10 pointer-events-none rounded-lg border-2 border-blue-500 bg-blue-50/60"
          style={{ top: ITEM_H, height: ITEM_H }} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
        <div ref={listRef} onScroll={handleScroll}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
          style={{ overflowY: 'scroll', height: '100%', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div style={{ height: ITEM_H }} />
          {items.map((item, i) => (
            <div key={i}
              className={`flex items-center justify-center font-medium transition-all cursor-pointer
                ${i === selectedIndex ? 'text-blue-600 text-base' : 'text-gray-400 text-sm hover:text-gray-600'}`}
              style={{ height: ITEM_H, scrollSnapAlign: 'start' }}
              onClick={() => { scrollToIndex(i); onChange(i); }}>
              {typeof item === 'number' ? String(item).padStart(2, '0') : item}
            </div>
          ))}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>
      <button type="button" className="text-gray-300 hover:text-blue-500 transition-colors p-1"
        onClick={() => { const ni = Math.min(items.length - 1, selectedIndex + 1); scrollToIndex(ni); onChange(ni); }}>
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
};

const DOBPicker = ({ value, onChange, maxDate }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const parseValue = (v) => {
    if (!v) return { year: 1995, month: 0, day: 1 };
    const [y, m, d] = v.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  };
  const parsed = parseValue(value);
  const currentYear = maxDate ? parseInt(maxDate.split('-')[0]) : new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1930; y--) years.push(y);
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth(parsed.year, parsed.month) }, (_, i) => i + 1);
  const yearIdx = Math.max(0, years.indexOf(parsed.year));
  const monthIdx = parsed.month;
  const dayIdx = Math.min(parsed.day - 1, days.length - 1);
  const emit = (y, m, d) => {
    const safeDay = Math.min(d + 1, daysInMonth(y, m));
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`);
  };
  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  React.useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between bg-white transition-all
          ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-blue-400'}
          ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {value ? displayValue : 'Select date of birth (optional)'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5"
          style={{ minWidth: 300 }}
          onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Date of Birth</p>
          <div className="flex items-start justify-center gap-2">
            <ScrollColumn label="Day" items={days} selectedIndex={dayIdx} onChange={(i) => emit(parsed.year, parsed.month, i)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Month" items={MONTHS} selectedIndex={monthIdx} onChange={(i) => emit(parsed.year, i, dayIdx)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Year" items={years} selectedIndex={yearIdx} onChange={(i) => emit(years[i], parsed.month, dayIdx)} />
          </div>
          {value && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-700">{displayValue}</p>
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)}
            className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ─── FORMAT TIME HELPER ──────────────────────────────────────────────────────
const formatTime = (time) => {
  if (!time) return '—';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// ─── PARSE SHIFT SLOTS ──────────────────────────────────────────────────────
const parseShiftSlots = (shiftSlots) => {
  if (!shiftSlots) return [];
  try {
    const parsed = JSON.parse(shiftSlots);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

// ─── GET SHIFT DISPLAY ──────────────────────────────────────────────────────
const getShiftDisplay = (staff) => {
  // First check for shift_slots (new format)
  if (staff.shift_slots) {
    try {
      const slots = JSON.parse(staff.shift_slots);
      if (Array.isArray(slots) && slots.length > 0) {
        return slots.map(s => `${formatTime(s.start)}-${formatTime(s.end)}`).join(', ');
      }
    } catch {
      // Fall through to legacy shift display
    }
  }
  
  // Legacy shift display (single shift)
  if (staff.shift_start_time && staff.shift_end_time) {
    let display = `${formatTime(staff.shift_start_time)} - ${formatTime(staff.shift_end_time)}`;
    if (staff.shift_days) {
      const dayCount = staff.shift_days.split(',').length;
      if (dayCount === 7) {
        display += ' (Daily)';
      } else if (dayCount > 0) {
        display += ` (${dayCount}d)`;
      }
    }
    return display;
  }
  
  return 'Not set';
};

// ─── SHIFT EDITOR COMPONENT ──────────────────────────────────────────────────
const ShiftEditor = ({ shiftSlots, shiftStartTime, shiftEndTime, shiftDays, breakDuration, onChange }) => {
  const [useSplitShift, setUseSplitShift] = useState(false);
  const [slots, setSlots] = useState([]);
  const [days, setDays] = useState(shiftDays || '');
  const [breakMin, setBreakMin] = useState(breakDuration?.toString() || '');

  const weekDays = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' }
  ];

  // Initialize shift mode and slots
  useEffect(() => {
    // Check if there are existing shift slots
    const parsedSlots = parseShiftSlots(shiftSlots);
    if (parsedSlots.length > 0) {
      setUseSplitShift(true);
      setSlots(parsedSlots.map(s => ({ ...s })));
    } else {
      setUseSplitShift(false);
      // Initialize with single shift if exists
      if (shiftStartTime && shiftEndTime) {
        setSlots([{ start: shiftStartTime, end: shiftEndTime }]);
      } else {
        setSlots([{ start: '', end: '' }]);
      }
    }
  }, [shiftSlots, shiftStartTime, shiftEndTime]);

  const updateSlot = (index, field, value) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
    notifyChange(newSlots);
  };

  const addSlot = () => {
    setSlots([...slots, { start: '', end: '' }]);
  };

  const removeSlot = (index) => {
    if (slots.length <= 1) return;
    const newSlots = slots.filter((_, i) => i !== index);
    setSlots(newSlots);
    notifyChange(newSlots);
  };

  const toggleDay = (dayValue) => {
    const dayArray = days ? days.split(',').map(d => d.trim()) : [];
    let newDays;
    if (dayArray.includes(dayValue)) {
      newDays = dayArray.filter(d => d !== dayValue);
    } else {
      newDays = [...dayArray, dayValue];
    }
    setDays(newDays.join(','));
    notifyChange(slots, newDays.join(','), breakMin);
  };

  const notifyChange = (newSlots = slots, newDays = days, newBreak = breakMin) => {
    const validSlots = newSlots.filter(s => s.start && s.end);
    const shiftSlotsJson = validSlots.length > 0 ? JSON.stringify(validSlots) : null;
    
    onChange({
      shift_slots: shiftSlotsJson,
      shift_start_time: (!useSplitShift && validSlots.length === 1) ? validSlots[0].start : null,
      shift_end_time: (!useSplitShift && validSlots.length === 1) ? validSlots[0].end : null,
      shift_days: newDays || null,
      break_duration: newBreak ? parseInt(newBreak) : null,
    });
  };

  const selectedDays = days ? days.split(',').map(d => d.trim()) : [];

  const getDaysDisplay = () => {
    if (selectedDays.length === 0) return 'No days selected';
    if (selectedDays.length === 7) return 'Every day';
    return selectedDays.map(d => weekDays.find(w => w.value === d)?.label).join(', ');
  };

  const getSlotPreview = () => {
    const validSlots = slots.filter(s => s.start && s.end);
    if (validSlots.length === 0) return 'No shift set';
    return validSlots.map(s => `${formatTime(s.start)} - ${formatTime(s.end)}`).join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Shift Mode Toggle */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="radio"
            checked={!useSplitShift}
            onChange={() => {
              setUseSplitShift(false);
              const validSlots = slots.filter(s => s.start && s.end);
              if (validSlots.length > 0) {
                setSlots([validSlots[0]]);
              } else {
                setSlots([{ start: '', end: '' }]);
              }
            }}
            className="w-4 h-4 text-blue-600"
          />
          Single Shift
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="radio"
            checked={useSplitShift}
            onChange={() => {
              setUseSplitShift(true);
              if (slots.length === 0 || !slots[0].start) {
                setSlots([{ start: '', end: '' }]);
              }
            }}
            className="w-4 h-4 text-blue-600"
          />
          Split Shift
        </label>
      </div>

      {/* Shift Slots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {useSplitShift ? 'Shift Slots' : 'Shift Timing'}
          </label>
          {useSplitShift && (
            <button
              type="button"
              onClick={addSlot}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Slot
            </button>
          )}
        </div>
        {useSplitShift && (
          <p className="text-xs text-gray-400 mb-2">
            Add multiple time slots for broken shifts (e.g., 6AM-11AM and 3PM-9PM)
          </p>
        )}
        <div className="space-y-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500">Start</label>
                  <input
                    type="time"
                    value={slot.start || ''}
                    onChange={(e) => updateSlot(index, 'start', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">End</label>
                  <input
                    type="time"
                    value={slot.end || ''}
                    onChange={(e) => updateSlot(index, 'end', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              {useSplitShift && slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-4"
                  title="Remove this slot"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Working Days */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Working Days</label>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedDays.includes(day.value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {getDaysDisplay()}
        </p>
      </div>

      {/* Break Duration */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Break Duration (minutes)</label>
        <div className="relative">
          <Coffee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            min="0"
            max="180"
            step="15"
            value={breakMin}
            onChange={(e) => {
              setBreakMin(e.target.value);
              notifyChange(slots, days, e.target.value);
            }}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="e.g., 60"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-semibold text-blue-700 mb-1">Shift Preview:</p>
        <p className="text-xs text-blue-600">
          {getSlotPreview()}
        </p>
        {selectedDays.length > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            Days: {getDaysDisplay()}
          </p>
        )}
        {breakMin && parseInt(breakMin) > 0 && (
          <p className="text-xs text-blue-600">
            Break: {breakMin} min
          </p>
        )}
      </div>
    </div>
  );
};

// ─── STAFF PROFILE MODAL ──────────────────────────────────────────────────────
const StaffProfileModal = ({ staff, onClose, onUpdate, devices = [], onSyncToDevice, canEditStaff, canSyncToDevice }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showSalaryCalculator, setShowSalaryCalculator] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (staff) {
      // Parse shift slots
      const parsedSlots = parseShiftSlots(staff.shift_slots);
      
      setFormData({
        position: staff.position || '',
        hireDate: staff.hire_date || '',
        salary: staff.salary?.toString() || '',
        specializations: staff.specializations || '',
        date_of_birth: staff.date_of_birth || '',
        status: staff.is_active ? 'active' : 'inactive',
        shift_start_time: staff.shift_start_time || '',
        shift_end_time: staff.shift_end_time || '',
        shift_days: staff.shift_days || '',
        break_duration: staff.break_duration?.toString() || '',
        shift_slots: staff.shift_slots || '',
        shift_slots_parsed: parsedSlots,
      });
    }
  }, [staff]);

  if (!staff) return null;

  const handleShiftChange = (shiftData) => {
    setFormData(prev => ({
      ...prev,
      shift_start_time: shiftData.shift_start_time || '',
      shift_end_time: shiftData.shift_end_time || '',
      shift_days: shiftData.shift_days || '',
      break_duration: shiftData.break_duration?.toString() || '',
      shift_slots: shiftData.shift_slots || '',
      shift_slots_parsed: parseShiftSlots(shiftData.shift_slots),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isActive = formData.status === 'active' ? true : false;
      
      await api.put(`/gym/staff/${staff.id}`, {
        position: formData.position,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        specializations: formData.specializations,
        is_active: isActive,
        hire_date: formData.hireDate,
        date_of_birth: formData.date_of_birth || null,
        shift_start_time: formData.shift_start_time || null,
        shift_end_time: formData.shift_end_time || null,
        shift_days: formData.shift_days || null,
        break_duration: formData.break_duration ? parseInt(formData.break_duration) : null,
        shift_slots: formData.shift_slots || null,
      });
      
      toast.success('Staff updated successfully!');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to update staff');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToDevice = async () => {
    if (!selectedDeviceId) {
      toast.error('Please select a device');
      return;
    }
    setSyncing(true);
    try {
      await onSyncToDevice(staff.id, selectedDeviceId, staff.user?.full_name || staff.user?.username);
    } catch (error) {
      console.error('Error syncing to device:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getShiftDisplayForModal = () => {
    const slots = formData.shift_slots_parsed || [];
    if (slots.length > 0) {
      return slots.map(s => `${formatTime(s.start)} - ${formatTime(s.end)}`).join(', ');
    }
    if (formData.shift_start_time && formData.shift_end_time) {
      let display = `${formatTime(formData.shift_start_time)} - ${formatTime(formData.shift_end_time)}`;
      if (formData.shift_days) {
        const dayCount = formData.shift_days.split(',').length;
        if (dayCount === 7) {
          display += ' (Daily)';
        } else if (dayCount > 0) {
          display += ` (${dayCount}d)`;
        }
      }
      return display;
    }
    return 'Not set';
  };

  const getPositionBadgeColor = (position) => {
    if (position === 'Head Trainer') return 'bg-purple-100 text-purple-800';
    if (position === 'Trainer' || position === 'Personal Trainer') return 'bg-blue-100 text-blue-800';
    if (position === 'Yoga Instructor') return 'bg-green-100 text-green-800';
    if (position === 'Manager') return 'bg-yellow-100 text-yellow-800';
    if (position === 'Floor Manager') return 'bg-indigo-100 text-indigo-800';
    if (position === 'Sales Manager') return 'bg-orange-100 text-orange-800';
    if (position === 'Gym Manager') return 'bg-red-100 text-red-800';
    if (position === 'Club Manager') return 'bg-pink-100 text-pink-800';
    if (position === 'Sales Executive') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const copyDeviceId = (deviceId) => {
    if (deviceId) {
      navigator.clipboard.writeText(deviceId);
      toast.success('Device ID copied to clipboard!');
    }
  };

  const hasShift = (formData.shift_slots_parsed && formData.shift_slots_parsed.length > 0) || 
                   (formData.shift_start_time && formData.shift_end_time);
  const deviceUserId = staff.device_user_id;
  const salaryValue = staff.salary || staff.salary_amount || staff.monthly_salary || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              staff.position === 'Head Trainer' ? 'bg-purple-100' : 
              staff.position === 'Sales Executive' ? 'bg-orange-100' : 
              staff.position === 'Floor Manager' ? 'bg-indigo-100' :
              staff.position === 'Sales Manager' ? 'bg-orange-100' :
              staff.position === 'Gym Manager' ? 'bg-red-100' :
              staff.position === 'Club Manager' ? 'bg-pink-100' :
              'bg-indigo-100'
            }`}>
              <span className={`text-xl font-bold ${
                staff.position === 'Head Trainer' ? 'text-purple-700' : 
                staff.position === 'Sales Executive' ? 'text-orange-700' : 
                staff.position === 'Floor Manager' ? 'text-indigo-700' :
                staff.position === 'Sales Manager' ? 'text-orange-700' :
                staff.position === 'Gym Manager' ? 'text-red-700' :
                staff.position === 'Club Manager' ? 'text-pink-700' :
                'text-indigo-700'
              }`}>
                {(staff.user?.full_name || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{staff.user?.full_name || '—'}</h2>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionBadgeColor(staff.position)}`}>
                  {staff.position || '—'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  staff.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && canEditStaff && (
              <>
                <button
                  onClick={() => setShowSalaryCalculator(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Salary
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Position</option>
                    {ALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <DOBPicker
                    value={formData.date_of_birth}
                    onChange={(val) => setFormData({ ...formData, date_of_birth: val })}
                    maxDate={today}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (Monthly ₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter salary"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specializations</label>
                  <textarea
                    value={formData.specializations}
                    onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                    rows="2"
                    placeholder="e.g., HIIT, Yoga, Strength Training, Nutrition"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Timing</label>
                  <ShiftEditor
                    shiftSlots={formData.shift_slots}
                    shiftStartTime={formData.shift_start_time}
                    shiftEndTime={formData.shift_end_time}
                    shiftDays={formData.shift_days}
                    breakDuration={formData.break_duration}
                    onChange={handleShiftChange}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    const parsedSlots = parseShiftSlots(staff.shift_slots);
                    setFormData({
                      position: staff.position || '',
                      hireDate: staff.hire_date || '',
                      salary: staff.salary?.toString() || '',
                      specializations: staff.specializations || '',
                      date_of_birth: staff.date_of_birth || '',
                      status: staff.is_active ? 'active' : 'inactive',
                      shift_start_time: staff.shift_start_time || '',
                      shift_end_time: staff.shift_end_time || '',
                      shift_days: staff.shift_days || '',
                      break_duration: staff.break_duration?.toString() || '',
                      shift_slots: staff.shift_slots || '',
                      shift_slots_parsed: parsedSlots,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Position</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{staff.position || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Hire Date</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(staff.hire_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Salary</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {salaryValue ? `₹${Number(salaryValue).toLocaleString()}` : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    staff.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Shift Timing
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {getShiftDisplayForModal()}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> Working Days
                  </p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {formData.shift_days ? formData.shift_days.split(',').length : '—'} days/week
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider flex items-center gap-1">
                    <Coffee className="h-3 w-3" /> Break Duration
                  </p>
                  <p className="text-base font-semibold text-gray-900 mt-1">
                    {formData.break_duration ? `${formData.break_duration} min` : '—'}
                  </p>
                </div>
              </div>

              {staff.specializations && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Award className="h-3 w-3" /> Specializations
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{staff.specializations}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> User Account Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-gray-400">Username</p>
                    <p className="text-sm font-medium text-gray-900">@{staff.user?.username || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900">{staff.user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{staff.user?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(staff.date_of_birth)}</p>
                  </div>
                </div>
              </div>

              {canSyncToDevice && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> Device Sync
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="flex-1 min-w-[120px]">
                      {deviceUserId ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Synced to Device</span>
                          <button
                            onClick={() => copyDeviceId(deviceUserId)}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            {deviceUserId}
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not synced to any device</span>
                      )}
                    </div>
                    {devices.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => setSelectedDeviceId(e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                        >
                          <option value="">Select Device</option>
                          {devices.map(device => (
                            <option key={device.id} value={device.id}>
                              {device.device_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSyncToDevice}
                          disabled={syncing || !selectedDeviceId}
                          className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                          Sync
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Salary Calculator Modal */}
      {showSalaryCalculator && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <StaffSalaryCalculator
              staffId={staff.id}
              staffName={staff.user?.full_name}
              onClose={() => setShowSalaryCalculator(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STAFF EDIT MODAL ─────────────────────────────────────────────────────────
const StaffEditModal = ({ isOpen, onClose, onSave, staff = null, devices = [], onSyncToDevice, canSyncToDevice }) => {
  const [formData, setFormData] = useState({
    position: '',
    hireDate: '',
    salary: '',
    specializations: '',
    date_of_birth: '',
    status: 'active',
    shift_start_time: '',
    shift_end_time: '',
    shift_days: '',
    break_duration: '',
    shift_slots: '',
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (staff) {
      setFormData({
        position: staff.position || '',
        hireDate: staff.hire_date || new Date().toISOString().split('T')[0],
        salary: staff.salary?.toString() || '',
        specializations: staff.specializations || '',
        date_of_birth: staff.date_of_birth || '',
        status: staff.is_active === true ? 'active' : 'inactive',
        shift_start_time: staff.shift_start_time || '',
        shift_end_time: staff.shift_end_time || '',
        shift_days: staff.shift_days || '',
        break_duration: staff.break_duration?.toString() || '',
        shift_slots: staff.shift_slots || '',
      });
    }
  }, [staff]);

  if (!isOpen) return null;

  const handleShiftChange = (shiftData) => {
    setFormData(prev => ({
      ...prev,
      shift_start_time: shiftData.shift_start_time || '',
      shift_end_time: shiftData.shift_end_time || '',
      shift_days: shiftData.shift_days || '',
      break_duration: shiftData.break_duration?.toString() || '',
      shift_slots: shiftData.shift_slots || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(staff.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving staff:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToDevice = async () => {
    if (!selectedDeviceId) {
      toast.error('Please select a device');
      return;
    }
    setSyncing(true);
    try {
      await onSyncToDevice(staff.id, selectedDeviceId, staff.user?.full_name || staff.user?.username);
    } catch (error) {
      console.error('Error syncing to device:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getShiftPreview = () => {
    const slots = parseShiftSlots(formData.shift_slots);
    if (slots.length > 0) {
      return slots.map(s => `${formatTime(s.start)}-${formatTime(s.end)}`).join(', ');
    }
    if (formData.shift_start_time && formData.shift_end_time) {
      return `${formatTime(formData.shift_start_time)}-${formatTime(formData.shift_end_time)}`;
    }
    return 'Not set';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Edit Staff Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Name
            </label>
            <input
              type="text"
              value={staff?.user?.full_name || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Position</option>
              {ALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
            <input
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <DOBPicker
              value={formData.date_of_birth}
              onChange={(val) => setFormData({ ...formData, date_of_birth: val })}
              maxDate={today}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary (Monthly ₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specializations</label>
            <textarea
              value={formData.specializations}
              onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
              rows="3"
              placeholder="e.g., HIIT, Yoga, Strength Training"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shift Timing</label>
            <ShiftEditor
              shiftSlots={formData.shift_slots}
              shiftStartTime={formData.shift_start_time}
              shiftEndTime={formData.shift_end_time}
              shiftDays={formData.shift_days}
              breakDuration={formData.break_duration}
              onChange={handleShiftChange}
            />
            <p className="text-xs text-gray-400 mt-1">
              Current: {getShiftPreview()}
            </p>
          </div>

          {canSyncToDevice && devices.length > 0 && (
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Smartphone className="inline h-4 w-4 mr-1" />
                Sync to Attendance Device
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Device</option>
                  {devices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.device_name} ({device.device_ip})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSyncToDevice}
                  disabled={syncing || !selectedDeviceId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Sync
                </button>
              </div>
              {staff?.device_user_id && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Device ID: {staff.device_user_id}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── STAFF DEVICE SYNC MODAL ─────────────────────────────────────────────────────
const StaffDeviceSyncModal = ({ isOpen, onClose, staffList, devices, onSyncSelected, onSyncAll }) => {
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set());
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState('selected');

  if (!isOpen) return null;

  const handleToggleStaff = (staffId) => {
    const newSet = new Set(selectedStaffIds);
    if (newSet.has(staffId)) {
      newSet.delete(staffId);
    } else {
      newSet.add(staffId);
    }
    setSelectedStaffIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedStaffIds.size === staffList.length) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(staffList.map(s => s.id)));
    }
  };

  const handleSync = async () => {
    if (!selectedDeviceId) {
      toast.error('Please select a device');
      return;
    }

    setSyncing(true);
    try {
      if (syncMode === 'selected' && selectedStaffIds.size > 0) {
        await onSyncSelected(Array.from(selectedStaffIds), selectedDeviceId);
      } else if (syncMode === 'all') {
        await onSyncAll(selectedDeviceId);
      }
      onClose();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatus = (staff) => {
    if (staff.device_user_id) {
      return { text: 'Synced', color: 'text-green-600', icon: CheckCircle };
    }
    return { text: 'Not Synced', color: 'text-gray-400', icon: XCircle };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sync Staff to Device
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Device</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an attendance device</option>
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.device_name} ({device.device_ip}) - {device.is_online ? 'Online' : 'Offline'}
              </option>
            ))}
          </select>
        </div>

        <div className="p-6 border-b overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="selected"
                  checked={syncMode === 'selected'}
                  onChange={() => setSyncMode('selected')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">Selected Staff</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="all"
                  checked={syncMode === 'all'}
                  onChange={() => setSyncMode('all')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">All Staff</span>
              </label>
            </div>
            {syncMode === 'selected' && staffList.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedStaffIds.size === staffList.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {syncMode === 'selected' && (
            <div className="border rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.size === staffList.length && staffList.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffList.map(staff => {
                    const status = getSyncStatus(staff);
                    const StatusIcon = status.icon;
                    return (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.has(staff.id)}
                            onChange={() => handleToggleStaff(staff.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{staff.user?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500">{staff.user?.email || ''}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{staff.position || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`h-4 w-4 ${status.color}`} />
                            <span className={`text-xs ${status.color}`}>{status.text}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {syncMode === 'all' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                This will sync all {staffList.length} staff members to the selected device.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-wrap justify-end gap-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !selectedDeviceId || (syncMode === 'selected' && selectedStaffIds.size === 0)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Sync to Device
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Staff Page ─────────────────────────────────────────────────────────────
const Staff = () => {
  const { permissions, hasPermission, loading: permissionsLoading } = usePermissions();
  const [userRole, setUserRole] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeviceSyncModalOpen, setIsDeviceSyncModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [staffDeviceIds, setStaffDeviceIds] = useState({});
  const [isSalaryCalculatorOpen, setIsSalaryCalculatorOpen] = useState(false);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);

  const isAdmin = userRole === 'gym_owner' || userRole === 'super_admin';

  const canViewStaff = hasPermission('view_staff');
  const canAddStaff = hasPermission('add_staff');
  const canEditStaff = hasPermission('edit_staff');
  const canDeleteStaff = hasPermission('delete_staff');
  const canManagePermissions = hasPermission('manage_staff_permissions');
  const canSyncToDevice = hasPermission('sync_to_device');

  const [initialStaffId, setInitialStaffId] = useState(null);
  const [selectedStaffForView, setSelectedStaffForView] = useState(null);
  const [showSingleStaff, setShowSingleStaff] = useState(false);
  const [loadingSingleStaff, setLoadingSingleStaff] = useState(false);

  useEffect(() => {
    if (canViewStaff) {
      fetchStaff();
      fetchDevices();
      fetchStaffDeviceIds();
    }
  }, [canViewStaff]);

  useEffect(() => {
    if (initialStaffId) {
      setInitialStaffId(initialStaffId);
      setShowSingleStaff(true);
      fetchSingleStaff(initialStaffId);
    } else {
      setShowSingleStaff(false);
      setInitialStaffId(null);
      setSelectedStaffForView(null);
    }
  }, [initialStaffId]);
  
  const fetchSingleStaff = async (staffId) => {
    setLoadingSingleStaff(true);
    try {
      const response = await api.get(`/gym/staff/${staffId}`);
      setSelectedStaffForView(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff details');
      setShowSingleStaff(false);
    } finally {
      setLoadingSingleStaff(false);
    }
  };
  
  const handleBackToStaffList = () => {
    setShowSingleStaff(false);
    setInitialStaffId(null);
    setSelectedStaffForView(null);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await api.get(`/gym/staff?${params.toString()}`);
      setStaffList(response.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await api.get('/attendance/devices');
      setDevices(response.data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchStaffDeviceIds = async () => {
    try {
      const response = await api.get('/attendance/staff/device-ids');
      const deviceIdMap = {};
      response.data.forEach(item => {
        deviceIdMap[item.staff_id] = item.device_user_id;
      });
      setStaffDeviceIds(deviceIdMap);
    } catch (error) {
      console.error('Error fetching staff device IDs:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStaff();
  };

  const handleAddSuccess = () => {
    fetchStaff();
  };

  const handleUpdateStaff = async (staffId, formData) => {
    try {
      const isActive = formData.status === 'active' ? true : false;
      
      await api.put(`/gym/staff/${staffId}`, {
        position: formData.position,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        specializations: formData.specializations,
        is_active: isActive,
        hire_date: formData.hireDate,
        date_of_birth: formData.date_of_birth || null,
        shift_start_time: formData.shift_start_time || null,
        shift_end_time: formData.shift_end_time || null,
        shift_days: formData.shift_days || null,
        break_duration: formData.break_duration ? parseInt(formData.break_duration) : null,
        shift_slots: formData.shift_slots || null,
      });
      toast.success('Staff updated successfully!');
      fetchStaff();
      fetchStaffDeviceIds();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to update staff');
      throw error;
    }
  };

  const handleSyncStaffToDevice = async (staffId, deviceId, staffName) => {
    try {
      const response = await api.post(`/gym/devices/${deviceId}/sync-staff`, {
        id: staffId,
        full_name: staffName
      });
      
      if (response.data.success) {
        toast.success(`✅ Staff "${staffName}" synced to device!`);
        setTimeout(() => {
          fetchStaff();
          fetchStaffDeviceIds();
        }, 1500);
        return response.data;
      } else {
        toast.error('Failed to sync staff member');
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Error syncing staff:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to sync staff member';
      toast.error(`❌ ${errorMsg}`);
      throw error;
    }
  };

  const handleSyncSelectedStaff = async (staffIds, deviceId) => {
    try {
      const response = await api.post(`/gym/devices/bulk-sync-staff`, staffIds, {
        params: { device_id: deviceId }
      });
      
      if (response.data.success) {
        toast.success(`✅ Queued ${staffIds.length} staff members for sync.`);
        setTimeout(() => {
          fetchStaff();
          fetchStaffDeviceIds();
        }, 2000);
        return response.data;
      } else {
        toast.error('Failed to sync staff members');
        throw new Error('Bulk sync failed');
      }
    } catch (error) {
      console.error('Error syncing staff:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to sync staff members';
      toast.error(`❌ ${errorMsg}`);
      throw error;
    }
  };

  const handleSyncAllStaff = async (deviceId) => {
    const allStaffIds = staffList.map(s => s.id);
    return handleSyncSelectedStaff(allStaffIds, deviceId);
  };

  const checkDeviceConnection = async () => {
    try {
      const response = await api.get('/attendance/devices');
      const onlineDevices = response.data.filter(d => d.is_online);
      
      if (onlineDevices.length === 0) {
        toast.error('No online devices found. Make sure the bridge is running.');
      } else {
        toast.success(`${onlineDevices.length} device(s) online: ${onlineDevices.map(d => d.device_name).join(', ')}`);
      }
      return onlineDevices.length > 0;
    } catch (error) {
      console.error('Error checking devices:', error);
      toast.error('Failed to check device status');
      return false;
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.delete(`/gym/staff/${staffId}`);
      setStaffList(staffList.filter(s => s.id !== staffId));
      toast.success('Staff removed successfully!');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove staff');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Reset password to default (Staff@123)?')) return;
    try {
      await api.post(`/users/${userId}/reset-password`, { new_password: 'Staff@123' });
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const openProfileModal = (staff) => {
    setSelectedStaff(staff);
    setIsProfileModalOpen(true);
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const openPermissionsModal = (staff) => {
    setSelectedStaff(staff);
    setIsPermissionsModalOpen(true);
  };

  const openSalaryCalculator = (staff) => {
    setSelectedStaffForSalary(staff);
    setIsSalaryCalculatorOpen(true);
  };

  const getPositionBadgeColor = (position) => {
    if (position === 'Head Trainer') return 'bg-purple-100 text-purple-800';
    if (position === 'Trainer' || position === 'Personal Trainer') return 'bg-blue-100 text-blue-800';
    if (position === 'Yoga Instructor') return 'bg-green-100 text-green-800';
    if (position === 'Manager') return 'bg-yellow-100 text-yellow-800';
    if (position === 'Floor Manager') return 'bg-indigo-100 text-indigo-800';
    if (position === 'Sales Manager') return 'bg-orange-100 text-orange-800';
    if (position === 'Gym Manager') return 'bg-red-100 text-red-800';
    if (position === 'Club Manager') return 'bg-pink-100 text-pink-800';
    if (position === 'Sales Executive') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (permissionsLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!canViewStaff) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
          <p className="text-red-600">You don't have permission to view staff members.</p>
        </div>
      </div>
    );
  }

  const filteredStaff = staffList.filter(s => {
    const name = s.user?.full_name || '';
    const email = s.user?.email || '';
    const pos = s.position || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || pos.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginated = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const onlineDevices = devices.filter(d => d.is_online);
  const hasDevices = devices.length > 0;

  return (
    <div className="p-4 sm:p-6">
      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Total Staff</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{staffList.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{staffList.filter(s => s.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600">Inactive</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">{staffList.filter(s => !s.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 hidden sm:block">
          <p className="text-xs sm:text-sm text-gray-600">With Shift</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">
            {staffList.filter(s => s.shift_slots || (s.shift_start_time && s.shift_end_time)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-6 hidden sm:block">
          <p className="text-xs sm:text-sm text-gray-600">Synced</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-600">
            {staffList.filter(s => staffDeviceIds[s.id] || s.device_user_id).length}
          </p>
        </div>
      </div>

      {/* Actions - Responsive */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSearch}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Search
          </button>
          
          {canSyncToDevice && hasDevices && (
            <button
              onClick={() => setIsDeviceSyncModalOpen(true)}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
            >
              <Database className="h-4 w-4" />
              <span className="hidden xs:inline">Sync</span>
              <span className="hidden sm:inline">to Device</span>
            </button>
          )}
          
          <button
            onClick={checkDeviceConnection}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 sm:gap-2 text-sm"
          >
            <Wifi className="h-4 w-4" />
            <span className="hidden xs:inline">Devices</span>
          </button>

          {/* Salary Calculator Button */}
          <button
            onClick={() => setIsSalaryCalculatorOpen(true)}
            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden xs:inline">Salary</span>
          </button>
          
          {canAddStaff && (
            <button
              onClick={() => { setIsAddModalOpen(true); }}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 sm:gap-2 text-sm whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden xs:inline">Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Device Status Banner - Responsive */}
      {hasDevices && (
        <div className={`mb-4 p-3 rounded-lg flex flex-wrap items-center gap-2 ${
          onlineDevices.length > 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          {onlineDevices.length > 0 ? (
            <>
              <Wifi className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {onlineDevices.length} device(s) online.
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                No devices online. Check connection.
              </span>
            </>
          )}
        </div>
      )}

      {/* Table - Responsive with horizontal scroll */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Position</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Shift</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Device ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No staff found matching your search.' : 'No staff members yet. Click "Add Staff" to get started.'}
                  </td>
                </tr>
              ) : (
                paginated.map((s) => {
                  const deviceUserId = staffDeviceIds[s.id] || s.device_user_id;
                  const shiftDisplay = getShiftDisplay(s);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div 
                          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
                          onClick={() => openProfileModal(s)}
                        >
                          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            s.position === 'Head Trainer' ? 'bg-purple-100' : 
                            s.position === 'Sales Executive' ? 'bg-orange-100' : 
                            s.position === 'Floor Manager' ? 'bg-indigo-100' :
                            s.position === 'Sales Manager' ? 'bg-orange-100' :
                            s.position === 'Gym Manager' ? 'bg-red-100' :
                            s.position === 'Club Manager' ? 'bg-pink-100' :
                            'bg-indigo-100'
                          }`}>
                            <span className={`font-semibold text-xs sm:text-sm ${
                              s.position === 'Head Trainer' ? 'text-purple-700' : 
                              s.position === 'Sales Executive' ? 'text-orange-700' : 
                              s.position === 'Floor Manager' ? 'text-indigo-700' :
                              s.position === 'Sales Manager' ? 'text-orange-700' :
                              s.position === 'Gym Manager' ? 'text-red-700' :
                              s.position === 'Club Manager' ? 'text-pink-700' :
                              'text-indigo-700'
                            }`}>
                              {(s.user?.full_name || 'S').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[150px]">
                              {s.user?.full_name || '—'}
                            </p>
                            <p className="text-xs text-gray-500 truncate max-w-[80px] sm:max-w-[120px]">@{s.user?.username || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {s.user?.email && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                              <Mail className="h-3 w-3 flex-shrink-0" /> 
                              <span className="truncate max-w-[120px]">{s.user.email}</span>
                            </div>
                          )}
                          {s.user?.phone && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                              <Phone className="h-3 w-3 flex-shrink-0" /> 
                              <span>{s.user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          {s.position === 'Head Trainer' && <Crown className="h-3 w-3 text-purple-600 flex-shrink-0" />}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPositionBadgeColor(s.position)}`}>
                            {s.position || '—'}
                          </span>
                        </div>
                        {s.specializations && (
                          <p className="text-xs text-gray-500 mt-1 max-w-[120px] truncate hidden lg:block" title={s.specializations}>
                            {s.specializations}
                          </p>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs sm:text-sm">
                          <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className={!s.shift_start_time && !s.shift_slots ? 'text-gray-400' : 'text-gray-700 truncate max-w-[150px]'}>
                            {shiftDisplay}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                        {deviceUserId ? (
                          <div className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span className="text-xs font-mono text-green-600 truncate max-w-[80px]">{deviceUserId}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {/* Salary Calculator Button */}
                          <button
                            onClick={() => openSalaryCalculator(s)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Salary Calculator"
                          >
                            <Calculator className="h-4 w-4" />
                          </button>

                          {canManagePermissions && (
                            <button
                              onClick={() => openPermissionsModal(s)}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="Manage Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => openProfileModal(s)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {canEditStaff && (
                            <button
                              onClick={() => openEditModal(s)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canEditStaff && (
                            <button
                              onClick={() => handleResetPassword(s.user_id)}
                              className="text-orange-600 hover:text-orange-900 p-1 hidden md:inline-flex"
                              title="Reset Password"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canDeleteStaff && (
                            <button
                              onClick={() => handleDeleteStaff(s.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length}
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <StaffUserSetup
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Staff Profile Modal */}
      {isProfileModalOpen && selectedStaff && (
        <StaffProfileModal
          staff={selectedStaff}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedStaff(null);
          }}
          onUpdate={() => {
            fetchStaff();
            fetchStaffDeviceIds();
          }}
          devices={devices.filter(d => d.is_online)}
          onSyncToDevice={handleSyncStaffToDevice}
          canEditStaff={canEditStaff}
          canSyncToDevice={canSyncToDevice}
        />
      )}

      {/* Edit Staff Modal */}
      <StaffEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        onSave={handleUpdateStaff}
        staff={selectedStaff}
        devices={devices.filter(d => d.is_online)}
        onSyncToDevice={handleSyncStaffToDevice}
        canSyncToDevice={canSyncToDevice}
      />

      {/* Device Sync Modal */}
      <StaffDeviceSyncModal
        isOpen={isDeviceSyncModalOpen}
        onClose={() => setIsDeviceSyncModalOpen(false)}
        staffList={staffList}
        devices={devices.filter(d => d.is_online)}
        onSyncSelected={handleSyncSelectedStaff}
        onSyncAll={handleSyncAllStaff}
      />

      {/* Staff Permissions Modal */}
      <StaffPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
        onUpdate={() => {
          fetchStaff();
        }}
      />

      {/* Salary Calculator Modal - Global */}
      {isSalaryCalculatorOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <StaffSalaryCalculator
              staffId={selectedStaffForSalary?.id}
              staffName={selectedStaffForSalary?.user?.full_name}
              onClose={() => {
                setIsSalaryCalculatorOpen(false);
                setSelectedStaffForSalary(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;