// src/pages/Members.jsx - Full Updated with Device Sync Integration & Resend Invoice WhatsApp

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Edit, Trash2, UserPlus, Download,
  ChevronLeft, ChevronRight, X, CheckCircle, XCircle,
  Clock, FileText, RefreshCw, Wifi, Loader2, WifiOff,
  FileSpreadsheet, Link, AlertTriangle, Smartphone, User,
  ArrowLeft, Dumbbell, Send
} from 'lucide-react';
import MemberModal from '../components/MemberModal';
import DeviceSyncModal from '../components/attendance/DeviceSyncModal';
import toast from 'react-hot-toast';
import api, { API_BASE_URL, fetchMembersOptimized, fetchMemberStatsOptimized, resendInvoiceWhatsApp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { useCache, CACHE_KEYS } from '../context/CacheContext';
import MemberProfileModal from '../components/MemberProfileModal';
import BulkImportModal from '../components/BulkImportModal';
import { generateInvoicePDF, generateBulkInvoices } from '../services/api';

// Debounce hook to prevent excessive API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================
// DELETE CONFIRMATION MODAL COMPONENT
// ============================================================
const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  member, 
  loading 
}) => {
  if (!isOpen || !member) return null;

  const hasDeviceSync = member.syncedToDevice || member.deviceUserId;
  const deviceInfo = member.deviceUserId || 'Unknown Device ID';
  
  const hasFreeze = member.freezes?.some(f => f.status === 'active') || false;
  const freezeInfo = member.freezes?.filter(f => f.status === 'active') || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 transform transition-all">
        <div className={`flex items-center gap-3 px-5 pt-5 pb-3 border-b ${
          hasFreeze ? 'border-amber-300' : ''
        }`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            hasFreeze ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            {hasFreeze ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <h3 className={`text-base font-bold ${hasFreeze ? 'text-amber-700' : 'text-gray-900'}`}>
              {hasFreeze ? 'Cannot Delete Member' : 'Delete Member'}
            </h3>
            <p className="text-xs text-gray-500">
              {hasFreeze ? 'This member has an active freeze' : 'This action cannot be undone'}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <img 
                src={member.avatar} 
                alt={member.fullName}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=0D9488&color=fff&size=128`;
                }}
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{member.fullName}</p>
                <p className="text-xs text-gray-500 truncate max-w-[180px]">{member.email || member.phone}</p>
              </div>
            </div>
          </div>

          {hasFreeze && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Active Freeze Detected</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This member has an active freeze. Please cancel the freeze before deleting.
                  </p>
                  {freezeInfo.map((freeze, idx) => (
                    <div key={idx} className="mt-1 text-xs text-amber-600">
                      {freeze.freeze_type === 'medical' ? '🏥 Medical' : '📅 Regular'} Freeze: 
                      {new Date(freeze.start_date).toLocaleDateString()} - {new Date(freeze.end_date).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasDeviceSync && !hasFreeze && (
            <p className="text-xs text-yellow-600 mt-1.5 flex items-center justify-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Synced to device: {deviceInfo}
            </p>
          )}
          
          {!hasFreeze && (
            <p className="text-xs text-gray-400 mt-1 text-center">All data will be permanently removed.</p>
          )}
        </div>

        <div className={`flex items-center justify-end gap-2 px-5 py-4 border-t rounded-b-xl ${
          hasFreeze ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'
        }`}>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium"
          >
            {hasFreeze ? 'Close' : 'Cancel'}
          </button>
          {!hasFreeze && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN MEMBERS COMPONENT
// ============================================================
const Members = ({ initialMemberId, onMemberSelect }) => {
  const { user } = useAuth(); 
  const { devices, syncMemberToDevice, removeMemberFromDevice, refreshAllData, attendanceApi } = useAttendance();
  const { getCache, setCache, clearCache, clearCachePattern, invalidateMembersCache, invalidateCache } = useCache();
  
  // ✅ Add membershipPlans state
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, newThisMonth: 0 });
  const [filters, setFilters] = useState({ status: 'all', plan: 'all', gender: 'all' });
  const [showNewThisMonthOnly, setShowNewThisMonthOnly] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showDeviceSyncModal, setShowDeviceSyncModal] = useState(false);
  const [selectedMemberForSync, setSelectedMemberForSync] = useState(null);
  const [showBulkDeviceSelect, setShowBulkDeviceSelect] = useState(false);
  const [selectedBulkDevice, setSelectedBulkDevice] = useState(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [totalMembersCount, setTotalMembersCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [resendingInvoice, setResendingInvoice] = useState(null);
  
  // PT Data
  const [ptData, setPtData] = useState({});
  const [loadingPt, setLoadingPt] = useState(false);
  
  // Single member view
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [singleMemberData, setSingleMemberData] = useState(null);
  const [showSingleMember, setShowSingleMember] = useState(false);
  const [loadingSingleMember, setLoadingSingleMember] = useState(false);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showBulkLinkModal, setShowBulkLinkModal] = useState(false);
  const [linkingMembers, setLinkingMembers] = useState(false);

  const itemsPerPage = 50;

  const [gymDetails, setGymDetails] = useState({
    name: 'GYM MANAGEMENT SYSTEM',
    address: '',
    phone: '',
    email: '',
    currency_symbol: '₹',
  });

  // ============================================================
  // CACHE INVALIDATION HELPER
  // ============================================================
  const invalidateMemberCache = useCallback(() => {
    invalidateMembersCache();
    clearCachePattern(CACHE_KEYS.DASHBOARD_STATS);
    clearCachePattern(CACHE_KEYS.DASHBOARD_BALANCE_OVERVIEW);
    clearCachePattern(CACHE_KEYS.MEMBER_STATS);
    clearCachePattern(CACHE_KEYS.MEMBER_BALANCES);
    clearCachePattern(CACHE_KEYS.MEMBER_PT_DATA);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
    invalidateCache();
  }, [invalidateMembersCache, clearCachePattern, invalidateCache]);

  // ============================================================
  // FETCH MEMBERSHIP PLANS
  // ============================================================
  const fetchMembershipPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const response = await api.get('/gym/plans?active_only=true');
      setMembershipPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      setMembershipPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  // ============================================================
  // FETCH PT DATA WITH CACHING
  // ============================================================
  const fetchPTData = useCallback(async () => {
    setLoadingPt(true);
    try {
      const cached = getCache(CACHE_KEYS.MEMBER_PT_DATA);
      if (cached) {
        setPtData(cached);
        setLoadingPt(false);
        return cached;
      }
      
      const response = await api.get('/gym/members/pt-data');
      const ptMap = {};
      response.data.forEach(pt => {
        ptMap[pt.member_id] = pt;
      });
      setPtData(ptMap);
      setCache(CACHE_KEYS.MEMBER_PT_DATA, ptMap, 3 * 60 * 1000);
      return ptMap;
    } catch (error) {
      console.error('Error fetching PT data:', error);
      setPtData({});
      return {};
    } finally {
      setLoadingPt(false);
    }
  }, [getCache, setCache]);

  // ============================================================
  // FETCH SINGLE MEMBER
  // ============================================================
  const fetchSingleMember = useCallback(async (memberId) => {
    setLoadingSingleMember(true);
    try {
      const response = await api.get(`/gym/members/${memberId}`);
      const member = response.data;
      
      let avatarUrl;
      if (member.profile_image) {
        if (member.profile_image.startsWith('http')) {
          avatarUrl = member.profile_image;
        } else {
          const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
          const imagePath = member.profile_image.startsWith('/') ? member.profile_image : `/${member.profile_image}`;
          avatarUrl = `${baseUrl}${imagePath}`;
        }
      } else {
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
      }
      
      const transformed = {
        id: member.id,
        fullName: member.full_name,
        email: member.email || '',
        phone: member.phone,
        gender: member.gender || 'male',
        joinDate: member.joined_date,
        membership: member.current_membership?.plan?.name || 'No Plan',
        membershipEndDate: member.current_membership?.end_date || null,
        membershipStatus: member.current_membership?.status || null,
        status: member.is_active ? 'active' : 'inactive',
        lastVisit: null,
        payments: member.memberships?.length || 0,
        avatar: avatarUrl,
        profile_image: member.profile_image,
        raw: member,
        activeMembership: member.current_membership,
        memberPayments: [],
        syncedToDevice: member.device_user_id ? true : false,
        deviceUserId: member.device_user_id || null,
      };
      
      setSingleMemberData(transformed);
      setMembers([transformed]);
      setTotalMembersCount(1);
      setTotalPages(1);
      setCurrentPage(1);
      
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member details');
      setShowSingleMember(false);
      setSelectedMemberId(null);
      setSingleMemberData(null);
      fetchMembers();
    } finally {
      setLoadingSingleMember(false);
    }
  }, []);

  // ============================================================
  // HANDLE BACK TO ALL MEMBERS
  // ============================================================
  const handleBackToAllMembers = () => {
    setShowSingleMember(false);
    setSelectedMemberId(null);
    setSingleMemberData(null);
    if (onMemberSelect) {
      onMemberSelect(null);
    }
    setCurrentPage(1);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
    fetchMembers();
  };

  // ============================================================
  // INITIAL MEMBER ID EFFECT
  // ============================================================
  useEffect(() => {
    if (initialMemberId) {
      setSelectedMemberId(initialMemberId);
      setShowSingleMember(true);
      fetchSingleMember(initialMemberId);
    } else {
      setShowSingleMember(false);
      setSelectedMemberId(null);
      setSingleMemberData(null);
    }
  }, [initialMemberId, fetchSingleMember]);

  // ============================================================
  // OPTIMIZED: FETCH MEMBERS WITH CACHING
  // ============================================================
  const fetchMembersOptimizedFn = useCallback(async () => {
    if (showSingleMember) return;
    
    setLoading(true);
    try {
      const cacheKey = `${CACHE_KEYS.MEMBERS_LIST}_${debouncedSearchTerm}_${filters.status}_${filters.gender}_${currentPage}`;
      
      const cached = getCache(cacheKey);
      if (cached) {
        console.log('📋 Using cached members data for key:', cacheKey);
        setMembers(cached.items || []);
        setTotalMembersCount(cached.total || 0);
        setTotalPages(cached.totalPages || 0);
        setLoading(false);
        await fetchPTData();
        return;
      }
      
      const params = {
        search: debouncedSearchTerm,
        status: filters.status === 'all' ? 'all' : filters.status,
        page: currentPage,
        limit: itemsPerPage
      };
      
      console.log('Fetching members with optimized endpoint:', params);
      const data = await fetchMembersOptimized(params);
      
      const transformed = data.items.map(item => {
        let avatarUrl;
        if (item.profile_image) {
          if (item.profile_image.startsWith('http')) {
            avatarUrl = item.profile_image;
          } else {
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            const imagePath = item.profile_image.startsWith('/') ? item.profile_image : `/${item.profile_image}`;
            avatarUrl = `${baseUrl}${imagePath}`;
          }
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.full_name)}&background=0D9488&color=fff&size=128`;
        }
        
        return {
          id: item.id,
          fullName: item.full_name,
          email: item.email || '',
          phone: item.phone,
          gender: item.gender || 'male',
          joinDate: item.join_date,
          membership: item.membership?.plan_name || 'No Plan',
          membershipEndDate: item.membership?.end_date || null,
          membershipStatus: item.membership?.status || null,
          status: item.status || 'inactive',
          lastVisit: null,
          payments: 0,
          avatar: avatarUrl,
          profile_image: item.profile_image,
          raw: {
            id: item.id,
            full_name: item.full_name,
            email: item.email || '',
            phone: item.phone,
            gender: item.gender || 'male',
            joined_date: item.join_date,
            is_active: item.is_active,
            profile_image: item.profile_image,
          },
          activeMembership: item.membership ? {
            plan: { name: item.membership.plan_name },
            end_date: item.membership.end_date,
            status: item.membership.status,
          } : null,
          memberPayments: [],
          syncedToDevice: item.synced_to_device || false,
          deviceUserId: item.device_user_id || null,
        };
      });
  
      const result = {
        items: transformed,
        total: data.total || 0,
        totalPages: data.total_pages || 0
      };
      
      setCache(cacheKey, result, 2 * 60 * 1000);
      
      setMembers(transformed);
      setTotalMembersCount(data.total || 0);
      setTotalPages(data.total_pages || 0);
      
      await fetchPTData();
      
    } catch (error) {
      console.error('Error fetching members (optimized):', error);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.status, filters.gender, currentPage, itemsPerPage, showSingleMember, fetchPTData, getCache, setCache]);

  // ============================================================
  // OPTIMIZED: FETCH STATS WITH CACHING
  // ============================================================
  const fetchStatsOptimizedFn = useCallback(async () => {
    try {
      const cached = getCache(CACHE_KEYS.MEMBER_STATS);
      if (cached) {
        setStats(cached);
        return;
      }
      
      const statsData = await fetchMemberStatsOptimized();
      const newStats = {
        total: statsData.total_members || 0,
        active: statsData.active_members || 0,
        newThisMonth: statsData.new_this_month || 0,
      };
      setStats(newStats);
      setCache(CACHE_KEYS.MEMBER_STATS, newStats, 3 * 60 * 1000);
    } catch (error) {
      console.error('Error fetching stats (optimized):', error);
      try {
        const response = await api.get('/gym/dashboard/stats');
        const newStats = {
          total: response.data.total_members,
          active: response.data.active_members,
          newThisMonth: response.data.new_members_this_month,
        };
        setStats(newStats);
        setCache(CACHE_KEYS.MEMBER_STATS, newStats, 3 * 60 * 1000);
      } catch (fallbackError) {
        console.error('Error fetching stats (fallback):', fallbackError);
      }
    }
  }, [getCache, setCache]);

  // ============================================================
  // LEGACY: FETCH MEMBERS
  // ============================================================
  const fetchMembersLegacy = useCallback(async () => {
    if (showSingleMember) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '10000');
      
      if (debouncedSearchTerm && !showNewThisMonthOnly) {
        params.append('search', debouncedSearchTerm);
      }
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }

      const [membersRes, membershipsRes, paymentsRes, deviceIdsRes] = await Promise.all([
        api.get(`/gym/members?${params.toString()}`),
        api.get('/gym/memberships?limit=10000'),
        api.get('/gym/payments?limit=10000'),
        api.get('/attendance/members/device-ids').catch(() => ({ data: [] })),
      ]);

      const membershipsData = membershipsRes.data || [];
      const paymentsData = paymentsRes.data || [];

      const deviceIdMap = {};
      (deviceIdsRes.data || []).forEach(entry => {
        if (entry.device_user_id) {
          deviceIdMap[entry.member_id] = entry.device_user_id;
        }
      });

      const transformed = membersRes.data.map(member => {
        const today = new Date().toISOString().split('T')[0];
        const activeMembership = membershipsData.find(
          ms => ms.member?.id === member.id &&
                ms.status === 'active' &&
                ms.end_date >= today
        );
        const memberPayments = paymentsData.filter(p => p.member_id === member.id);
        const paymentCount = memberPayments.length;
      
        let avatarUrl;
        if (member.profile_image) {
          if (member.profile_image.startsWith('http')) {
            avatarUrl = member.profile_image;
          } else {
            const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
            const imagePath = member.profile_image.startsWith('/') ? member.profile_image : `/${member.profile_image}`;
            avatarUrl = `${baseUrl}${imagePath}`;
          }
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
        }
      
        const deviceUserId = member.device_user_id || deviceIdMap[member.id] || null;
      
        return {
          id: member.id,
          fullName: member.full_name,
          email: member.email || '',
          phone: member.phone,
          gender: member.gender || 'male',
          joinDate: member.joined_date,
          membership: activeMembership?.plan?.name || 'No Plan',
          membershipEndDate: activeMembership?.end_date || null,
          membershipStatus: activeMembership?.status || null,
          status: member.is_active ? 'active' : 'inactive',
          lastVisit: member.last_visit || null,
          payments: paymentCount,
          avatar: avatarUrl,
          profile_image: member.profile_image,
          raw: member,
          activeMembership: activeMembership,
          memberPayments: memberPayments,
          syncedToDevice: !!deviceUserId,
          deviceUserId: deviceUserId,
        };
      });

      setMembers(transformed);
      setTotalMembersCount(transformed.length);
      setTotalPages(Math.ceil(transformed.length / itemsPerPage));
      
      await fetchPTData();
      
    } catch (error) {
      console.error('Error fetching members:', error.response?.data || error.message);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.status, showNewThisMonthOnly, itemsPerPage, showSingleMember, fetchPTData]);

  // ============================================================
  // MAIN FETCH FUNCTION
  // ============================================================
  const fetchMembers = useCallback(async () => {
    if (showSingleMember && singleMemberData) {
      setMembers([singleMemberData]);
      setTotalMembersCount(1);
      setTotalPages(1);
      return;
    }
    
    try {
      await fetchMembersOptimizedFn();
    } catch (error) {
      console.log('Optimized fetch failed, falling back to legacy...');
      await fetchMembersLegacy();
    }
  }, [fetchMembersOptimizedFn, fetchMembersLegacy, showSingleMember, singleMemberData]);

  const fetchStats = useCallback(async () => {
    try {
      await fetchStatsOptimizedFn();
    } catch (error) {
      console.log('Optimized stats fetch failed, falling back to legacy...');
      try {
        const response = await api.get('/gym/dashboard/stats');
        setStats({
          total: response.data.total_members,
          active: response.data.active_members,
          newThisMonth: response.data.new_members_this_month,
        });
      } catch (fallbackError) {
        console.error('Error fetching stats (fallback):', fallbackError);
      }
    }
  }, [fetchStatsOptimizedFn]);

  const fetchGymDetails = async () => {
    try {
      const response = await api.get('/gym/my-gym');
      setGymDetails({
        name: response.data.name || 'GYM MANAGEMENT SYSTEM',
        address: response.data.address || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        currency_symbol: '₹',
      });
    } catch (error) {
      console.error('Error fetching gym details:', error);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    fetchStats();
    fetchGymDetails();
    fetchPTData();
    fetchMembershipPlans();
  }, []);

  useEffect(() => {
    if (!showSingleMember) {
      fetchMembers();
    } else if (singleMemberData) {
      setMembers([singleMemberData]);
      setTotalMembersCount(1);
      setTotalPages(1);
    }
  }, [debouncedSearchTerm, filters.status, filters.gender, currentPage, showSingleMember, singleMemberData]);

  // ============================================================
  // HANDLE RESEND INVOICE VIA WHATSAPP
  // ============================================================
  const handleResendInvoiceWhatsApp = async (member) => {
    if (!member.phone) {
      toast.error('Member has no phone number to send invoice');
      return;
    }

    setResendingInvoice(member.id);
    toast.loading(`Sending invoice to ${member.fullName} via WhatsApp...`, { id: 'resend-invoice' });

    try {
      const result = await resendInvoiceWhatsApp(member.id);
      toast.dismiss('resend-invoice');

      if (result.success) {
        toast.success(`✅ Invoice sent to ${member.fullName} via WhatsApp!`);
      } else {
        toast.error(result.error || 'Failed to send invoice');
      }
    } catch (error) {
      toast.dismiss('resend-invoice');
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to send invoice';
      toast.error(`❌ ${errorMsg}`);
      console.error('Error resending invoice:', error);
    } finally {
      setResendingInvoice(null);
    }
  };

  // ============================================================
  // DELETE FUNCTION WITH CONFIRMATION
  // ============================================================
  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    
    setDeleting(true);
    try {
      console.log('Deleting member with ID:', memberToDelete.id);
      
      const response = await api.delete(`/gym/members/${memberToDelete.id}`);
      
      console.log('Delete response:', response.data);
      
      if (response.data.removed_from_devices > 0) {
        toast.success(
          `✅ Member deleted successfully!\n\n` +
          `Removed from ${response.data.removed_from_devices} device(s).\n` +
          `The device will sync within 3 seconds.`,
          { duration: 5000 }
        );
      } else if (response.data.device_user_id) {
        toast(
          `⚠️ Member deleted but not removed from devices.\n\n` +
          `The member had a device ID (${response.data.device_user_id}) but no active devices were found.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Member deleted successfully! (No device sync needed)');
      }
      
      invalidateMemberCache();
      clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
      
      if (showSingleMember) {
        handleBackToAllMembers();
      } else {
        setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
        setSelectedMembers(prev => prev.filter(id => id !== memberToDelete.id));
        fetchStats();
      }
      
      refreshAllData();
      
      setShowDeleteModal(false);
      setMemberToDelete(null);
      
    } catch (error) {
      console.error('Delete error:', error);
      
      if (error.response) {
        if (error.response.status === 400 && error.response.data?.detail?.message === "Cannot delete member with active freeze") {
          const freezeInfo = error.response.data.detail.freezes || [];
          let freezeDetails = freezeInfo.map(f => 
            `• ${f.freeze_type.charAt(0).toUpperCase() + f.freeze_type.slice(1)} Freeze: ${new Date(f.start_date).toLocaleDateString()} to ${new Date(f.end_date).toLocaleDateString()}`
          ).join('\n');
          
          toast.error(
            (t) => (
              <div className="max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-red-700">Cannot Delete Member</p>
                    <p className="text-sm text-gray-700 mt-1">{memberToDelete.fullName} has an active freeze.</p>
                    {freezeDetails && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                        <p className="font-medium">Active Freeze:</p>
                        <pre className="whitespace-pre-wrap">{freezeDetails}</pre>
                      </div>
                    )}
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            ),
            { duration: 8000, id: 'freeze-error' }
          );
          
          setShowDeleteModal(false);
          setMemberToDelete(null);
          return;
        }
        
        toast.error(error.response?.data?.detail || 'Failed to delete member');
      } else {
        toast.error('Network error. Please check your connection.');
      }
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // BULK DELETE
  // ============================================================
  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    
    const hasDeviceSync = selectedMembers.some(id => {
      const member = members.find(m => m.id === id);
      return member?.syncedToDevice || member?.deviceUserId;
    });
    
    const message = hasDeviceSync
      ? `⚠️ You are about to delete ${selectedMembers.length} members. Some of them are synced to attendance devices and will be automatically removed.\n\nAre you sure you want to continue?`
      : `Are you sure you want to delete ${selectedMembers.length} members?`;
    
    if (!window.confirm(message)) return;
    
    try {
      await Promise.all(selectedMembers.map(id => api.delete(`/gym/members/${id}`)));
      setMembers(members.filter(m => !selectedMembers.includes(m.id)));
      setSelectedMembers([]);
      fetchStats();
      invalidateMemberCache();
      clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
      toast.success(`${selectedMembers.length} members deleted successfully!`);
    } catch (error) {
      toast.error('Failed to delete some members');
    }
  };

  // ============================================================
  // HANDLE ADD MEMBER
  // ============================================================
  const handleAddMember = async (memberData) => {
    console.log('📥 MemberModal sending data:', memberData);
    
    const { 
      plan_id, 
      membership_start_date, 
      payment_method, 
      amount_paid, 
      discount_applied, 
      custom_due_date,
      payment_date,
      pt_data,
      ...memberFields 
    } = memberData;
  
    let memberResponse;
    let createdMember = null;
    let hasError = false;
    let membershipCreated = false;
    
    try {
      // Step 1: Create the member
      memberResponse = await api.post('/gym/members', memberFields);
      createdMember = memberResponse.data;
      console.log('✅ Member created:', createdMember);
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.detail, { duration: 5000 });
      } else {
        toast.error(error.response?.data?.detail || 'Failed to add member');
      }
      throw error;
    }
  
    const memberId = createdMember.id;
  
    // Step 2: Create membership with payment (if plan is selected)
    if (plan_id && membership_start_date && memberId) {
      try {
        const paidAmount = amount_paid ? parseFloat(amount_paid) : 0;
        const discount = discount_applied ? parseFloat(discount_applied) : 0;
        
        console.log('💰 New member payment amount:', paidAmount);
        console.log('💰 New member discount:', discount);
        
        let dueDate = null;
        if (custom_due_date && custom_due_date !== 'null' && custom_due_date !== 'None' && custom_due_date.trim() !== '') {
          dueDate = custom_due_date.trim();
        }
        
        const membershipPayload = {
          member_id: memberId,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: paidAmount,
          discount_applied: discount,
          payment_method: payment_method || 'cash',
          payment_date: payment_date,
        };
        
        if (dueDate) {
          membershipPayload.custom_due_date = dueDate;
        }
        
        console.log('📤 Membership payload:', membershipPayload);
        
        // ✅ This creates the membership AND the payment record
        const membershipResponse = await api.post('/gym/memberships', membershipPayload);
        membershipCreated = true;
        console.log('✅ Membership created with payment:', membershipResponse.data);
        
        // ✅ Trigger payment added event to refresh Payments page
        window.dispatchEvent(new CustomEvent('paymentAdded'));
        window.dispatchEvent(new CustomEvent('paymentUpdated'));
        
      } catch (membershipError) {
        console.error('Membership creation error:', membershipError);
        hasError = true;
        toast.error(`Member added but membership assignment failed. Please assign membership manually.`);
        return createdMember;
      }
    }
  
    // Step 3: Create PT session (if applicable)
    if (pt_data && pt_data.trainer_id && !hasError) {
      try {
        const ptPayload = {
          member_id: memberId,
          trainer_id: parseInt(pt_data.trainer_id),
          start_date: pt_data.start_date,
          end_date: pt_data.end_date,
          session_time: pt_data.session_time,
          session_days: pt_data.session_days || '[]',
          total_amount: pt_data.total_amount ? parseFloat(pt_data.total_amount) : null,
          amount_paid: pt_data.amount_paid ? parseFloat(pt_data.amount_paid) : 0,
          notes: pt_data.notes || null
        };
        
        console.log('📤 Creating personal training session:', ptPayload);
        await api.post('/gym/personal-training', ptPayload);
        console.log('✅ Personal training session created');
        toast.success('Personal training session added!');
      } catch (ptError) {
        console.error('Error creating PT session:', ptError);
        toast('Member added but personal training session could not be created.');
      }
    }
  
    // Step 4: Invalidate cache and refresh data
    invalidateMemberCache();
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
    
    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    
    // Step 5: Show success message
    if (!hasError) {
      if (membershipCreated) {
        const paidAmount = amount_paid ? parseFloat(amount_paid) : 0;
        if (paidAmount > 0) {
          toast.success(`✅ ${createdMember.full_name} added successfully with ₹${paidAmount} payment!`);
        } else {
          toast.success(`✅ ${createdMember.full_name} added successfully!`);
        }
      } else {
        toast.success(`✅ ${createdMember.full_name} added successfully!`);
      }
      
      // Step 6: Sync to device (smart sync) — background/best-effort only.
      const autoSyncDevice = devices.find(d => d.is_active);
      if (createdMember && createdMember.id && autoSyncDevice) {
        setTimeout(async () => {
          const result = await syncMemberToDevice(autoSyncDevice.id, createdMember, { silent: true });
          if (!result?.success) {
            console.warn('Background device sync skipped/failed (no alert shown):', result?.error);
          }
        }, 1500);
      }
      
      // Step 7: Ask to sync to device (fallback)
      const activeDevices = devices.filter(d => d.is_active);
      if (activeDevices.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Would you like to sync "${createdMember.full_name}" to the attendance device now?`)) {
            setSelectedMemberForSync({
              id: createdMember.id,
              full_name: createdMember.full_name,
            });
            setShowDeviceSyncModal(true);
          }
        }, 500);
      }
    }
    
    return createdMember;
  };

  // ============================================================
  // HANDLE UPDATE MEMBER
  // ============================================================
  const handleUpdateMember = async (memberData) => {
    const {
      plan_id, 
      membership_start_date, 
      payment_method, 
      amount_paid,
      discount_applied,
      renew_membership,
      current_membership_id,
      payment_date,
      pt_data,
      ...memberFields
    } = memberData;

    console.log('📤 handleUpdateMember - Received data:', memberData);
    console.log('💰 amount_paid received:', amount_paid);
    console.log('🔄 renew_membership:', renew_membership);
    console.log('📅 payment_date received:', payment_date);

    let hasError = false;
    let memberId = selectedMember?.id;

    try {
      await api.put(`/gym/members/${memberId}`, memberFields);
      console.log('✅ Member details updated');
    } catch (error) {
      console.error('Member update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update member details');
      throw error;
    }

    if (renew_membership && plan_id && membership_start_date) {
      try {
        const paidAmount = amount_paid ? parseFloat(amount_paid) : 0;
        const discount = discount_applied ? parseFloat(discount_applied) : 0;
        
        console.log('💰 Final payment amount for renewal:', paidAmount);
        console.log('💰 Discount for renewal:', discount);
        
        const selectedPlan = membershipPlans.find(p => String(p.id) === String(plan_id));
        if (selectedPlan) {
          const planPrice = selectedPlan.discounted_price || selectedPlan.price;
          console.log('📊 Plan price:', planPrice);
          console.log('📊 Final amount after discount:', planPrice - discount);
          console.log('📊 Amount paid:', paidAmount);
          console.log('📊 Balance due:', Math.max(0, (planPrice - discount) - paidAmount));
        }
        
        const membershipPayload = {
          member_id: memberId,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: paidAmount,
          discount_applied: discount,
          payment_method: payment_method || 'cash',
          current_membership_id: current_membership_id || null,
          is_renewal: true,
          payment_date: payment_date,
        };
        
        console.log('📤 Membership renewal payload:', membershipPayload);
        
        const membershipResponse = await api.post('/gym/memberships', membershipPayload);
        console.log('✅ Membership renewed:', membershipResponse.data);
        
        window.dispatchEvent(new CustomEvent('paymentAdded'));
        window.dispatchEvent(new CustomEvent('paymentUpdated'));
        
        if (paidAmount > 0) {
          toast.success(`✅ Membership renewed successfully with ₹${paidAmount} payment!`);
        } else {
          toast.warning('⚠️ Membership renewed but no payment was recorded.');
        }
        
        // ✅ After successful renewal, sync member to device
        const renewalSyncDevice = devices.find(d => d.is_active);
        if (memberId && renewalSyncDevice) {
          setTimeout(async () => {
            const result = await syncMemberToDevice(
              renewalSyncDevice.id,
              { id: memberId, ...memberFields },
              { silent: true }
            );
            if (!result?.success) {
              console.warn('Background device sync skipped/failed (no alert shown):', result?.error);
            }
          }, 1500);
        }
        
      } catch (err) {
        console.error('Membership renewal error:', err);
        hasError = true;
        toast.error(`Details saved but membership renewal failed. Please assign membership manually.`);
      }
    }

    if (pt_data && pt_data.trainer_id) {
      try {
        const existingPtResponse = await api.get(`/gym/members/${memberId}/personal-training`);
        const existingPtSessions = existingPtResponse.data || [];
        const activePt = existingPtSessions.find(s => s.status === 'active' || s.status === 'pending');
        
        const ptPayload = {
          member_id: memberId,
          trainer_id: parseInt(pt_data.trainer_id),
          start_date: pt_data.start_date,
          end_date: pt_data.end_date,
          session_time: pt_data.session_time,
          session_days: pt_data.session_days || '[]',
          total_amount: pt_data.total_amount ? parseFloat(pt_data.total_amount) : null,
          amount_paid: pt_data.amount_paid ? parseFloat(pt_data.amount_paid) : 0,
          notes: pt_data.notes || null
        };
        
        console.log('📤 Creating/Updating PT session:', ptPayload);
        
        if (activePt) {
          await api.put(`/gym/personal-training/${activePt.id}`, ptPayload);
          console.log('✅ PT session updated:', activePt.id);
          toast.success('Personal training session updated!');
        } else {
          await api.post('/gym/personal-training', ptPayload);
          console.log('✅ New PT session created');
          toast.success('Personal training session added!');
        }
      } catch (ptError) {
        console.error('Error updating PT session:', ptError);
        toast.error('Failed to update personal training session');
        hasError = true;
      }
    }

    invalidateMemberCache();
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
    
    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    
    if (!hasError) {
      toast.success('Member updated successfully!');
    }
  };

  // ============================================================
  // LEGACY SYNC MEMBER TO BRIDGE (keep for compatibility)
  // ============================================================
  const syncMemberToBridge = async (memberId) => {
    try {
      const response = await api.post(`/gym/members/${memberId}/sync-to-bridge`);
      if (response.data.success) {
        console.log('✅ Member synced to bridge:', response.data);
        return true;
      } else {
        console.warn('⚠️ Bridge sync response:', response.data);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync member to bridge:', error);
      return false;
    }
  };

  // ============================================================
  // EXPORT MEMBERS
  // ============================================================
  const handleExport = async () => {
    try {
      const balancesResponse = await api.get('/gym/members/balances');
      const balancesMap = new Map();
      balancesResponse.data.forEach(balance => {
        balancesMap.set(balance.member_id, balance);
      });

      const csvRows = [
        [
          'Member ID', 'Name', 'Email', 'Phone', 'Gender',
          'Membership Plan', 'Status', 'Join Date', 'Payments Count',
          'Plan Amount (₹)', 'Amount Paid (₹)', 'Pending Balance (₹)',
          'Payment Status', 'Next Payment Date', 'Last Payment Date',
          'Device User ID', 'Synced to Device', 'Personal Training',
          'PT Total (₹)', 'PT Paid (₹)', 'PT Balance (₹)'
        ]
      ];

      for (const member of members) {
        const balance = balancesMap.get(member.id);
        const ptInfo = ptData[member.id];
        
        csvRows.push([
          member.id, member.fullName, member.email, member.phone,
          member.gender || 'Not specified', member.membership, member.status,
          member.joinDate, member.payments,
          balance ? balance.total_amount : '0',
          balance ? balance.amount_paid : '0',
          balance ? balance.balance_due : '0',
          balance ? balance.payment_status : 'N/A',
          balance?.next_payment_date ? new Date(balance.next_payment_date).toLocaleDateString() : '',
          balance?.last_payment_date ? new Date(balance.last_payment_date).toLocaleDateString() : '',
          member.deviceUserId || '', member.syncedToDevice ? 'Yes' : 'No',
          ptInfo ? `Yes (Trainer: ${ptInfo.trainer_name})` : 'No',
          ptInfo ? ptInfo.total_amount || 0 : '',
          ptInfo ? ptInfo.amount_paid || 0 : '',
          ptInfo ? ptInfo.balance_due || 0 : ''
        ]);
      }

      const csv = csvRows.map(row => {
        return row.map(cell => {
          const stringCell = String(cell || '');
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        }).join(',');
      }).join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${members.length} members with balance information`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export members with balance data');
    }
  };

  // ============================================================
  // FILTER HANDLERS
  // ============================================================
  const handleFilterAll = () => {
    if (showSingleMember) handleBackToAllMembers();
    setFilters({ ...filters, status: 'all' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
  };

  const handleFilterActive = () => {
    if (showSingleMember) handleBackToAllMembers();
    setFilters({ ...filters, status: 'active' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
  };

  const handleFilterInactive = () => {
    if (showSingleMember) handleBackToAllMembers();
    setFilters({ ...filters, status: 'inactive' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
  };

  const handleFilterNewThisMonth = () => {
    if (showSingleMember) handleBackToAllMembers();
    setFilters({ ...filters, status: 'all' });
    setShowNewThisMonthOnly(true);
    setSearchTerm('');
    setCurrentPage(1);
    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
  };

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const openDeviceSyncModal = (member) => {
    const memberData = {
      id: member.id,
      full_name: member.fullName || member.full_name || '',
      fullName: member.fullName || member.full_name || '',
      phone: member.phone || '',
      email: member.email || '',
      device_user_id: member.deviceUserId || member.device_user_id || null,
      deviceUserId: member.deviceUserId || member.device_user_id || null,
      syncedToDevice: member.syncedToDevice || false,
      membership: member.membership || '',
      status: member.status || 'inactive',
      joinDate: member.joinDate || '',
      avatar: member.avatar || '',
      raw: member.raw || member
    };
    
    console.log('📱 Opening sync modal for member:', memberData);
    setSelectedMemberForSync(memberData);
    setShowDeviceSyncModal(true);
  };

  const handleSyncComplete = (deviceUserId, memberId) => {
    console.log('Sync complete called with:', { deviceUserId, memberId });
    
    const targetId = memberId;
    
    if (targetId) {
      setMembers(prevMembers => {
        const updatedMembers = prevMembers.map(m =>
          m.id === targetId
            ? {
                ...m,
                deviceUserId: String(deviceUserId || targetId),
                syncedToDevice: true,
              }
            : m
        );
        console.log('Updated member:', updatedMembers.find(m => m.id === targetId));
        return updatedMembers;
      });
    }
    
    setTimeout(() => {
      fetchMembers();
    }, 1000);
  };

  const openBulkDeviceSelect = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select members to sync first');
      return;
    }
    setShowBulkDeviceSelect(true);
  };

  const handleBulkSyncToDevice = async () => {
    if (!selectedBulkDevice) {
      toast.error('Please select a device');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select members to sync');
      return;
    }

    setSyncingAll(true);
    try {
      const memberIds = selectedMembers;
      const result = await attendanceApi.bulkSyncMembersToDevice(selectedBulkDevice.id, memberIds);
      
      if (result.success) {
        toast.success(`Syncing ${memberIds.length} members to device ${selectedBulkDevice.device_name}`);
        
        setMembers(prevMembers => 
          prevMembers.map(m => 
            memberIds.includes(m.id) 
              ? { ...m, syncedToDevice: true, deviceUserId: String(m.id) }
              : m
          )
        );
        
        setSelectedMembers([]);
        setShowBulkDeviceSelect(false);
        setSelectedBulkDevice(null);
        refreshAllData();
        
        if (result.device_serial) {
          try {
            await api.post(`/attendance/devices/trigger-sync?device_serial=${result.device_serial}`);
            console.log('✅ Triggered immediate device sync');
          } catch (triggerError) {
            console.warn('Could not trigger immediate sync, will wait for normal poll:', triggerError);
          }
        }
        
        setTimeout(() => fetchMembers(), 2000);
      } else {
        toast.error(result.error || 'Bulk sync failed');
      }
    } catch (error) {
      console.error('Bulk sync error:', error);
      toast.error(error.response?.data?.detail || 'Bulk sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDownloadInvoice = async (member) => {
    setDownloadingInvoice(member.id);
    try {
      await generateInvoicePDF(member.id);
    } catch (error) {
      console.error('Error generating invoice:', error);
      if (error.response?.data?.detail) {
        console.error('Server error detail:', error.response.data.detail);
      }
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleBulkInvoice = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select members to generate invoices');
      return;
    }
    
    setDownloadingBulk(true);
    try {
      toast.loading(`Generating ${selectedMembers.length} invoices...`, { id: 'bulk-invoice' });
      await generateBulkInvoices(selectedMembers);
      toast.dismiss('bulk-invoice');
      toast.success(`${selectedMembers.length} invoices downloaded as ZIP!`);
      setSelectedMembers([]);
    } catch (error) {
      toast.dismiss('bulk-invoice');
      console.error('Error generating bulk invoices:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate bulk invoices');
    } finally {
      setDownloadingBulk(false);
    }
  };

  const openProfileModal = (member) => {
    setSelectedMemberForProfile(member);
    setShowProfileModal(true);
  };

  const openEditModal = (member) => {
    setSelectedMember({
      id: member.id,
      full_name: member.fullName,
      email: member.email,
      phone: member.phone,
      gender: member.gender,
      joined_date: member.joinDate,
      membership: member.membership,
      membershipEndDate: member.membershipEndDate,
      ...member.raw,
    });
    setIsModalOpen(true);
  };

  const copyDeviceIdToClipboard = (deviceUserId) => {
    if (deviceUserId) {
      navigator.clipboard.writeText(deviceUserId);
      toast.success('Device User ID copied to clipboard!');
    }
  };

  const activeDevices = devices.filter(d => d.is_active);
  const inactiveCount = stats.total - stats.active;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatedMembers = members;
  const displayTotalPages = totalPages;

  const toggleSelectAll = () => {
    if (selectedMembers.length === paginatedMembers.length && paginatedMembers.length > 0) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(paginatedMembers.map(m => m.id));
    }
  };

  const toggleSelectMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="p-6">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        member={memberToDelete}
        loading={deleting}
      />

      {/* Header Stats - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div 
          onClick={handleFilterAll}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'all' && !showNewThisMonthOnly && !showSingleMember ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{showSingleMember ? 1 : stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show all</p>
        </div>
        <div 
          onClick={handleFilterActive}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'active' && !showNewThisMonthOnly && !showSingleMember ? 'ring-2 ring-green-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{showSingleMember ? (singleMemberData?.status === 'active' ? 1 : 0) : stats.active}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show active</p>
        </div>
        <div 
          onClick={handleFilterInactive}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'inactive' && !showNewThisMonthOnly && !showSingleMember ? 'ring-2 ring-red-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Inactive Members</p>
          <p className="text-2xl font-bold text-gray-600">{showSingleMember ? (singleMemberData?.status === 'inactive' ? 1 : 0) : inactiveCount}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show inactive</p>
        </div>
        <div 
          onClick={handleFilterNewThisMonth}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            showNewThisMonthOnly && !showSingleMember ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show new members</p>
        </div>
      </div>

      {/* Show "Back to All Members" button when viewing single member */}
      {showSingleMember && (
        <div className="mb-4">
          <button
            onClick={handleBackToAllMembers}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Members
          </button>
          <span className="ml-3 text-sm text-gray-500">
            Showing: <strong>{singleMemberData?.fullName}</strong>
          </span>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={showSingleMember ? "Search disabled - viewing single member" : "Search members..."}
                value={searchTerm}
                onChange={(e) => {
                  if (!showSingleMember) {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                    clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                  }
                }}
                disabled={showSingleMember}
                className={`pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                  showSingleMember ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              disabled={showSingleMember}
              className={`p-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'} ${
                showSingleMember ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Filter className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => {
                if (showSingleMember) {
                  handleBackToAllMembers();
                } else {
                  clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                  fetchMembers();
                }
              }}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title={showSingleMember ? "Back to all members" : "Refresh Members"}
            >
              {showSingleMember ? <ArrowLeft className="h-5 w-5 text-blue-600" /> : <RefreshCw className="h-5 w-5 text-gray-600" />}
            </button>
            {(filters.status !== 'all' || showNewThisMonthOnly || searchTerm) && !showSingleMember && (
              <button
                onClick={() => {
                  setFilters({ ...filters, status: 'all' });
                  setShowNewThisMonthOnly(false);
                  setSearchTerm('');
                  setCurrentPage(1);
                  clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {selectedMembers.length > 0 && !showSingleMember && (
              <>
                <button 
                  onClick={handleBulkInvoice}
                  disabled={downloadingBulk}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {downloadingBulk ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Invoices ({selectedMembers.length})
                </button>
                <button 
                  onClick={handleBulkDelete} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedMembers.length})
                </button>
                <button onClick={() => setSelectedMembers([])} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
            <button onClick={handleExport} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Import
            </button>
            <button
              onClick={() => { setSelectedMember(null); setIsModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && !showSingleMember && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setShowNewThisMonthOnly(false);
                  setCurrentPage(1);
                  clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                }}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select 
                value={filters.gender} 
                onChange={(e) => {
                  setFilters({ ...filters, gender: e.target.value });
                  setCurrentPage(1);
                  clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                }}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            {showNewThisMonthOnly && (
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm">
                  <span className="font-medium">Filter: New Members This Month</span>
                  <button
                    onClick={() => {
                      setShowNewThisMonthOnly(false);
                      setCurrentPage(1);
                      clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Single Member Info Banner */}
        {showSingleMember && singleMemberData && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-4 bg-blue-50 rounded-lg p-3">
              <img 
                src={singleMemberData.avatar} 
                alt={singleMemberData.fullName}
                className="h-12 w-12 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(singleMemberData.fullName)}&background=0D9488&color=fff&size=128`;
                }}
              />
              <div>
                <p className="font-semibold text-gray-900">{singleMemberData.fullName}</p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{singleMemberData.phone}</span>
                  <span>•</span>
                  <span>{singleMemberData.email || 'No email'}</span>
                  <span>•</span>
                  <span>{getStatusBadge(singleMemberData.status)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox"
                    checked={!showSingleMember && selectedMembers.length === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={toggleSelectAll}
                    disabled={showSingleMember}
                    className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${showSingleMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading || loadingSingleMember ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                    {showNewThisMonthOnly 
                      ? 'No new members joined this month' 
                      : showSingleMember 
                        ? 'Member not found' 
                        : 'No members found'}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => {
                  const ptInfo = ptData[member.id];
                  return (
                    <tr key={member.id} className={`hover:bg-gray-50 ${showSingleMember ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <input type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleSelectMember(member.id)}
                          disabled={showSingleMember}
                          className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${showSingleMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div 
                          className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
                          onClick={() => openProfileModal(member)}
                        >
                          <img 
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0" 
                            src={member.avatar} 
                            alt={member.fullName}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=0D9488&color=fff&size=128`;
                            }}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              {member.fullName}
                              {showSingleMember && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Joined {new Date(member.joinDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{member.email || '—'}</div>
                        <div className="text-sm text-gray-500">{member.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.membership}</div>
                        <div className="text-sm text-gray-500">
                          {member.membershipEndDate ? (
                            <span>
                              Expires: {new Date(member.membershipEndDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">No active membership</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ptInfo ? (
                          <div className="group relative">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 cursor-help">
                              <Dumbbell className="h-3 w-3 mr-1" />
                              Active
                            </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none min-w-[240px] text-center shadow-lg">
                              <p className="font-semibold text-purple-300">PT Details</p>
                              <p><strong>Trainer:</strong> {ptInfo.trainer_name}</p>
                              <p><strong>Days:</strong> {ptInfo.session_days_display || '—'}</p>
                              <p><strong>Time:</strong> {ptInfo.session_time || '—'}</p>
                              <div className="border-t border-gray-700 my-1"></div>
                              <p><strong>Total:</strong> ₹{ptInfo.total_amount?.toLocaleString() || 0}</p>
                              <p><strong>Paid:</strong> ₹{ptInfo.amount_paid?.toLocaleString() || 0}</p>
                              <p><strong>Balance:</strong> ₹{ptInfo.balance_due?.toLocaleString() || 0}</p>
                              <p><strong>Status:</strong> <span className="capitalize">{ptInfo.status || 'Active'}</span></p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.syncedToDevice ? (
                          <div className="group relative">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-help">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Synced
                            </span>
                            {member.deviceUserId && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                Device ID: {member.deviceUserId}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Synced
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.deviceUserId ? (
                          <button
                            onClick={() => copyDeviceIdToClipboard(member.deviceUserId)}
                            className="group relative inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                            title="Click to copy Device User ID"
                          >
                            {member.deviceUserId.substring(0, 8)}...
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              Click to copy full ID
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Download Invoice PDF */}
                        <button 
                          onClick={() => handleDownloadInvoice(member)} 
                          className="text-green-600 hover:text-green-900 mr-2 inline-flex items-center"
                          title="Download Invoice PDF"
                          disabled={downloadingInvoice === member.id}
                        >
                          {downloadingInvoice === member.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Resend Invoice via WhatsApp */}
                        <button 
                          onClick={() => handleResendInvoiceWhatsApp(member)} 
                          className={`mr-2 inline-flex items-center ${
                            member.phone 
                              ? 'text-blue-500 hover:text-blue-700' 
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                          title={member.phone ? "Resend Invoice via WhatsApp" : "No phone number available"}
                          disabled={!member.phone || resendingInvoice === member.id}
                        >
                          {resendingInvoice === member.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                        
                        {/* Sync to Attendance Device */}
                        <button 
                          onClick={() => {
                            const memberForSync = {
                              id: member.id,
                              full_name: member.fullName,
                              fullName: member.fullName,
                              phone: member.phone,
                              email: member.email || '',
                              device_user_id: member.deviceUserId || null,
                              deviceUserId: member.deviceUserId || null,
                              syncedToDevice: member.syncedToDevice || false,
                              membership: member.membership,
                              status: member.status,
                              joinDate: member.joinDate,
                              avatar: member.avatar,
                              raw: member.raw || member
                            };
                            openDeviceSyncModal(memberForSync);
                          }} 
                          className="text-purple-600 hover:text-purple-900 mr-2"
                          title="Sync to Attendance Device"
                        >
                          <Wifi className="h-4 w-4" />
                        </button>
                        
                        {/* Edit Member */}
                        <button onClick={() => openEditModal(member)} className="text-blue-600 hover:text-blue-900 mr-2">
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        {/* Delete Member */}
                        <button onClick={() => handleDeleteClick(member)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {displayTotalPages > 0 && !showSingleMember && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{members.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> to{' '}
              <span className="font-medium">{members.length > 0 ? ((currentPage - 1) * itemsPerPage) + members.length : 0}</span> of{' '}
              <span className="font-medium">{totalMembersCount}</span> members
              <span className="text-gray-400 ml-2">(showing {itemsPerPage} per page)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{displayTotalPages}</span>
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === displayTotalPages || loading}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => { 
          setIsModalOpen(false); 
          setSelectedMember(null);
          if (!showSingleMember) {
            clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
            fetchMembers();
          }
        }}
        onSave={selectedMember ? handleUpdateMember : handleAddMember}
        member={selectedMember}
        userRole={user?.role}
      />

      <DeviceSyncModal
        isOpen={showDeviceSyncModal}
        onClose={() => {
          setShowDeviceSyncModal(false);
          setSelectedMemberForSync(null);
        }}
        member={selectedMemberForSync}
        onSyncComplete={handleSyncComplete}
        refreshMemberList={() => {
          clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
          fetchMembers();
        }}
      />

      {showProfileModal && selectedMemberForProfile && (
        <MemberProfileModal
          memberId={selectedMemberForProfile.id}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedMemberForProfile(null);
            clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
            clearCachePattern(CACHE_KEYS.MEMBER_STATS);
            fetchMembers();
            fetchStats();
          }}
          onUpdate={() => {
            clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
            clearCachePattern(CACHE_KEYS.MEMBER_STATS);
            fetchMembers();
            fetchStats();
          }}
        />
      )}

      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => {
          setShowBulkImportModal(false);
          clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
          clearCachePattern(CACHE_KEYS.MEMBER_STATS);
          fetchMembers();
          fetchStats();
        }}
        onImportComplete={() => {
          clearCachePattern(CACHE_KEYS.MEMBERS_LIST);
          clearCachePattern(CACHE_KEYS.MEMBER_STATS);
          fetchMembers();
          fetchStats();
        }}
      />

      {showBulkDeviceSelect && !showSingleMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sync to Attendance Device</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Selected {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowBulkDeviceSelect(false);
                  setSelectedBulkDevice(null);
                }} 
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {activeDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <WifiOff className="h-12 w-12 mx-auto mb-3 text-orange-300" />
                  <p>No devices registered</p>
                  <p className="text-sm mt-1">Please register a device first</p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Device
                  </label>
                  <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
                    {activeDevices.map(device => (
                      <button
                        key={device.id}
                        onClick={() => setSelectedBulkDevice(device)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedBulkDevice?.id === device.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{device.device_name}</p>
                            <p className="text-xs text-gray-500">{device.device_ip}:{device.device_port}</p>
                            {!device.is_online && (
                              <p className="text-xs text-orange-500 mt-1">⚠️ Bridge offline - commands will queue</p>
                            )}
                          </div>
                          {device.is_online ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-orange-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowBulkDeviceSelect(false);
                        setSelectedBulkDevice(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkSyncToDevice}
                      disabled={!selectedBulkDevice || syncingAll}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {syncingAll ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )}
                      Sync {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;