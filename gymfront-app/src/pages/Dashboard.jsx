// src/pages/Dashboard.jsx - COMPLETE UPDATED WITH BILLING INTEGRATION
// Modified: Total Members and New Members are always visible (not hidden)
// Modified: Billing & Plan tab added under Account section

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Bell, Settings, Activity, Users, DollarSign, TrendingUp,
  Dumbbell, CreditCard, Award, BarChart3, Clock as ClockIcon, AlertCircle,
  Menu, X, Home, UserPlus, Users as UsersIcon, Calendar as CalendarIcon,
  CreditCard as CreditCardIcon, BarChart, Target, ChevronDown, Loader,
  TrendingDown, UserCheck, UserMinus, Calendar, IndianRupee, Gift, Star,
  Flame, Zap, TrendingUp as TrendUp, MessageCircle, Mail, CheckCircle,
  Briefcase, Wallet, ChevronLeft, ChevronRight, Wifi, Phone,
  Mail as MailIcon, Clock, AlertTriangle, Eye, Shield, RefreshCw,
  MessageSquare, Send, Download, Filter, FileText, Utensils,
  Tag, CalendarRange, Clock as ClockIcon2, EyeOff,
  Crown, // ✅ NEW — icon for Billing & Plan sidebar item
  Plus, // ✅ NEW — for Create Membership Plan action
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCache, CACHE_KEYS } from '../context/CacheContext';
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
import HistoricalInvoices from './HistoricalInvoices';
import SearchBar from '../components/SearchBar';
import FollowUpCard from '../components/FollowUpCard';
import WhatsAppLogs from './WhatsAppLogs';
import TrainerSchedule from '../components/TrainerSchedule';
import IrregularMembers from '../components/attendance/IrregularMembers';
import DietPlans from './DietPlans';
import FollowUpPage from '../components/FollowUpPage';
import AddOns from './AddOns';
import PTPage from './PTPage';
import WhatsAppNotifications from './WhatsAppNotifications';
import BillingSettings from './BillingSettings'; // ✅ NEW — SaaS billing tab

const AUTO_REFRESH_INTERVAL = 60000;

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
  const { getCache, setCache, clearCache, clearCachePattern, invalidateCache } = useCache();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openCreatePlan, setOpenCreatePlan] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [hideValues, setHideValues] = useState(() => {
    const saved = localStorage.getItem('gymmonitor_hide_values');
    return saved ? JSON.parse(saved) : false;
  });
  const [userRole, setUserRole] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [followupsCount, setFollowupsCount] = useState(0);
  
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [whatsappStats, setWhatsappStats] = useState(null);
  const [logFilter, setLogFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all'
  });
  
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

  // SaaS plan expiry & admin notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsData, setNotificationsData] = useState({
    plan_alert: null,
    recent_alerts: [],
    unread_count: 0
  });
  const notifMenuRef = useRef(null);
  const notifButtonRef = useRef(null);

  // ─── PERMISSION CHECKS FOR DASHBOARD CARDS ──────────────────────────────
  const canViewDashboard = hasPermission('view_dashboard');
  const effectiveRole = user?.role || userRole;
  const isAdmin = effectiveRole === 'gym_owner' || effectiveRole === 'super_admin';
  
  const canViewMemberStats = isAdmin || hasPermission('dashboard_view_member_stats') || hasPermission('view_members');
  const canViewRevenueStats = isAdmin || hasPermission('dashboard_view_revenue_stats') || hasPermission('view_payments');
  const canViewExpenseStats = isAdmin || hasPermission('dashboard_view_expense_stats') || hasPermission('view_expenses');
  const canViewBalanceStats = isAdmin || hasPermission('dashboard_view_balance_stats') || hasPermission('view_balances');
  const canViewLeadStats = isAdmin || hasPermission('dashboard_view_lead_stats') || hasPermission('view_leads');
  const canViewStaffStats = isAdmin || hasPermission('dashboard_view_staff_stats') || hasPermission('view_staff');
  const canViewClasses = isAdmin || hasPermission('dashboard_view_classes');
  const canViewBirthdays = isAdmin || hasPermission('dashboard_view_birthdays');
  const canViewActivity = isAdmin || hasPermission('dashboard_view_activity');
  const canViewAlerts = isAdmin || hasPermission('dashboard_view_alerts');
  
  const canViewMembers = isAdmin || hasPermission('view_members');
  const canViewPayments = isAdmin || hasPermission('view_payments');
  const canViewMemberships = isAdmin || hasPermission('view_memberships');
  const canViewBalances = isAdmin || hasPermission('view_balances');
  const canViewStaff = isAdmin || hasPermission('view_staff');
  const canViewExpenses = isAdmin || hasPermission('view_expenses');
  const canViewAttendance = isAdmin || hasPermission('view_attendance');
  const canViewDevices = isAdmin || hasPermission('view_devices');
  const canViewLeads = isAdmin || hasPermission('view_leads');
  
  const canViewWhatsApp = isAdmin || hasPermission('view_whatsapp') || hasPermission('manage_whatsapp');

  const canSeeDashboard = isAdmin || canViewDashboard || hasPermission('view_members') || hasPermission('view_payments') || hasPermission('view_attendance');
  const canSeeMembers = isAdmin || canViewMembers;
  const canSeePayments = isAdmin || canViewPayments;
  const canSeeMemberships = isAdmin || canViewMemberships;
  const canSeeBalances = isAdmin || canViewBalances;
  const canSeeStaff = isAdmin || canViewStaff;
  const canSeeExpenses = isAdmin || canViewExpenses;
  const canSeeAttendance = isAdmin || canViewAttendance;
  const canSeeDevices = isAdmin || canViewDevices;
  const canSeeLeads = isAdmin || canViewLeads;
  const canSeeWhatsApp = isAdmin || canViewWhatsApp;

  // ✅ NEW — Only gym owners / super admins can manage SaaS billing
  const canSeeBilling = isAdmin;

  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role);
      localStorage.setItem('userRole', user.role);
    } else {
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole);
      }
    }
  }, [user]);

  useEffect(() => {
    const handleRefresh = () => {
        fetchDashboardStats();
    };
    
    window.addEventListener('refreshDashboard', handleRefresh);
    
    return () => {
        window.removeEventListener('refreshDashboard', handleRefresh);
    };
  }, []);

  // Fetch admin notifications (SaaS plan expiry + security alerts)
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/gym/billing/notifications');
      if (res.data) {
        setNotificationsData(res.data);
      }
    } catch (err) {
      console.debug('Failed to fetch admin notifications:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target) &&
        notifButtonRef.current &&
        !notifButtonRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const planAlert = notificationsData.plan_alert;
  const isExpiringSoon = Boolean(planAlert?.is_expiring_soon);
  const isExpired = Boolean(planAlert?.is_expired);
  const daysRemaining = planAlert?.days_remaining ?? 0;

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
    },
    totalRefunds: 0,
    refundCount: 0,
    netRevenue: 0,
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [membersWithBalanceList, setMembersWithBalanceList] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);

  const hasAnyPermission = isAdmin || 
    hasPermission('view_members') || 
    hasPermission('view_payments') || 
    hasPermission('view_attendance') ||
    hasPermission('view_staff') ||
    hasPermission('view_expenses') ||
    hasPermission('view_leads') ||
    hasPermission('view_dashboard') ||
    hasPermission('view_whatsapp') ||
    hasPermission('manage_whatsapp');

  // ─── FETCH FOLLOWUPS COUNT ──────────────────────────────────────────────
  const fetchFollowupsCount = useCallback(async () => {
    if (!canSeeLeads) return;
    
    try {
      const response = await api.get('/gym/followups/today');
      if (response.data) {
        setFollowupsCount(response.data.count || 0);
      }
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching followups count:', error);
      }
    }
  }, [canSeeLeads]);

  const fetchWhatsAppLogs = useCallback(async (date) => {
    try {
      const response = await api.get(`/whatsapp/logs?limit=100&start_date=${date}T00:00:00&end_date=${date}T23:59:59`);
      if (response.data) {
        setWhatsappLogs(response.data.logs || []);
      }
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching WhatsApp logs:', error);
      }
    }
  }, []);

  const fetchWhatsAppStats = useCallback(async () => {
    try {
      const response = await api.get('/whatsapp/logs/stats');
      if (response.data) {
        setWhatsappStats(response.data);
      }
    } catch (error) {
      if (error.response?.status !== 403) {
        console.error('Error fetching WhatsApp stats:', error);
      }
    }
  }, []);

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

  const exportLogs = async () => {
    try {
      const response = await api.get(`/whatsapp/logs/export?start_date=${logFilter.startDate}T00:00:00&end_date=${logFilter.endDate}T23:59:59`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `whatsapp_logs_${logFilter.startDate}_to_${logFilter.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Logs exported successfully!');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    }
  };

  useEffect(() => {
    if (user && !user.currency_symbol && !loading) {
      setShowCurrencyModal(true);
    }
  }, [user, loading]);

  const fetchSilently = async (url, options = {}) => {
    try {
      const response = await api.get(url, options);
      return { data: response.data, success: true };
    } catch (error) {
      if (error.response?.status === 403) {
        return { data: null, success: false, forbidden: true };
      }
      return { data: null, success: false };
    }
  };

  // ─── TOGGLE HIDE/SHOW VALUES ─────────────────────────────────────────────
  const toggleHideValues = useCallback(() => {
    setHideValues(prev => {
      const newValue = !prev;
      localStorage.setItem('gymmonitor_hide_values', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  // ─── HELPER: Check if value should be hidden ────────────────────────────
  // ALWAYS SHOW: totalMembers, newMembersThisMonth, activeMembers, inactiveMembers
  const shouldHideValue = (value, key) => {
    // List of keys that should ALWAYS be visible (never hidden)
    const alwaysVisibleKeys = [
      'totalMembers', 
      'newMembersThisMonth', 
      'activeMembers', 
      'inactiveMembers',
      'membersWithBalance',
      'membersByGender'
    ];
    
    // If the key is in the always-visible list, return false (don't hide)
    if (alwaysVisibleKeys.some(k => key && key.includes(k))) {
      return false;
    }
    
    // Otherwise, respect the hideValues setting
    return hideValues && value > 0;
  };

  // ─── CURRENCY FORMATTING ──────────────────────────────────────────────
  const currencySymbol = user?.currency_symbol || '₹';

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return `${currencySymbol} 0`;
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
    
    if (amount < 0) {
      return `(${currencySymbol} ${formatted})`;
    }
    return `${currencySymbol} ${formatted}`;
  };

  // ─── FORMAT WITH HIDE/SHOW ──────────────────────────────────────────────
  const formatCurrencyMasked = (amount, key = '') => {
    if (shouldHideValue(amount, key)) {
      return '****';
    }
    return formatCurrency(amount);
  };

  const formatNumberMasked = (number, key = '') => {
    if (shouldHideValue(number, key)) {
      return '****';
    }
    return number?.toLocaleString() || 0;
  };

  // ─── FETCH DASHBOARD DATA ───────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const cachedStats = !silent ? getCache(CACHE_KEYS.DASHBOARD_STATS) : null;
      
      if (cachedStats && !silent) {
        console.log('📊 Using cached dashboard stats');
        setStats(prev => ({ ...prev, ...cachedStats }));
      }
      
      let statsData = { data: null };
      let membersData = { data: [] };
      let paymentsData = { data: [] };
      let membershipsData = { data: [] };
      let staffData = { data: [] };
      let balanceData = { data: {} };
      let balanceMembersData = { data: [] };
      let leadsData = { data: [] };
  
      if (canSeeDashboard) {
        try {
          const statsResult = await fetchMemberStatsOptimized();
          
          if (statsResult) {
            statsData = { data: {
              total_members: statsResult.total_members || 0,
              active_members: statsResult.active_members || 0,
              new_members_this_month: statsResult.new_this_month || 0,
              today_checkins: statsResult.today_checkins || 0,
              total_revenue: statsResult.total_revenue || 0,
              monthly_revenue: statsResult.monthly_revenue || 0,
              revenue_growth: statsResult.revenue_growth || 0,
              total_expenses: statsResult.total_expenses || 0,
              monthly_expenses: statsResult.monthly_expenses || 0,
              expense_growth: statsResult.expense_growth || 0,
              net_profit: statsResult.net_profit || 0,
              profit_margin: statsResult.profit_margin || 0,
              expense_by_category: statsResult.expense_by_category || {},
              average_attendance: statsResult.average_attendance || 0,
              peak_hour: statsResult.peak_hour || "5:00 PM - 7:00 PM",
              popular_class: statsResult.popular_class || "HIIT Training",
              member_retention: statsResult.member_retention || 87,
              trainer_count: statsResult.trainer_count || 0,
              upcoming_classes: statsResult.upcoming_classes || []
            } };
            
            setCache(CACHE_KEYS.DASHBOARD_STATS, statsData.data, 3 * 60 * 1000);
          }
        } catch (err) {
          console.warn('Could not fetch optimized stats:', err);
        }
      }
  
      const promises = [];
      const endpointMap = {};
  
      if (canSeeMembers) {
        promises.push(fetchSilently('/gym/members?limit=100&sort=-created_at'));
        endpointMap.members = promises.length - 1;
      }
  
      if (canSeePayments) {
        promises.push(fetchSilently('/gym/payments?limit=10000'));
        endpointMap.payments = promises.length - 1;
      }
  
      if (canSeeMemberships) {
        promises.push(fetchSilently('/gym/memberships?limit=1000'));
        endpointMap.memberships = promises.length - 1;
      }
  
      if (canSeeStaff) {
        promises.push(fetchSilently('/gym/staff'));
        endpointMap.staff = promises.length - 1;
      }
  
      if (canSeeBalances) {
        promises.push(fetchSilently('/gym/balance/overview'));
        endpointMap.balance = promises.length - 1;
        promises.push(fetchSilently('/gym/members/balances?has_balance=true&limit=10'));
        endpointMap.balanceMembers = promises.length - 1;
      }
  
      if (canSeeLeads) {
        promises.push(fetchSilently('/gym/leads?limit=10'));
        endpointMap.leads = promises.length - 1;
      }
  
      const results = await Promise.all(promises);
  
      if (endpointMap.members !== undefined) membersData = results[endpointMap.members];
      if (endpointMap.payments !== undefined) paymentsData = results[endpointMap.payments];
      if (endpointMap.memberships !== undefined) membershipsData = results[endpointMap.memberships];
      if (endpointMap.staff !== undefined) staffData = results[endpointMap.staff];
      if (endpointMap.balance !== undefined) balanceData = results[endpointMap.balance];
      if (endpointMap.balanceMembers !== undefined) balanceMembersData = results[endpointMap.balanceMembers];
      if (endpointMap.leads !== undefined) leadsData = results[endpointMap.leads];
  
      const statsApiData = statsData.data || {};
      
      let totalMembers = statsApiData.total_members || 0;
      let activeMembers = statsApiData.active_members || 0;
      let newMembersThisMonth = statsApiData.new_members_this_month || 0;
      
      const members = membersData.data || [];
      
      if (newMembersThisMonth === 0 && members.length > 0) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const calculatedNewMembers = members.filter(m => {
          const joinedDate = new Date(m.joined_date || m.created_at);
          return joinedDate.getMonth() === currentMonth && 
                 joinedDate.getFullYear() === currentYear;
        }).length;
        
        if (calculatedNewMembers > 0) {
          newMembersThisMonth = calculatedNewMembers;
        }
      }
  
      const inactiveMembers = totalMembers - activeMembers;
      const payments = paymentsData.data || [];
      const memberships = membershipsData.data || [];
      const staff = staffData.data || [];
      const balanceOverview = balanceData.data || {};
      const membersWithBalance = balanceMembersData.data || [];
      const leads = leadsData.data || [];
      
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
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
  
      const currentYear = new Date().getFullYear();
      
      const allPayments = payments || [];
      
      const yearlyPayments = allPayments.filter(p => {
        const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
        return paymentDate && paymentDate.getFullYear() === currentYear;
      });
      
      const totalRevenue = yearlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const now = new Date();
      const monthlyPayments = allPayments.filter(p => {
        if (!p.payment_date) return false;
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
      });
      
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const todayDate = new Date();
      const firstDayOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
      
      const lastMonthPayments = allPayments.filter(p => {
        if (!p.payment_date) return false;
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= firstDayOfLastMonth && paymentDate <= lastDayOfLastMonth;
      });
      
      const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
        : monthlyRevenue > 0 ? 100 : 0;
      
      const refundPayments = allPayments.filter(p => p.amount < 0 || (p.notes && p.notes.includes('REFUND')));
      const totalRefunds = refundPayments.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);
      const refundCount = refundPayments.length;
      
      const netRevenue = totalRevenue - totalRefunds;
  
      const pendingPayments = memberships.filter(m => 
        m.payment_status === 'pending' || m.payment_status === 'PENDING'
      ).length;
  
      const thirtyDaysLater = new Date(todayDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const expiringThisMonth = memberships.filter(m => 
        m.status === 'active' && 
        m.end_date && 
        m.end_date <= thirtyDaysLater &&
        m.end_date >= today
      ).length;
  
      const expiringSoon = memberships.filter(m => 
        m.status === 'active' && 
        m.end_date && 
        m.end_date <= new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
        m.end_date >= today
      ).length;
  
      const expiringMembers = memberships
        .filter(m => 
          m.status === 'active' && 
          m.end_date && 
          m.end_date <= new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] &&
          m.end_date >= today
        )
        .map(m => {
          const member = members.find(mem => mem.id === m.member_id);
          const memberData = member || m.member;
          const daysLeft = Math.ceil((new Date(m.end_date) - todayDate) / (1000 * 60 * 60 * 24));
          
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
          const isRefund = p.amount < 0 || (p.notes && p.notes.includes('REFUND'));
          return {
            id: p.id,
            memberName: member?.full_name || 'Unknown',
            amount: p.amount,
            date: new Date(p.payment_date).toLocaleDateString('en-IN'),
            method: p.payment_method,
            isRefund: isRefund
          };
        });
  
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
  
      const activities = [];
      
      if (canSeePayments) {
        payments.slice(0, 3).forEach(p => {
          const member = members.find(m => m.id === p.member_id);
          const isRefund = p.amount < 0 || (p.notes && p.notes.includes('REFUND'));
          activities.push({
            id: `payment-${p.id}`,
            member: member?.full_name || 'Unknown',
            action: isRefund ? `Received refund of ${formatCurrency(Math.abs(p.amount))}` : `Made a payment of ${formatCurrency(p.amount)}`,
            time: new Date(p.payment_date).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', hour12: true }),
            type: isRefund ? 'refund' : 'payment',
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
  
      const membershipDistribution = memberships.reduce((acc, m) => {
        const planName = m.plan?.name || 'No Plan';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {});
  
      const next7Days = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingBirthdays = {
        members: [],
        staff: []
      };
  
      if (canSeeMembers) {
        members.forEach(member => {
          if (member.date_of_birth) {
            const dob = new Date(member.date_of_birth);
            const thisYearBirthday = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
            const nextYearBirthday = new Date(todayDate.getFullYear() + 1, dob.getMonth(), dob.getDate());
            
            let birthdayDate = thisYearBirthday;
            if (thisYearBirthday < todayDate) {
              birthdayDate = nextYearBirthday;
            }
            
            if (birthdayDate <= next7Days) {
              const daysUntil = Math.ceil((birthdayDate - todayDate) / (1000 * 60 * 60 * 24));
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
            const thisYearBirthday = new Date(todayDate.getFullYear(), dob.getMonth(), dob.getDate());
            const nextYearBirthday = new Date(todayDate.getFullYear() + 1, dob.getMonth(), dob.getDate());
            
            let birthdayDate = thisYearBirthday;
            if (thisYearBirthday < todayDate) {
              birthdayDate = nextYearBirthday;
            }
            
            if (birthdayDate <= next7Days) {
              const daysUntil = Math.ceil((birthdayDate - todayDate) / (1000 * 60 * 60 * 24));
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
  
      const monthlyExpenses = statsApiData.monthly_expenses || 0;
      const netProfit = monthlyRevenue - monthlyExpenses;
      const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue * 100) : 0;
  
      const newStats = {
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
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        totalExpenses: statsApiData.total_expenses || 0,
        monthlyExpenses: monthlyExpenses,
        expenseGrowth: statsApiData.expense_growth || 0,
        netProfit: netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
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
        upcomingBirthdays,
        totalRefunds,
        refundCount,
        netRevenue
      };
  
      setStats(newStats);
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
  }, [canSeeDashboard, canSeeMembers, canSeePayments, canSeeMemberships, canSeeStaff, canSeeBalances, canSeeLeads, getCache, setCache]);

  const refreshDashboard = useCallback(() => {
    clearCachePattern(CACHE_KEYS.DASHBOARD_STATS);
    clearCachePattern(CACHE_KEYS.DASHBOARD_BALANCE_OVERVIEW);
    clearCachePattern(CACHE_KEYS.PAYMENTS_LIST);
    clearCachePattern(CACHE_KEYS.MEMBER_BALANCES);
    invalidateCache();
    
    sessionStorage.setItem('dashboard_cache_invalidated', 'true');
    
    fetchDashboardData(false);
    fetchFollowupsCount();
  }, [clearCachePattern, invalidateCache, fetchDashboardData, fetchFollowupsCount]);

  useEffect(() => {
    const handleDataChange = () => {
      refreshDashboard();
    };

    const handleDataChanged = (event) => {
      console.log('🔄 Data changed event received:', event.detail);
      refreshDashboard();
    };

    window.addEventListener('memberAdded', handleDataChange);
    window.addEventListener('memberUpdated', handleDataChange);
    window.addEventListener('memberDeleted', handleDataChange);
    window.addEventListener('paymentAdded', handleDataChange);
    window.addEventListener('paymentUpdated', handleDataChange);
    window.addEventListener('paymentDeleted', handleDataChange);
    window.addEventListener('dataChanged', handleDataChanged);
    window.addEventListener('leadAdded', handleDataChange);
    window.addEventListener('leadUpdated', handleDataChange);
    
    return () => {
      window.removeEventListener('memberAdded', handleDataChange);
      window.removeEventListener('memberUpdated', handleDataChange);
      window.removeEventListener('memberDeleted', handleDataChange);
      window.removeEventListener('paymentAdded', handleDataChange);
      window.removeEventListener('paymentUpdated', handleDataChange);
      window.removeEventListener('paymentDeleted', handleDataChange);
      window.removeEventListener('dataChanged', handleDataChanged);
      window.removeEventListener('leadAdded', handleDataChange);
      window.removeEventListener('leadUpdated', handleDataChange);
    };
  }, [refreshDashboard]);

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
    if (activeTab === 'whatsapp-logs') {
      fetchWhatsAppLogs(new Date().toISOString().split('T')[0]);
      fetchWhatsAppStats();
    }
  }, [activeTab, fetchWhatsAppLogs, fetchWhatsAppStats]);

  // ─── NAVIGATION ──────────────────────────────────────────────────────────
  const getNavigation = () => {
    const nav = [];
    
    if (canSeeDashboard) {
      nav.push({ name: 'Dashboard', icon: Home, id: 'dashboard', section: 'main' });
    }
    
    if (canSeeMembers) {
      nav.push({ name: 'Members', icon: UsersIcon, id: 'members', section: 'management' });
    }
    nav.push({ name: 'Membership Plans', icon: Dumbbell, id: 'membership-plans', section: 'management' });
    nav.push({ name: 'Add-Ons', icon: Tag, id: 'addons', section: 'management' });
    nav.push({ name: 'Personal Training', icon: Dumbbell, id: 'pt', section: 'management' });
    
    if (canSeeBalances) {
      nav.push({ name: 'Balance', icon: Wallet, id: 'balance', section: 'management' });
    }
    if (canSeePayments) {
      nav.push({ name: 'Payments', icon: CreditCardIcon, id: 'payments', section: 'management' });
    }
    if (canSeeLeads) {
      nav.push({ name: 'Leads', icon: Target, id: 'leads', section: 'management' });
    }
    if (canSeeLeads) {
      nav.push({ name: 'Follow-Ups', icon: Calendar, id: 'follow-ups', section: 'management' });
    }
    nav.push({ name: 'Diet Plans', icon: Utensils, id: 'diet-plans', section: 'management' });
    
    if (canSeeStaff) {
      nav.push({ name: 'Staff', icon: UserPlus, id: 'staff', section: 'staff' });
    }
    nav.push({ name: 'Trainer Schedule', icon: Calendar, id: 'trainer-schedule', section: 'staff' });
    if (canSeeAttendance) {
      nav.push({ name: 'Live Attendance', icon: Activity, id: 'attendance', section: 'staff' });
      nav.push({ name: 'Attendance History', icon: CalendarIcon, id: 'history', section: 'staff' });
      if (canSeeAttendance) {
        nav.push({ name: 'Irregular Members', icon: AlertTriangle, id: 'irregular-members', section: 'staff' });
      }
    }
    if (canSeeDevices) {
      nav.push({ name: 'Devices', icon: Wifi, id: 'devices', section: 'staff' });
    }
    
    if (canSeeExpenses) {
      nav.push({ name: 'Expenses', icon: TrendingDown, id: 'expenses', section: 'finance' });
    }
    
    const canViewHistoricalInvoices = canSeeMembers || canSeePayments;
    if (canViewHistoricalInvoices) {
      nav.push({ 
        name: 'Historical Invoices', 
        icon: FileText, 
        id: 'historical-invoices',
        section: 'reports'
      });
    }
    nav.push({ name: 'WhatsApp Logs', icon: MessageSquare, id: 'whatsapp-logs', section: 'reports' });
    nav.push({ 
      name: 'WhatsApp Notifications', 
      icon: Send, 
      id: 'whatsapp-notifications',
      section: 'reports'
    });

    // Billing & Plan section (only for gym owners / super admins)
    if (canSeeBilling) {
      nav.push({
        name: 'Billing & Plan',
        icon: Crown,
        id: 'billing',
        section: 'account',
        badge: isExpired ? 'Expired' : isExpiringSoon ? `${daysRemaining}d` : null,
        badgeColor: isExpired ? 'bg-red-500 text-white shadow-sm' : 'bg-amber-500 text-white animate-pulse shadow-sm',
      });
    }
    
    return nav;
  };

  const navigation = getNavigation();

  const groupedNav = navigation.reduce((acc, item) => {
    const section = item.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  // ✅ NEW — added 'account' label
  const sectionLabels = {
    main: 'Main',
    management: 'Management',
    staff: 'Staff & Attendance',
    finance: 'Finance',
    reports: 'Reports & History',
    account: 'Account',
    other: 'Other'
  };

  const getActivityColor = (type) => {
    const colors = {
      checkin: 'bg-green-100 text-green-600',
      renewal: 'bg-blue-100 text-blue-600',
      booking: 'bg-purple-100 text-purple-600',
      payment: 'bg-emerald-100 text-emerald-600',
      refund: 'bg-red-100 text-red-600',
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

  // ─── PERMISSION CHECK: No permissions at all ────────────────────────────
  if (!permissionsLoading && !hasAnyPermission) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="bg-yellow-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Shield className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Limited Access</h2>
          <p className="text-gray-600 mb-6">
            Your account doesn't have any permissions assigned yet. 
            Please contact your gym administrator to set up your access.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-500">Your role: <span className="font-medium text-gray-700">{user?.role || 'Unknown'}</span></p>
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

  // ─── LOADING STATE ────────────────────────────────────────────────────────
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

  // ─── RENDER DASHBOARD ─────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              Welcome back, {user?.full_name || 'Admin'}! 👋
              <span className="bg-yellow-400 text-yellow-900 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ml-1">
                {user?.role === 'gym_owner' ? 'GYM OWNER' : user?.role?.toUpperCase()}
              </span>
            </h1>
            <p className="text-blue-100 mt-0.5 text-sm sm:text-base">Here's what's happening at your gym today.</p>
          </div>
          <button
            onClick={() => {
              setOpenCreatePlan(true);
              setActiveTab('membership-plans');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border border-white/40 ml-auto sm:ml-0"
            title="Create a new membership plan"
          >
            <Plus className="h-4 w-4 text-indigo-600 stroke-[3]" />
            <span>+ Create Membership Plan</span>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3.5">
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          
          {canSeeAttendance && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {formatNumberMasked(stats.todayCheckins, 'todayCheckins')} check-ins today
            </div>
          )}
          
          {canSeePayments && (
            <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5">
              <TrendUp className="h-3.5 w-3.5" />
              {stats.monthlyRevenue > 0 ? formatCurrencyMasked(stats.monthlyRevenue, 'monthlyRevenue') : 'No revenue yet'} this month
            </div>
          )}
          
          {canSeeLeads && followupsCount > 0 && (
            <button
              onClick={() => {
                const el = document.getElementById('followup-card-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
                  setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2');
                  }, 2000);
                }
              }}
              title="Click to view follow-ups today"
              className="bg-white/15 hover:bg-white/25 active:scale-95 transition-all backdrop-blur-sm rounded-full px-3 py-1 text-xs flex items-center gap-1.5 animate-pulse cursor-pointer border border-white/25 hover:border-white/50 shadow-xs"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{followupsCount} follow-up{followupsCount !== 1 ? 's' : ''} today</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-medium ml-0.5">↓ View</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Plan Management Bar on Front Page */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xs">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Membership Plans Management</h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2 py-0.5 rounded-full">Quick Access</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Easily configure pricing, durations & custom packages for your members.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('membership-plans')}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200 cursor-pointer"
          >
            Manage Plans
          </button>
          <button
            onClick={() => {
              setOpenCreatePlan(true);
              setActiveTab('membership-plans');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Create Membership Plan
          </button>
        </div>
      </div>
  
      {/* Row 1: Key Stats Cards - Total Members ALWAYS visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewMemberStats && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                {stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}% active
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Members</h3>
            {/* Total Members - ALWAYS visible (never hidden) */}
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{formatNumberMasked(stats.totalMembers, 'totalMembers')}</p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-green-600 flex items-center text-xs">
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                {formatNumberMasked(stats.activeMembers, 'activeMembers')} active
              </span>
              <span className="text-gray-500 flex items-center text-xs">
                <UserMinus className="h-3.5 w-3.5 mr-1" />
                {formatNumberMasked(stats.inactiveMembers, 'inactiveMembers')} inactive
              </span>
            </div>
          </div>
        )}

        {canViewMemberStats && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserPlus className="h-4.5 w-4.5 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                +{formatNumberMasked(stats.newMembersThisMonth, 'newMembersThisMonth')} new
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">New Members</h3>
            {/* New Members - ALWAYS visible (never hidden) */}
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{formatNumberMasked(stats.newMembersThisMonth, 'newMembersThisMonth')}</p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                This month
              </span>
              <span className="text-blue-600 font-medium text-xs flex items-center">
                <Flame className="h-3.5 w-3.5 mr-1" />
                {formatNumberMasked(stats.expiringThisMonth, 'expiringThisMonth')} expiring
              </span>
            </div>
          </div>
        )}
  
        {canViewRevenueStats && (
          <div 
            className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-purple-500 cursor-pointer group"
            onClick={() => setActiveTab('payments')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                <IndianRupee className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stats.revenueGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {stats.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth || 0)}%
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Monthly Revenue</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{formatCurrencyMasked(stats.monthlyRevenue, 'monthlyRevenue')}</p>
            <p className="text-xs text-gray-600 mt-2.5 pt-2 border-t border-gray-100 flex items-center">
              {stats.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 mr-1 text-red-500" />
              )}
              vs last month
            </p>
          </div>
        )}
  
        {canViewRevenueStats && (
          <div 
            className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-orange-500 cursor-pointer group"
            onClick={() => setActiveTab('payments')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200 transition-colors">
                <CreditCard className="h-4.5 w-4.5 text-orange-600" />
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                {formatNumberMasked(stats.pendingPayments, 'pendingPayments')} pending
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Yearly Revenue</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{formatCurrencyMasked(stats.totalRevenue, 'totalRevenue')}</p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-xs">
                <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                {new Date().getFullYear()}
              </span>
              <span className="text-orange-600 font-medium text-xs flex items-center">
                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                {formatNumberMasked(stats.expiringSoon, 'expiringSoon')} expiring
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row 1.5: Refund Stats Cards */}
      {canViewRevenueStats && stats.totalRefunds > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Refunds</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatCurrencyMasked(stats.totalRefunds, 'totalRefunds')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>{stats.refundCount} refund{stats.refundCount !== 1 ? 's' : ''} issued</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Net Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatCurrencyMasked(stats.netRevenue, 'netRevenue')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>After refunds</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Refund Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
                  {stats.totalRevenue > 0 ? ((stats.totalRefunds / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>Of gross revenue</span>
            </div>
          </div>
        </div>
      )}
  
      {/* Balance Overview Cards */}
      {canViewBalanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Balance Due</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatCurrencyMasked(stats.totalBalanceDue, 'totalBalanceDue')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>{formatNumberMasked(stats.membersWithBalance, 'membersWithBalance')} members have dues</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Members with Balance</p>
                {/* membersWithBalance - ALWAYS visible */}
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatNumberMasked(stats.membersWithBalance, 'membersWithBalance')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Need to collect payment</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Overdue Payments</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatNumberMasked(stats.overdueCount, 'overdueCount')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>Past due date</span>
            </div>
          </div>
  
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Upcoming Payments</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatNumberMasked(stats.upcomingPayments, 'upcomingPayments')}</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-white/80 text-xs">
              <span>Due in next 7 days</span>
            </div>
          </div>
        </div>
      )}
  
      {/* Row 3: Expense and Profit Cards */}
      {canViewExpenseStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <Wallet className="h-4.5 w-4.5 text-red-600" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stats.expenseGrowth <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {stats.expenseGrowth <= 0 ? '↓' : '↑'} {Math.abs(stats.expenseGrowth || 0)}%
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Monthly Expenses</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">{formatCurrencyMasked(stats.monthlyExpenses, 'monthlyExpenses')}</p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                This month
              </span>
              <span className="text-red-600 font-medium text-xs flex items-center">
                <TrendingDown className="h-3.5 w-3.5 mr-1" />
                Total: {formatCurrencyMasked(stats.totalExpenses, 'totalExpenses')}
              </span>
            </div>
          </div>

          {(canViewExpenseStats && canViewRevenueStats) && (
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  stats.profitMargin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stats.profitMargin >= 0 ? '↑' : '↓'} {Math.abs(stats.profitMargin || 0)}% margin
                </span>
              </div>
              <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Net Profit</h3>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-0.5">{formatCurrencyMasked(stats.netProfit, 'netProfit')}</p>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                <span className="text-gray-600 flex items-center text-xs truncate mr-1">
                  Rev: {formatCurrencyMasked(stats.monthlyRevenue, 'monthlyRevenue')}
                </span>
                <span className="text-emerald-600 font-medium text-xs flex items-center whitespace-nowrap">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Profit: {hideValues ? '**' : stats.profitMargin || 0}%
                </span>
              </div>
            </div>
          )}
  
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <BarChart3 className="h-4.5 w-4.5 text-cyan-600" />
              </div>
              <span className="text-xs font-semibold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full">
                {Object.keys(stats.expenseByCategory).length} categories
              </span>
            </div>
            <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Top Expense</h3>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 truncate">
              {Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
            </p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
              <span className="text-gray-600 flex items-center text-xs">
                <Wallet className="h-3.5 w-3.5 mr-1" />
                {Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0]?.[1] 
                  ? formatCurrencyMasked(Object.entries(stats.expenseByCategory).sort(([,a], [,b]) => b - a)[0][1], 'expenseTop') 
                  : '₹0'}
              </span>
              <button 
                onClick={() => setActiveTab('expenses')}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-0.5"
              >
                Details →
              </button>
            </div>
          </div>
          
          {(canViewExpenseStats && canViewRevenueStats) && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm hover:shadow-md p-4 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <DollarSign className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Financial Health
                </span>
              </div>
              <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider">Profit vs Expenses</h3>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-xs text-white">
                  <span>Profit Margin</span>
                  <span className="font-semibold">{hideValues ? '**' : stats.profitMargin || 0}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-green-400 rounded-full h-1.5 transition-all duration-500" 
                    style={{ width: `${hideValues ? 50 : Math.min(Math.max(stats.profitMargin || 0, 0), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-white/80 mt-1.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    Rev: {formatCurrencyMasked(stats.monthlyRevenue, 'monthlyRevenue')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                    Exp: {formatCurrencyMasked(stats.monthlyExpenses, 'monthlyExpenses')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
  
      {/* Row 4: Member Demographics and Expiring Memberships */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {canViewMemberStats && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 lg:col-span-1 transition-all">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-md">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                Demographics
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                {formatNumberMasked(stats.totalMembers, 'totalMembers')} total
              </span>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600 font-medium">Male</span>
                  <span className="font-semibold text-blue-600">{formatNumberMasked(stats.membersByGender?.male, 'membersByGender')}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full h-2 transition-all duration-500" 
                    style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.male || 0) / stats.totalMembers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600 font-medium">Female</span>
                  <span className="font-semibold text-pink-600">{formatNumberMasked(stats.membersByGender?.female, 'membersByGender')}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-full h-2 transition-all duration-500" 
                    style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.female || 0) / stats.totalMembers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600 font-medium">Other</span>
                  <span className="font-semibold text-purple-600">{formatNumberMasked(stats.membersByGender?.other, 'membersByGender')}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full h-2 transition-all duration-500" 
                    style={{ width: `${stats.totalMembers > 0 ? ((stats.membersByGender?.other || 0) / stats.totalMembers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-yellow-500" />
                Top Membership Plans
              </h4>
              <div className="space-y-1.5">
                {Object.entries(stats.membershipDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg text-xs">
                    <span className="text-gray-700 font-medium truncate max-w-[150px]">{plan}</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                      {formatNumberMasked(count)}
                    </span>
                  </div>
                ))}
                {Object.keys(stats.membershipDistribution).length === 0 && (
                  <p className="text-gray-400 text-xs text-center py-1">No plans assigned yet</p>
                )}
              </div>
            </div>
          </div>
        )}
  
        {canViewMemberStats && stats.expiringMembers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 lg:col-span-2 transition-all">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-orange-400 to-red-400 p-1.5 rounded-md">
                  <ClockIcon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Expiring Soon</h3>
              </div>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                {stats.expiringMembers.length} {stats.expiringMembers.length === 1 ? 'member' : 'members'} need attention
              </span>
            </div>
            
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1.5 custom-scrollbar">
              {stats.expiringMembers.map((member) => (
                <div 
                  key={member.id} 
                  className={`group relative flex items-center justify-between p-2.5 rounded-lg transition-all hover:shadow-sm cursor-pointer ${
                    member.daysLeft <= 3 
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500' 
                      : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400'
                  }`}
                  onClick={() => {
                    setSelectedMemberId(null);
                    setTimeout(() => {
                      setSelectedMemberId(member.memberId);
                      setActiveTab('members');
                    }, 0);
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img 
                      src={member.avatar} 
                      alt={member.memberName} 
                      className="w-9 h-9 rounded-full border border-white shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{member.memberName}</p>
                        {member.daysLeft <= 3 && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full animate-pulse flex-shrink-0">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 truncate">{member.planName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] bg-white/80 px-1.5 py-0.5 rounded text-gray-700 shadow-xs">
                          Expires: {member.endDate}
                        </span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          member.daysLeft <= 3 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {member.daysLeft}d left
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMemberId(null);
                      setTimeout(() => {
                        setSelectedMemberId(member.memberId);
                        setActiveTab('members');
                      }, 0);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-md flex-shrink-0 ml-2"
                  >
                    Renew →
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-2 border-t border-gray-100 text-center">
              <button 
                onClick={() => setActiveTab('members')}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center justify-center gap-1 py-1 hover:bg-blue-50 px-3 rounded-lg transition-colors"
              >
                View all expiring members
                <ChevronDown className="h-3.5 w-3.5 rotate-270" />
              </button>
            </div>
          </div>
        )}
  
        {canViewMemberStats && stats.expiringMembers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 lg:col-span-2 transition-all">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-orange-400 to-red-400 p-1.5 rounded-md">
                  <ClockIcon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Memberships Expiring Soon</h3>
              </div>
            </div>
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full mb-3 shadow-md">
                <Gift className="h-7 w-7 text-white" />
              </div>
              <p className="text-gray-900 font-bold text-base mb-1">All Memberships Active! 🎉</p>
              <p className="text-gray-500 text-xs">No memberships expiring in the next 7 days.</p>
            </div>
          </div>
        )}
      </div>
  
      {/* Row 5: Members with Balance & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {canViewBalanceStats && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-md">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white">Members with Balance</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('balance')}
                  className="text-white/90 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-white/80 text-xs mt-0.5">
                {formatNumberMasked(stats.membersWithBalance, 'membersWithBalance')} members with due • Total: {formatCurrencyMasked(stats.totalBalanceDue, 'totalBalanceDue')}
              </p>
            </div>
            
            <div className="p-3 max-h-[320px] overflow-y-auto custom-scrollbar">
              {membersWithBalanceList.length > 0 ? (
                <div className="space-y-2">
                  {membersWithBalanceList.map((member) => (
                    <div 
                      key={member.id} 
                      className="group relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                    >
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-9 h-9 rounded-full ring-2 ring-red-200 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900 truncate">{member.name}</p>
                          <span className="text-sm font-bold text-red-600">{formatCurrencyMasked(member.balanceDue, 'balanceDue')}</span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-gray-500">
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
                          <div className="mt-1">
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full flex items-center gap-1 w-fit font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue by {member.daysOverdue}d
                            </span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          setActiveTab('balance');
                          toast.success(`Viewing balance details for ${member.name}`);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-red-500 to-orange-500 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:shadow-md flex-shrink-0"
                      >
                        Collect
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-medium text-sm">All caught up! 🎉</p>
                  <p className="text-gray-500 text-xs">No members with outstanding balance</p>
                </div>
              )}
            </div>
            
            {membersWithBalanceList.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Total Outstanding:</span>
                  <span className="font-bold text-red-600">{formatCurrencyMasked(stats.totalBalanceDue, 'totalBalanceDue')}</span>
                </div>
              </div>
            )}
          </div>
        )}
  
        {canViewLeadStats && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-md">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white">Recent Leads</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('leads')}
                  className="text-white/90 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-white/80 text-xs mt-0.5">
                Track and manage incoming gym inquiries
              </p>
            </div>
            
            <div className="p-3 max-h-[320px] overflow-y-auto custom-scrollbar">
              {recentLeads.length > 0 ? (
                <div className="space-y-2">
                  {recentLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className="group relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-purple-50 transition-all border border-transparent hover:border-purple-200 cursor-pointer"
                      onClick={() => {
                        setActiveTab('leads');
                        setSelectedLeadId(lead.id);
                        toast.success(`Viewing lead: ${lead.name}`);
                      }}
                    >
                      <img 
                        src={lead.avatar} 
                        alt={lead.name} 
                        className="w-9 h-9 rounded-full ring-2 ring-purple-200 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm text-gray-900 truncate">{lead.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLeadQualityColor(lead.leadQuality)}`}>
                            {lead.leadQuality === 'hot' ? '🔥 Hot' : lead.leadQuality === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate max-w-[140px]">
                              <MailIcon className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${getLeadStatusColor(lead.status)}`}>
                            {getLeadStatusLabel(lead.status)}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-gray-900 font-medium text-sm">No leads yet</p>
                  <p className="text-gray-500 text-xs">Start tracking your first lead</p>
                  <button 
                    onClick={() => setActiveTab('leads')}
                    className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-md transition-all"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Lead
                  </button>
                </div>
              )}
            </div>
            
            {recentLeads.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 flex items-center justify-between text-xs">
                <span className="text-gray-600">New leads need attention</span>
                <button 
                  onClick={() => setActiveTab('leads')}
                  className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-0.5"
                >
                  Manage Leads
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
  
      {/* Row 6: Follow-Up Card */}
      {canViewLeadStats && (
        <div id="followup-card-section" className="grid grid-cols-1 gap-4 transition-all duration-300 rounded-xl">
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
              refreshDashboard();
            }}
          />
        </div>
      )}
  
      {/* Row 7: Birthday Notifications */}
      {(stats.upcomingBirthdays?.members?.length > 0 || stats.upcomingBirthdays?.staff?.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Gift className="h-4.5 w-4.5 text-pink-500" />
            🎂 Upcoming Birthdays
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canViewMemberStats && stats.upcomingBirthdays?.members?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all border-l-4 border-pink-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-pink-100 p-1.5 rounded-md">
                      <Users className="h-4 w-4 text-pink-600" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">Member Birthdays</h3>
                  </div>
                  <span className="text-xs bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full font-medium">
                    {stats.upcomingBirthdays.members.length} this week
                  </span>
                </div>
                
                <div className="space-y-2">
                  {stats.upcomingBirthdays.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 hover:shadow-xs transition-all">
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-9 h-9 rounded-full ring-2 ring-pink-200 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{member.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {member.birthdayDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          member.daysUntil === 0 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : member.daysUntil === 1
                            ? 'bg-orange-500 text-white'
                            : 'bg-pink-100 text-pink-700'
                        }`}>
                          {member.daysUntil === 0 ? 'Today! 🎉' : `${member.daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {canViewStaffStats && stats.upcomingBirthdays?.staff?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-1.5 rounded-md">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">Staff Birthdays</h3>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium">
                    {stats.upcomingBirthdays.staff.length} this week
                  </span>
                </div>
                
                <div className="space-y-2">
                  {stats.upcomingBirthdays.staff.map((staff) => (
                    <div key={staff.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 hover:shadow-xs transition-all">
                      <img 
                        src={staff.avatar} 
                        alt={staff.name} 
                        className="w-9 h-9 rounded-full ring-2 ring-purple-200 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{staff.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                          <Briefcase className="h-3 w-3" />
                          {staff.position || 'Staff Member'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          staff.daysUntil === 0 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : staff.daysUntil === 1
                            ? 'bg-orange-500 text-white'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {staff.daysUntil === 0 ? 'Today! 🎉' : `${staff.daysUntil}d`}
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
  
      {/* Row 8: Recent Activities and Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(canViewMemberStats || canViewRevenueStats) && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-indigo-100 p-1.5 rounded-md">
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                Recent Activity
              </h3>
            </div>
            
            <div className="space-y-2.5">
              {recentActivities.length > 0 && recentActivities[0]?.member !== 'No activities yet' ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-all">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${getActivityColor(activity.type)}`}>
                      {activity.avatar || activity.member?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{activity.member}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.action}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-xs text-center py-6">No recent activities</p>
              )}
            </div>
          </div>
        )}
  
        {(canSeeAttendance || canViewMemberStats) && (
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md p-4 transition-all">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <div className="bg-orange-100 p-1.5 rounded-md">
                  <CalendarIcon className="h-4 w-4 text-orange-600" />
                </div>
                Today's Classes
              </h3>
              <button 
                onClick={() => setActiveTab('classes')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Schedule
              </button>
            </div>
            
            <div className="space-y-2.5">
              {upcomingClasses.length > 0 ? (
                upcomingClasses.map((classItem) => (
                  <div key={classItem.id} className="p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-xs transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5 truncate">
                        <Dumbbell className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{classItem.name}</span>
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2">
                        {classItem.attendees || 0}/{classItem.capacity || 20} booked
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 text-gray-600 text-[11px]">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {classItem.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {classItem.trainer || 'TBA'}
                        </span>
                      </div>
                      <button className="text-[11px] bg-white px-2 py-0.5 rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                        Join
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No classes scheduled today</p>
                  <button 
                    onClick={() => setActiveTab('classes')}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
                  >
                    Schedule a class →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  
      {/* Row 9: Alerts Section */}
      {(stats.expiringThisMonth > 0 || stats.pendingPayments > 0 || stats.overdueCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {canViewBalanceStats && stats.overdueCount > 0 && (
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl p-4 shadow-md text-white">
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-base mb-0.5">Overdue Payments</h4>
                  <p className="text-white/90 text-xs mb-2.5">{formatNumberMasked(stats.overdueCount, 'overdueCount')} members have overdue payments</p>
                  <button 
                    onClick={() => setActiveTab('balance')}
                    className="bg-white text-red-600 px-3 py-1.5 rounded-md text-xs font-semibold hover:shadow-md transition-all"
                  >
                    View Balance →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {canViewMemberStats && stats.expiringSoon > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-yellow-600 rounded-xl p-4 shadow-md text-white">
              <div className="flex items-start gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <ClockIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-base mb-0.5">Expiring Memberships</h4>
                  <p className="text-white/90 text-xs mb-2.5">{formatNumberMasked(stats.expiringSoon, 'expiringSoon')} memberships expire within 7 days</p>
                  <button 
                    onClick={() => setActiveTab('members')}
                    className="bg-white text-orange-600 px-3 py-1.5 rounded-md text-xs font-semibold hover:shadow-md transition-all"
                  >
                    View Members →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────
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
        transition-all duration-300 shadow-xl flex flex-col
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
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
            className="hidden md:block text-white/70 hover:text-white flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-white/70 hover:text-white flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-white/10 flex-shrink-0 ${sidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`flex ${sidebarCollapsed ? 'flex-col items-center' : 'items-center gap-3'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
          {Object.entries(groupedNav).map(([section, items]) => {
            if (items.length === 0) return null;
            
            return (
              <div key={section} className="mb-3">
                {!sidebarCollapsed && (
                  <div className="px-3 py-2">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {sectionLabels[section] || section}
                    </span>
                  </div>
                )}
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-white/70 hover:text-white hover:bg-white/10 
                      transition-all duration-200
                      ${activeTab === item.id ? 'bg-white/15 text-white shadow-lg' : ''}
                      ${sidebarCollapsed ? 'justify-center' : ''}
                      group relative
                    `}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${activeTab === item.id ? 'text-blue-400' : ''}`} />
                    {!sidebarCollapsed && (
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    )}
                    {item.badge && !sidebarCollapsed && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-amber-500 text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded 
                                    opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity 
                                    whitespace-nowrap z-50 shadow-lg">
                        {item.name} {item.badge ? `(${item.badge})` : ''}
                      </div>
                    )}
                    {activeTab === item.id && !sidebarCollapsed && !item.badge && (
                      <div className="ml-auto w-1 h-6 bg-blue-400 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab('profile');
              setMobileMenuOpen(false);
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200
              ${sidebarCollapsed ? 'justify-center' : ''}
              group relative
            `}
            title={sidebarCollapsed ? 'Profile' : ''}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Profile</span>}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded 
                            opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity 
                            whitespace-nowrap z-50 shadow-lg">
                Profile
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-red-300 hover:text-red-400 hover:bg-white/10 transition-all duration-200 mt-1
              ${sidebarCollapsed ? 'justify-center' : ''}
              group relative
            `}
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded 
                            opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity 
                            whitespace-nowrap z-50 shadow-lg">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className={`
        transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
        ml-0
        min-h-screen
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
            
            <div className="flex-1 max-w-xl w-full hidden md:block">
              <SearchBar 
                onSelect={handleSearchSelect}
                placeholder="Search members, leads, staff..."
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="md:hidden flex-1">
                <SearchBar 
                  onSelect={handleSearchSelect}
                  placeholder="Search..."
                />
              </div>
              
              {/* Minor Glowing Plan Expiry Beacon (shows when gym's plan ends in <= 3 days or expired) */}
              {(isExpiringSoon || isExpired) && (
                <button
                  onClick={() => {
                    if (canSeeBilling) {
                      setActiveTab('billing');
                    } else {
                      setShowNotifications(true);
                    }
                  }}
                  title={isExpired ? 'Gym subscription has expired!' : `Gym plan ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}! Click to view.`}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    isExpired
                      ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.4)] hover:shadow-[0_0_20px_rgba(244,63,94,0.65)] hover:bg-rose-100'
                      : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.45)] hover:shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:bg-amber-100'
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isExpired ? 'bg-rose-500' : 'bg-amber-500'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isExpired ? 'bg-rose-600' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className="hidden sm:inline font-medium">
                    {isExpired ? 'Plan Expired' : `Plan Ends in ${daysRemaining}d`}
                  </span>
                  <span className="sm:hidden font-mono font-bold">
                    {isExpired ? 'Expired' : `${daysRemaining}d`}
                  </span>
                </button>
              )}

              {/* Hide/Show Values Eye Favicon Toggle */}
              <button
                onClick={toggleHideValues}
                className={`p-2 rounded-lg relative transition-all duration-200 ${
                  hideValues 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-1 ring-amber-300' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={hideValues ? 'Show values' : 'Hide values'}
                aria-label={hideValues ? 'Show values' : 'Hide values'}
              >
                {hideValues ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>

              {/* Notification Bell & Dropdown */}
              <div className="relative">
                <button 
                  ref={notifButtonRef}
                  onClick={() => setShowNotifications(prev => !prev)}
                  className={`p-2 rounded-lg hover:bg-gray-100 relative transition-colors ${
                    showNotifications ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                  }`}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {(isExpiringSoon || isExpired || (notificationsData.unread_count > 0)) && (
                    <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isExpired ? 'bg-rose-400' : isExpiringSoon ? 'bg-amber-400' : 'bg-blue-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-blue-500'
                      }`}></span>
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div 
                    ref={notifMenuRef}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-gray-700" />
                        <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                        {notificationsData.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            {notificationsData.unread_count} new
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => fetchNotifications()}
                        title="Refresh"
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto px-3 py-2 space-y-2.5">
                      {/* SaaS Plan Expiry Alert Card */}
                      {planAlert && (isExpiringSoon || isExpired) ? (
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          isExpired 
                            ? 'bg-rose-50/70 border-rose-200' 
                            : 'bg-amber-50/70 border-amber-200'
                        }`}>
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${
                              isExpired ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                  isExpired ? 'text-rose-700' : 'text-amber-700'
                                }`}>
                                  {isExpired ? 'Subscription Expired' : 'Plan Expiring Soon'}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isExpired ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                                }`}>
                                  {isExpired ? '0 days' : `${daysRemaining}d left`}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 mt-1 leading-snug">
                                {planAlert.message}
                              </p>
                              {planAlert.end_date && (
                                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Ends on {new Date(planAlert.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                              {canSeeBilling && (
                                <button
                                  onClick={() => {
                                    setActiveTab('billing');
                                    setShowNotifications(false);
                                  }}
                                  className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-white transition-all shadow-sm ${
                                    isExpired 
                                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' 
                                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                                  }`}
                                >
                                  <Crown className="h-3.5 w-3.5" /> Renew Subscription Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        planAlert && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800">
                                Plan Active ({planAlert.plan_name || 'Standard'})
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Subscription is in good standing'}
                              </p>
                            </div>
                          </div>
                        )
                      )}

                      {/* Recent Biometric Security Alerts (e.g. Access Denied) */}
                      {notificationsData.recent_alerts && notificationsData.recent_alerts.length > 0 && (
                        <div>
                          <div className="px-1 pt-1 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Biometric Security Alerts
                          </div>
                          <div className="space-y-1.5">
                            {notificationsData.recent_alerts.map((alert, idx) => (
                              <div 
                                key={alert.id || idx}
                                className="p-2.5 rounded-lg bg-red-50/60 border border-red-100 text-xs flex items-start gap-2"
                              >
                                <Shield className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-900 truncate">
                                      {alert.member_name}
                                    </span>
                                    <span className="text-[10px] text-rose-600 font-medium">Denied</span>
                                  </div>
                                  <p className="text-[11px] text-gray-600 mt-0.5">
                                    {alert.reason || 'Membership expired'} · {alert.device_name}
                                  </p>
                                  <span className="text-[10px] text-gray-400">
                                    {alert.time ? new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state if neither */}
                      {(!planAlert || (!isExpiringSoon && !isExpired)) && (!notificationsData.recent_alerts || notificationsData.recent_alerts.length === 0) && (
                        <div className="py-6 text-center text-gray-400">
                          <CheckCircle className="h-8 w-8 mx-auto text-emerald-400 mb-2 opacity-80" />
                          <p className="text-xs font-medium text-gray-600">All caught up!</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">No critical alerts for your gym</p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {canSeeBilling && (
                      <div className="px-3 pt-2 mt-1 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setActiveTab('billing');
                            setShowNotifications(false);
                          }}
                          className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-500" /> Manage Billing & Plan
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

          {/* User Dropdown */}
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

              {/* ✅ NEW — quick link to Billing from user menu */}
              {canSeeBilling && (
                <button
                  onClick={() => {
                    setActiveTab('billing');
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                >
                  <Crown className="h-4 w-4" />
                  Billing & Plan
                </button>
              )}

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
        <div className="p-4 sm:p-5 md:p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'members' && canSeeMembers && (
            <Members 
              initialMemberId={selectedMemberId} 
              onMemberSelect={(id) => setSelectedMemberId(id)}
            />
          )}
          {activeTab === 'pt' && <PTPage />}
          {activeTab === 'membership-plans' && (
            <MembershipPlans 
              initialCreate={openCreatePlan} 
              onCloseCreate={() => setOpenCreatePlan(false)} 
            />
          )}
          {activeTab === 'addons' && <AddOns />}
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
          {activeTab === 'diet-plans' && <DietPlans />}
          {activeTab === 'irregular-members' && canSeeAttendance && <IrregularMembers />}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'payments' && canSeePayments && <Payments />}
          {activeTab === 'leads' && canSeeLeads && (
            <Leads 
              initialLeadId={selectedLeadId}
              onLeadSelect={(id) => setSelectedLeadId(id)}
            />
          )}
          {activeTab === 'follow-ups' && canSeeLeads && (
            <FollowUpPage />
          )}
          {activeTab === 'trainer-schedule' && <TrainerSchedule />}
          {activeTab === 'historical-invoices' && <HistoricalInvoices />}
          {activeTab === 'whatsapp-logs' && <WhatsAppLogs />}
          {activeTab === 'whatsapp-notifications' && canSeeWhatsApp && <WhatsAppNotifications />}

          {/* ✅ NEW — Billing & Plan tab */}
          {activeTab === 'billing' && canSeeBilling && <BillingSettings />}
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