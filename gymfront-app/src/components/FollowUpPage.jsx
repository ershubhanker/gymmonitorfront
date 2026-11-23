// src/components/FollowUpPage.jsx - Complete Follow-up Management with Edit Details, Date Rescheduling & Full History Tracking

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Users, Phone, Mail, ChevronRight, CheckCircle, CheckCircle2,
  XCircle, Clock, AlertCircle, Filter, Search, X, RefreshCw,
  User, MessageCircle, Star, Target, TrendingUp, Download,
  ChevronDown, ChevronUp, Loader2, FileText, Trash2, Edit,
  Plus, ArrowLeft, Send, History, Check, ShieldCheck,
  Flame, Zap, Snowflake, ExternalLink, CalendarDays,
  Sparkles, ArrowRight, CornerDownRight
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCache, CACHE_KEYS } from '../context/CacheContext';
import { useNavigate } from 'react-router-dom';
import { parseUtcDate } from '../utils/dateUtils';

// ─── Status Badge Component ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    contacted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    interested: 'bg-green-100 text-green-700 border-green-200',
    not_interested: 'bg-red-100 text-red-700 border-red-200',
    converted: 'bg-purple-100 text-purple-700 border-purple-200',
    lost: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  const labels = {
    new: 'New',
    contacted: 'Contacted',
    interested: 'Interested',
    not_interested: 'Not Interested',
    converted: 'Converted',
    lost: 'Lost'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || colors.new}`}>
      {labels[status] || status}
    </span>
  );
};

// ─── Quality Badge ──────────────────────────────────────────────────────────
const QualityBadge = ({ quality }) => {
  const colors = {
    hot: 'bg-red-50 text-red-700 border-red-200',
    warm: 'bg-orange-50 text-orange-700 border-orange-200',
    cold: 'bg-blue-50 text-blue-700 border-blue-200'
  };
  const labels = {
    hot: '🔥 Hot',
    warm: '☀️ Warm',
    cold: '❄️ Cold'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[quality] || colors.warm}`}>
      {labels[quality] || quality}
    </span>
  );
};

// ─── Helper: Format date for datetime-local input ──────────────────────────
const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ─── Helper: Quick Date Presets ───────────────────────────────────────────
const getQuickDateString = (type) => {
  const d = new Date();
  if (type === 'today_evening') {
    d.setHours(18, 0, 0, 0);
  } else if (type === 'plus_3_hours') {
    d.setHours(d.getHours() + 3);
  } else if (type === 'tomorrow_morning') {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  } else if (type === 'tomorrow_evening') {
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
  } else if (type === 'in_2_days') {
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
  } else if (type === 'in_3_days') {
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
  } else if (type === 'in_1_week') {
    d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0);
  }
  return toDateTimeLocal(d);
};

// ─── Main FollowUpPage Component ──────────────────────────────────────────
const FollowUpPage = ({ onFollowUpClick, onRefresh }) => {
  const navigate = useNavigate();
  const { getCache, setCache, clearCache, clearCachePattern, invalidateCache } = useCache();

  // ─── State ──────────────────────────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState('pending'); // 'pending' | 'done'
  const [followups, setFollowups] = useState([]);
  const [doneFollowups, setDoneFollowups] = useState([]);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingDone, setLoadingDone] = useState(false);
  const [error, setError] = useState(null);
  const [staffList, setStaffList] = useState([]);

  // Selected Lead & Modals
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [initialDetailTab, setInitialDetailTab] = useState('history');

  // Edit Follow-up Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Quick Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [leadToReschedule, setLeadToReschedule] = useState(null);

  // Action status
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ─── Filters ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all',
    quality: 'all',
    assignedTo: 'all',
    search: ''
  });

  const [dateRangePreset, setDateRangePreset] = useState('today');

  // ─── Stats ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    interested: 0,
    converted: 0,
    lost: 0,
    not_interested: 0
  });

  // ─── Date Range Presets ────────────────────────────────────────────────
  const datePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'Next Week', value: 'next_week' },
    { label: 'This Month', value: 'month' },
  ];

  // ─── Fetch Staff List ───────────────────────────────────────────────────
  const fetchStaffList = useCallback(async () => {
    try {
      const res = await api.get('/gym/leads/staff-list');
      setStaffList(res.data?.staff || res.data || []);
    } catch (err) {
      console.debug('Failed to load staff list for followups:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // ─── Apply Date Preset ──────────────────────────────────────────────────
  const applyDatePreset = useCallback((preset) => {
    setDateRangePreset(preset);
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case 'today':
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        startDate = tomorrow.toISOString().split('T')[0];
        endDate = tomorrow.toISOString().split('T')[0];
        break;
      case 'week':
        startDate = today.toISOString().split('T')[0];
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        endDate = weekEnd.toISOString().split('T')[0];
        break;
      case 'next_week':
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(nextWeekStart.getDate() + 7);
        const nextWeekEnd = new Date(today);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);
        startDate = nextWeekStart.toISOString().split('T')[0];
        endDate = nextWeekEnd.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = today.toISOString().split('T')[0];
        const monthEnd = new Date(today);
        monthEnd.setDate(monthEnd.getDate() + 30);
        endDate = monthEnd.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: startDate,
      endDate: endDate
    }));
  }, []);

  // ─── Handle Date Change ─────────────────────────────────────────────────
  const handleDateChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setDateRangePreset('custom');
  };

  // ─── Fetch Followups (Pending) ──────────────────────────────────────────
  const fetchFollowups = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.quality !== 'all') params.append('quality', filters.quality);
      if (filters.assignedTo !== 'all') params.append('assigned_to', filters.assignedTo);
      if (filters.search) params.append('search', filters.search);

      const cacheKey = `followups_${params.toString()}`;
      if (!bypassCache) {
        const cached = getCache(cacheKey);
        if (cached) {
          setFollowups(cached.items || []);
          setStats(cached.stats || {});
          setLoading(false);
          return;
        }
      }

      const response = await api.get(`/gym/followups?${params.toString()}`);
      const data = response.data || { items: [], stats: {} };
      setFollowups(data.items || []);
      setStats(data.stats || {});

      setCache(cacheKey, { items: data.items, stats: data.stats }, 2 * 60 * 1000);
    } catch (err) {
      console.error('Error fetching followups:', err);
      setError(err.response?.data?.detail || 'Failed to load followups');
      toast.error('Failed to load followups');
    } finally {
      setLoading(false);
    }
  }, [filters, getCache, setCache]);

  // ─── Fetch Done Followups ───────────────────────────────────────────────
  const fetchDoneFollowups = useCallback(async (bypassCache = false) => {
    setLoadingDone(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.search) params.append('search', filters.search);

      const cacheKey = `done_followups_${params.toString()}`;
      if (!bypassCache) {
        const cached = getCache(cacheKey);
        if (cached) {
          setDoneFollowups(cached.done_followups || []);
          setDoneCount(cached.count || (cached.done_followups ? cached.done_followups.length : 0));
          setLoadingDone(false);
          return;
        }
      }

      const res = await api.get(`/gym/followups/done-today?${params.toString()}`);
      const data = res.data || { done_followups: [], count: 0 };
      setDoneFollowups(data.done_followups || []);
      setDoneCount(data.count || (data.done_followups ? data.done_followups.length : 0));
      setCache(cacheKey, data, 2 * 60 * 1000);
    } catch (err) {
      console.error('Error fetching done followups:', err);
    } finally {
      setLoadingDone(false);
    }
  }, [filters, getCache, setCache]);

  // ─── Fetch Lead Details (with comments/history) ─────────────────────────
  const fetchLeadDetails = useCallback(async (leadId) => {
    try {
      const response = await api.get(`/gym/leads/${leadId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching lead details:', err);
      toast.error('Failed to load lead details');
      return null;
    }
  }, []);

  // ─── Update Lead Status ─────────────────────────────────────────────────
  const updateLeadStatus = useCallback(async (leadId, status) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/gym/leads/${leadId}`, { status });
      toast.success(`Status updated to ${status}`);

      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      fetchFollowups(true);
      fetchDoneFollowups(true);

      if (selectedLead && selectedLead.id === leadId) {
        const updated = await fetchLeadDetails(leadId);
        if (updated) setSelectedLead(updated);
      }
      invalidateCache();
    } catch (err) {
      console.error('Error updating lead status:', err);
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [fetchFollowups, fetchDoneFollowups, fetchLeadDetails, selectedLead, invalidateCache, clearCachePattern]);

  // ─── Save Full Edit Follow-up Details ──────────────────────────────────
  const handleSaveEditFollowUp = async (leadId, formData) => {
    try {
      const payload = {
        status: formData.status,
        lead_quality: formData.lead_quality,
        notes: formData.notes,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        interest: formData.interest || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        preferred_plan: formData.preferred_plan || null,
        next_follow_up: formData.next_follow_up ? new Date(formData.next_follow_up).toISOString() : null,
        followup_note: formData.followup_note
          ? `[${(formData.followup_type || 'follow_up').replace('_', ' ').toUpperCase()}] ${formData.followup_note}`
          : null
      };

      await api.put(`/gym/leads/${leadId}`, payload);
      toast.success('Follow-up details updated and logged to history!');

      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      fetchFollowups(true);
      fetchDoneFollowups(true);

      if (selectedLead && selectedLead.id === leadId) {
        const refreshed = await fetchLeadDetails(leadId);
        if (refreshed) setSelectedLead(refreshed);
      }

      setShowEditModal(false);
      setLeadToEdit(null);
      invalidateCache();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error updating follow-up details:', err);
      toast.error(err.response?.data?.detail || 'Failed to update follow-up details');
      throw err;
    }
  };

  // ─── Quick Reschedule Follow-up Date ───────────────────────────────────
  const handleQuickReschedule = async (leadId, newDateStr, note = '') => {
    try {
      const isoDate = new Date(newDateStr).toISOString();
      await api.post(`/gym/followups/${leadId}/reschedule`, {
        next_follow_up: isoDate,
        note: note.trim() || 'Follow-up rescheduled'
      });
      toast.success('Next follow-up date updated and scheduled!');

      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      invalidateCache();

      window.dispatchEvent(new CustomEvent('leadUpdated', { detail: { leadId } }));

      fetchFollowups(true);
      fetchDoneFollowups(true);

      if (selectedLead && selectedLead.id === leadId) {
        const refreshed = await fetchLeadDetails(leadId);
        if (refreshed) setSelectedLead(refreshed);
      }

      setShowRescheduleModal(false);
      setLeadToReschedule(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error rescheduling follow-up:', err);
      toast.error(err.response?.data?.detail || 'Failed to reschedule follow-up');
      throw err;
    }
  };

  // ─── Quick Complete Follow-up ──────────────────────────────────────────
  const handleCompleteFollowUp = async (leadId) => {
    // 1. Locate lead to complete
    const lead = followups.find(f => f.id === leadId);

    // 2. Optimistically remove from pending followups list immediately
    setFollowups(prev => prev.filter(f => f.id !== leadId));
    setStats(prev => ({
      ...prev,
      total: Math.max(0, (prev.total || 1) - 1),
      contacted: (prev.contacted || 0) + 1
    }));

    // 3. Optimistically add to doneFollowups list immediately
    if (lead) {
      const nowIso = new Date().toISOString();
      const doneItem = {
        ...lead,
        lead_name: lead.full_name,
        lead_phone: lead.phone,
        lead_email: lead.email,
        done_at: nowIso,
        done_by_name: 'You',
        comment: '✅ Follow-up marked as completed',
        status: lead.status === 'new' ? 'contacted' : lead.status
      };
      setDoneFollowups(prev => [doneItem, ...prev.filter(d => d.id !== leadId)]);
      setDoneCount(prev => prev + 1);
    }

    try {
      await api.put(`/gym/followups/${leadId}/complete`);
      toast.success('Follow-up marked as completed and moved to Done Follow-ups!');

      // Clear follow-up caches so stale data isn't loaded on subsequent queries
      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      invalidateCache();

      // Dispatch real-time events for other components/dashboard cards
      window.dispatchEvent(new CustomEvent('followupCompleted', { detail: { leadId } }));
      window.dispatchEvent(new CustomEvent('leadUpdated', { detail: { leadId } }));

      if (selectedLead && selectedLead.id === leadId) {
        const refreshed = await fetchLeadDetails(leadId);
        if (refreshed) setSelectedLead(refreshed);
      }

      if (onRefresh) onRefresh();

      // Synchronize in background
      fetchFollowups(true);
      fetchDoneFollowups(true);
    } catch (err) {
      console.error('Error completing follow-up:', err);
      toast.error('Failed to mark follow-up as completed');
      fetchFollowups(true);
      fetchDoneFollowups(true);
    }
  };

  // ─── Log Quick History Note / Interaction ──────────────────────────────
  const handleAddHistoryNote = async (leadId, noteText, newStatus = null, newFollowupDate = null) => {
    if (!noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      if (newStatus || newFollowupDate) {
        const updatePayload = {
          followup_note: noteText.trim()
        };
        if (newStatus) updatePayload.status = newStatus;
        if (newFollowupDate) updatePayload.next_follow_up = new Date(newFollowupDate).toISOString();
        await api.put(`/gym/leads/${leadId}`, updatePayload);
      } else {
        await api.post(`/gym/leads/${leadId}/comments`, {
          comment: noteText.trim()
        });
      }

      toast.success('Follow-up activity recorded in history!');
      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      fetchFollowups(true);
      fetchDoneFollowups(true);

      const refreshed = await fetchLeadDetails(leadId);
      if (refreshed) setSelectedLead(refreshed);

      invalidateCache();
    } catch (err) {
      console.error('Error logging history note:', err);
      toast.error(err.response?.data?.detail || 'Failed to log note');
    }
  };

  // ─── Initial Load & Event Listeners ────────────────────────────────────
  useEffect(() => {
    applyDatePreset('today');
  }, [applyDatePreset]);

  useEffect(() => {
    fetchFollowups();
    fetchDoneFollowups();
  }, [fetchFollowups, fetchDoneFollowups]);

  // Real-time synchronization when follow-ups are completed or leads are added/updated anywhere
  useEffect(() => {
    const handleGlobalUpdate = () => {
      clearCachePattern('followups_');
      clearCachePattern('done_followups_');
      fetchFollowups(true);
      fetchDoneFollowups(true);
    };

    window.addEventListener('followupCompleted', handleGlobalUpdate);
    window.addEventListener('leadUpdated', handleGlobalUpdate);
    window.addEventListener('leadAdded', handleGlobalUpdate);

    return () => {
      window.removeEventListener('followupCompleted', handleGlobalUpdate);
      window.removeEventListener('leadUpdated', handleGlobalUpdate);
      window.removeEventListener('leadAdded', handleGlobalUpdate);
    };
  }, [fetchFollowups, fetchDoneFollowups, clearCachePattern]);

  // ─── Handle Row Click ──────────────────────────────────────────────────
  const handleOpenLeadDetail = async (lead, tab = 'overview') => {
    const details = await fetchLeadDetails(lead.id);
    if (details) {
      setSelectedLead(details);
      setInitialDetailTab(tab);
      setShowDetailModal(true);
    }
  };

  // ─── Open Edit Modal ───────────────────────────────────────────────────
  const handleOpenEdit = async (lead) => {
    const details = await fetchLeadDetails(lead.id);
    setLeadToEdit(details || lead);
    setShowEditModal(true);
  };

  // ─── Open Reschedule Modal ─────────────────────────────────────────────
  const handleOpenReschedule = (lead) => {
    setLeadToReschedule(lead);
    setShowRescheduleModal(true);
  };

  // ─── Clear Filters ─────────────────────────────────────────────────────
  const clearFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'all',
      quality: 'all',
      assignedTo: 'all',
      search: ''
    });
    setDateRangePreset('today');
    clearCache(CACHE_KEYS.LEADS_LIST);
  };

  // ─── Export CSV ────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    if (activeMainTab === 'pending') {
      if (followups.length === 0) {
        toast.error('No pending follow-ups to export');
        return;
      }

      const headers = [
        'Lead ID', 'Name', 'Phone', 'Email', 'Status', 'Quality',
        'Next Follow-up', 'Assigned Staff', 'Interest', 'Source', 'Notes', 'Created At'
      ];

      const rows = followups.map(lead => [
        lead.id,
        lead.full_name,
        lead.phone,
        lead.email || '',
        lead.status,
        lead.lead_quality || 'warm',
        lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString() : '',
        lead.assigned_staff_name || '',
        lead.interest || '',
        lead.source,
        (lead.notes || '').replace(/,/g, ';'),
        new Date(lead.created_at).toLocaleString()
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending_followups_${filters.startDate}_to_${filters.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${followups.length} pending followups`);
    } else {
      if (doneFollowups.length === 0) {
        toast.error('No completed follow-ups to export');
        return;
      }

      const headers = [
        'Lead ID', 'Name', 'Phone', 'Email', 'Status', 'Quality',
        'Done At', 'Done By', 'Activity Note', 'Assigned Staff'
      ];

      const rows = doneFollowups.map(item => [
        item.id,
        item.full_name || item.lead_name,
        item.phone || item.lead_phone,
        item.email || item.lead_email || '',
        item.status,
        item.lead_quality || 'warm',
        item.done_at ? new Date(item.done_at).toLocaleString() : '',
        item.done_by_name || 'Staff',
        (item.comment || item.notes || '').replace(/,/g, ';'),
        item.assigned_staff_name || ''
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `done_followups_${filters.startDate}_to_${filters.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${doneFollowups.length} completed followups`);
    }
  }, [activeMainTab, followups, doneFollowups, filters]);

  // ─── Format Date Helpers ───────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = parseUtcDate(dateStr);
    if (!d || isNaN(d.getTime())) return 'N/A';
    try {
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    const d = parseUtcDate(dateStr);
    if (!d || isNaN(d.getTime())) return 'N/A';
    try {
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // ─── Empty & Loading States ────────────────────────────────────────────
  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-4">
        <Calendar className="h-10 w-10 text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">No Follow-ups Found</h3>
      <p className="text-gray-500 mb-4 max-w-md mx-auto text-sm">
        {filters.search || filters.status !== 'all' || filters.quality !== 'all' || filters.assignedTo !== 'all'
          ? 'Try adjusting your filters or search keywords to see more follow-up leads'
          : 'There are no follow-ups scheduled for the selected date range. You can reschedule leads or add new follow-ups anytime.'}
      </p>
      {(filters.search || filters.status !== 'all' || filters.quality !== 'all' || filters.assignedTo !== 'all') && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      )}
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-500 text-sm font-medium">Loading follow-ups & schedule...</p>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
            Follow-ups Management
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {followups.length} pending
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {doneFollowups.length} done
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track, edit follow-up details, reschedule dates, and keep complete interaction history
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              clearCachePattern('followups_');
              clearCachePattern('done_followups_');
              fetchFollowups(true);
              fetchDoneFollowups(true);
              toast.success('Refreshed follow-ups');
            }}
            className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/dashboard?tab=leads')}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm hover:shadow"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* ─── Stats Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div
          onClick={() => setActiveMainTab('pending')}
          className={`bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-blue-500 cursor-pointer transition-all hover:shadow-md ${
            activeMainTab === 'pending' ? 'ring-2 ring-blue-500' : ''
          }`}
          title="Click to view pending follow-ups"
        >
          <p className="text-xs text-gray-500 font-medium">Pending Due</p>
          <p className="text-xl font-bold text-gray-900">{stats.total || followups.length}</p>
        </div>
        <div
          onClick={() => setActiveMainTab('done')}
          className={`bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-emerald-500 cursor-pointer transition-all hover:shadow-md ${
            activeMainTab === 'done' ? 'ring-2 ring-emerald-500' : ''
          }`}
          title="Click to view done follow-ups"
        >
          <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Done Follow-ups
          </p>
          <p className="text-xl font-bold text-emerald-600">{doneFollowups.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 font-medium">New</p>
          <p className="text-xl font-bold text-blue-600">{stats.new || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 font-medium">Contacted</p>
          <p className="text-xl font-bold text-yellow-600">{stats.contacted || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 font-medium">Interested</p>
          <p className="text-xl font-bold text-green-600">{stats.interested || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 font-medium">Converted</p>
          <p className="text-xl font-bold text-purple-600">{stats.converted || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 font-medium">Lost</p>
          <p className="text-xl font-bold text-red-600">{stats.lost || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-xs p-3.5 border-l-4 border-gray-400">
          <p className="text-xs text-gray-500 font-medium">Not Interested</p>
          <p className="text-xl font-bold text-gray-600">{stats.not_interested || 0}</p>
        </div>
      </div>

      {/* ─── Filters Bar ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-xs p-4 space-y-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by name, phone, email, notes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
              <option value="not_interested">Not Interested</option>
            </select>

            <select
              value={filters.quality}
              onChange={(e) => setFilters(prev => ({ ...prev, quality: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Quality</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
            </select>

            {staffList.length > 0 && (
              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[170px]"
              >
                <option value="all">All Staff</option>
                {staffList.map((s) => (
                  <option key={s.id || s.user_id} value={s.user_id || s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            )}

            {(filters.search || filters.status !== 'all' || filters.quality !== 'all' || filters.assignedTo !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-red-300"
              >
                <X className="h-3.5 w-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ─── Date Range Filtering ───────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Schedule Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {datePresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => applyDatePreset(preset.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      dateRangePreset === preset.value
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">From:</span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">To:</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Tabs & Follow-ups Table ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-xs overflow-hidden border border-gray-100">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/70 px-4 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('pending')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeMainTab === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Clock className="h-4 w-4" />
              Pending Follow-ups
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeMainTab === 'pending'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200/80 text-gray-600'
              }`}>
                {followups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('done')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                activeMainTab === 'done'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Done Follow-ups
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeMainTab === 'done'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-200/80 text-gray-600'
              }`}>
                {doneFollowups.length}
              </span>
            </button>
          </div>

          <span className="text-xs text-gray-400 hidden sm:inline-block pb-3">
            {activeMainTab === 'pending'
              ? `${followups.length} follow-up${followups.length === 1 ? '' : 's'} pending`
              : `${doneFollowups.length} follow-up${doneFollowups.length === 1 ? '' : 's'} completed`}
          </span>
        </div>

        {/* Tab 1: Pending Follow-ups Table */}
        {activeMainTab === 'pending' && (
          loading ? (
            renderLoadingState()
          ) : followups.length === 0 ? (
            renderEmptyState()
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Quality</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Follow-up</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff / Interest</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {followups.map((lead) => {
                  const isOverdue = lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
                  const isToday = lead.next_follow_up && new Date(lead.next_follow_up).toDateString() === new Date().toDateString();

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenLeadDetail(lead, 'overview')}
                    >
                      {/* Lead Name & ID */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                            {lead.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {lead.full_name}
                            </p>
                            <span className="text-xs text-gray-400">ID #{lead.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {lead.phone}
                          </a>
                          {lead.email ? (
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-xs text-gray-500 hover:text-blue-600 truncate max-w-[180px] transition-colors"
                            >
                              {lead.email}
                            </a>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">No email</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Quality */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={lead.status} />
                          <QualityBadge quality={lead.lead_quality} />
                        </div>
                      </td>

                      {/* Next Follow-up Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {lead.next_follow_up ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-blue-500" />
                              {formatDateTime(lead.next_follow_up)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isOverdue ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                                  ⚠️ Overdue
                                </span>
                              ) : isToday ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700">
                                  ⚡ Due Today
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">
                                  Scheduled
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenReschedule(lead)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline inline-flex items-center gap-0.5"
                                title="Reschedule Date"
                              >
                                Edit Date
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 italic">No date set</span>
                            <button
                              onClick={() => handleOpenReschedule(lead)}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium"
                            >
                              + Schedule
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Staff & Interest */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm text-gray-800 font-medium">
                          {lead.assigned_staff_name || 'Unassigned'}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {lead.interest || lead.preferred_plan || lead.source?.replace('_', ' ') || 'General Enquiry'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ✏️ Edit Follow-up Details */}
                          <button
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1.5 rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all"
                            title="Edit Follow-up Details"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {/* 📅 Quick Reschedule Date */}
                          <button
                            onClick={() => handleOpenReschedule(lead)}
                            className="p-1.5 rounded-lg border border-gray-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                            title="Edit Next Follow-up Date"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>

                          {/* 📜 View Complete History */}
                          <button
                            onClick={() => handleOpenLeadDetail(lead, 'history')}
                            className="p-1.5 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all"
                            title="View Follow-up History"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          {/* Quick Complete / Status change */}
                          <button
                            onClick={() => handleCompleteFollowUp(lead.id)}
                            className="p-1.5 rounded-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                            title="Mark Follow-up as Completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>

                          {/* WhatsApp Link */}
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-all"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Tab 2: Done Follow-ups Table */}
        {activeMainTab === 'done' && (
          loadingDone ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">Loading completed follow-ups...</p>
            </div>
          ) : doneFollowups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-b-xl shadow-xs">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-full mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Completed Follow-ups Found</h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto text-sm">
                Follow-ups marked as completed for the selected date range will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Quality</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed At & By</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity / Comment</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {doneFollowups.map((item) => {
                    const leadName = item.full_name || item.lead_name || 'Lead';
                    const leadPhone = item.phone || item.lead_phone;
                    const leadEmail = item.email || item.lead_email;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                        onClick={() => handleOpenLeadDetail(item, 'history')}
                      >
                        {/* Lead Name & ID */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0">
                              {leadName.charAt(0)?.toUpperCase() || 'L'}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                                {leadName}
                              </p>
                              <span className="text-xs text-gray-400">ID #{item.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            {leadPhone ? (
                              <a
                                href={`tel:${leadPhone}`}
                                className="text-sm font-medium text-gray-900 hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                {leadPhone}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No phone</span>
                            )}
                            {leadEmail ? (
                              <a
                                href={`mailto:${leadEmail}`}
                                className="text-xs text-gray-500 hover:text-emerald-600 truncate max-w-[180px] transition-colors"
                              >
                                {leadEmail}
                              </a>
                            ) : null}
                          </div>
                        </td>

                        {/* Status & Quality */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={item.status} />
                            <QualityBadge quality={item.lead_quality} />
                          </div>
                        </td>

                        {/* Completed At & By */}
                        <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              {item.done_at ? formatDateTime(item.done_at) : 'Today'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-400" />
                              By: <span className="font-medium text-gray-700">{item.done_by_name || 'Staff'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Activity / Comment */}
                        <td className="px-5 py-3.5">
                          <div className="text-xs text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 max-w-xs truncate" title={item.comment || item.notes || ''}>
                            {item.comment || item.notes || 'Follow-up completed'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* ✏️ Edit Details */}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all"
                              title="Edit Follow-up Details"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {/* 📅 Reschedule New Follow-up */}
                            <button
                              onClick={() => handleOpenReschedule(item)}
                              className="px-2 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium text-xs flex items-center gap-1 transition-all"
                              title="Schedule Next Follow-up"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Schedule Next</span>
                            </button>

                            {/* 📜 View History */}
                            <button
                              onClick={() => handleOpenLeadDetail(item, 'history')}
                              className="p-1.5 rounded-lg border border-gray-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all"
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </button>

                            {/* WhatsApp Link */}
                            {leadPhone && (
                              <a
                                href={`https://wa.me/${leadPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-all"
                                title="Message on WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ─── MODAL 1: Edit Follow-up Details Modal ──────────────────────── */}
      {showEditModal && leadToEdit && (
        <EditFollowUpModal
          lead={leadToEdit}
          staffList={staffList}
          onClose={() => {
            setShowEditModal(false);
            setLeadToEdit(null);
          }}
          onSave={handleSaveEditFollowUp}
        />
      )}

      {/* ─── MODAL 2: Quick Reschedule Next Follow-up Date ──────────────── */}
      {showRescheduleModal && leadToReschedule && (
        <QuickRescheduleModal
          lead={leadToReschedule}
          onClose={() => {
            setShowRescheduleModal(false);
            setLeadToReschedule(null);
          }}
          onConfirm={handleQuickReschedule}
        />
      )}

      {/* ─── MODAL 3: Comprehensive Lead Details & History Timeline ─────── */}
      {showDetailModal && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          staffList={staffList}
          initialTab={initialDetailTab}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLead(null);
          }}
          onStatusChange={(status) => updateLeadStatus(selectedLead.id, status)}
          onAddNote={handleAddHistoryNote}
          onOpenEdit={() => {
            setShowDetailModal(false);
            handleOpenEdit(selectedLead);
          }}
          onOpenReschedule={() => {
            setShowDetailModal(false);
            handleOpenReschedule(selectedLead);
          }}
          onRefresh={async () => {
            fetchFollowups(true);
            fetchDoneFollowups(true);
            const refreshed = await fetchLeadDetails(selectedLead.id);
            if (refreshed) setSelectedLead(refreshed);
          }}
          onCompleteFollowUp={handleCompleteFollowUp}
          updatingStatus={updatingStatus}
        />
      )}
    </div>
  );
};

// ─── COMPONENT: Edit Follow-up Details Modal ──────────────────────────────
const EditFollowUpModal = ({ lead, staffList, onClose, onSave }) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: lead.status || 'contacted',
    lead_quality: lead.lead_quality || 'warm',
    next_follow_up: toDateTimeLocal(lead.next_follow_up),
    followup_type: 'phone_call',
    followup_note: '',
    notes: lead.notes || '',
    assigned_to: lead.assigned_to || '',
    interest: lead.interest || '',
    budget: lead.budget || '',
    preferred_plan: lead.preferred_plan || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(lead.id, formData);
    } catch (err) {
      // toast shown in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Edit Follow-up Details</h3>
              <p className="text-xs text-gray-500">
                Lead: <span className="font-semibold text-gray-700">{lead.full_name}</span> ({lead.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/60 rounded-lg text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Next Follow-up Date & Time */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Next Follow-up Date & Time
              </label>
              {formData.next_follow_up && (
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: '' }))}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear Date
                </button>
              )}
            </div>

            <input
              type="datetime-local"
              value={formData.next_follow_up}
              onChange={(e) => setFormData(p => ({ ...p, next_follow_up: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {/* Date Preset Buttons */}
            <div>
              <p className="text-[11px] font-medium text-gray-500 mb-1.5">Quick Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: getQuickDateString('plus_3_hours') }))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md font-medium text-gray-700 transition-colors"
                >
                  +3 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: getQuickDateString('tomorrow_morning') }))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md font-medium text-gray-700 transition-colors"
                >
                  Tomorrow (10 AM)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: getQuickDateString('in_2_days') }))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md font-medium text-gray-700 transition-colors"
                >
                  In 2 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: getQuickDateString('in_3_days') }))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md font-medium text-gray-700 transition-colors"
                >
                  In 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, next_follow_up: getQuickDateString('in_1_week') }))}
                  className="px-2.5 py-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md font-medium text-gray-700 transition-colors"
                >
                  In 1 Week
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Follow-up Interaction & Discussion Note */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-indigo-600" />
                Follow-up Discussion / Activity Note
              </label>
              <select
                value={formData.followup_type}
                onChange={(e) => setFormData(p => ({ ...p, followup_type: e.target.value }))}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white font-medium text-gray-700 outline-none"
              >
                <option value="phone_call">📞 Phone Call</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="in_person">👥 In-Person Meeting</option>
                <option value="instagram">📸 Instagram DM</option>
                <option value="email">✉️ Email</option>
                <option value="other">📝 Other</option>
              </select>
            </div>

            <textarea
              rows="3"
              value={formData.followup_note}
              onChange={(e) => setFormData(p => ({ ...p, followup_note: e.target.value }))}
              placeholder="What was discussed in this follow-up? (e.g. Discussed 3-month membership, requested discount, agreed to visit tomorrow at 10 AM...)"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <p className="text-[11px] text-gray-400">
              💡 This note will automatically be permanently recorded in the lead's history log.
            </p>
          </div>

          {/* Section 3: Status & Quality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Lead Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
                <option value="not_interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Lead Quality
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'hot', label: '🔥 Hot' },
                  { value: 'warm', label: '☀️ Warm' },
                  { value: 'cold', label: '❄️ Cold' }
                ].map(q => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, lead_quality: q.value }))}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      formData.lead_quality === q.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Assigned Staff & Interest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Assigned Staff
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData(p => ({ ...p, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Unassigned</option>
                {staffList.map((s) => (
                  <option key={s.id || s.user_id} value={s.user_id || s.id}>
                    {s.full_name} {s.position ? `(${s.position})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Interested In / Goal
              </label>
              <input
                type="text"
                value={formData.interest}
                onChange={(e) => setFormData(p => ({ ...p, interest: e.target.value }))}
                placeholder="e.g. Weight Loss, Muscle Building, PT"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Section 5: General Lead Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Permanent Lead Notes
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="General permanent notes for this lead..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save & Log History
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── COMPONENT: Quick Reschedule Date Modal ──────────────────────────────
const QuickRescheduleModal = ({ lead, onClose, onConfirm }) => {
  const [submitting, setSubmitting] = useState(false);
  const [newDate, setNewDate] = useState(toDateTimeLocal(lead.next_follow_up) || getQuickDateString('tomorrow_morning'));
  const [note, setNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      toast.error('Please select a follow-up date and time');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(lead.id, newDate, note);
    } catch (err) {
      // toast in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Reschedule Follow-up</h3>
              <p className="text-xs text-gray-500">For {lead.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200/60 rounded-lg text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Date Display */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs">
            <span className="text-gray-500">Currently Scheduled:</span>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              }) : 'None'}
            </p>
          </div>

          {/* New Date Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Select New Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-1.5">Shortcuts:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setNewDate(getQuickDateString('tomorrow_morning'))}
                className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md font-medium text-gray-700 transition-colors"
              >
                Tomorrow 10 AM
              </button>
              <button
                type="button"
                onClick={() => setNewDate(getQuickDateString('in_2_days'))}
                className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md font-medium text-gray-700 transition-colors"
              >
                In 2 Days
              </button>
              <button
                type="button"
                onClick={() => setNewDate(getQuickDateString('in_3_days'))}
                className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md font-medium text-gray-700 transition-colors"
              >
                In 3 Days
              </button>
              <button
                type="button"
                onClick={() => setNewDate(getQuickDateString('in_1_week'))}
                className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md font-medium text-gray-700 transition-colors"
              >
                In 1 Week
              </button>
            </div>
          </div>

          {/* Reschedule Reason / Note */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Reason / Follow-up Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Lead asked to call after working hours"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newDate}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── COMPONENT: Comprehensive Lead Detail Modal with Full History Timeline ──
const LeadDetailModal = ({
  lead,
  staffList,
  initialTab = 'history',
  onClose,
  onStatusChange,
  onAddNote,
  onOpenEdit,
  onOpenReschedule,
  onRefresh,
  onCompleteFollowUp,
  updatingStatus
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [comments, setComments] = useState(lead.comments || []);
  const [quickNote, setQuickNote] = useState('');
  const [quickStatus, setQuickStatus] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    setComments(lead.comments || []);
  }, [lead.comments]);

  const handlePostNote = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    setSubmittingNote(true);
    try {
      await onAddNote(lead.id, quickNote, quickStatus || null, quickDate || null);
      setQuickNote('');
      setQuickStatus('');
      setQuickDate('');
    } catch (err) {
      // toast shown in parent
    } finally {
      setSubmittingNote(false);
    }
  };

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-700' },
    { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700' },
    { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-700' },
    { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-500' }
  ];

  const formatFullDateTime = (dateStr) => {
    const d = parseUtcDate(dateStr);
    if (!d || isNaN(d.getTime())) return 'N/A';
    try {
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-blue-50/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              {lead.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-lg">{lead.full_name}</h3>
                <span className="text-xs text-gray-400 font-medium">#{lead.id}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={lead.status} />
                <QualityBadge quality={lead.lead_quality} />
                {lead.assigned_staff_name && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    👤 {lead.assigned_staff_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="p-2 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                title="Call"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            {lead.phone && (
              <a
                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            {lead.next_follow_up && onCompleteFollowUp && (
              <button
                onClick={() => {
                  onClose();
                  onCompleteFollowUp(lead.id);
                }}
                className="px-2.5 py-1.5 border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-lg text-emerald-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Mark Follow-up as Completed"
              >
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Mark Completed</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200/60 rounded-lg text-gray-500 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b bg-white text-sm font-medium flex-shrink-0">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <History className="h-4 w-4" />
            Follow-up History ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="h-4 w-4" />
            Lead Details
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history' ? (
            <div className="space-y-6">
              {/* Quick Log Follow-up Activity Box */}
              <form onSubmit={handlePostNote} className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Log Follow-up Activity / Note
                  </span>
                  <span className="text-[11px] text-gray-400">Recorded instantly</span>
                </div>

                <textarea
                  rows="2"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Record what happened (e.g. Called lead, discussed membership pricing, sent brochure on WhatsApp...)"
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Update Status (Optional):</label>
                    <select
                      value={quickStatus}
                      onChange={(e) => setQuickStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="">Keep current ({lead.status})</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Set Next Date (Optional):</label>
                    <input
                      type="datetime-local"
                      value={quickDate}
                      onChange={(e) => setQuickDate(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!quickNote.trim() || submittingNote}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    {submittingNote ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Log Activity
                  </button>
                </div>
              </form>

              {/* Complete Follow-up History Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 w-4 text-purple-600" />
                    Interaction & Follow-up History ({comments.length})
                  </h4>
                  <button
                    onClick={onRefresh}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                </div>

                {comments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">No interaction history recorded yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">Use the box above to log your first follow-up note or call</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
                    {comments.map((item, idx) => {
                      const isDateChange = item.comment?.includes('📅');
                      const isStatusChange = item.comment?.includes('🔄');
                      const isCompleted = item.comment?.includes('✅');
                      const isCall = item.comment?.toUpperCase().includes('PHONE') || item.comment?.toUpperCase().includes('CALL');
                      const isWhatsApp = item.comment?.toUpperCase().includes('WHATSAPP');

                      return (
                        <div key={item.id || idx} className="relative group">
                          {/* Timeline node */}
                          <div className={`absolute -left-6 top-1.5 h-5 w-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-[10px] ${
                            isCompleted ? 'bg-emerald-500 text-white' :
                            isDateChange ? 'bg-blue-500 text-white' :
                            isStatusChange ? 'bg-purple-500 text-white' :
                            isWhatsApp ? 'bg-green-500 text-white' :
                            isCall ? 'bg-indigo-500 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {isCompleted ? '✓' : isDateChange ? '📅' : isStatusChange ? '🔄' : '•'}
                          </div>

                          {/* Card */}
                          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs hover:border-blue-200 transition-colors">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                {item.user_name || 'Staff User'}
                                {item.user_role && (
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.2 rounded font-normal">
                                    {item.user_role}
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatFullDateTime(item.created_at)}
                              </span>
                            </div>

                            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                              {item.comment}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Lead Overview Tab */
            <div className="space-y-6">
              {/* Follow-up Status Highlights Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Next Follow-up Due
                  </span>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {lead.next_follow_up ? formatFullDateTime(lead.next_follow_up) : 'No date set'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Assigned: <span className="font-medium text-gray-700">{lead.assigned_staff_name || 'Unassigned'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenReschedule}
                    className="px-3.5 py-1.5 bg-white border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold text-blue-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Reschedule Date
                  </button>
                  <button
                    onClick={onOpenEdit}
                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-blue-600 hover:underline mt-1 block">
                    {lead.phone}
                  </a>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 truncate">{lead.email || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{lead.source?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Interest / Plan</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{lead.interest || lead.preferred_plan || 'N/A'}</p>
                </div>
              </div>

              {/* Permanent Notes */}
              {lead.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <FileText className="h-4 w-4" />
                    Permanent Notes
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{lead.notes}</p>
                </div>
              )}

              {/* Status Update Quick Buttons */}
              <div>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Quick Change Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => onStatusChange(option.value)}
                      disabled={updatingStatus || lead.status === option.value}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        lead.status === option.value
                          ? option.color + ' ring-2 ring-offset-1 ring-blue-500'
                          : option.color + ' hover:opacity-75'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              window.location.href = `/dashboard?tab=leads&lead=${lead.id}`;
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Leads Management
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpPage;
