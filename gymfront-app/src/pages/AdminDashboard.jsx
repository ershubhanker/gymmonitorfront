import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Activity, CheckCircle, XCircle, Settings,
  LogOut, Bell, ChevronDown, Menu, X, Home, Shield, RefreshCw,
  Loader2, Mail, Phone, Eye, MapPin, Search, UserCheck, UserX,
  Clock, Calendar, AlertCircle, User, Edit, Trash2, Plus,
  Filter, Download, Database, Server, HardDrive, Globe,
  DollarSign, CreditCard, Award, Star, Zap, Target,
  TrendingUp, TrendingDown, BarChart3, PieChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Data states
  const [stats, setStats] = useState({
    total_gyms: 0,
    active_gyms: 0,
    new_gyms_this_month: 0,
    total_users: 0,
    gym_owners: 0,
    gym_staff: 0,
    verified_owners: 0,
    total_members_across_gyms: 0,
    total_active_members: 0,
    total_staff_across_gyms: 0,
    total_memberships: 0,
    total_payments: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    gyms_by_plan: {},
    recent_activities: []
  });

  const [gyms, setGyms] = useState([]);
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showGymDetails, setShowGymDetails] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    setLoading(true);
    
    try {
      console.log('Fetching all database records...');
      
      const [
        statsRes, gymsRes, usersRes, membersRes, 
        staffRes, plansRes, membershipsRes, paymentsRes
      ] = await Promise.all([
        api.get('/admin/dashboard/stats').catch(err => {
          console.error('Stats error:', err);
          return { data: null };
        }),
        api.get('/admin/gyms?limit=1000').catch(err => {
          console.error('Gyms error:', err);
          return { data: [] };
        }),
        api.get('/admin/users?limit=1000').catch(err => {
          console.error('Users error:', err);
          return { data: [] };
        }),
        api.get('/admin/members?limit=1000').catch(err => {
          console.error('Members error:', err);
          return { data: [] };
        }),
        api.get('/admin/staff?limit=1000').catch(err => {
          console.error('Staff error:', err);
          return { data: [] };
        }),
        api.get('/admin/plans?limit=1000').catch(err => {
          console.error('Plans error:', err);
          return { data: [] };
        }),
        api.get('/admin/memberships?limit=1000').catch(err => {
          console.error('Memberships error:', err);
          return { data: [] };
        }),
        api.get('/admin/payments?limit=1000').catch(err => {
          console.error('Payments error:', err);
          return { data: [] };
        })
      ]);

      // Update all states with fetched data
      if (statsRes?.data) setStats(statsRes.data);
      if (gymsRes?.data) setGyms(gymsRes.data);
      if (usersRes?.data) setUsers(usersRes.data);
      if (membersRes?.data) setMembers(membersRes.data);
      if (staffRes?.data) setStaff(staffRes.data);
      if (plansRes?.data) setPlans(plansRes.data);
      if (membershipsRes?.data) setMemberships(membershipsRes.data);
      if (paymentsRes?.data) setPayments(paymentsRes.data);

      console.log('Data fetched successfully:', {
        gyms: gymsRes?.data?.length,
        users: usersRes?.data?.length,
        members: membersRes?.data?.length,
        staff: staffRes?.data?.length,
        plans: plansRes?.data?.length,
        memberships: membershipsRes?.data?.length,
        payments: paymentsRes?.data?.length
      });

      if (showToast) toast.success('Database refreshed!');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load database records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // CRUD Operations
  const handleEdit = (type, item) => {
    setSelectedItem({ type, ...item });
    setShowEditModal(true);
  };

  const handleDelete = async (type, id) => {
    setDeleteTarget({ type, id });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const { type, id } = deleteTarget;
      await api.delete(`/admin/${type}/${id}`);
      toast.success(`${type} deleted successfully`);
      fetchAllData();
    } catch (error) {
      toast.error(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleUpdate = async (type, id, data) => {
    try {
      await api.put(`/admin/${type}/${id}`, data);
      toast.success(`${type} updated successfully`);
      fetchAllData();
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error(`Failed to update ${type}`);
    }
  };

  // Filter functions
  const filteredGyms = gyms.filter(g => {
    const matchSearch = 
      g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || g.subscription_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const filteredMembers = members.filter(m => {
    return m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.phone?.includes(searchTerm);
  });

  const filteredStaff = staff.filter(s => {
    return s.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.position?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredPlans = plans.filter(p => {
    return p.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredMemberships = memberships.filter(m => {
    return m.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredPayments = payments.filter(p => {
    return p.member?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      gym_owner: 'bg-blue-100 text-blue-800',
      gym_staff: 'bg-green-100 text-green-800',
      member: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const navigation = [
    { name: 'Overview', icon: Home, id: 'overview', count: null },
    { name: 'Gyms', icon: Building2, id: 'gyms', count: gyms.length },
    { name: 'Users', icon: Users, id: 'users', count: users.length },
    { name: 'Members', icon: User, id: 'members', count: members.length },
    { name: 'Staff', icon: Users, id: 'staff', count: staff.length },
    { name: 'Plans', icon: Award, id: 'plans', count: plans.length },
    { name: 'Memberships', icon: CreditCard, id: 'memberships', count: memberships.length },
    { name: 'Payments', icon: DollarSign, id: 'payments', count: payments.length },
    { name: 'Database', icon: Database, id: 'database', count: null },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <Database className="h-16 w-16 text-purple-500 animate-pulse mx-auto mb-4" />
            <Loader2 className="h-8 w-8 text-white absolute top-4 left-1/2 transform -translate-x-1/2 animate-spin" />
          </div>
          <p className="text-gray-400 mt-4">Loading database records...</p>
          <p className="text-xs text-gray-600 mt-2">Fetching all gyms, users, members, and transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-md">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <span>DB Admin</span>
                </div>
              </div>

              {/* Desktop Navigation - Scrollable */}
              <div className="hidden md:flex ml-6 space-x-1 overflow-x-auto max-w-3xl pb-1">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { 
                      setSelectedTab(item.id); 
                      setSearchTerm(''); 
                      setFilterStatus('all');
                      setFilterRole('all');
                    }}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      selectedTab === item.id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                    {item.count !== null && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                        selectedTab === item.id ? 'bg-purple-500' : 'bg-gray-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-lg hover:bg-gray-700 relative">
                <Bell className="h-5 w-5 text-gray-300" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 transition-all"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {user?.full_name?.charAt(0) || 'A'}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-xl shadow-xl py-2 border border-gray-700">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
                      <span className="inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-900 text-purple-300">
                        <Shield className="h-3 w-3 mr-1" /> Super Admin
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 w-full"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-700"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Search and Refresh */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search in ${selectedTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {(selectedTab === 'gyms' || selectedTab === 'users') && (
              <select
                value={selectedTab === 'gyms' ? filterStatus : filterRole}
                onChange={(e) => {
                  if (selectedTab === 'gyms') setFilterStatus(e.target.value);
                  else setFilterRole(e.target.value);
                }}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                {selectedTab === 'gyms' ? (
                  <>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </>
                ) : (
                  <>
                    <option value="all">All Roles</option>
                    <option value="gym_owner">Gym Owners</option>
                    <option value="gym_staff">Gym Staff</option>
                    <option value="member">Members</option>
                  </>
                )}
              </select>
            )}
            <button
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh DB</span>
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Database Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-2xl p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-900/50 p-3 rounded-xl">
                    <Database className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Total Records</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {gyms.length + users.length + members.length + staff.length + plans.length + memberships.length + payments.length}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-gray-700/50 p-2 rounded">
                    <p className="text-gray-400">Gyms</p>
                    <p className="text-white font-bold">{gyms.length}</p>
                  </div>
                  <div className="bg-gray-700/50 p-2 rounded">
                    <p className="text-gray-400">Users</p>
                    <p className="text-white font-bold">{users.length}</p>
                  </div>
                  <div className="bg-gray-700/50 p-2 rounded">
                    <p className="text-gray-400">Members</p>
                    <p className="text-white font-bold">{members.length}</p>
                  </div>
                  <div className="bg-gray-700/50 p-2 rounded">
                    <p className="text-gray-400">Staff</p>
                    <p className="text-white font-bold">{staff.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-900/50 p-3 rounded-xl">
                    <Award className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Membership Plans</p>
                <p className="text-3xl font-bold text-white mt-1">{plans.length}</p>
                <p className="text-xs text-gray-400 mt-3">Active: {plans.filter(p => p.is_active).length}</p>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-900/50 p-3 rounded-xl">
                    <CreditCard className="h-6 w-6 text-green-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Memberships</p>
                <p className="text-3xl font-bold text-white mt-1">{memberships.length}</p>
                <p className="text-xs text-gray-400 mt-3">Active: {memberships.filter(m => m.status === 'active').length}</p>
              </div>

              <div className="bg-gray-800 rounded-2xl p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-yellow-900/50 p-3 rounded-xl">
                    <DollarSign className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">Payments</p>
                <p className="text-3xl font-bold text-white mt-1">{payments.length}</p>
                <p className="text-xs text-gray-400 mt-3">Total: {formatCurrency(stats.total_revenue)}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Platform Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gym Owners</span>
                    <span className="text-white font-bold">{stats.gym_owners}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Verified Owners</span>
                    <span className="text-green-400 font-bold">{stats.verified_owners}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gym Staff</span>
                    <span className="text-white font-bold">{stats.gym_staff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Members</span>
                    <span className="text-green-400 font-bold">{stats.total_active_members}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {payments.slice(0, 3).map(p => (
                    <div key={p.id} className="text-xs text-gray-400">
                      💰 Payment of {formatCurrency(p.amount)} received
                    </div>
                  ))}
                  {members.slice(0, 2).map(m => (
                    <div key={m.id} className="text-xs text-gray-400">
                      👤 New member: {m.full_name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">System Health</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-green-400" />
                    <span className="text-gray-400 text-sm">Database: Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-green-400" />
                    <span className="text-gray-400 text-sm">Storage: Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-green-400" />
                    <span className="text-gray-400 text-sm">API: Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Tables Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Gyms */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-semibold">Recent Gyms</h3>
                  <button onClick={() => setSelectedTab('gyms')} className="text-purple-400 text-sm hover:text-purple-300">
                    View All ({gyms.length})
                  </button>
                </div>
                <div className="space-y-2">
                  {gyms.slice(0, 5).map(gym => (
                    <div key={gym.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{gym.name}</p>
                        <p className="text-xs text-gray-400">Owner: {gym.owner_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(gym.subscription_status)}`}>
                        {gym.subscription_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-semibold">Recent Users</h3>
                  <button onClick={() => setSelectedTab('users')} className="text-purple-400 text-sm hover:text-purple-300">
                    View All ({users.length})
                  </button>
                </div>
                <div className="space-y-2">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-white text-sm">{u.full_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(u.role)}`}>
                        {u.role?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gyms Tab */}
        {selectedTab === 'gyms' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Members</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredGyms.map(gym => (
                    <tr key={gym.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{gym.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            {gym.name?.charAt(0)}
                          </div>
                          <span className="text-white text-sm">{gym.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{gym.owner_name}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-400">{gym.email}</div>
                        <div className="text-xs text-gray-500">{gym.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{gym.address}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{gym.total_members}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{gym.total_staff}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-900 text-purple-300 capitalize">
                          {gym.subscription_plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(gym.subscription_status)}`}>
                          {gym.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(gym.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('gym', gym)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('gyms', gym.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {selectedTab === 'users' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Verified</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                            {u.full_name?.charAt(0)}
                          </div>
                          <span className="text-white text-sm">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">@{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(u.role)}`}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.gym_name || '—'}</td>
                      <td className="px-4 py-3">
                        {u.is_verified ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('user', u)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('users', u.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {selectedTab === 'members' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{m.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                            {m.full_name?.charAt(0)}
                          </div>
                          <span className="text-white text-sm">{m.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{m.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{m.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 capitalize">{m.gender || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {gyms.find(g => g.id === m.gym_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(m.joined_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          m.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('member', m)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('members', m.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {selectedTab === 'staff' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Hire Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredStaff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{s.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                            {s.user?.full_name?.charAt(0)}
                          </div>
                          <span className="text-white text-sm">{s.user?.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.position}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{s.user?.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{s.user?.phone || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {gyms.find(g => g.id === s.gym_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.hire_date)}</td>
                      <td className="px-4 py-3 text-sm text-green-400">{s.salary ? formatCurrency(s.salary) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          s.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('staff', s)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('staff', s.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {selectedTab === 'plans' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Discounted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredPlans.map(p => (
                    <tr key={p.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{p.id}</td>
                      <td className="px-4 py-3 text-sm text-white">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 capitalize">{p.plan_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{p.duration_days} days</td>
                      <td className="px-4 py-3 text-sm text-green-400">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 text-sm text-orange-400">
                        {p.discounted_price ? formatCurrency(p.discounted_price) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {gyms.find(g => g.id === p.gym_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          p.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('plan', p)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('plans', p.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Memberships Tab */}
        {selectedTab === 'memberships' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredMemberships.map(m => (
                    <tr key={m.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{m.id}</td>
                      <td className="px-4 py-3 text-sm text-white">{m.member?.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{m.plan?.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(m.start_date)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(m.end_date)}</td>
                      <td className="px-4 py-3 text-sm text-green-400">{formatCurrency(m.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(m.status)}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(m.payment_status)}`}>
                          {m.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {gyms.find(g => g.id === m.gym_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('membership', m)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('memberships', m.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {selectedTab === 'payments' && (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Transaction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gym</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">#{p.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">{p.transaction_id}</td>
                      <td className="px-4 py-3 text-sm text-white">{p.member?.full_name}</td>
                      <td className="px-4 py-3 text-sm text-green-400">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 capitalize">{p.payment_method}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(p.payment_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {gyms.find(g => g.id === p.gym_id)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit('payment', p)}
                            className="p-1 text-blue-400 hover:bg-blue-900/30 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('payments', p.id)}
                            className="p-1 text-red-400 hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Database Tab - Complete Overview */}
        {selectedTab === 'database' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Complete Database Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-400" />
                  Gyms ({gyms.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {gyms.map(g => (
                    <div key={g.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div className="flex justify-between">
                        <span>{g.name}</span>
                        <span className="text-xs text-purple-400">ID: {g.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  Users ({users.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map(u => (
                    <div key={u.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div>{u.full_name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  Members ({members.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {members.map(m => (
                    <div key={m.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div>{m.full_name}</div>
                      <div className="text-xs text-gray-500">{m.phone}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-400" />
                  Staff ({staff.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {staff.map(s => (
                    <div key={s.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div>{s.user?.full_name}</div>
                      <div className="text-xs text-gray-500">{s.position}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-400" />
                  Plans ({plans.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {plans.map(p => (
                    <div key={p.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div>{p.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-pink-400" />
                  Memberships ({memberships.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {memberships.map(m => (
                    <div key={m.id} className="text-sm text-gray-300 p-2 bg-gray-700/50 rounded">
                      <div>{m.member?.full_name} - {m.plan?.name}</div>
                      <div className="text-xs text-gray-500">Status: {m.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Confirm Delete</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - You can expand this based on the type */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Edit {selectedItem.type}
            </h3>
            <p className="text-gray-400 mb-4">
              Edit functionality for {selectedItem.type} ID: {selectedItem.id}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(selectedItem.type, selectedItem.id, {})}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;