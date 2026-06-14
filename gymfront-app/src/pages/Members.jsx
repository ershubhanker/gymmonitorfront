// src/pages/Members.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserPlus,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Wifi,
  Loader2,
  WifiOff
} from 'lucide-react';
import MemberModal from '../components/MemberModal';
import DeviceSyncModal from '../components/attendance/DeviceSyncModal';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';

// Import the invoice functions
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

const Members = () => {
  const { user } = useAuth(); 
  const { devices, syncMemberToDevice, removeMemberFromDevice, refreshAllData, attendanceApi } = useAttendance();
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
  const [gymDetails, setGymDetails] = useState({
    name: 'GYM MANAGEMENT SYSTEM',
    address: '',
    phone: '',
    email: '',
    currency_symbol: '₹',
  });

  useEffect(() => {
    const renewalMemberData = localStorage.getItem('selectedMemberForRenewal');
    if (renewalMemberData) {
      try {
        const memberData = JSON.parse(renewalMemberData);
        console.log('Member renewal data received:', memberData);
        console.log('Available members:', members);
        
        // Clear the stored data immediately
        localStorage.removeItem('selectedMemberForRenewal');
        
        // Find the member by comparing numeric IDs
        const memberToRenew = members.find(m => m.id === Number(memberData.id));
        console.log('Found member to renew:', memberToRenew);
        
        if (memberToRenew) {
          setTimeout(() => {
            openEditModal(memberToRenew);
            toast.success(`Ready to renew membership for ${memberToRenew.fullName}`);
          }, 500);
        } else {
          console.log('Member not found, waiting for members to load...');
          // If member not found yet, wait for members to load
          const checkInterval = setInterval(() => {
            const member = members.find(m => m.id === Number(memberData.id));
            if (member) {
              console.log('Found member after waiting:', member);
              clearInterval(checkInterval);
              openEditModal(member);
              toast.success(`Ready to renew membership for ${member.fullName}`);
            }
          }, 500);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Timeout: Member not found after 10 seconds');
          }, 10000);
        }
      } catch (error) {
        console.error('Error parsing renewal data:', error);
        localStorage.removeItem('selectedMemberForRenewal');
      }
    }
  }, [members]);

  const itemsPerPage = 10;

  // Wrap fetchMembers in useCallback to prevent infinite loops
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm && !showNewThisMonthOnly) params.append('search', debouncedSearchTerm);
      if (filters.status !== 'all') params.append('status', filters.status);

      const [membersRes, membershipsRes, paymentsRes, deviceIdsRes] = await Promise.all([
        api.get(`/gym/members?${params.toString()}`),
        api.get('/gym/memberships?limit=1000'),
        api.get('/gym/payments?limit=1000'),
        api.get('/attendance/members/device-ids').catch(() => ({ data: [] })),
      ]);

      const membershipsData = membershipsRes.data || [];
      const paymentsData = paymentsRes.data || [];

      // Build a lookup map: member_id -> device_user_id
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
            avatarUrl = `${API_BASE_URL}${member.profile_image}`;
          }
        } else {
          avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff&size=128`;
        }

        // Use device_user_id from gym_routes if present, otherwise fall back to deviceIdMap
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
    } catch (error) {
      console.error('Error fetching members:', error.response?.data || error.message);
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters.status, showNewThisMonthOnly]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/gym/dashboard/stats');
      setStats({
        total: response.data.total_members,
        active: response.data.active_members,
        newThisMonth: response.data.new_members_this_month,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

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

  useEffect(() => {
    fetchMembers();
    fetchStats();
    fetchGymDetails();
  }, [fetchMembers]);

  // Filter handlers for stats cards
  const handleFilterAll = () => {
    setFilters({ ...filters, status: 'all' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleFilterActive = () => {
    setFilters({ ...filters, status: 'active' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleFilterInactive = () => {
    setFilters({ ...filters, status: 'inactive' });
    setShowNewThisMonthOnly(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleFilterNewThisMonth = () => {
    setFilters({ ...filters, status: 'all' });
    setShowNewThisMonthOnly(true);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDownloadInvoice = async (member) => {
    setDownloadingInvoice(member.id);
    try {
      await generateInvoicePDF(member.id);
      // Success toast is already shown in generateInvoicePDF
    } catch (error) {
      console.error('Error generating invoice:', error);
      // Error toast is already shown in generateInvoicePDF
      // Just log additional details if needed
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
      setSelectedMembers([]); // Clear selection after download
    } catch (error) {
      toast.dismiss('bulk-invoice');
      console.error('Error generating bulk invoices:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate bulk invoices');
    } finally {
      setDownloadingBulk(false);
    }
  };

  const handleAddMember = async (memberData) => {
    const { plan_id, membership_start_date, payment_method, amount_paid, discount_applied, ...memberFields } = memberData;
  
    let memberResponse;
    let createdMember = null;
    let hasError = false;
    
    try {
      memberResponse = await api.post('/gym/members', memberFields);
      createdMember = memberResponse.data;
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.detail, { duration: 5000 });
      } else {
        toast.error(error.response?.data?.detail || 'Failed to add member');
      }
      throw error;
    }
  
    const memberId = createdMember.id;
  
    if (plan_id && membership_start_date && memberId) {
      try {
        const membershipPayload = {
          member_id: memberId,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: amount_paid ? parseFloat(amount_paid) : 0,
          discount_applied: discount_applied ? parseFloat(discount_applied) : 0, // Include discount
        };
        
        const membershipResponse = await api.post('/gym/memberships', membershipPayload);
        
        if (amount_paid && parseFloat(amount_paid) > 0) {
          try {
            await api.post('/gym/payments', {
              member_id: memberId,
              membership_id: membershipResponse.data.id,
              amount: parseFloat(amount_paid),
              payment_method: payment_method || 'cash',
              payment_date: new Date().toISOString().split('T')[0],
            });
          } catch (paymentError) {
            console.error('Payment creation error:', paymentError);
            hasError = true;
          }
        }
      } catch (membershipError) {
        console.error('Membership creation error:', membershipError);
        hasError = true;
        toast.error(`Member added but membership assignment failed. Please assign membership manually.`);
        return createdMember;
      }
    }
  
    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    
    if (!hasError) {
      toast.success('Member added successfully!');
      
      const activeDevices = devices.filter(d => d.is_active);
      if (activeDevices.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Would you like to sync "${createdMember.full_name}" to the attendance device?`)) {
            setSelectedMemberForSync({
              id: createdMember.id,
              full_name: createdMember.full_name,
            });
            setShowDeviceSyncModal(true);
          }
        }, 500);
      }
    } else {
      toast.success('Member added! Please review membership and payment details.');
    }
    return createdMember;
  };
  
  const handleUpdateMember = async (memberData) => {
    const {
      plan_id, 
      membership_start_date, 
      payment_method, 
      amount_paid,
      discount_applied, // Add this
      renew_membership,
      ...memberFields
    } = memberData;
  
    let hasError = false;
  
    try {
      await api.put(`/gym/members/${selectedMember.id}`, memberFields);
    } catch (error) {
      console.error('Member update error:', error);
      toast.error(error.response?.data?.detail || 'Failed to update member details');
      throw error;
    }
  
    if (renew_membership && plan_id && membership_start_date) {
      try {
        const membershipPayload = {
          member_id: selectedMember.id,
          plan_id: parseInt(plan_id),
          start_date: membership_start_date,
          amount_paid: amount_paid ? parseFloat(amount_paid) : 0,
          discount_applied: discount_applied ? parseFloat(discount_applied) : 0, // Include discount
        };
        
        const membershipResponse = await api.post('/gym/memberships', membershipPayload);
        
        if (amount_paid && parseFloat(amount_paid) > 0) {
          try {
            await api.post('/gym/payments', {
              member_id: selectedMember.id,
              membership_id: membershipResponse.data.id,
              amount: parseFloat(amount_paid),
              payment_method: payment_method || 'cash',
              payment_date: new Date().toISOString().split('T')[0],
            });
          } catch (paymentError) {
            console.error('Payment creation error:', paymentError);
            hasError = true;
          }
        }
      } catch (err) {
        console.error('Membership renewal error:', err);
        hasError = true;
        toast.error(`Details saved but membership renewal failed. Please assign membership manually.`);
      }
    }
  
    await fetchMembers();
    fetchStats();
    setIsModalOpen(false);
    
    if (!hasError) {
      toast.success('Member updated successfully!');
    } else if (renew_membership) {
      toast.success('Member details updated! Please review membership details.');
    } else {
      toast.success('Member updated successfully!');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member? This will also remove them from all attendance devices.')) return;
    
    setLoading(true);
    try {
      const response = await api.delete(`/gym/members/${memberId}`);
      
      // Show detailed success message
      if (response.data.removed_from_devices > 0) {
        toast.success(
          `✅ Member deleted successfully!\n\n` +
          `Removed from ${response.data.removed_from_devices} device(s).\n` +
          `The device will sync within 3 seconds.`,
          { duration: 5000 }
        );
      } else if (response.data.device_user_id) {
        toast.warning(
          `⚠️ Member deleted but not removed from devices.\n\n` +
          `The member had a device ID (${response.data.device_user_id}) but no active devices were found.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Member deleted successfully! (No device sync needed)');
      }
      
      // Update local state
      setMembers(members.filter(m => m.id !== memberId));
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
      fetchStats();
      refreshAllData(); // Refresh device data if needed
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete member');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMembers.length} members?`)) return;
    try {
      await Promise.all(selectedMembers.map(id => api.delete(`/gym/members/${id}`)));
      setMembers(members.filter(m => !selectedMembers.includes(m.id)));
      setSelectedMembers([]);
      fetchStats();
      toast.success(`${selectedMembers.length} members deleted successfully!`);
    } catch (error) {
      toast.error('Failed to delete some members');
    }
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
        
        // Update local state immediately
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
        
        // Full refresh to sync with server
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
          'Device User ID', 'Synced to Device'
        ]
      ];

      for (const member of members) {
        const balance = balancesMap.get(member.id);
        
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
          member.deviceUserId || '', member.syncedToDevice ? 'Yes' : 'No'
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
    setSelectedMemberForSync(member);
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

  // Filtered members - including new this month filter
  const filteredMembers = members.filter(member => {
    // Check if we're filtering by "new this month"
    if (showNewThisMonthOnly) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const joinDate = new Date(member.joinDate);
      const isNewThisMonth = joinDate.getFullYear() === currentYear && joinDate.getMonth() === currentMonth;
      return isNewThisMonth;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (searchLower) {
      matchesSearch =
        member.fullName?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.phone?.includes(searchTerm);
    }
    
    const matchesStatus = filters.status === 'all' || member.status === filters.status;
    const matchesGender = filters.gender === 'all' || member.gender === filters.gender;
    
    return matchesSearch && matchesStatus && matchesGender;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedMembers.length === paginatedMembers.length) {
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

  // Use ALL active devices, not just online ones
  const activeDevices = devices.filter(d => d.is_active);
  
  const copyDeviceIdToClipboard = (deviceUserId) => {
    if (deviceUserId) {
      navigator.clipboard.writeText(deviceUserId);
      toast.success('Device User ID copied to clipboard!');
    }
  };

  const inactiveCount = stats.total - stats.active;

  return (
    <div className="p-6">
      {/* Header Stats - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div 
          onClick={handleFilterAll}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'all' && !showNewThisMonthOnly ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show all</p>
        </div>
        <div 
          onClick={handleFilterActive}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'active' && !showNewThisMonthOnly ? 'ring-2 ring-green-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show active</p>
        </div>
        <div 
          onClick={handleFilterInactive}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            filters.status === 'inactive' && !showNewThisMonthOnly ? 'ring-2 ring-red-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">Inactive Members</p>
          <p className="text-2xl font-bold text-gray-600">{inactiveCount}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show inactive</p>
        </div>
        <div 
          onClick={handleFilterNewThisMonth}
          className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            showNewThisMonthOnly ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
        >
          <p className="text-sm text-gray-600">New This Month</p>
          <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
          <p className="text-xs text-gray-400 mt-1">Click to show new members</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center space-x-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
            >
              <Filter className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => fetchMembers()}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Refresh Members"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
            {/* Clear filters button */}
            {(filters.status !== 'all' || showNewThisMonthOnly || searchTerm) && (
              <button
                onClick={() => {
                  setFilters({ ...filters, status: 'all' });
                  setShowNewThisMonthOnly(false);
                  setSearchTerm('');
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {selectedMembers.length > 0 && (
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
                  onClick={openBulkDeviceSelect}
                  disabled={syncingAll || activeDevices.length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {syncingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  Sync ({selectedMembers.length})
                </button>
                <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
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
              onClick={() => { setSelectedMember(null); setIsModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={filters.status} 
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setShowNewThisMonthOnly(false);
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
              <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2">
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            {/* Show active filter indicator when new this month is active */}
            {showNewThisMonthOnly && (
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-100 text-blue-800 text-sm">
                  <span className="font-medium">Filter: New Members This Month</span>
                  <button
                    onClick={() => setShowNewThisMonthOnly(false)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
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
                    checked={selectedMembers.length === paginatedMembers.length && paginatedMembers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                 </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    {showNewThisMonthOnly 
                      ? 'No new members joined this month' 
                      : 'No members found'}
                   </td>
                 </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={() => toggleSelectMember(member.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
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
                          <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
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
                        {member.payments} payment{member.payments !== 1 ? 's' : ''}
                        {member.membershipEndDate && (
                          <span className="ml-1">
                            · expires {new Date(member.membershipEndDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.status)}
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
                      <button 
                        onClick={() => handleDownloadInvoice(member)} 
                        className="text-green-600 hover:text-green-900 mr-3 inline-flex items-center"
                        title="Download Invoice"
                        disabled={downloadingInvoice === member.id}
                      >
                        {downloadingInvoice === member.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </button>
                      <button 
                        onClick={() => openDeviceSyncModal(member)} 
                        className="text-purple-600 hover:text-purple-900 mr-3"
                        title="Sync to Attendance Device"
                      >
                        <Wifi className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditModal(member)} className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteMember(member.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                     </td>
                   </tr>
                ))
              )}
            </tbody>
           </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of{' '}
              {filteredMembers.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Modal */}
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedMember(null); }}
        onSave={selectedMember ? handleUpdateMember : handleAddMember}
        member={selectedMember}
        userRole={user?.role}
      />

      {/* Device Sync Modal for Single Member */}
      <DeviceSyncModal
        isOpen={showDeviceSyncModal}
        onClose={() => {
          setShowDeviceSyncModal(false);
          setSelectedMemberForSync(null);
        }}
        member={selectedMemberForSync}
        onSyncComplete={handleSyncComplete}
        refreshMemberList={fetchMembers}
      />

      {/* Bulk Device Selection Modal - FIXED VERSION */}
      {showBulkDeviceSelect && (
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