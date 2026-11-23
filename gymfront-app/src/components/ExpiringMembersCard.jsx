// src/components/ExpiringMembersCard.jsx - Membership Expiry with Custom Future Date & Range Selection
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  CalendarDays, 
  Search, 
  Phone, 
  MessageCircle, 
  ChevronRight, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  ArrowRight,
  Filter,
  X
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ExpiringMembersCard = ({ 
  onMemberClick, 
  onViewAllClick, 
  gymName = '',
  initialMembers = []
}) => {
  // Mode: '7d' | '15d' | '30d' | 'this_month' | 'next_month' | 'specific_date' | 'custom_range'
  const [filterMode, setFilterMode] = useState('7d');
  
  // Specific single date (default: 7 days from now)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultFutureDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  const [specificDate, setSpecificDate] = useState(defaultFutureDate);
  const [rangeStart, setRangeStart] = useState(todayStr);
  const [rangeEnd, setRangeEnd] = useState(defaultFutureDate);

  const [members, setMembers] = useState(initialMembers || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // ─── Fetch Expiring Members based on current filter ──────────────────────────
  const fetchExpiringMembers = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/gym/memberships/expiring-soon';
      const params = new URLSearchParams();

      if (filterMode === '7d') {
        params.append('days', '7');
      } else if (filterMode === '15d') {
        params.append('days', '15');
      } else if (filterMode === '30d') {
        params.append('days', '30');
      } else if (filterMode === 'this_month') {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        params.append('start_date', todayStr);
        params.append('end_date', lastDay);
      } else if (filterMode === 'next_month') {
        const now = new Date();
        const firstDayNext = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
        const lastDayNext = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
        params.append('start_date', firstDayNext);
        params.append('end_date', lastDayNext);
      } else if (filterMode === 'specific_date') {
        if (specificDate) {
          params.append('date', specificDate);
        }
      } else if (filterMode === 'custom_range') {
        if (rangeStart) params.append('start_date', rangeStart);
        if (rangeEnd) params.append('end_date', rangeEnd);
      }

      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const res = await api.get(fullUrl);
      if (Array.isArray(res.data)) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('Error fetching expiring memberships:', err);
      toast.error('Failed to load expiring memberships');
    } finally {
      setLoading(false);
    }
  }, [filterMode, specificDate, rangeStart, rangeEnd, todayStr]);

  useEffect(() => {
    fetchExpiringMembers();
  }, [fetchExpiringMembers]);

  // Filter members by local search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase().trim();
    return members.filter(m => 
      (m.member_name && m.member_name.toLowerCase().includes(term)) ||
      (m.member_phone && m.member_phone.includes(term)) ||
      (m.plan_name && m.plan_name.toLowerCase().includes(term))
    );
  }, [members, searchTerm]);

  // ─── Format Subtitle Description ───────────────────────────────────────────
  const filterDescription = useMemo(() => {
    const formatDateFriendly = (dStr) => {
      if (!dStr) return '';
      const d = new Date(dStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (filterMode === '7d') return 'Expiring in next 7 days';
    if (filterMode === '15d') return 'Expiring in next 15 days';
    if (filterMode === '30d') return 'Expiring in next 30 days';
    if (filterMode === 'this_month') return 'Expiring by end of this month';
    if (filterMode === 'next_month') return 'Expiring during next month';
    if (filterMode === 'specific_date') {
      if (!specificDate) return 'Select a date';
      const d = new Date(specificDate + 'T00:00:00');
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
      return `Expiring on ${formatDateFriendly(specificDate)} (${dayName})`;
    }
    if (filterMode === 'custom_range') {
      return `Expiring between ${formatDateFriendly(rangeStart)} and ${formatDateFriendly(rangeEnd)}`;
    }
    return '';
  }, [filterMode, specificDate, rangeStart, rangeEnd]);

  // ─── Export to CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredMembers.length === 0) {
      toast.info('No records to export');
      return;
    }

    const headers = ['Member Name', 'Phone', 'Email', 'Plan Name', 'Start Date', 'Expiry Date', 'Days Left'];
    const rows = filteredMembers.map(m => [
      `"${m.member_name || ''}"`,
      `"${m.member_phone || ''}"`,
      `"${m.member_email || ''}"`,
      `"${m.plan_name || ''}"`,
      m.start_date || '',
      m.end_date || '',
      m.days_left ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expiring_Members_${filterMode}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Expiring members exported!');
  };

  // ─── WhatsApp reminder helper ─────────────────────────────────────────────
  const getWhatsAppLink = (member) => {
    const rawPhone = (member.member_phone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) return null;
    const phoneWithCode = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
    const expiryFormatted = member.end_date 
      ? new Date(member.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'soon';
    
    const message = `Hello ${member.member_name},\n\nYour ${member.plan_name || 'gym'} membership at ${gymName || 'our gym'} is expiring on ${expiryFormatted}.\n\nPlease renew your membership to continue your workout sessions without any interruption.\n\nThank you!`;
    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 lg:col-span-2 transition-all flex flex-col justify-between">
      {/* ─── Top Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-2 rounded-lg text-white shadow-xs">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Membership Expiry</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  filteredMembers.length > 0 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                <CalendarDays className="h-3 w-3 text-amber-500" />
                {filterDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showSearch || searchTerm 
                  ? 'bg-orange-50 text-orange-600 border-orange-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title="Search in expiring list"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            {filteredMembers.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition-colors"
                title="Export list as CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={fetchExpiringMembers}
              disabled={loading}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* ─── Filter Pills & Mode Selector ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-gray-100">
          {[
            { id: '7d', label: '7 Days' },
            { id: '15d', label: '15 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'next_month', label: 'Next Month' },
            { id: 'specific_date', label: '📅 Specific Date' },
            { id: 'custom_range', label: '📆 Custom Range' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterMode(tab.id);
                setSearchTerm('');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterMode === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Custom Date Pickers when Specific Date or Custom Range active ─── */}
        {filterMode === 'specific_date' && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 my-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900">Select Expiry Date:</span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-2.5 py-1 border border-amber-300 rounded-md text-xs bg-white font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-gray-500 mr-1">Quick pick:</span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setSpecificDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 bg-white border border-amber-200 rounded text-amber-800 hover:bg-amber-100"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setSpecificDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 bg-white border border-amber-200 rounded text-amber-800 hover:bg-amber-100"
              >
                +1 Week
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  setSpecificDate(d.toISOString().split('T')[0]);
                }}
                className="px-2 py-0.5 bg-white border border-amber-200 rounded text-amber-800 hover:bg-amber-100"
              >
                +1 Month
              </button>
            </div>
          </div>
        )}

        {filterMode === 'custom_range' && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 my-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-900">From:</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="px-2.5 py-1 border border-amber-300 rounded-md text-xs bg-white font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-900">To:</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="px-2.5 py-1 border border-amber-300 rounded-md text-xs bg-white font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* ─── Search Bar (Togglable) ───────────────────────────────────── */}
        {showSearch && (
          <div className="relative my-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* ─── Members List ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
            <span className="ml-2 text-xs text-gray-500 font-medium">Checking expiry dates...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8 my-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-full mb-2 text-emerald-600 ring-4 ring-emerald-50/50">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-gray-900 font-bold text-sm">No Memberships Expiring</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {filterMode === 'specific_date' 
                ? `No active memberships are scheduled to expire on ${specificDate}.`
                : `No active memberships expire during this selected period.`}
            </p>
            {filterMode !== '7d' && (
              <button
                onClick={() => setFilterMode('7d')}
                className="mt-2.5 text-xs text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                Reset to Next 7 Days →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 mt-2 max-h-[310px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredMembers.map((member) => {
              const waLink = getWhatsAppLink(member);
              const daysLeft = member.days_left;
              const isUrgent = daysLeft !== undefined && daysLeft <= 3;
              const isToday = daysLeft === 0;
              const isPast = daysLeft !== undefined && daysLeft < 0;

              return (
                <div
                  key={member.membership_id || member.member_id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-lg transition-all hover:shadow-xs border cursor-pointer ${
                    isToday
                      ? 'bg-red-50/80 border-red-300 border-l-4 border-l-red-600'
                      : isUrgent
                        ? 'bg-orange-50/80 border-orange-200 border-l-4 border-l-orange-500'
                        : 'bg-gray-50/80 border-gray-200/70 border-l-4 border-l-amber-400 hover:bg-amber-50/50'
                  }`}
                  onClick={() => {
                    if (onMemberClick) {
                      onMemberClick(member.member_id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <img
                      src={member.avatar || member.profile_image}
                      alt={member.member_name}
                      className="w-9 h-9 rounded-full border border-white shadow-2xs object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.member_name || 'M')}&background=0D9488&color=fff`;
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                          {member.member_name}
                        </p>
                        {isToday ? (
                          <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                            Expires Today
                          </span>
                        ) : isUrgent ? (
                          <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                            Urgent
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="truncate max-w-[130px] font-medium text-gray-700">
                          {member.plan_name}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-gray-800">
                          Expires: {member.end_date ? new Date(member.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}
                        </span>
                        {daysLeft !== undefined && (
                          <span className={`px-1.5 py-0.2 rounded-full font-bold text-[10px] ${
                            isToday
                              ? 'bg-red-100 text-red-700'
                              : isUrgent
                                ? 'bg-orange-100 text-orange-700'
                                : isPast
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isToday ? 'Today' : isPast ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (WhatsApp, Call, Renew) */}
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {member.member_phone && (
                      <a
                        href={`tel:${member.member_phone}`}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md border border-gray-200 transition-colors"
                        title={`Call ${member.member_name} (${member.member_phone})`}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}

                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md border border-green-200 transition-colors"
                        title="Send WhatsApp renewal reminder"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </a>
                    )}

                    <button
                      onClick={() => {
                        if (onMemberClick) {
                          onMemberClick(member.member_id);
                        }
                      }}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-2xs hover:shadow transition-all flex items-center gap-1"
                    >
                      Renew
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Bottom Footer ──────────────────────────────────────────────── */}
      {onViewAllClick && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'record' : 'records'} matching selection
          </span>
          <button
            onClick={onViewAllClick}
            className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 hover:underline"
          >
            Manage in Members
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpiringMembersCard;
