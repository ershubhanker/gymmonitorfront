// src/components/admin/ActiveUsersTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Users, Building2, MapPin, Globe, Laptop, Smartphone,
  Search, RefreshCw, Filter, Calendar, Clock, Shield, Wifi,
  ExternalLink, Copy, Check, AlertCircle, ChevronDown, Radio
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ActiveUsersTracker() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, logs: [] });
  const [dateFilter, setDateFilter] = useState('today');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedIp, setCopiedIp] = useState(null);

  const fetchActiveUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date_filter', dateFilter);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/admin/active-users?${params.toString()}`);
      setData(res.data || { summary: {}, logs: [] });
    } catch (err) {
      console.error('Failed to fetch active users:', err);
      toast.error('Failed to load active users');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, roleFilter, searchTerm]);

  useEffect(() => {
    fetchActiveUsers();
  }, [fetchActiveUsers]);

  const copyToClipboard = (text) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success('IP copied to clipboard');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const parseIST = (isoString) => {
    if (!isoString) return null;
    const str = (isoString.includes('+') || isoString.endsWith('Z')) ? isoString : `${isoString}Z`;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTimeAgo = (isoString) => {
    const d = parseIST(isoString);
    if (!d) return '—';
    try {
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '—';
    }
  };

  const formatClockTime = (isoString) => {
    const d = parseIST(isoString);
    if (!d) return '—';
    try {
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '—';
    }
  };

  const summary = data.summary || {};
  const logs = data.logs || [];

  return (
    <div className="space-y-6">
      {/* ── TOP SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Online Now */}
        <div className="bg-gray-800/90 border border-emerald-500/30 rounded-xl p-4 shadow-lg shadow-emerald-950/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Online Now</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">
            {loading ? '—' : (summary.online_now || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Active in last 15 minutes</p>
        </div>

        {/* Card 2: Total Active in Selected Period */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4 shadow-lg relative">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Users</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">
            {loading ? '—' : (summary.total_records || 0)}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span>👑 {summary.gym_owners || 0} Owners</span>
            <span>🛡️ {summary.staff || 0} Staff</span>
          </div>
        </div>

        {/* Card 3: Active Gyms */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4 shadow-lg relative">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Gyms</span>
            <Building2 className="h-4 w-4" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">
            {loading ? '—' : (summary.active_gyms || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Gyms with active owners/staff</p>
        </div>

        {/* Card 4: Top Locations */}
        <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4 shadow-lg relative">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Locations</span>
            <MapPin className="h-4 w-4" />
          </div>
          <div className="mt-2 text-sm font-semibold text-white truncate">
            {summary.top_cities && summary.top_cities.length > 0
              ? summary.top_cities.slice(0, 2).join(' • ')
              : 'Detecting...'}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {summary.top_cities && summary.top_cities.length > 2
              ? `+${summary.top_cities.length - 2} more cities today`
              : 'Real-time IP Geolocation'}
          </p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user name, email, gym, city, or IP..."
            className="w-full bg-gray-800 border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="today">📅 Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Roles</option>
            <option value="gym_owner">👑 Gym Owners</option>
            <option value="gym_staff">🛡️ Staff</option>
            <option value="super_admin">⚡ Super Admins</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchActiveUsers}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Refresh active users"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── ACTIVE USERS TABLE ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Gym</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ISP / Network</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Device</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-900/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-400 mb-2" />
                    <p className="text-sm">Fetching active users and resolving IP locations...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Activity className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                    <p className="text-sm font-semibold text-gray-300">No active user sessions found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm ? 'Try adjusting your search or filters.' : 'Active user sessions will appear here as gym owners and staff interact with the app.'}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const roleBadgeClass =
                    log.user_role === 'gym_owner'
                      ? 'bg-purple-950/70 text-purple-300 border-purple-800/60'
                      : log.user_role === 'gym_staff'
                      ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                      : 'bg-rose-950/70 text-rose-300 border-rose-800/60';

                  const roleLabel =
                    log.user_role === 'gym_owner'
                      ? 'Gym Owner'
                      : log.user_role === 'gym_staff'
                      ? 'Staff'
                      : log.user_role === 'super_admin'
                      ? 'Super Admin'
                      : log.user_role;

                  return (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {log.user_name?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{log.user_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 truncate">{log.user_email}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${roleBadgeClass}`}>
                                {roleLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Gym */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-300 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{log.gym_name || '—'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {log.is_online_now ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                            <Clock className="h-3 w-3 text-gray-500" />
                            {formatTimeAgo(log.last_seen_at)}
                          </span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded px-2 py-1">
                          <code className="text-xs font-mono text-purple-300">{log.ip_address}</code>
                          <button
                            onClick={() => copyToClipboard(log.ip_address)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy IP"
                          >
                            {copiedIp === log.ip_address ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-200">
                          <span className="text-base" role="img" aria-label="country">
                            {log.country_code === 'IN' ? '🇮🇳' : log.country_code === 'LOC' ? '💻' : '🌐'}
                          </span>
                          <div>
                            <p className="font-medium truncate max-w-[150px]">
                              {log.city && log.city !== 'Unknown' ? log.city : 'Location Detected'}
                            </p>
                            {log.region && log.region !== 'Unknown' && log.region !== 'Internal' && (
                              <p className="text-[11px] text-gray-400 truncate max-w-[150px]">
                                {log.region}, {log.country}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ISP / Network */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-300 flex items-center gap-1.5 truncate max-w-[140px]" title={log.isp}>
                          <Wifi className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                          <span className="truncate">{log.isp && log.isp !== '—' ? log.isp : 'Network'}</span>
                        </span>
                      </td>

                      {/* Device */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 bg-gray-800/80 px-2 py-1 rounded border border-gray-700">
                          {log.device_type === 'Mobile' ? (
                            <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <Laptop className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          <span>{log.device_type}</span>
                        </span>
                      </td>

                      {/* Active Time */}
                      <td className="px-4 py-3.5">
                        <div className="text-xs">
                          <p className="text-gray-200 font-medium">Last: {formatClockTime(log.last_seen_at)}</p>
                          <p className="text-[11px] text-gray-500">First: {formatClockTime(log.first_seen_at)}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 bg-gray-800/40 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {logs.length} active sessions</span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Throttled update every 10 mins (Zero server lag)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
