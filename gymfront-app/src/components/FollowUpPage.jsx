// src/components/FollowUpPage.jsx - Updated with always visible date filters

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Users, Phone, Mail, ChevronRight, CheckCircle,
  XCircle, Clock, AlertCircle, Filter, Search, X, RefreshCw,
  Calendar as CalendarIcon, User, MessageCircle, Star, Target,
  TrendingUp, Download, ChevronDown, ChevronUp, Loader2,
  FileText, Trash2, Edit, Plus, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useCache, CACHE_KEYS } from '../context/CacheContext';
import { useNavigate } from 'react-router-dom';

// ─── Status Badge Component ───────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    interested: 'bg-green-100 text-green-700',
    not_interested: 'bg-red-100 text-red-700',
    converted: 'bg-purple-100 text-purple-700',
    lost: 'bg-gray-100 text-gray-500'
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.new}`}>
      {labels[status] || status}
    </span>
  );
};

// ─── Quality Badge ──────────────────────────────────────────────────────────
const QualityBadge = ({ quality }) => {
  const colors = {
    hot: 'bg-red-100 text-red-700',
    warm: 'bg-orange-100 text-orange-700',
    cold: 'bg-blue-100 text-blue-700'
  };
  const labels = {
    hot: '🔥 Hot',
    warm: '☀️ Warm',
    cold: '❄️ Cold'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[quality] || colors.warm}`}>
      {labels[quality] || quality}
    </span>
  );
};

// ─── Main FollowUpPage Component ──────────────────────────────────────────
const FollowUpPage = ({ onFollowUpClick, onRefresh }) => {
  const navigate = useNavigate();
  const { getCache, setCache, clearCache, invalidateCache } = useCache();
  
  // ─── State ──────────────────────────────────────────────────────────────
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  // ─── Apply Date Preset ──────────────────────────────────────────────────
  const applyDatePreset = useCallback((preset) => {
    setDateRangePreset(preset);
    const today = new Date();
    let startDate, endDate;
    
    switch(preset) {
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

  // ─── Fetch Followups ────────────────────────────────────────────────────
  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.quality !== 'all') params.append('quality', filters.quality);
      if (filters.assignedTo !== 'all') params.append('assigned_to', filters.assignedTo);
      if (filters.search) params.append('search', filters.search);
      
      // Try cache first
      const cacheKey = `followups_${params.toString()}`;
      const cached = getCache(cacheKey);
      if (cached) {
        console.log('📋 Using cached followups data');
        setFollowups(cached.items || []);
        setStats(cached.stats || {});
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/gym/followups?${params.toString()}`);
      
      const data = response.data || { items: [], stats: {} };
      setFollowups(data.items || []);
      setStats(data.stats || {});
      
      // Cache the result
      setCache(cacheKey, { items: data.items, stats: data.stats }, 2 * 60 * 1000);
      
    } catch (error) {
      console.error('Error fetching followups:', error);
      setError(error.response?.data?.detail || 'Failed to load followups');
      toast.error('Failed to load followups');
    } finally {
      setLoading(false);
    }
  }, [filters, getCache, setCache]);

  // ─── Fetch Lead Details ────────────────────────────────────────────────
  const fetchLeadDetails = useCallback(async (leadId) => {
    try {
      const response = await api.get(`/gym/leads/${leadId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast.error('Failed to load lead details');
      return null;
    }
  }, []);

  // ─── Update Lead Status ─────────────────────────────────────────────────
  const updateLeadStatus = useCallback(async (leadId, status) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/gym/leads/${leadId}`, { status });
      toast.success(`Lead status updated to ${status}`);
      
      // Refresh the list
      fetchFollowups();
      
      // If the lead is open in modal, refresh it too
      if (selectedLead && selectedLead.id === leadId) {
        const updated = await fetchLeadDetails(leadId);
        if (updated) setSelectedLead(updated);
      }
      
      // Invalidate cache
      invalidateCache();
      
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [fetchFollowups, fetchLeadDetails, selectedLead, invalidateCache]);

  // ─── Add Comment ────────────────────────────────────────────────────────
  const addComment = useCallback(async () => {
    if (!commentText.trim()) return;
    if (!selectedLead) return;
    
    setSubmitting(true);
    try {
      await api.post(`/gym/leads/${selectedLead.id}/comments`, {
        comment: commentText.trim()
      });
      
      toast.success('Comment added successfully');
      setCommentText('');
      setShowCommentModal(false);
      
      // Refresh lead details
      const updated = await fetchLeadDetails(selectedLead.id);
      if (updated) setSelectedLead(updated);
      
      // Refresh the list
      fetchFollowups();
      
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [commentText, selectedLead, fetchLeadDetails, fetchFollowups]);

  // ─── Initial Load ──────────────────────────────────────────────────────
  useEffect(() => {
    applyDatePreset('today');
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  // ─── Handle Row Click ──────────────────────────────────────────────────
  const handleRowClick = async (lead) => {
    const details = await fetchLeadDetails(lead.id);
    if (details) {
      setSelectedLead(details);
      setShowLeadModal(true);
    }
  };

  // ─── Status Change Handler ─────────────────────────────────────────────
  const handleStatusChange = (leadId, status) => {
    updateLeadStatus(leadId, status);
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
    if (followups.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = [
      'Lead ID', 'Name', 'Phone', 'Email', 'Status', 'Quality',
      'Next Follow-up', 'Source', 'Notes', 'Created At'
    ];
    
    const rows = followups.map(lead => [
      lead.id,
      lead.full_name,
      lead.phone,
      lead.email || '',
      lead.status,
      lead.lead_quality || 'warm',
      lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString() : '',
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
    a.download = `followups_${filters.startDate}_to_${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${followups.length} followups`);
  }, [followups, filters]);

  // ─── Format Date ──────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // ─── Render Functions ──────────────────────────────────────────────────
  const renderEmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl shadow-sm">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
        <Calendar className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">No Follow-ups Found</h3>
      <p className="text-gray-500 mb-4">
        {filters.search || filters.status !== 'all' || filters.quality !== 'all'
          ? 'Try adjusting your filters to see more results'
          : 'There are no follow-ups scheduled for the selected date range'}
      </p>
      {(filters.search || filters.status !== 'all' || filters.quality !== 'all') && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      <p className="text-gray-500">Loading follow-ups...</p>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-7 w-7 text-blue-600" />
            Follow-ups
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {followups.length} scheduled
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all your lead follow-ups in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchFollowups();
              toast.success('Refreshed follow-ups');
            }}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => navigate('/dashboard?tab=leads')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* ─── Stats Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 font-medium">New</p>
          <p className="text-xl font-bold text-blue-600">{stats.new || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 font-medium">Contacted</p>
          <p className="text-xl font-bold text-yellow-600">{stats.contacted || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 font-medium">Interested</p>
          <p className="text-xl font-bold text-green-600">{stats.interested || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-400">
          <p className="text-xs text-gray-500 font-medium">Converted</p>
          <p className="text-xl font-bold text-purple-600">{stats.converted || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 font-medium">Lost</p>
          <p className="text-xl font-bold text-red-600">{stats.lost || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-400">
          <p className="text-xs text-gray-500 font-medium">Not Interested</p>
          <p className="text-xl font-bold text-gray-600">{stats.not_interested || 0}</p>
        </div>
      </div>

      {/* ─── Filters Bar ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        {/* Top Row - Quick Search and Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads by name, phone, email..."
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
            
            {(filters.search || filters.status !== 'all' || filters.quality !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 px-2 py-1"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ─── ✅ DATE RANGE FILTERS - ALWAYS VISIBLE ───────────────────── */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            
            {/* Date Presets */}
            <div className="flex flex-wrap gap-1.5">
              {datePresets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => applyDatePreset(preset.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    dateRangePreset === preset.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          {/* Active Date Range Indicator */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {filters.startDate && filters.endDate ? (
                  `Showing follow-ups from ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`
                ) : filters.startDate ? (
                  `Showing follow-ups from ${formatDate(filters.startDate)}`
                ) : filters.endDate ? (
                  `Showing follow-ups up to ${formatDate(filters.endDate)}`
                ) : (
                  'Showing all follow-ups'
                )}
              </span>
            </div>
            {(filters.startDate || filters.endDate) && dateRangePreset !== 'today' && (
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ ...prev, startDate: today, endDate: today }));
                  setDateRangePreset('today');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset to Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Follow-ups Table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? renderLoadingState() : followups.length === 0 ? renderEmptyState() : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Follow-up</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {followups.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(lead)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {lead.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{lead.full_name}</p>
                          <p className="text-xs text-gray-500">ID: #{lead.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.phone}</div>
                      {lead.email && <div className="text-xs text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <QualityBadge quality={lead.lead_quality} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.next_follow_up ? (
                        <div className="text-sm text-gray-900">
                          {formatDateTime(lead.next_follow_up)}
                          {new Date(lead.next_follow_up) < new Date() && (
                            <span className="ml-2 text-xs text-red-500 font-medium">Overdue</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 capitalize">
                        {lead.source?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, 'contacted');
                          }}
                          className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 transition-colors"
                          title="Mark as Contacted"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, 'interested');
                          }}
                          className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                          title="Mark as Interested"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, 'converted');
                          }}
                          className="p-1.5 rounded hover:bg-purple-100 text-purple-600 transition-colors"
                          title="Mark as Converted"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, 'lost');
                          }}
                          className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                          title="Mark as Lost"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Lead Detail Modal ──────────────────────────────────────────── */}
      {showLeadModal && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          onStatusChange={(status) => handleStatusChange(selectedLead.id, status)}
          onComment={() => setShowCommentModal(true)}
          onRefresh={fetchFollowups}
          updatingStatus={updatingStatus}
        />
      )}

      {/* ─── Comment Modal ──────────────────────────────────────────────── */}
      {showCommentModal && selectedLead && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Add Comment</h3>
                  <p className="text-xs text-gray-500">For: {selectedLead.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <textarea
                rows="4"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your comment here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                autoFocus
              />
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addComment}
                disabled={!commentText.trim() || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Lead Detail Modal Component ──────────────────────────────────────────
const LeadDetailModal = ({ lead, onClose, onStatusChange, onComment, onRefresh, updatingStatus }) => {
  const [comments, setComments] = useState(lead.comments || []);
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-700' },
    { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700' },
    { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-700' },
    { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-500' }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {lead.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{lead.full_name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={lead.status} />
                <QualityBadge quality={lead.lead_quality} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{lead.phone}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{lead.email || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Source</p>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{lead.source?.replace('_', ' ') || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Next Follow-up</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(lead.next_follow_up)}</p>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </p>
              <p className="text-sm text-gray-700 mt-1">{lead.notes}</p>
            </div>
          )}

          {/* Status Update */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onStatusChange(option.value)}
                  disabled={updatingStatus || lead.status === option.value}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    lead.status === option.value
                      ? option.color + ' ring-2 ring-offset-1 ring-blue-500'
                      : option.color + ' hover:opacity-70'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5" />
                Comments ({comments.length})
              </p>
              <button
                onClick={onComment}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Comment
              </button>
            </div>
            
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {comment.user_name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{comment.user_name || 'Staff'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              window.location.href = `/dashboard?tab=leads&lead=${lead.id}`;
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            View Full Profile
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpPage;