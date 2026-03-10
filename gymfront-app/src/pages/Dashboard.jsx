import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  User, 
  Bell, 
  Settings, 
  Activity, 
  Users,
  DollarSign,
  TrendingUp,
  Dumbbell,
  CreditCard,
  Award,
  BarChart3,
  Clock as ClockIcon,
  AlertCircle,
  Menu,
  X,
  Home,
  UserPlus,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  CreditCard as CreditCardIcon,
  BarChart,
  ChevronDown,
  Loader,
  TrendingDown,
  UserCheck,
  UserMinus,
  Calendar,
  IndianRupee,
  RefreshCw,
  Gift,
  Star,
  Flame,
  Zap,
  Target,
  TrendingUp as TrendUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

// Import your page components
import Members from './Members';
import Staff from './Staff';
import Profile from './Profile';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Initialize with default values
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    newMembersThisMonth: 0,
    monthlyRevenue: 0,
    todayCheckins: 0,
    pendingPayments: 0,
    expiringThisMonth: 0,
    expiringSoon: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    averageAttendance: 0,
    peakHour: "N/A",
    popularClass: "N/A",
    memberRetention: 0,
    trainerCount: 0,
    membersByGender: {
      male: 0,
      female: 0,
      other: 0
    },
    recentMembers: [],
    recentPayments: [],
    membershipDistribution: {},
    expiringMembers: []
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Function to fetch all dashboard data
  const fetchDashboardData = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);
    setLoading(true);
    
    try {
      // Fetch dashboard stats, members, payments, and memberships in parallel
      const [statsResponse, membersResponse, paymentsResponse, membershipsResponse] = await Promise.all([
        api.get('/gym/dashboard/stats').catch(err => {
          console.error('Error fetching stats:', err);
          return { data: null };
        }),
        api.get('/gym/members?limit=1000').catch(err => {
          console.error('Error fetching members:', err);
          return { data: [] };
        }),
        api.get('/gym/payments?limit=100').catch(err => {
          console.error('Error fetching payments:', err);
          return { data: [] };
        }),
        api.get('/gym/memberships?limit=1000').catch(err => {
          console.error('Error fetching memberships:', err);
          return { data: [] };
        })
      ]);

      const members = membersResponse.data || [];
      const payments = paymentsResponse.data || [];
      const memberships = membershipsResponse.data || [];
      
      // Calculate real stats from actual data
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      // Member calculations
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.is_active).length;
      const inactiveMembers = totalMembers - activeMembers;
      
      // New members this month
      const newMembersThisMonth = members.filter(m => 
        m.joined_date && m.joined_date >= firstDayOfMonth
      ).length;
      
      // Members by gender
      const membersByGender = members.reduce((acc, m) => {
        const gender = m.gender || 'other';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, { male: 0, female: 0, other: 0 });

      // Recent members (last 5)
      const recentMembers = members
        .sort((a, b) => new Date(b.created_at || b.joined_date) - new Date(a.created_at || a.joined_date))
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          name: m.full_name,
          joinedDate: new Date(m.joined_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0D9488&color=fff`
        }));

      // Payment calculations
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Monthly revenue (current month)
      const monthlyRevenue = payments
        .filter(p => p.payment_date && p.payment_date.split('T')[0] >= firstDayOfMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // Previous month revenue for growth calculation
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
      
      const lastMonthRevenue = payments
        .filter(p => {
          const date = p.payment_date?.split('T')[0];
          return date && date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : monthlyRevenue > 0 ? 100 : 0;

      // Pending payments (memberships with pending status)
      const pendingPayments = memberships.filter(m => 
        m.payment_status === 'pending' || m.payment_status === 'PENDING'
      ).length;

      // Expiring memberships (within next 30 days)
      const today_date = new Date();
      const thirtyDaysLater = new Date(today_date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const expiringThisMonth = memberships.filter(m => 
        m.status === 'active' && 
        m.end_date && 
        m.end_date <= thirtyDaysLater &&
        m.end_date >= today
      ).length;

      const expiringSoon = memberships.filter(m => 
        m.status === 'active' && 
        m.end_date && 
        m.end_date <= new Date(today_date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
        m.end_date >= today
      ).length;

      // FIX: Get expiring members details with proper member data
      const expiringMembers = memberships
        .filter(m => 
          m.status === 'active' && 
          m.end_date && 
          m.end_date <= new Date(today_date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
          m.end_date >= today
        )
        .map(m => {
          // Find the member by ID from the members array
          const member = members.find(mem => mem.id === m.member_id);
          
          // If member is not found in the members array, try to get it from the membership object
          const memberData = member || m.member;
          
          const daysLeft = Math.ceil((new Date(m.end_date) - today_date) / (1000 * 60 * 60 * 24));
          
          return {
            id: m.id,
            memberId: m.member_id,
            memberName: memberData?.full_name || m.member?.full_name || 'Unknown Member',
            endDate: new Date(m.end_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }),
            daysLeft,
            planName: m.plan?.name || 'Unknown Plan',
            avatar: memberData?.full_name 
              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(memberData.full_name)}&background=0D9488&color=fff`
              : `https://ui-avatars.com/api/?name=Unknown&background=0D9488&color=fff`
          };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);

      // Today's check-ins (from attendance - if available)
      const todayCheckins = statsResponse.data?.today_checkins || 0;

      // Recent payments for display
      const recentPayments = payments
        .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
        .slice(0, 5)
        .map(p => {
          const member = members.find(m => m.id === p.member_id);
          return {
            id: p.id,
            memberName: member?.full_name || 'Unknown',
            amount: p.amount,
            date: new Date(p.payment_date).toLocaleDateString('en-IN'),
            method: p.payment_method
          };
        });

      // Create recent activities from payments and new members
      const activities = [
        ...payments.slice(0, 3).map(p => {
          const member = members.find(m => m.id === p.member_id);
          return {
            id: `payment-${p.id}`,
            member: member?.full_name || 'Unknown',
            action: 'Made a payment',
            time: new Date(p.payment_date).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }),
            type: 'payment',
            avatar: member?.full_name?.charAt(0) || 'U'
          };
        }),
        ...members.slice(0, 3).map(m => ({
          id: `member-${m.id}`,
          member: m.full_name,
          action: 'Joined the gym',
          time: new Date(m.joined_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          type: 'signup',
          avatar: m.full_name.charAt(0)
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

      // Membership distribution
      const membershipDistribution = memberships.reduce((acc, m) => {
        const planName = m.plan?.name || 'No Plan';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalMembers,
        activeMembers,
        inactiveMembers,
        newMembersThisMonth,
        monthlyRevenue,
        todayCheckins,
        pendingPayments,
        expiringThisMonth,
        expiringSoon,
        totalRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        averageAttendance: statsResponse.data?.average_attendance || Math.round(todayCheckins / 2) || 0,
        peakHour: statsResponse.data?.peak_hour || "5:00 PM - 7:00 PM",
        popularClass: statsResponse.data?.popular_class || "HIIT Training",
        memberRetention: statsResponse.data?.member_retention || 87,
        trainerCount: statsResponse.data?.trainer_count || 0,
        membersByGender,
        recentMembers,
        recentPayments,
        membershipDistribution,
        expiringMembers
      });

      setRecentActivities(activities.length > 0 ? activities : [
        { id: 1, member: 'No activities yet', action: '', time: '', type: 'info', avatar: 'N' }
      ]);

      setUpcomingClasses(statsResponse.data?.upcoming_classes || []);
      
      if (showRefreshToast) {
        toast.success('Dashboard updated!');
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for member added events
  useEffect(() => {
    const handleMemberAdded = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('memberAdded', handleMemberAdded);
    window.addEventListener('paymentAdded', handleMemberAdded);
    
    return () => {
      window.removeEventListener('memberAdded', handleMemberAdded);
      window.removeEventListener('paymentAdded', handleMemberAdded);
    };
  }, [fetchDashboardData]);

  const navigation = [
    { name: 'Dashboard', icon: Home, id: 'dashboard' },
    { name: 'Members', icon: UsersIcon, id: 'members' },
    { name: 'Staff', icon: UserPlus, id: 'staff' },
    { name: 'Classes', icon: CalendarIcon, id: 'classes' },
    { name: 'Payments', icon: CreditCardIcon, id: 'payments' },
    { name: 'Reports', icon: BarChart, id: 'reports' },
  ];

  const getActivityColor = (type) => {
    const colors = {
      checkin: 'bg-green-100 text-green-600',
      renewal: 'bg-blue-100 text-blue-600',
      booking: 'bg-purple-100 text-purple-600',
      payment: 'bg-emerald-100 text-emerald-600',
      signup: 'bg-indigo-100 text-indigo-600',
      info: 'bg-gray-100 text-gray-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  // Format currency in Rupees
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₹', '₹ ');
  };

  // Show loading spinner
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse mx-auto mb-4 flex items-center justify-center">
              <Dumbbell className="h-12 w-12 text-white" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader className="h-8 w-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading your fitness empire...</p>
        </div>
      </div>
    );
  }

  // Render dashboard content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header with Refresh Button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Welcome back, {user?.full_name || 'Admin'}! 👋
              <span className="bg-yellow-400 text-yellow-900 text-xs px-3 py-1 rounded-full font-semibold ml-2">
                {user?.role === 'gym_owner' ? 'GYM OWNER' : user?.role?.toUpperCase()}
              </span>
            </h1>
            <p className="text-blue-100 mt-2 text-lg">Here's what's happening at your gym today.</p>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-lg rounded-xl hover:bg-white/30 transition-all disabled:opacity-50 border border-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">Refresh Data</span>
          </button>
        </div>
        
        {/* Quick Stats Pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            {stats.todayCheckins} check-ins today
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <TrendUp className="h-4 w-4" />
            {stats.monthlyRevenue > 0 ? formatCurrency(stats.monthlyRevenue) : 'No revenue yet'} this month
          </div>
        </div>
      </div>

      {/* Key Stats Cards - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
              {stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}% active
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Members</h3>
          <p className="text-4xl font-bold text-gray-900 mt-1">{stats.totalMembers?.toLocaleString() || 0}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-green-600 flex items-center text-sm font-medium">
              <UserCheck className="h-4 w-4 mr-1" />
              {stats.activeMembers || 0} active
            </span>
            <span className="text-gray-500 flex items-center text-sm">
              <UserMinus className="h-4 w-4 mr-1" />
              {stats.inactiveMembers || 0} inactive
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <UserPlus className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
              +{stats.newMembersThisMonth || 0} new
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">New Members</h3>
          <p className="text-4xl font-bold text-gray-900 mt-1">{stats.newMembersThisMonth || 0}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-600 flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-1" />
              This month
            </span>
            <span className="text-blue-600 font-medium text-sm flex items-center">
              <Flame className="h-4 w-4 mr-1" />
              {stats.expiringThisMonth || 0} expiring
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <IndianRupee className="h-6 w-6 text-purple-600" />
            </div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              stats.revenueGrowth >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {stats.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth || 0)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Monthly Revenue</h3>
          <p className="text-4xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthlyRevenue || 0)}</p>
          <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 flex items-center">
            {stats.revenueGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
            )}
            vs last month
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-xl">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
              {stats.pendingPayments || 0} pending
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Revenue</h3>
          <p className="text-4xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue || 0)}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-600 flex items-center text-sm">
              <Activity className="h-4 w-4 mr-1" />
              {stats.todayCheckins || 0} check-ins
            </span>
            <span className="text-orange-600 font-medium text-sm flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              {stats.expiringSoon || 0} expiring
            </span>
          </div>
        </div>
      </div>

      {/* Member Demographics and Expiry Notifications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Demographics Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-1 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              Member Demographics
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {stats.totalMembers} total
            </span>
          </div>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Male</span>
                <span className="font-semibold text-blue-600">{stats.membersByGender?.male || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-3 transition-all duration-500" 
                  style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.male || 0) / stats.totalMembers) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Female</span>
                <span className="font-semibold text-pink-600">{stats.membersByGender?.female || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-full h-3 transition-all duration-500" 
                  style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.female || 0) / stats.totalMembers) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Other</span>
                <span className="font-semibold text-purple-600">{stats.membersByGender?.other || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full h-3 transition-all duration-500" 
                  style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.other || 0) / stats.totalMembers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Top Membership Plans
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.membershipDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">{plan}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-semibold">
                      {count} members
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(stats.membershipDistribution).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-2">No plans assigned yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Expiry Notifications Card - Fixed */}
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-orange-400 to-red-400 p-2 rounded-lg">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Memberships Expiring Soon</h3>
            </div>
            {stats.expiringMembers.length > 0 && (
              <span className="bg-red-100 text-red-600 text-sm font-bold px-4 py-2 rounded-full animate-pulse">
                {stats.expiringMembers.length} {stats.expiringMembers.length === 1 ? 'member' : 'members'} need attention
              </span>
            )}
          </div>
          
          {stats.expiringMembers.length > 0 ? (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.expiringMembers.map((member) => (
                <div 
                  key={member.id} 
                  className={`group relative flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md ${
                    member.daysLeft <= 3 
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500' 
                      : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <img 
                      src={member.avatar} 
                      alt={member.memberName} 
                      className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{member.memberName}</p>
                        {member.daysLeft <= 3 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{member.planName}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-white/80 px-2 py-1 rounded-full text-gray-700 shadow-sm">
                          📅 Expires: {member.endDate}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          member.daysLeft <= 3 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          ⏳ {member.daysLeft} {member.daysLeft === 1 ? 'day' : 'days'} left
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('members');
                      // You can add logic to open renewal modal
                      toast.success(`Ready to renew ${member.memberName}'s membership`);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                  >
                    Renew Now →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mb-6 shadow-lg">
                <Gift className="h-10 w-10 text-white" />
              </div>
              <p className="text-gray-900 font-bold text-xl mb-2">All Memberships Active! 🎉</p>
              <p className="text-gray-500">No memberships expiring in the next 7 days.</p>
              <p className="text-sm text-gray-400 mt-2">You're doing great! Keep up the good work.</p>
            </div>
          )}
          
          {stats.expiringMembers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button 
                onClick={() => setActiveTab('members')}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 w-full py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                View all expiring members
                <ChevronDown className="h-4 w-4 ml-1 rotate-270" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Members and Recent Payments Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              Recent Members
            </h3>
            <button 
              onClick={() => setActiveTab('members')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              View All
              <ChevronDown className="h-4 w-4 rotate-270" />
            </button>
          </div>
          
          <div className="space-y-3">
            {stats.recentMembers?.length > 0 ? (
              stats.recentMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all group">
                  <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      Joined {member.joinedDate}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    View Profile
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No members yet</p>
                <button 
                  onClick={() => {
                    setActiveTab('members');
                    window.dispatchEvent(new CustomEvent('openAddMemberModal'));
                  }}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Add your first member →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              Recent Payments
            </h3>
            <button 
              onClick={() => setActiveTab('payments')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              View All
              <ChevronDown className="h-4 w-4 rotate-270" />
            </button>
          </div>
          
          <div className="space-y-3">
            {stats.recentPayments?.length > 0 ? (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      {payment.memberName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{payment.memberName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {payment.date}
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="capitalize">{payment.method}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Transaction #{payment.id}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No payments yet</p>
                <button 
                  onClick={() => setActiveTab('payments')}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Record first payment →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities and Classes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-all">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${getActivityColor(activity.type)}`}>
                    {activity.avatar || activity.member?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{activity.member}</p>
                    <p className="text-sm text-gray-500">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {activity.time}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No recent activities</p>
            )}
          </div>
        </div>

        {/* Today's Classes Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-orange-100 p-2 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
              </div>
              Today's Classes
            </h3>
            <button 
              onClick={() => setActiveTab('classes')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Schedule
            </button>
          </div>
          
          <div className="space-y-4">
            {upcomingClasses.length > 0 ? (
              upcomingClasses.map((classItem) => (
                <div key={classItem.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-blue-500" />
                      {classItem.name}
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
                      {classItem.attendees || 0}/{classItem.capacity || 20} booked
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {classItem.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {classItem.trainer || 'TBA'}
                      </span>
                    </div>
                    <button className="text-xs bg-white px-3 py-1 rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                      Join
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No classes scheduled today</p>
                <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Schedule a class →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section - Only shown when there are alerts */}
      {(stats.expiringThisMonth > 0 || stats.pendingPayments > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.expiringThisMonth > 0 && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">Memberships Expiring Soon</h4>
                  <p className="text-white/90 mb-3">{stats.expiringThisMonth} memberships will expire this month</p>
                  <button 
                    onClick={() => setActiveTab('members')}
                    className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    View Expiring Members →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {stats.pendingPayments > 0 && (
            <div className="bg-gradient-to-r from-red-400 to-pink-500 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <CreditCardIcon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">Pending Payments</h4>
                  <p className="text-white/90 mb-3">{stats.pendingPayments} payments are pending</p>
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    View Pending Payments →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    <span>GymManager Pro</span>
                  </div>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex ml-10 space-x-2">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 rounded-xl hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-all"
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=0D9488&color=fff&size=32`}
                    alt="Profile"
                    className="h-8 w-8 rounded-full ring-2 ring-blue-200"
                  />
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 backdrop-blur-lg">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'members' && <Members />}
        {activeTab === 'staff' && <Staff />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'classes' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CalendarIcon className="h-16 w-16 text-blue-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Classes Management</h2>
            <p className="text-gray-500 mt-2">This feature is coming soon! 🚀</p>
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CreditCardIcon className="h-16 w-16 text-purple-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Payments Management</h2>
            <p className="text-gray-500 mt-2">This feature is coming soon! 🚀</p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BarChart className="h-16 w-16 text-orange-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <p className="text-gray-500 mt-2">This feature is coming soon! 🚀</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-gray-500 mt-2">This feature is coming soon! 🚀</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;