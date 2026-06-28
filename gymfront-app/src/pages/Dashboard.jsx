// src/pages/Dashboard.jsx - Updated with Search Bar and Follow-Up Card
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Target,
  ChevronDown,
  Loader,
  TrendingDown,
  UserCheck,
  UserMinus,
  Calendar,
  IndianRupee,
  Gift,
  Star,
  Flame,
  Zap,
  TrendingUp as TrendUp,
  MessageCircle,
  Mail,
  CheckCircle,
  Briefcase,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Phone,
  Mail as MailIcon,
  Clock,
  AlertTriangle,
  Eye,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE_URL, fetchMemberStatsOptimized } from '../services/api';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';

// Import your page components
import Members from './Members';
import Staff from './Staff';
import Profile from './Profile';
import Leads from './Leads';
import Expenses from './Expenses';
import Balance from './Balance';
import Payments from './Payments';
import DeviceManager from '../components/attendance/DeviceManager';
import LiveMonitoring from '../components/attendance/LiveMonitoring';
import AttendanceHistory from '../components/attendance/AttendanceHistory';
import StaffHours from '../components/attendance/StaffHours';
import MembershipPlans from './MembershipPlans';

// Import Search Bar and Follow-Up Card
import SearchBar from '../components/SearchBar';
import FollowUpCard from '../components/FollowUpCard';

// Auto-refresh interval in milliseconds
const AUTO_REFRESH_INTERVAL = 40000;

// Currency list
const CURRENCIES = [
  { symbol: '₹', label: 'Indian Rupee (INR)', flag: '🇮🇳' },
  { symbol: '$', label: 'US Dollar (USD)', flag: '🇺🇸' },
  { symbol: '€', label: 'Euro (EUR)', flag: '🇪🇺' },
  { symbol: '£', label: 'British Pound (GBP)', flag: '🇬🇧' },
  { symbol: '¥', label: 'Japanese Yen (JPY)', flag: '🇯🇵' },
  { symbol: '₩', label: 'South Korean Won (KRW)', flag: '🇰🇷' },
  { symbol: 'A$', label: 'Australian Dollar (AUD)', flag: '🇦🇺' },
  { symbol: 'C$', label: 'Canadian Dollar (CAD)', flag: '🇨🇦' },
  { symbol: 'CHF', label: 'Swiss Franc (CHF)', flag: '🇨🇭' },
  { symbol: 'AED', label: 'UAE Dirham (AED)', flag: '🇦🇪' },
  { symbol: 'SGD', label: 'Singapore Dollar (SGD)', flag: '🇸🇬' },
  { symbol: 'R', label: 'South African Rand (ZAR)', flag: '🇿🇦' },
];

const CurrencyPickerModal = ({ onSelect }) => {
  const [selected, setSelected] = React.useState('₹');
  const [saving, setSaving] = React.useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await onSelect(selected);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl mb-4 shadow-lg">
            💰
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Currency</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Select the currency to display across your dashboard.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
          {CURRENCIES.map((c) => (
            <button
              key={c.symbol}
              onClick={() => setSelected(c.symbol)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                selected === c.symbol
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-xl">{c.flag}</span>
              <div>
                <div className="font-bold text-base leading-none">{c.symbol}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{c.label.split(' (')[0]}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60"
        >
          {saving ? (
            <><Loader className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle className="h-5 w-5" /> Confirm — Use {selected}</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          This will be remembered for all future logins.
        </p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, updateCurrencySymbol } = useAuth();
  const { permissions, hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [followupsCount, setFollowupsCount] = useState(0);
  
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

  // Check if user has specific permissions
  const canViewDashboard = hasPermission('view_dashboard');
  const canViewMembers = hasPermission('view_members');
  const canViewPayments = hasPermission('view_payments');
  const canViewMemberships = hasPermission('view_memberships');
  const canViewBalances = hasPermission('view_balances');
  const canViewStaff = hasPermission('view_staff');
  const canViewExpenses = hasPermission('view_expenses');
  const canViewAttendance = hasPermission('view_attendance');
  const canViewDevices = hasPermission('view_devices');
  const canViewLeads = hasPermission('view_leads');
  
  // Admin check (gym owners and super admins have all permissions)
  const isAdmin = userRole === 'gym_owner' || userRole === 'super_admin';

  // Determine what the user can see
  const canSeeDashboard = isAdmin || canViewDashboard;
  const canSeeMembers = isAdmin || canViewMembers;
  const canSeePayments = isAdmin || canViewPayments;
  const canSeeMemberships = isAdmin || canViewMemberships;
  const canSeeBalances = isAdmin || canViewBalances;
  const canSeeStaff = isAdmin || canViewStaff;
  const canSeeExpenses = isAdmin || canViewExpenses;
  const canSeeAttendance = isAdmin || canViewAttendance;
  const canSeeDevices = isAdmin || canViewDevices;
  const canSeeLeads = isAdmin || canViewLeads;

  useEffect(() => {
    // Get user role from localStorage
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    }
  }, []);

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
    totalExpenses: 0,
    monthlyExpenses: 0,
    expenseGrowth: 0,
    netProfit: 0,
    profitMargin: 0,
    expenseByCategory: {},
    totalBalanceDue: 0,
    membersWithBalance: 0,
    overdueCount: 0,
    upcomingPayments: 0,
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
    expiringMembers: [],
    upcomingBirthdays: {
      members: [],
      staff: []
    }
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [membersWithBalanceList, setMembersWithBalanceList] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showUserMenu && 
        userMenuRef.current && 
        userButtonRef.current &&
        !userMenuRef.current.contains(event.target) && 
        !userButtonRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Fetch follow-ups count for dashboard header
  const fetchFollowupsCount = useCallback(async () => {
    if (!canSeeLeads) return;
    
    try {
      const response = await api.get('/gym/followups/today');
      if (response.data) {
        setFollowupsCount(response.data.count || 0);
      }
    } catch (error) {
      // Silently fail - don't show toast for 403
      if (error.response?.status !== 403) {
        console.error('Error fetching followups count:', error);
      }
    }
  }, [canSeeLeads]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToDashboard = () => {
    setActiveTab('dashboard');
    setSelectedLeadId(null);
    setSelectedMemberId(null);
    setSelectedStaffId(null);
  };

  // Handle search result selection
  const handleSearchSelect = (result) => {
    switch (result.type) {
      case 'member':
        setActiveTab('members');
        setSelectedMemberId(result.id);
        break;
      case 'lead':
        setActiveTab('leads');
        setSelectedLeadId(result.id);
        break;
      case 'staff':
        setActiveTab('staff');
        setSelectedStaffId(result.id);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (user && !user.currency_symbol && !loading) {
      setShowCurrencyModal(true);
    }
  }, [user, loading]);

  // Silent fetch function - doesn't show errors on 403
  const fetchSilently = async (url, options = {}) => {
    try {
      const response = await api.get(url, options);
      return { data: response.data, success: true };
    } catch (error) {
      // Silently handle 403 errors - user just doesn't have permission
      if (error.response?.status === 403) {
        return { data: null, success: false, forbidden: true };
      }
      // For other errors, return null but don't show toast
      return { data: null, success: false };
    }
  };

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      // ===== FIX: Use optimized stats endpoint for accurate counts =====
      let statsData = { data: null };
      let membersData = { data: [] };
      let paymentsData = { data: [] };
      let membershipsData = { data: [] };
      let staffData = { data: [] };
      let balanceData = { data: {} };
      let balanceMembersData = { data: [] };
      let leadsData = { data: [] };
  
      // Fetch optimized stats first (this gives accurate totals without loading all members)
      if (canSeeDashboard) {
        try {
          const statsResult = await fetchMemberStatsOptimized();
          if (statsResult) {
            statsData = { data: {
              total_members: statsResult.total_members || 0,
              active_members: statsResult.active_members || 0,
              new_members_this_month: statsResult.new_this_month || 0,
              today_checkins: 0,
              total_revenue: 0,
              monthly_revenue: 0,
              revenue_growth: 0,
              total_expenses: 0,
              monthly_expenses: 0,
              expense_growth: 0,
              net_profit: 0,
              profit_margin: 0,
              expense_by_category: {},
              average_attendance: 0,
              peak_hour: "5:00 PM - 7:00 PM",
              popular_class: "HIIT Training",
              member_retention: 87,
              trainer_count: 0,
              upcoming_classes: []
            } };
          }
        } catch (err) {
          console.warn('Could not fetch optimized stats:', err);
        }
      }
  
      // Only fetch detailed data if we have permissions
      const promises = [];
      const endpointMap = {};
  
      // Members - only if user can view members (limit to 100 for dashboard)
      if (canSeeMembers) {
        promises.push(fetchSilently('/gym/members?limit=100&sort=-created_at'));
        endpointMap.members = promises.length - 1;
      }
  
      // Payments - only if user can view payments
      if (canSeePayments) {
        promises.push(fetchSilently('/gym/payments?limit=100'));
        endpointMap.payments = promises.length - 1;
      }
  
      // Memberships - only if user can view memberships
      if (canSeeMemberships) {
        promises.push(fetchSilently('/gym/memberships?limit=1000'));
        endpointMap.memberships = promises.length - 1;
      }
  
      // Staff - only if user can view staff
      if (canSeeStaff) {
        promises.push(fetchSilently('/gym/staff'));
        endpointMap.staff = promises.length - 1;
      }
  
      // Balance overview - only if user can view balances
      if (canSeeBalances) {
        promises.push(fetchSilently('/gym/balance/overview'));
        endpointMap.balance = promises.length - 1;
      }
  
      // Members with balance - only if user can view balances
      if (canSeeBalances) {
        promises.push(fetchSilently('/gym/members/balances?has_balance=true&limit=10'));
        endpointMap.balanceMembers = promises.length - 1;
      }
  
      // Leads - only if user can view leads
      if (canSeeLeads) {
        promises.push(fetchSilently('/gym/leads?limit=10'));
        endpointMap.leads = promises.length - 1;
      }
  
      const results = await Promise.all(promises);
  
      // Extract data from results
      if (endpointMap.members !== undefined) membersData = results[endpointMap.members];
      if (endpointMap.payments !== undefined) paymentsData = results[endpointMap.payments];
      if (endpointMap.memberships !== undefined) membershipsData = results[endpointMap.memberships];
      if (endpointMap.staff !== undefined) staffData = results[endpointMap.staff];
      if (endpointMap.balance !== undefined) balanceData = results[endpointMap.balance];
      if (endpointMap.balanceMembers !== undefined) balanceMembersData = results[endpointMap.balanceMembers];
      if (endpointMap.leads !== undefined) leadsData = results[endpointMap.leads];
  
      // ===== USE OPTIMIZED STATS FOR COUNTS =====
      const statsApiData = statsData.data || {};
      
      // Get accurate counts from optimized stats
      const totalMembers = statsApiData.total_members || 0;
      const activeMembers = statsApiData.active_members || 0;
      const inactiveMembers = totalMembers - activeMembers;
      const newMembersThisMonth = statsApiData.new_members_this_month || 0;
  
      const members = membersData.data || [];
      const payments = paymentsData.data || [];
      const memberships = membershipsData.data || [];
      const staff = staffData.data || [];
      const balanceOverview = balanceData.data || {};
      const membersWithBalance = balanceMembersData.data || [];
      const leads = leadsData.data || [];
      
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      // ===== FIX: Calculate from ALL memberships, not just fetched members =====
      const membersByGender = members.reduce((acc, m) => {
        const gender = m.gender || 'other';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, { male: 0, female: 0, other: 0 });
  
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
          avatar: m.profile_image 
            ? (m.profile_image.startsWith('http') ? m.profile_image : `${API_BASE_URL}${m.profile_image}`)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0D9488&color=fff`
        }));
  
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const monthlyRevenue = payments
        .filter(p => p.payment_date && p.payment_date.split('T')[0] >= firstDayOfMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
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
  
      // ===== FIX: Calculate from ALL memberships =====
      const pendingPayments = memberships.filter(m => 
        m.payment_status === 'pending' || m.payment_status === 'PENDING'
      ).length;
  
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
  
      const expiringMembers = memberships
        .filter(m => 
          m.status === 'active' && 
          m.end_date && 
          m.end_date <= new Date(today_date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
          m.end_date >= today
        )
        .map(m => {
          const member = members.find(mem => mem.id === m.member_id);
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
  
      const todayCheckins = statsApiData.today_checkins || 0;
  
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
  
      // Process members with balance
      const processedMembersWithBalance = membersWithBalance.map(m => ({
        id: m.member_id,
        memberId: m.member_id,
        name: m.member_name,
        phone: m.member_phone,
        email: m.member_email,
        balanceDue: m.balance_due,
        planName: m.plan_name,
        daysOverdue: m.next_payment_date && new Date(m.next_payment_date) < new Date() 
          ? Math.ceil((new Date() - new Date(m.next_payment_date)) / (1000 * 60 * 60 * 24))
          : 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(m.member_name)}&background=EF4444&color=fff`
      })).slice(0, 5);
  
      // Process recent leads
      const processedRecentLeads = leads.slice(0, 5).map(lead => ({
        id: lead.id,
        name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        leadQuality: lead.lead_quality || 'warm',
        createdAt: lead.created_at,
        source: lead.source,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.full_name)}&background=8B5CF6&color=fff`
      }));
  
      // Build activities from available data
      const activities = [];
      
      if (canSeePayments) {
        payments.slice(0, 3).forEach(p => {
          const member = members.find(m => m.id === p.member_id);
          activities.push({
            id: `payment-${p.id}`,
            member: member?.full_name || 'Unknown',
            action: 'Made a payment',
            time: new Date(p.payment_date).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }),
            type: 'payment',
            avatar: member?.full_name?.charAt(0) || 'U'
          });
        });
      }
      
      if (canSeeMembers) {
        members.slice(0, 3).forEach(m => {
          activities.push({
            id: `member-${m.id}`,
            member: m.full_name,
            action: 'Joined the gym',
            time: new Date(m.joined_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            type: 'signup',
            avatar: m.full_name.charAt(0)
          });
        });
      }
  
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      const sortedActivities = activities.slice(0, 5);
  
      // ===== FIX: Calculate membership distribution from ALL memberships =====
      const membershipDistribution = memberships.reduce((acc, m) => {
        const planName = m.plan?.name || 'No Plan';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {});
  
      // Calculate Upcoming Birthdays
      const next7Days = new Date(today_date.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingBirthdays = {
        members: [],
        staff: []
      };
  
      if (canSeeMembers) {
        members.forEach(member => {
          if (member.date_of_birth) {
            const dob = new Date(member.date_of_birth);
            const thisYearBirthday = new Date(today_date.getFullYear(), dob.getMonth(), dob.getDate());
            const nextYearBirthday = new Date(today_date.getFullYear() + 1, dob.getMonth(), dob.getDate());
            
            let birthdayDate = thisYearBirthday;
            if (thisYearBirthday < today_date) {
              birthdayDate = nextYearBirthday;
            }
            
            if (birthdayDate <= next7Days) {
              const daysUntil = Math.ceil((birthdayDate - today_date) / (1000 * 60 * 60 * 24));
              upcomingBirthdays.members.push({
                id: member.id,
                name: member.full_name,
                date_of_birth: member.date_of_birth,
                daysUntil,
                birthdayDate: birthdayDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }),
                avatar: member.profile_image 
                  ? (member.profile_image.startsWith('http') ? member.profile_image : `${API_BASE_URL}${member.profile_image}`)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0D9488&color=fff`,
                type: 'member'
              });
            }
          }
        });
      }
  
      if (canSeeStaff) {
        staff.forEach(staffMember => {
          if (staffMember.date_of_birth) {
            const dob = new Date(staffMember.date_of_birth);
            const thisYearBirthday = new Date(today_date.getFullYear(), dob.getMonth(), dob.getDate());
            const nextYearBirthday = new Date(today_date.getFullYear() + 1, dob.getMonth(), dob.getDate());
            
            let birthdayDate = thisYearBirthday;
            if (thisYearBirthday < today_date) {
              birthdayDate = nextYearBirthday;
            }
            
            if (birthdayDate <= next7Days) {
              const daysUntil = Math.ceil((birthdayDate - today_date) / (1000 * 60 * 60 * 24));
              upcomingBirthdays.staff.push({
                id: staffMember.id,
                name: staffMember.user?.full_name || 'Staff Member',
                position: staffMember.position,
                date_of_birth: staffMember.date_of_birth,
                daysUntil,
                birthdayDate: birthdayDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.user?.full_name || 'S')}&background=8B5CF6&color=fff`,
                type: 'staff'
              });
            }
          }
        });
      }
  
      upcomingBirthdays.members.sort((a, b) => a.daysUntil - b.daysUntil);
      upcomingBirthdays.staff.sort((a, b) => a.daysUntil - b.daysUntil);
  
      // ===== SET STATS WITH ACCURATE COUNTS =====
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
        totalExpenses: statsApiData.total_expenses || 0,
        monthlyExpenses: statsApiData.monthly_expenses || 0,
        expenseGrowth: statsApiData.expense_growth || 0,
        netProfit: statsApiData.net_profit || 0,
        profitMargin: statsApiData.profit_margin || 0,
        expenseByCategory: statsApiData.expense_by_category || {},
        totalBalanceDue: balanceOverview.total_balance_due || 0,
        membersWithBalance: balanceOverview.members_with_balance || 0,
        overdueCount: balanceOverview.overdue_count || 0,
        upcomingPayments: balanceOverview.upcoming_payments || 0,
        averageAttendance: statsApiData.average_attendance || Math.round(todayCheckins / 2) || 0,
        peakHour: statsApiData.peak_hour || "5:00 PM - 7:00 PM",
        popularClass: statsApiData.popular_class || "HIIT Training",
        memberRetention: statsApiData.member_retention || 87,
        trainerCount: statsApiData.trainer_count || 0,
        membersByGender,
        recentMembers,
        recentPayments,
        membershipDistribution,
        expiringMembers,
        upcomingBirthdays
      });
  
      setMembersWithBalanceList(processedMembersWithBalance);
      setRecentLeads(processedRecentLeads);
      setRecentActivities(sortedActivities.length > 0 ? sortedActivities : [
        { id: 1, member: 'No activities yet', action: '', time: '', type: 'info', avatar: 'N' }
      ]);
  
      setUpcomingClasses(statsApiData.upcoming_classes || []);
      
    } catch (error) {
      if (!silent && error.response?.status !== 403) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canSeeDashboard, canSeeMembers, canSeePayments, canSeeMemberships, canSeeStaff, canSeeBalances, canSeeLeads]);


  useEffect(() => {
    if (!permissionsLoading) {
      fetchDashboardData(false);
      fetchFollowupsCount();
    }
  }, [fetchDashboardData, permissionsLoading, fetchFollowupsCount]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
        fetchFollowupsCount();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [fetchDashboardData, fetchFollowupsCount]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
        fetchFollowupsCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDashboardData, fetchFollowupsCount]);

  useEffect(() => {
    const handleDataChange = () => {
      fetchDashboardData(true);
      fetchFollowupsCount();
    };

    window.addEventListener('memberAdded', handleDataChange);
    window.addEventListener('paymentAdded', handleDataChange);
    window.addEventListener('leadAdded', handleDataChange);
    window.addEventListener('leadUpdated', handleDataChange);
    
    return () => {
      window.removeEventListener('memberAdded', handleDataChange);
      window.removeEventListener('paymentAdded', handleDataChange);
      window.removeEventListener('leadAdded', handleDataChange);
      window.removeEventListener('leadUpdated', handleDataChange);
    };
  }, [fetchDashboardData, fetchFollowupsCount]);

  // Navigation items based on permissions
  const getNavigation = () => {
    const nav = [];
    
    if (canSeeDashboard) {
      nav.push({ name: 'Dashboard', icon: Home, id: 'dashboard' });
    }
    if (canSeeMembers) {
      nav.push({ name: 'Members', icon: UsersIcon, id: 'members' });
    }
    nav.push({ name: 'Membership Plans', icon: Dumbbell, id: 'membership-plans' });
    if (canSeeBalances) {
      nav.push({ name: 'Balance', icon: Wallet, id: 'balance' });
    }
    if (canSeeDevices) {
      nav.push({ name: 'Devices', icon: Wifi, id: 'devices' });
    }
    if (canSeeAttendance) {
      nav.push({ name: 'Live Attendance', icon: Activity, id: 'attendance' });
      nav.push({ name: 'Attendance History', icon: CalendarIcon, id: 'history' });
    }
    if (canSeeExpenses) {
      nav.push({ name: 'Expenses', icon: TrendingDown, id: 'expenses' });
    }
    if (canSeeStaff) {
      nav.push({ name: 'Staff', icon: UserPlus, id: 'staff' });
    }
    if (canSeePayments) {
      nav.push({ name: 'Payments', icon: CreditCardIcon, id: 'payments' });
    }
    if (canSeeLeads) {
      nav.push({ name: 'Leads', icon: Target, id: 'leads' });
    }
    
    return nav;
  };

  const navigation = getNavigation();

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

  const getLeadStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      interested: 'bg-green-100 text-green-700',
      not_interested: 'bg-red-100 text-red-700',
      converted: 'bg-purple-100 text-purple-700',
      lost: 'bg-gray-100 text-gray-500'
    };
    return colors[status] || 'bg-gray-100 text-gray-500';
  };

  const getLeadQualityColor = (quality) => {
    const colors = {
      hot: 'text-red-600 bg-red-100',
      warm: 'text-orange-600 bg-orange-100',
      cold: 'text-blue-600 bg-blue-100'
    };
    return colors[quality] || 'text-gray-600 bg-gray-100';
  };

  const getLeadStatusLabel = (status) => {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      interested: 'Interested',
      not_interested: 'Not Interested',
      converted: 'Converted',
      lost: 'Lost'
    };
    return labels[status] || status;
  };

  const currencySymbol = user?.currency_symbol || '₹';

  const formatCurrency = (amount) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${currencySymbol} ${formatted}`;
  };

  // If user doesn't have permission to view dashboard
  if (!permissionsLoading && !canSeeDashboard && !isAdmin) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Shield className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to view the dashboard. Please contact your gym administrator.</p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-500">Your role: <span className="font-medium text-gray-700">{user?.role || 'Unknown'}</span></p>
            <p className="text-sm text-gray-500 mt-1">Required permission: <span className="font-medium text-gray-700">view_dashboard</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
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
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 text-sm text-white/80">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
            Live · auto-updates every minute
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          {canSeeAttendance && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {stats.todayCheckins} check-ins today
            </div>
          )}
          {canSeePayments && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2">
              <TrendUp className="h-4 w-4" />
              {stats.monthlyRevenue > 0 ? formatCurrency(stats.monthlyRevenue) : 'No revenue yet'} this month
            </div>
          )}
          {canSeeLeads && followupsCount > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2 animate-pulse">
              <Calendar className="h-4 w-4" />
              {followupsCount} follow-up{followupsCount !== 1 ? 's' : ''} today
            </div>
          )}
        </div>
      </div>
  
      {/* Key Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {canSeeMembers && (
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
              <span className="text-green-600 flex items-center text-sm">
                <UserCheck className="h-4 w-4 mr-1" />
                {stats.activeMembers || 0} active
              </span>
              <span className="text-gray-500 flex items-center text-sm">
                <UserMinus className="h-4 w-4 mr-1" />
                {stats.inactiveMembers || 0} inactive
              </span>
            </div>
          </div>
        )}

        {canSeeMembers && (
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
        )}
  
        {canSeePayments && (
          <div 
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-purple-500 cursor-pointer group"
            onClick={() => setActiveTab('payments')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
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
        )}
  
        {canSeePayments && (
          <div 
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500 cursor-pointer group"
            onClick={() => setActiveTab('payments')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                {stats.pendingPayments || 0} pending
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Revenue</h3>
            <p className="text-4xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue || 0)}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              {canSeeAttendance && (
                <span className="text-gray-600 flex items-center text-sm">
                  <Activity className="h-4 w-4 mr-1" />
                  {stats.todayCheckins || 0} check-ins
                </span>
              )}
              <span className="text-orange-600 font-medium text-sm flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {stats.expiringSoon || 0} expiring
              </span>
            </div>
          </div>
        )}
      </div>
  
      {/* Balance Overview Cards - Row 2 */}
      {canSeeBalances && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Total Balance Due</p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(stats.totalBalanceDue)}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
              <span>{stats.membersWithBalance} members have dues</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Members with Balance</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.membersWithBalance}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Need to collect payment</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Overdue Payments</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.overdueCount}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
              <span>Past due date</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Upcoming Payments</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.upcomingPayments}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
              <span>Due in next 7 days</span>
            </div>
          </div>
        </div>
      )}
  
      {/* Expense and Profit Cards */}
      {canSeeExpenses && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-xl">
                <Wallet className="h-6 w-6 text-red-600" />
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                stats.expenseGrowth <= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {stats.expenseGrowth <= 0 ? '↓' : '↑'} {Math.abs(stats.expenseGrowth || 0)}%
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Monthly Expenses</h3>
            <p className="text-4xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthlyExpenses || 0)}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                This month
              </span>
              <span className="text-red-600 font-medium text-sm flex items-center">
                <TrendingDown className="h-4 w-4 mr-1" />
                Total: {formatCurrency(stats.totalExpenses || 0)}
              </span>
            </div>
          </div>
  
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-100 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                stats.profitMargin >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {stats.profitMargin >= 0 ? '↑' : '↓'} {Math.abs(stats.profitMargin || 0)}% margin
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Net Profit</h3>
            <p className="text-4xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.netProfit || 0)}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-sm">
                Revenue: {formatCurrency(stats.monthlyRevenue || 0)}
              </span>
              <span className="text-emerald-600 font-medium text-sm flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Profit: {stats.profitMargin || 0}%
              </span>
            </div>
          </div>
  
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-cyan-100 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-cyan-600" />
              </div>
              <span className="text-sm font-medium text-cyan-600 bg-cyan-100 px-3 py-1 rounded-full">
                {Object.keys(stats.expenseByCategory).length} categories
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Top Expense Category</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1 truncate">
              {Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
            </p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-sm">
                <Wallet className="h-4 w-4 mr-1" />
                {Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0]?.[1] 
                  ? formatCurrency(Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0][1]) 
                  : '₹0'}
              </span>
              <button 
                onClick={() => setActiveTab('expenses')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                View Details →
              </button>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm">
                Financial Health
              </span>
            </div>
            <h3 className="text-white/80 text-sm font-medium uppercase tracking-wider">Profit vs Expenses</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm text-white">
                <span>Profit</span>
                <span className="font-semibold">{stats.profitMargin || 0}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-400 rounded-full h-2 transition-all duration-500" 
                  style={{ width: `${Math.min(Math.max(stats.profitMargin || 0, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-white/80 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Revenue: {formatCurrency(stats.monthlyRevenue || 0)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Expenses: {formatCurrency(stats.monthlyExpenses || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
  
      {/* Member Demographics and Expiring Memberships Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canSeeMembers && (
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
        )}
  
        {/* UPDATED: Expiring Memberships Card with working click handler */}
        {canSeeMembers && stats.expiringMembers.length > 0 && (
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
            
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.expiringMembers.map((member) => (
                <div 
                  key={member.id} 
                  className={`group relative flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md cursor-pointer ${
                    member.daysLeft <= 3 
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500' 
                      : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400'
                  }`}
                  onClick={() => {
                    // Reset first so useEffect always fires, even if same member clicked again
                    setSelectedMemberId(null);
                    setTimeout(() => {
                      setSelectedMemberId(member.memberId);
                      setActiveTab('members');
                    }, 0);
                  }}
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
                  {/* Renew Now button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMemberId(null);
                      setTimeout(() => {
                        setSelectedMemberId(member.memberId);
                        setActiveTab('members');
                      }, 0);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                  >
                    Renew Now →
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button 
                onClick={() => setActiveTab('members')}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 w-full py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                View all expiring members
                <ChevronDown className="h-4 w-4 ml-1 rotate-270" />
              </button>
            </div>
          </div>
        )}
  
        {canSeeMembers && stats.expiringMembers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-orange-400 to-red-400 p-2 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Memberships Expiring Soon</h3>
              </div>
            </div>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mb-6 shadow-lg">
                <Gift className="h-10 w-10 text-white" />
              </div>
              <p className="text-gray-900 font-bold text-xl mb-2">All Memberships Active! 🎉</p>
              <p className="text-gray-500">No memberships expiring in the next 7 days.</p>
              <p className="text-sm text-gray-400 mt-2">You're doing great! Keep up the good work.</p>
            </div>
          </div>
        )}
      </div>
  
      {/* Members with Balance & Recent Leads Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canSeeBalances && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Members with Balance</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('balance')}
                  className="text-white/90 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                {stats.membersWithBalance} members have outstanding balance • Total: {formatCurrency(stats.totalBalanceDue)}
              </p>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {membersWithBalanceList.length > 0 ? (
                <div className="space-y-3">
                  {membersWithBalanceList.map((member) => (
                    <div 
                      key={member.id} 
                      className="group relative flex items-center gap-4 p-3 rounded-xl hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                    >
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-12 h-12 rounded-full ring-2 ring-red-200 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                          <span className="text-lg font-bold text-red-600">{formatCurrency(member.balanceDue)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone || 'No phone'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {member.planName}
                          </span>
                        </div>
                        {member.daysOverdue > 0 && (
                          <div className="mt-2">
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue by {member.daysOverdue} days
                            </span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setActiveTab('balance');
                          toast.success(`Viewing balance details for ${member.name}`);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-lg"
                      >
                        Collect Payment
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-medium">All caught up! 🎉</p>
                  <p className="text-gray-500 text-sm mt-1">No members with outstanding balance</p>
                </div>
              )}
            </div>
            
            {membersWithBalanceList.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Outstanding:</span>
                  <span className="font-bold text-red-600">{formatCurrency(stats.totalBalanceDue)}</span>
                </div>
              </div>
            )}
          </div>
        )}
  
        {canSeeLeads && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Recent Leads</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('leads')}
                  className="text-white/90 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  View All Leads
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                Track and manage incoming gym inquiries
              </p>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {recentLeads.length > 0 ? (
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className="group relative flex items-center gap-4 p-3 rounded-xl hover:bg-purple-50 transition-all border border-transparent hover:border-purple-200 cursor-pointer"
                      onClick={() => {
                        setActiveTab('leads');
                        setSelectedLeadId(lead.id);
                        toast.success(`Viewing lead: ${lead.name}`);
                      }}
                    >
                      <img 
                        src={lead.avatar} 
                        alt={lead.name} 
                        className="w-12 h-12 rounded-full ring-2 ring-purple-200 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getLeadQualityColor(lead.leadQuality)}`}>
                              {lead.leadQuality === 'hot' ? '🔥 Hot' : lead.leadQuality === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <MailIcon className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getLeadStatusColor(lead.status)}`}>
                            {getLeadStatusLabel(lead.status)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-gray-900 font-medium">No leads yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start tracking your first lead</p>
                  <button 
                    onClick={() => setActiveTab('leads')}
                    className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add New Lead
                  </button>
                </div>
              )}
            </div>
            
            {recentLeads.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-600">New leads need attention</span>
                <button 
                  onClick={() => setActiveTab('leads')}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                >
                  Manage Leads
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  
      {/* ===== FOLLOW-UP CARD - NEW SECTION ===== */}
      {canSeeLeads && (
        <div className="grid grid-cols-1 gap-6">
          <FollowUpCard 
            onFollowUpClick={(lead) => {
              if (lead && lead.viewAll) {
                setActiveTab('leads');
              } else if (lead && lead.id) {
                setActiveTab('leads');
                setSelectedLeadId(lead.id);
              }
            }}
            onRefresh={() => {
              fetchDashboardData(true);
              fetchFollowupsCount();
            }}
          />
        </div>
      )}
  
      {/* Birthday Notifications Section */}
      {(stats.upcomingBirthdays?.members?.length > 0 || stats.upcomingBirthdays?.staff?.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            🎂 Upcoming Birthdays
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.upcomingBirthdays?.members?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-pink-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-pink-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Member Birthdays</h3>
                  </div>
                  <span className="text-xs bg-pink-100 text-pink-600 px-3 py-1 rounded-full">
                    {stats.upcomingBirthdays.members.length} this week
                  </span>
                </div>
                
                <div className="space-y-3">
                  {stats.upcomingBirthdays.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 hover:shadow-md transition-all">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-12 h-12 rounded-full ring-2 ring-pink-200 object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {member.birthdayDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                          member.daysUntil === 0 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : member.daysUntil === 1
                            ? 'bg-orange-500 text-white'
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {member.daysUntil === 0 ? 'Today! 🎉' : `${member.daysUntil} day${member.daysUntil !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {stats.upcomingBirthdays?.staff?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Staff Birthdays</h3>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full">
                    {stats.upcomingBirthdays.staff.length} this week
                  </span>
                </div>
                
                <div className="space-y-3">
                  {stats.upcomingBirthdays.staff.map((staff) => (
                    <div key={staff.id} className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:shadow-md transition-all">
                      <img 
                        src={staff.avatar} 
                        alt={staff.name} 
                        className="w-12 h-12 rounded-full ring-2 ring-purple-200"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{staff.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Briefcase className="h-3 w-3" />
                          {staff.position || 'Staff Member'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {staff.birthdayDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                          staff.daysUntil === 0 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : staff.daysUntil === 1
                            ? 'bg-orange-500 text-white'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {staff.daysUntil === 0 ? 'Today! 🎉' : `${staff.daysUntil} day${staff.daysUntil !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
  
      {/* Recent Activities and Classes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            {recentActivities.length > 0 && recentActivities[0]?.member !== 'No activities yet' ? (
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
  
      {/* Alerts Section */}
      {(stats.expiringThisMonth > 0 || stats.pendingPayments > 0 || stats.overdueCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
          
          {canSeePayments && stats.pendingPayments > 0 && (
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
  
          {canSeeBalances && stats.overdueCount > 0 && (
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-1">Overdue Payments</h4>
                  <p className="text-white/90 mb-3">{stats.overdueCount} members have overdue payments</p>
                  <button 
                    onClick={() => setActiveTab('balance')}
                    className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    View Balance →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Don't show loading state if already logged in
  if (loading && !user) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {showCurrencyModal && (
        <CurrencyPickerModal
          onSelect={async (symbol) => {
            await updateCurrencySymbol(symbol);
            setShowCurrencyModal(false);
          }}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen bg-gradient-to-b from-blue-900 to-purple-900 
        transition-all duration-300 shadow-xl
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={goToDashboard}>
              <Dumbbell className="h-8 w-8 text-white" />
              <span className="text-white font-bold text-lg">GymMonitor</span>
            </div>
          )}
          {sidebarCollapsed && (
            <Dumbbell className="h-8 w-8 text-white mx-auto cursor-pointer" onClick={goToDashboard} />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:block text-white/70 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-white/10 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`flex ${sidebarCollapsed ? 'flex-col' : 'items-center gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-white/60 text-xs truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 transition-colors
                ${activeTab === item.id ? 'bg-white/10 text-white border-r-4 border-blue-400' : ''}
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
              title={sidebarCollapsed ? item.name : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              setActiveTab('profile');
              setMobileMenuOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title={sidebarCollapsed ? 'Profile' : ''}
          >
            <User className="h-5 w-5" />
            {!sidebarCollapsed && <span className="text-sm">Profile</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-4 py-2 text-red-300 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors mt-2
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`
        transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        ml-0
      `}>
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="md:hidden">
                <div className="w-10" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">
                {navigation.find(n => n.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>
            
            {/* Search Bar - Desktop */}
            <div className="flex-1 max-w-xl w-full hidden md:block">
              <SearchBar 
                onSelect={handleSearchSelect}
                placeholder="Search members, leads, staff..."
              />
            </div>
            
            {/* Right Header Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {/* Search Bar - Mobile */}
              <div className="md:hidden flex-1">
                <SearchBar 
                  onSelect={handleSearchSelect}
                  placeholder="Search..."
                />
              </div>
              
              <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <button
                  ref={userButtonRef}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                </button>
              </div>
            </div>
          </div>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div 
              ref={userMenuRef}
              className="absolute right-6 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50"
            >
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
                  setShowCurrencyModal(true);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <IndianRupee className="h-4 w-4" />
                Currency ({currencySymbol})
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
        </header>

        {/* Page Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'members' && canSeeMembers && (
            <Members 
              initialMemberId={selectedMemberId} 
              onMemberSelect={(id) => setSelectedMemberId(id)}
            />
          )}
          {activeTab === 'membership-plans' && <MembershipPlans />}
          {activeTab === 'balance' && canSeeBalances && <Balance />}
          {activeTab === 'devices' && canSeeDevices && <DeviceManager />}
          {activeTab === 'attendance' && canSeeAttendance && <LiveMonitoring />}
          {activeTab === 'history' && canSeeAttendance && <AttendanceHistory />}
          {activeTab === 'expenses' && canSeeExpenses && <Expenses />}
          {activeTab === 'staff' && canSeeStaff && (
            <Staff 
              initialStaffId={selectedStaffId}
              onStaffSelect={(id) => setSelectedStaffId(id)}
            />
          )}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'payments' && canSeePayments && <Payments />}
          {activeTab === 'leads' && canSeeLeads && (
            <Leads 
              initialLeadId={selectedLeadId}
              onLeadSelect={(id) => setSelectedLeadId(id)}
            />
          )}
          {activeTab === 'classes' && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <CalendarIcon className="h-16 w-16 text-blue-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Classes Management</h2>
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
          {/* Access denied for tabs user doesn't have permission for */}
          {activeTab === 'members' && !canSeeMembers && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Shield className="h-16 w-16 text-red-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
              <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-6">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span>Support WhatsApp:</span>
              <a href="https://wa.me/919041300884" className="text-green-600 hover:text-green-700">+91-9041300884</a>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-red-500" />
              <span>Email:</span>
              <a href="mailto:info@maskottchentechnology.com" className="text-blue-600 hover:text-blue-700">info@maskottchentenology.com</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;