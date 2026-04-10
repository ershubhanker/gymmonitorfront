import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, Edit, Trash2, Phone, Mail,
  Briefcase, ChevronLeft, ChevronRight, X, RefreshCw, Calendar,
  ChevronUp, ChevronDown, AlertCircle
} from 'lucide-react';
import { X as CloseIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';
import StaffUserSetup from '../components/StaffUserSetup';

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

// ─── Staff Edit Modal ───────────────────────────────────────────────────────
const StaffEditModal = ({ isOpen, onClose, onSave, staff = null }) => {
  const [formData, setFormData] = useState({
    position: staff?.position || '',
    hireDate: staff?.hire_date || new Date().toISOString().split('T')[0],
    salary: staff?.salary || '',
    specializations: staff?.specializations || '',
    date_of_birth: staff?.date_of_birth || '',
    status: staff?.is_active ? 'active' : 'inactive',
  });

  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

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

  const positions = [
    'Head Trainer', 'Personal Trainer', 'Yoga Instructor', 'Spin Instructor',
    'Group Fitness Instructor', 'Nutritionist', 'Physiotherapist',
    'Receptionist', 'Manager', 'Cleanliness Staff',
  ];

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
              Position <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Position</option>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
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

// ─── Main Staff Page ─────────────────────────────────────────────────────────────
const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStaff();
  }, []);

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

  const handleSearch = () => {
    setCurrentPage(1);
    fetchStaff();
  };

  const handleAddSuccess = () => {
    fetchStaff();
  };

  const handleUpdateStaff = async (staffId, formData) => {
    try {
      await api.put(`/gym/staff/${staffId}`, {
        position: formData.position,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        specializations: formData.specializations,
        is_active: formData.status === 'active',
        hire_date: formData.hireDate,
        date_of_birth: formData.date_of_birth || null,
      });
      toast.success('Staff updated successfully!');
      fetchStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to update staff');
      throw error;
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

  const filteredStaff = staffList.filter(s => {
    const name = s.user?.full_name || '';
    const email = s.user?.email || '';
    const pos = s.position || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || pos.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginated = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900">{staffList.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{staffList.filter(s => s.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-gray-600">On Leave / Inactive</p>
          <p className="text-2xl font-bold text-yellow-600">{staffList.filter(s => !s.is_active).length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name, email or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Search
          </button>
          <button
            onClick={() => { setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No staff found matching your search.' : 'No staff members yet. Click "Add Staff" to get started.'}
                  </td>
                </tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700 font-semibold text-sm">
                          {(s.user?.full_name || 'S').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.user?.full_name || '—'}</p>
                        <p className="text-xs text-gray-500">@{s.user?.username || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {s.user?.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3 flex-shrink-0" /> 
                          <span className="truncate max-w-[150px]">{s.user.email}</span>
                        </div>
                      )}
                      {s.user?.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3 flex-shrink-0" /> 
                          <span>{s.user.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-800">{s.position || '—'}</div>
                    {s.specializations && (
                      <p className="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate" title={s.specializations}>
                        {s.specializations}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.hire_date ? new Date(s.hire_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {s.salary ? `₹${s.salary.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedStaff(s);
                        setIsEditModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(s.user_id)}
                      className="text-orange-600 hover:text-orange-900 mr-2"
                      title="Reset Password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
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

      {/* Edit Staff Modal */}
      <StaffEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        onSave={handleUpdateStaff}
        staff={selectedStaff}
      />
    </div>
  );
};

export default Staff;