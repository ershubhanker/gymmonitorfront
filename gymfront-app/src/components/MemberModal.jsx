import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, User, Phone, Heart, FileText, Camera, Plus, CheckCircle,
  Calendar, CreditCard, AlertCircle, ChevronRight, Loader2, RefreshCw,
  ChevronUp, ChevronDown, Upload, Trash2, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';

// ─── Plan type presets ────────────────────────────────────────────────────────
const PLAN_PRESETS = [
  { label: 'Monthly',     plan_type: 'monthly',     duration_days: 30  },
  { label: 'Quarterly',   plan_type: 'quarterly',   duration_days: 90  },
  { label: 'Half-Yearly', plan_type: 'half_yearly', duration_days: 180 },
  { label: 'Yearly',      plan_type: 'yearly',      duration_days: 365 },
];

// ─── DOB Scroll Picker (unchanged) ────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ITEM_H = 40;

const ScrollColumn = ({ items, selectedIndex, onChange, label }) => {
  const listRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  const scrollToIndex = useCallback((idx, smooth = true) => {
    if (!listRef.current) return;
    listRef.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => { scrollToIndex(selectedIndex, false); }, [selectedIndex, scrollToIndex]);

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

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
  const yearIdx  = Math.max(0, years.indexOf(parsed.year));
  const monthIdx = parsed.month;
  const dayIdx   = Math.min(parsed.day - 1, days.length - 1);
  const emit = (y, m, d) => {
    const safeDay = Math.min(d + 1, daysInMonth(y, m));
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`);
  };
  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  useEffect(() => {
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
          {value ? displayValue : 'Select date of birth'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 z-[60] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5"
          style={{ minWidth: 300 }}
          onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">Date of Birth</p>
          <div className="flex items-start justify-center gap-2">
            <ScrollColumn label="Day"   items={days}   selectedIndex={dayIdx}   onChange={(i) => emit(parsed.year, parsed.month, i)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Month" items={MONTHS} selectedIndex={monthIdx} onChange={(i) => emit(parsed.year, i, dayIdx)} />
            <div className="w-px bg-gray-100 self-stretch" />
            <ScrollColumn label="Year"  items={years}  selectedIndex={yearIdx}  onChange={(i) => emit(years[i], parsed.month, dayIdx)} />
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

// ─── Profile Photo Uploader (unchanged) ───────────────────────────────────────
const PhotoUploader = ({ memberId, currentPhotoUrl, onPhotoUploaded, getPendingFileRef }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    if (getPendingFileRef) {
      getPendingFileRef.current = () => pendingFile;
    }
  }, [pendingFile, getPendingFileRef]);

  useEffect(() => {
    if (currentPhotoUrl) {
      if (currentPhotoUrl.startsWith('http')) {
        setPreview(currentPhotoUrl);
      } else {
        setPreview(`${API_BASE_URL}${currentPhotoUrl}`);
      }
    } else {
      setPreview(null);
    }
    setPendingFile(null);
  }, [currentPhotoUrl, memberId]);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE_MB = 5;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (memberId) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post(
          `/gym/members/${memberId}/upload-photo`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        const fullUrl = res.data.photo_url.startsWith('http') 
          ? res.data.photo_url 
          : `${API_BASE_URL}${res.data.photo_url}`;
        setPreview(fullUrl);
        setPendingFile(null);
        if (onPhotoUploaded) onPhotoUploaded(res.data.photo_url);
        toast.success('Photo uploaded successfully!');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Photo upload failed. Please try again.');
        if (currentPhotoUrl) {
          const revertUrl = currentPhotoUrl.startsWith('http') 
            ? currentPhotoUrl 
            : `${API_BASE_URL}${currentPhotoUrl}`;
          setPreview(revertUrl);
        } else {
          setPreview(null);
        }
      } finally {
        setUploading(false);
      }
    } else {
      setPendingFile(file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    setPreview(null);
    setPendingFile(null);
    if (onPhotoUploaded) onPhotoUploaded(null);
  };

  return (
    <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-xl">
      <div className="relative flex-shrink-0">
        {preview ? (
          <img
            src={preview}
            alt="Member photo"
            className="h-20 w-20 rounded-full object-cover border-2 border-blue-200 shadow"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow">
            <User className="h-8 w-8" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full text-white hover:bg-blue-700 shadow transition-colors disabled:opacity-60"
          title="Upload photo"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm">Member Photo</p>
        {pendingFile && !memberId ? (
          <p className="text-xs text-amber-600 mt-0.5 font-medium">
            📎 {pendingFile.name} — will upload after saving
          </p>
        ) : uploading ? (
          <p className="text-xs text-blue-600 mt-0.5">Uploading…</p>
        ) : preview ? (
          <p className="text-xs text-green-600 mt-0.5 font-medium">✓ Photo set</p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5">JPEG, PNG, WebP · max 5 MB</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            {preview ? 'Change Photo' : 'Upload Photo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

// ─── Reusable Plan Form (Create / Edit) ───────────────────────────────────────
const PlanFormModal = ({ plan, onSave, onCancel }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    plan_type: plan?.plan_type || 'monthly',
    duration_days: plan?.duration_days || 30,
    price: plan?.price?.toString() || '',
    discounted_price: plan?.discounted_price?.toString() || '',
    description: plan?.description || '',
    is_active: plan?.is_active ?? true,
  });

  const handlePreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      plan_type: preset.plan_type,
      duration_days: preset.duration_days,
      name: prev.name || preset.label,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Plan name and price are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        plan_type: formData.plan_type,
        duration_days: parseInt(formData.duration_days),
        price: parseFloat(formData.price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
        description: formData.description || null,
        is_active: formData.is_active,
      };
      await onSave(payload);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
          <Plus className="h-4 w-4" /> {plan ? 'Edit Plan' : 'Create Plan'}
        </h4>
        <button type="button" onClick={onCancel} className="text-blue-400 hover:text-blue-600 p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Plan Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLAN_PRESETS.map(preset => (
              <button key={preset.plan_type} type="button" onClick={() => handlePreset(preset)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  formData.plan_type === preset.plan_type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Basic Monthly"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
            <input type="number" min="1" value={formData.duration_days}
              onChange={e => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discounted Price (₹) <span className="text-gray-400 font-normal">optional</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input type="number" min="0" step="0.01" value={formData.discounted_price}
                onChange={e => setFormData({ ...formData, discounted_price: e.target.value })}
                placeholder="Optional"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows="2" value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Plan is active (available for selection)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>{plan ? 'Update Plan' : 'Create Plan'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Membership Selector (with Edit/Delete) ────────────────────────────────────
const MembershipSelector = ({ 
  formData, setFormData, membershipPlans, setMembershipPlans, 
  showPlanCreator, setShowPlanCreator, inputCls, labelCls,
  onRefreshPlans
}) => {
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const selectedPlan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handlePlanSave = async (planPayload) => {
    if (editingPlan) {
      const res = await api.put(`/gym/plans/${editingPlan.id}`, planPayload);
      toast.success(`Plan "${res.data.name}" updated`);
      setEditingPlan(null);
      await onRefreshPlans();
      if (String(formData.plan_id) === String(editingPlan.id)) {
        const updatedPlan = res.data;
        setFormData(prev => ({
          ...prev,
          amount_paid: String(updatedPlan.discounted_price || updatedPlan.price)
        }));
      }
    } else {
      const res = await api.post('/gym/plans', planPayload);
      toast.success(`Plan "${res.data.name}" created`);
      await onRefreshPlans();
      setFormData(prev => ({
        ...prev,
        plan_id: String(res.data.id),
        amount_paid: String(res.data.discounted_price || res.data.price)
      }));
    }
    setShowPlanCreator(false);
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? This will not affect existing memberships, but the plan will be removed from selection.`)) return;
    
    setDeletingPlanId(plan.id);
    try {
      const response = await api.delete(`/gym/plans/${plan.id}`);
      toast.success(response.data.message || 'Plan deleted/deactivated successfully');
      
      // If the deleted plan was selected, clear the selection
      if (String(formData.plan_id) === String(plan.id)) {
        setFormData(prev => ({ ...prev, plan_id: '', amount_paid: '' }));
      }
      
      await onRefreshPlans();
    } catch (err) {
      console.error('Delete plan error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to delete plan';
      toast.error(errorMessage);
      
      // If the error is about active memberships, suggest deactivation instead
      if (errorMessage.includes('active memberships')) {
        toast.error('You can deactivate the plan instead by editing it and unchecking "Plan is active"');
      }
    } finally {
      setDeletingPlanId(null);
    }
  };

  const startEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowPlanCreator(true);
  };

  const cancelPlanForm = () => {
    setEditingPlan(null);
    setShowPlanCreator(false);
  };

  // Always show "Create a new plan" button when there are plans
  // And show the plan creator form when showPlanCreator is true OR when there are no plans
  const shouldShowPlanCreator = showPlanCreator || membershipPlans.length === 0;

  return (
    <div className="space-y-4">
      {membershipPlans.length === 0 && !shouldShowPlanCreator && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">No membership plans yet</p>
            <p className="text-sm text-amber-700 mt-0.5">Create your first plan below.</p>
          </div>
        </div>
      )}

      {membershipPlans.length === 0 && !shouldShowPlanCreator && (
        <PlanFormModal onSave={handlePlanSave} onCancel={cancelPlanForm} />
      )}

      {membershipPlans.length > 0 && !shouldShowPlanCreator && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">Select a plan:</p>
            <button
              type="button"
              onClick={onRefreshPlans}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {membershipPlans.map(plan => {
              const price = plan.discounted_price || plan.price;
              const isSelected = String(formData.plan_id) === String(plan.id);
              const isDeleting = deletingPlanId === plan.id;
              
              return (
                <div key={plan.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}>
                  <input type="radio" name="plan_id" value={String(plan.id)}
                    checked={isSelected} onChange={set('plan_id')}
                    className="accent-blue-600 w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{plan.name}</p>
                      {!plan.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => startEditPlan(plan)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="Edit plan"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          disabled={isDeleting}
                          className="text-gray-400 hover:text-red-600 p-1 disabled:opacity-50"
                          title="Delete plan"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.duration_days} days{plan.description ? ` · ${plan.description}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">₹{price}</p>
                    {plan.discounted_price && <p className="text-xs text-gray-400 line-through">₹{plan.price}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => { setEditingPlan(null); setShowPlanCreator(true); }}
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="h-4 w-4" /> Create a new plan
          </button>
        </div>
      )}

      {shouldShowPlanCreator && (
        <PlanFormModal
          plan={editingPlan}
          onSave={handlePlanSave}
          onCancel={cancelPlanForm}
        />
      )}

      {selectedPlan && !shouldShowPlanCreator && (
        <div className="space-y-4">
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">Selected: {selectedPlan.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm text-green-700">
              <div><span className="font-medium">Duration:</span> {selectedPlan.duration_days} days</div>
              <div><span className="font-medium">Price:</span> ₹{selectedPlan.discounted_price || selectedPlan.price}</div>
              <div>
                <span className="font-medium">Expires:</span>{' '}
                {formData.membership_start_date
                  ? new Date(new Date(formData.membership_start_date).getTime() + selectedPlan.duration_days * 86400000)
                      .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Start Date <span className="text-red-500">*</span>
                </span>
              </label>
              <input type="date" value={formData.membership_start_date} onChange={set('membership_start_date')}
                className={inputCls} style={{ colorScheme: 'light' }} />
              {formData.membership_start_date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(formData.membership_start_date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-gray-400" /> Payment Method
                </span>
              </label>
              <select value={formData.payment_method} onChange={set('payment_method')} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Amount Paid (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                <input type="number" min="0" step="0.01" value={formData.amount_paid}
                  onChange={set('amount_paid')} className={`${inputCls} pl-7`} placeholder="0.00" />
              </div>

              {/* Quick fill buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount_paid: String(selectedPlan.discounted_price || selectedPlan.price) }))}
                  className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Full (₹{selectedPlan.discounted_price || selectedPlan.price})
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount_paid: String(Math.floor((selectedPlan.discounted_price || selectedPlan.price) / 2)) }))}
                  className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Half (₹{Math.floor((selectedPlan.discounted_price || selectedPlan.price) / 2)})
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount_paid: '0' }))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Pay Later
                </button>
              </div>

              {/* Payment status feedback */}
              {formData.amount_paid !== '' && (() => {
                const planPrice = Number(selectedPlan.discounted_price || selectedPlan.price);
                const paid = Number(formData.amount_paid);
                const balanceDue = Math.max(0, planPrice - paid);
                if (paid === 0) {
                  return (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-600 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <span>No payment recorded — full amount of <strong>₹{planPrice}</strong> will remain as balance due</span>
                      </p>
                    </div>
                  );
                } else if (paid >= planPrice) {
                  return (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-700 flex items-center gap-1.5 font-medium">
                        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Full payment — no balance due ✓
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                      <p className="text-xs text-amber-700 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        Partial payment — balance will be tracked
                      </p>
                      <div className="flex justify-between text-xs text-amber-700 pl-5">
                        <span>Plan price:</span>
                        <span className="font-medium">₹{planPrice}</span>
                      </div>
                      <div className="flex justify-between text-xs text-amber-700 pl-5">
                        <span>Paying now:</span>
                        <span className="font-medium text-green-700">₹{paid}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-red-600 pl-5 pt-0.5 border-t border-amber-200">
                        <span>Remaining balance due:</span>
                        <span>₹{balanceDue}</span>
                      </div>
                      <p className="text-xs text-amber-600 pl-5">Member can pay remaining from Balance tab</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main MemberModal ─────────────────────────────────────────────────────────
const MemberModal = ({ isOpen, onClose, onSave, member = null, userRole = 'gym_owner' }) => {
  const today = new Date().toISOString().split('T')[0];
  const isEdit = !!member;

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', date_of_birth: '', gender: 'male',
    address: '', emergency_contact_name: '', emergency_contact_phone: '',
    medical_conditions: '', allergies: '', medications: '',
    id_proof_type: 'aadhar', id_proof_number: '',
    plan_id: '', membership_start_date: today, payment_method: 'cash', amount_paid: '',
    renew_membership: false,
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanCreator, setShowPlanCreator] = useState(false);
  const [saving, setSaving] = useState(false);

  const getPendingFileRef = useRef(null);

  const refreshMembershipPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const response = await api.get('/gym/plans?active_only=false');
      const plans = response.data || [];
      setMembershipPlans(plans);
      
      // Show plan creator if there are no plans AND we're not in edit mode for a member
      // This ensures new gym owners can create their first plan
      if (!member && plans.length === 0) {
        setShowPlanCreator(true);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      toast.error('Could not load membership plans');
    } finally {
      setLoadingPlans(false);
    }
  }, [member]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('personal');
    setSaving(false);
    setShowPlanCreator(false);

    if (member) {
      setFormData({
        full_name: member.full_name || '',
        email: member.email || '',
        phone: member.phone || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || 'male',
        address: member.address || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_conditions: member.medical_conditions || '',
        allergies: member.allergies || '',
        medications: member.medications || '',
        id_proof_type: member.id_proof_type || 'aadhar',
        id_proof_number: member.id_proof_number || '',
        plan_id: '', membership_start_date: today, payment_method: 'cash', amount_paid: '',
        renew_membership: false,
      });
    } else {
      setFormData({
        full_name: '', email: '', phone: '', date_of_birth: '', gender: 'male',
        address: '', emergency_contact_name: '', emergency_contact_phone: '',
        medical_conditions: '', allergies: '', medications: '',
        id_proof_type: 'aadhar', id_proof_number: '',
        plan_id: '', membership_start_date: today, payment_method: 'cash', amount_paid: '',
        renew_membership: false,
      });
    }
    refreshMembershipPlans();
  }, [isOpen, member, refreshMembershipPlans, today]);

  useEffect(() => {
    if (formData.plan_id) {
      const plan = membershipPlans.find(p => String(p.id) === String(formData.plan_id));
      if (plan) {
        setFormData(prev => ({ ...prev, amount_paid: String(plan.discounted_price || plan.price) }));
      }
    }
  }, [formData.plan_id, membershipPlans]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      setActiveTab('personal');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      setActiveTab('personal');
      return;
    }
    if (!/^[+]?[\d\s\-]{7,15}$/.test(formData.phone.trim())) {
      toast.error('Enter a valid phone number (e.g. +91-9876543210)');
      setActiveTab('personal');
      return;
    }
    if (formData.emergency_contact_phone.trim() && !/^[+]?[\d\s\-]{7,15}$/.test(formData.emergency_contact_phone.trim())) {
      toast.error('Enter a valid emergency contact phone number');
      setActiveTab('contact');
      return;
    }
    if (!isEdit && !formData.plan_id) {
      toast.error('Please select a membership plan');
      setActiveTab('membership');
      return;
    }
    if (isEdit && formData.renew_membership && !formData.plan_id) {
      toast.error('Please select a plan to renew');
      setActiveTab('membership');
      return;
    }

    if (!isEdit) {
      try {
        const phoneCheck = await api.get(`/gym/members?search=${encodeURIComponent(formData.phone.trim())}`);
        const duplicate = phoneCheck.data?.find(
          m => m.phone === formData.phone.trim()
        );
        if (duplicate) {
          toast.error(
            `A member with phone number ${formData.phone.trim()} already exists (${duplicate.full_name}). Please use a different number.`,
            { duration: 5000 }
          );
          setActiveTab('personal');
          return;
        }
      } catch {
        // ignore
      }
    }

    setSaving(true);
    try {
      const savedMember = await onSave(formData);

      if (!isEdit && savedMember?.id) {
        const pendingFile = getPendingFileRef.current?.();
        if (pendingFile) {
          try {
            const fd = new FormData();
            fd.append('file', pendingFile);
            await api.post(
              `/gym/members/${savedMember.id}/upload-photo`,
              fd,
              { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            toast.success('Photo uploaded!');
          } catch {
            toast.error('Member saved, but photo upload failed. You can re-upload from edit mode.');
          }
        }
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const tabs = [
    { id: 'personal',   name: 'Personal',                                     icon: User      },
    { id: 'contact',    name: 'Contact',                                      icon: Phone     },
    { id: 'medical',    name: 'Medical',                                      icon: Heart     },
    { id: 'documents',  name: 'Documents',                                    icon: FileText  },
    { id: 'membership', name: isEdit ? 'Renew / Change Plan' : 'Membership',  icon: isEdit ? RefreshCw : CreditCard },
  ];

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white";
  const phoneKeyDown = (e) => {
    const nav = new Set(['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']);
    if (!e.ctrlKey && !e.metaKey && !nav.has(e.key) && !/^[0-9+\- ]$/.test(e.key)) e.preventDefault();
  };
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const idProofOptions = [
    { value: 'aadhar',   label: 'Aadhar Card'      },
    { value: 'pan',      label: 'PAN Card'          },
    { value: 'dl',       label: 'Driving License'   },
    { value: 'passport', label: 'Passport'          },
    { value: 'voter',    label: 'Voter ID'          },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Member' : 'Add New Member'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? 'Update details or renew / change membership plan' : 'Register a new gym member'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 flex-shrink-0 overflow-x-auto">
          <nav className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                <tab.icon className="h-4 w-4" />
                {tab.name}
                {tab.id === 'membership' && formData.plan_id && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">

            {activeTab === 'personal' && (
              <div className="space-y-4">
                <PhotoUploader
                  memberId={isEdit ? member?.id : null}
                  currentPhotoUrl={isEdit ? member?.raw?.profile_image : null}
                  onPhotoUploaded={() => {}}
                  getPendingFileRef={isEdit ? null : getPendingFileRef}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.full_name} onChange={set('full_name')}
                      className={inputCls} placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={formData.email} onChange={set('email')}
                      className={inputCls} placeholder="member@example.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
                    <input type="tel" required value={formData.phone} onChange={set('phone')}
                      maxLength={15} onKeyDown={phoneKeyDown}
                      className={inputCls} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <DOBPicker
                      value={formData.date_of_birth}
                      onChange={(val) => setFormData(prev => ({ ...prev, date_of_birth: val }))}
                      maxDate={today}
                    />
                    {formData.date_of_birth && (() => {
                      const dob = new Date(formData.date_of_birth + 'T00:00:00');
                      const now = new Date();
                      let age = now.getFullYear() - dob.getFullYear();
                      const mDiff = now.getMonth() - dob.getMonth();
                      if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--;
                      return <p className="text-xs text-gray-400 mt-1.5">{age} years old</p>;
                    })()}
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select value={formData.gender} onChange={set('gender')} className={inputCls}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea rows="2" value={formData.address} onChange={set('address')}
                      className={inputCls} placeholder="Full address" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Contact Name</label>
                    <input type="text" value={formData.emergency_contact_name}
                      onChange={set('emergency_contact_name')} className={inputCls}
                      placeholder="Emergency contact name" />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Phone</label>
                    <input type="tel" value={formData.emergency_contact_phone}
                      onChange={set('emergency_contact_phone')} className={inputCls}
                      maxLength={15} onKeyDown={phoneKeyDown}
                      placeholder="+91 98765 43210" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medical' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                  This information is confidential and used only for member safety.
                </div>
                {[
                  { key: 'medical_conditions', label: 'Medical Conditions', placeholder: 'e.g. Diabetes, Hypertension' },
                  { key: 'allergies',           label: 'Allergies',          placeholder: 'e.g. Peanuts, Latex'         },
                  { key: 'medications',         label: 'Current Medications', placeholder: 'List any regular medications' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <textarea rows="3" value={formData[key]}
                      onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder} className={inputCls} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>ID Proof Type</label>
                    <select value={formData.id_proof_type} onChange={set('id_proof_type')} className={inputCls}>
                      {idProofOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>ID Proof Number</label>
                    <input type="text" value={formData.id_proof_number} onChange={set('id_proof_number')}
                      className={inputCls} placeholder="Enter ID number" />
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50">
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Click to upload ID proof image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            )}

            {activeTab === 'membership' && (
              <div className="space-y-5">
                {isEdit && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current Membership</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {member?.membership && member.membership !== 'No Plan'
                              ? member.membership
                              : <span className="text-gray-400 italic">No active plan</span>}
                          </p>
                          {member?.membershipEndDate && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              Expires: {new Date(member.membershipEndDate).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                        {member?.membershipEndDate && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            new Date(member.membershipEndDate) < new Date()
                              ? 'bg-red-100 text-red-700'
                              : new Date(member.membershipEndDate) < new Date(Date.now() + 7 * 86400000)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {new Date(member.membershipEndDate) < new Date() ? 'Expired' :
                             new Date(member.membershipEndDate) < new Date(Date.now() + 7 * 86400000) ? 'Expiring soon' : 'Active'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900 text-sm">Renew or Change Plan</p>
                          <p className="text-xs text-blue-600 mt-0.5">Creates a new membership period for this member</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          renew_membership: !prev.renew_membership,
                          plan_id: '',
                          amount_paid: '',
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          formData.renew_membership ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.renew_membership ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                )}

                {(!isEdit || formData.renew_membership) && (
                  loadingPlans ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm">Loading plans...</p>
                    </div>
                  ) : (
                    <MembershipSelector
                      formData={formData}
                      setFormData={setFormData}
                      membershipPlans={membershipPlans}
                      setMembershipPlans={setMembershipPlans}
                      showPlanCreator={showPlanCreator}
                      setShowPlanCreator={setShowPlanCreator}
                      inputCls={inputCls}
                      labelCls={labelCls}
                      onRefreshPlans={refreshMembershipPlans}
                    />
                  )
                )}

                {isEdit && !formData.renew_membership && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Toggle the switch above to renew or change this member's plan.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} title={tab.name}
                  className={`rounded-full transition-all ${
                    activeTab === tab.id ? 'w-6 h-2.5 bg-blue-600' : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium">
                Cancel
              </button>
              {activeTab !== tabs[tabs.length - 1].id && (
                <button type="button"
                  onClick={() => {
                    const idx = tabs.findIndex(t => t.id === activeTab);
                    setActiveTab(tabs[idx + 1].id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : <>{isEdit ? 'Save Changes' : 'Add Member'}</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;