// src/components/attendance/IrregularMembers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, User, Phone, Mail, Calendar, Clock, 
  RefreshCw, Loader2, ChevronRight, Eye, UserCheck,
  TrendingUp, TrendingDown, Search, Filter, X,
  Trash2, Database, HardDrive, CheckCircle
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../services/adminHelpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

const IrregularMembers = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [irregularMembers, setIrregularMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [daysThreshold, setDaysThreshold] = useState(3);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupStats, setCleanupStats] = useState(null);

  const fetchIrregularMembers = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get(`/gym/members/irregular?days_threshold=${daysThreshold}`);
      const data = response.data || [];
      setIrregularMembers(data);
      setFilteredMembers(data);
      
      if (showToast) {
        toast.success(`Found ${data.length} irregular members`);
      }
    } catch (error) {
      console.error('Error fetching irregular members:', error);
      toast.error('Failed to load irregular members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [daysThreshold]);

  useEffect(() => {
    fetchIrregularMembers();
  }, [fetchIrregularMembers]);

  // Filter members based on search and status
  useEffect(() => {
    let filtered = [...irregularMembers];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.member_name?.toLowerCase().includes(search) ||
        m.phone?.includes(search) ||
        m.email?.toLowerCase().includes(search)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    setFilteredMembers(filtered);
  }, [searchTerm, irregularMembers, filterStatus]);

  const fetchMemberCheckins = async (memberId) => {
    setLoadingCheckins(true);
    try {
      const response = await api.get(`/gym/members/irregular/recent-checkins?member_id=${memberId}&limit=10`);
      setRecentCheckins(response.data || []);
    } catch (error) {
      console.error('Error fetching checkins:', error);
      toast.error('Failed to load check-in history');
    } finally {
      setLoadingCheckins(false);
    }
  };

  const handleViewMember = async (member) => {
    setSelectedMember(member);
    setShowMemberDetails(true);
    await fetchMemberCheckins(member.member_id);
  };

  // ===== CLEANUP ATTENDANCE FUNCTION =====
  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      const response = await api.post('/gym/attendance/cleanup?days_threshold=4');
      setCleanupStats(response.data);
      toast.success(
        `✅ Cleaned up ${response.data.total_records_deleted} records!\n` +
        `Processed ${response.data.members_processed} members`
      );
      // Refresh the irregular members list
      await fetchIrregularMembers(true);
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error(error.response?.data?.detail || 'Failed to cleanup attendance records');
    } finally {
      setCleanupLoading(false);
      setShowCleanupModal(false);
    }
  };

  // ===== CLEANUP EXPIRED MEMBERS FUNCTION =====
  const handleCleanupExpired = async () => {
    setCleanupLoading(true);
    try {
      const response = await api.post('/gym/attendance/cleanup/expired');
      toast.success(
        `✅ Cleaned up ${response.data.total_records_deleted} records for expired members!\n` +
        `Processed ${response.data.expired_members_processed} expired members`
      );
      // Refresh the irregular members list
      await fetchIrregularMembers(true);
    } catch (error) {
      console.error('Cleanup expired error:', error);
      toast.error(error.response?.data?.detail || 'Failed to cleanup expired members');
    } finally {
      setCleanupLoading(false);
      setShowCleanupModal(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'irregular':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">⚠️ Irregular</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">⚠️ Warning</span>;
      case 'never_checked_in':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Never Checked In</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getDaysAbsentColor = (days) => {
    if (days >= 14) return 'text-red-600 font-bold';
    if (days >= 7) return 'text-orange-500 font-semibold';
    return 'text-yellow-600';
  };

  const stats = {
    total: irregularMembers.length,
    irregular: irregularMembers.filter(m => m.status === 'irregular').length,
    warning: irregularMembers.filter(m => m.status === 'warning').length,
    neverCheckedIn: irregularMembers.filter(m => m.status === 'never_checked_in').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-gray-500 mt-2">Checking member attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Irregular Members
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Members who haven't checked in for {daysThreshold} or more days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ===== CLEANUP BUTTON ===== */}
          <button
            onClick={() => setShowCleanupModal(true)}
            disabled={cleanupLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Clean up old attendance records to save disk space"
          >
            <HardDrive className="h-4 w-4" />
            Cleanup Attendance
          </button>
          
          <select
            value={daysThreshold}
            onChange={(e) => {
              setDaysThreshold(parseInt(e.target.value));
              fetchIrregularMembers();
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days</option>
          </select>
          <button
            onClick={() => fetchIrregularMembers(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Irregular</p>
          <p className="text-2xl font-bold text-red-600">{stats.irregular}</p>
          <p className="text-xs text-gray-400 mt-1">7+ days absent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Warning</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
          <p className="text-xs text-gray-400 mt-1">3-7 days absent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-400">
          <p className="text-xs text-gray-500 uppercase font-medium">Never Checked In</p>
          <p className="text-2xl font-bold text-gray-600">{stats.neverCheckedIn}</p>
          <p className="text-xs text-gray-400 mt-1">No check-in history</p>
        </div>
      </div>

      {/* Disk Space Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Database className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm text-blue-800 font-medium">Disk Space Management</p>
          <p className="text-xs text-blue-600">
            Old attendance records can take up significant disk space. 
            The cleanup will delete member check-in records older than 4 days 
            while keeping the last check-in for irregular tracking.
          </p>
        </div>
        <button
          onClick={() => setShowCleanupModal(true)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          Cleanup Now
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value="irregular">Irregular</option>
          <option value="warning">Warning</option>
          <option value="never_checked_in">Never Checked In</option>
        </select>
        {(searchTerm || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
            }}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-gray-900 font-medium text-lg">All members are active! 🎉</p>
            <p className="text-gray-500 mt-1">
              No members have been absent for {daysThreshold} or more days.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.member_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {member.profile_image ? (
                          <img 
                            src={member.profile_image} 
                            alt={member.member_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            {member.member_name?.charAt(0) || 'M'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{member.member_name}</p>
                          <p className="text-xs text-gray-500">ID: {member.member_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {member.phone || '—'}
                        </div>
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.last_checkin ? (
                        <div>
                          <p className="text-sm text-gray-900">{formatDateTime(member.last_checkin)}</p>
                          <p className="text-xs text-gray-500">{formatDate(member.last_checkin)}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${getDaysAbsentColor(member.days_absent)}`}>
                        {member.days_absent}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">days</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.current_plan ? (
                        <div>
                          <p className="text-sm text-gray-900">{member.current_plan}</p>
                          <p className={`text-xs ${member.membership_status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                            {member.membership_status}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewMember(member)}
                        className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== CLEANUP CONFIRMATION MODAL ===== */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <HardDrive className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Cleanup Attendance Records</h2>
              </div>
              <button
                onClick={() => setShowCleanupModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  What will be deleted:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    Member check-in records older than 4 days
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    Old records for expired members (keeps only the last one)
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  What will be preserved:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-green-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    All staff attendance records (for salary)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    The last check-in record for each member
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    All records for irregular member tracking
                  </li>
                </ul>
              </div>

              {cleanupStats && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800 font-medium">Previous Cleanup Results:</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Records Deleted:</span>
                      <span className="font-bold text-blue-700 ml-2">{cleanupStats.total_records_deleted}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Members Processed:</span>
                      <span className="font-bold text-blue-700 ml-2">{cleanupStats.members_processed}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCleanup}
                  disabled={cleanupLoading}
                  className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {cleanupLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  {cleanupLoading ? 'Cleaning up...' : 'Delete Old Member Records'}
                </button>

                <button
                  onClick={handleCleanupExpired}
                  disabled={cleanupLoading}
                  className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {cleanupLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UserCheck className="h-5 w-5" />
                  )}
                  {cleanupLoading ? 'Cleaning up...' : 'Cleanup Expired Members Only'}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                This action cannot be undone. Staff attendance records are never deleted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {showMemberDetails && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                  {selectedMember.member_name?.charAt(0) || 'M'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMember.member_name}</h2>
                  <p className="text-sm text-gray-500">Member ID: {selectedMember.member_id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMemberDetails(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Member Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium">Contact</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selectedMember.phone || '—'}
                  </p>
                  {selectedMember.email && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {selectedMember.email}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase font-medium">Attendance</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    Last check-in: {selectedMember.last_checkin ? formatDateTime(selectedMember.last_checkin) : 'Never'}
                  </p>
                  <p className={`text-sm font-bold ${getDaysAbsentColor(selectedMember.days_absent)}`}>
                    {selectedMember.days_absent} days absent
                  </p>
                </div>
              </div>

              {/* Recent Check-ins */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Recent Check-in History
                </h3>
                {loadingCheckins ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : recentCheckins.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentCheckins.map((checkin) => (
                      <div key={checkin.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">
                            {formatDateTime(checkin.checkin_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">
                            Device: {checkin.device_serial || 'N/A'}
                          </span>
                          {checkin.verified ? (
                            <span className="text-xs text-green-600">✓ Verified</span>
                          ) : (
                            <span className="text-xs text-red-600">✗ Not verified</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No check-in history found</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={() => {
                    setShowMemberDetails(false);
                  }}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  View Full Profile
                </button>
                <button
                  onClick={() => {
                    setShowMemberDetails(false);
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark Check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrregularMembers;