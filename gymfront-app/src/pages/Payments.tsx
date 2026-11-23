// src/pages/Payments.tsx - Complete updated with refund handling and proper revenue calculation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  Calendar,
  Download,
  Search,
  ChevronDown,
  X,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  Building,
  DollarSign,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Tag,
  Dumbbell,
  ChevronLeft,
  ChevronRight, Clock, XCircle, RefreshCw, TrendingDown,
  Receipt,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  PlusCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseUtcDate } from '../utils/dateUtils';
import CustomDatePicker from '../components/CustomDatePicker';
import AddPaymentModal from '../components/AddPaymentModal';

// Helper to extract strictly local YYYY-MM-DD (Asia/Kolkata) from payment date
const getPaymentLocalDateStr = (paymentDate: any): string => {
  if (!paymentDate) return '';
  if (typeof paymentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate.trim())) {
    return paymentDate.trim();
  }
  try {
    const d = parseUtcDate(paymentDate);
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }
  } catch (e) { }
  return String(paymentDate).split('T')[0].split(' ')[0];
};

// Helper to get today's YYYY-MM-DD in Asia/Kolkata
const getTodayDateStr = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper to get yesterday's YYYY-MM-DD in Asia/Kolkata
const getYesterdayDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper to get start of current week (Monday) in Asia/Kolkata
const getStartOfWeekStr = (): string => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper to get last month start & end dates in Asia/Kolkata
const getLastMonthRange = (): { start: string; end: string } => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    start: firstDay.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    end: lastDay.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  };
};

// Helper to check if a payment happened today in Asia/Kolkata
const isPaymentToday = (payment: any): boolean => {
  if (!payment || !payment.payment_date) return false;
  const pLocal = getPaymentLocalDateStr(payment.payment_date);
  return Boolean(pLocal && pLocal === getTodayDateStr());
};

export interface Payment {
  id: number | string;
  payment_date: string;
  amount: number;
  payment_method: string;
  status?: string;
  member_id?: number | string;
  member_name?: string;
  member_phone?: string;
  member_email?: string;
  member_plan?: any;
  member_balance?: number;
  member?: {
    id?: number | string;
    full_name?: string;
    phone?: string;
    email?: string;
    balance_amount?: number;
  };
  membership?: any;
  notes?: string;
  transaction_id?: string;
  is_inflow?: boolean;
  is_refund?: boolean;
  is_renewal?: boolean;
  is_balance_payment?: boolean;
  payment_category?: string;
  payment_type?: string;
  addon_name?: string;
  original_invoice_id?: string | null;
  subtotal?: number;
  gst_amount?: number;
  gst_rate?: number;
  created_at?: string;
  [key: string]: any;
}

const Payments = () => {
  const { user, setUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const todayStr = getTodayDateStr();
    const [year, month] = todayStr.split('-');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => getTodayDateStr());
  const isInitialMount = useRef(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState('start');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Delete-related state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<any>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    inflowRevenue: 0,
    inflowCount: 0,
    totalCount: 0,
    averagePayment: 0,
    cashPayments: 0,
    cardPayments: 0,
    upiPayments: 0,
    otherPayments: 0,
    growth: 0,
    totalGST: 0,
    totalBalancePayments: 0,
    totalAddonPayments: 0,
    addonPaymentCount: 0,
    renewalPayments: 0,
    renewalCount: 0,
    // ✅ Refund tracking
    totalRefunds: 0,
    refundCount: 0,
    netRevenue: 0,
  });

  // ✅ NEW: Today's collection summary
  const [todaySummary, setTodaySummary] = useState({
    grossRevenue: 0,
    netRevenue: 0,
    totalRefunds: 0,
    count: 0,
    refundCount: 0,
    cash: 0,
    upi: 0,
    card: 0,
    other: 0,
  });

  // Helper to calculate today's collection from master payment list
  const calculateTodaySummary = (allPayments: any[]) => {
    if (!Array.isArray(allPayments) || allPayments.length === 0) {
      return {
        grossRevenue: 0,
        netRevenue: 0,
        totalRefunds: 0,
        count: 0,
        refundCount: 0,
        cash: 0,
        upi: 0,
        card: 0,
        other: 0,
      };
    }

    const todayDateStr = getTodayDateStr();
    const todayPayments = allPayments.filter(p => {
      if (!p || !p.payment_date) return false;
      const pDate = getPaymentLocalDateStr(p.payment_date);
      return Boolean(pDate && pDate === todayDateStr);
    });

    const positiveToday = todayPayments.filter(p => !p.is_refund && Number(p.amount) > 0);
    const refundToday = todayPayments.filter(p => p.is_refund || Number(p.amount) < 0);

    const grossRevenue = positiveToday.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalRefunds = refundToday.reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
    const netRevenue = grossRevenue - totalRefunds;
    const count = positiveToday.length;
    const refundCount = refundToday.length;

    const cash = positiveToday
      .filter(p => p.payment_method?.toLowerCase() === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const upi = positiveToday
      .filter(p => p.payment_method?.toLowerCase() === 'upi')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const card = positiveToday
      .filter(p => p.payment_method?.toLowerCase() === 'card')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const other = positiveToday
      .filter(p => !['cash', 'card', 'upi'].includes(p.payment_method?.toLowerCase()))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      grossRevenue,
      netRevenue,
      totalRefunds,
      count,
      refundCount,
      cash,
      upi,
      card,
      other,
    };
  };

  const currencySymbol = user?.currency_symbol || '₹';
  const gymGST = user?.gym_gst_number || user?.gst_number || 'Not Available';
  const gymName = user?.gym_name || 'Gym Management System';
  const [gstRate, setGstRate] = useState<number>(
    user?.gst_rate !== undefined && user?.gst_rate !== null ? Number(user.gst_rate) : 5.0
  );
  const [showGstModal, setShowGstModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [updatingGst, setUpdatingGst] = useState(false);

  // Sync gstRate whenever user profile updates
  useEffect(() => {
    if (user?.gst_rate !== undefined && user?.gst_rate !== null) {
      setGstRate(Number(user.gst_rate));
    }
  }, [user?.gst_rate]);

  // Fetch today's summary independently so the Today card is always accurate
  const fetchTodaySummary = useCallback(async () => {
    try {
      const todayDateStr = getTodayDateStr();
      const res = await api.get(`/gym/payments?start_date=${todayDateStr}&end_date=${todayDateStr}&limit=500`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setTodaySummary(calculateTodaySummary(res.data));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // ✅ Load current month payments on initial mount
  useEffect(() => {
    fetchPayments(startDate, endDate);
    fetchTodaySummary();
  }, []);

  // ✅ Fetch payments whenever startDate or endDate changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchPayments(startDate, endDate);
    }, 250);
    return () => clearTimeout(timer);
  }, [startDate, endDate]);

  // ✅ Refresh when date range or filters change
  useEffect(() => {
    if (payments.length > 0 || startDate) {
      filterPayments();
    }
  }, [payments, startDate, endDate, searchTerm, selectedMethod, directionFilter, paymentTypeFilter]);

  // Exit selection mode when payments change
  useEffect(() => {
    setSelectionMode(false);
    setSelectedPayments(new Set());
  }, [payments]);

  // ✅ Listen for payment added events
  useEffect(() => {
    const handlePaymentAdded = () => {
      console.log('🔄 Payment added event received, refreshing...');
      fetchPayments(startDate, endDate);
      fetchTodaySummary();
    };

    window.addEventListener('paymentAdded', handlePaymentAdded);
    window.addEventListener('paymentUpdated', handlePaymentAdded);
    window.addEventListener('paymentDeleted', handlePaymentAdded);

    return () => {
      window.removeEventListener('paymentAdded', handlePaymentAdded);
      window.removeEventListener('paymentUpdated', handlePaymentAdded);
      window.removeEventListener('paymentDeleted', handlePaymentAdded);
    };
  }, [startDate, endDate, fetchTodaySummary]);

  const fetchPayments = useCallback(async (sDate?: string, eDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      const queryStart = sDate !== undefined ? sDate : startDate;
      const queryEnd = eDate !== undefined ? eDate : endDate;

      const params = new URLSearchParams();
      if (queryStart) params.append('start_date', queryStart);
      if (queryEnd) params.append('end_date', queryEnd);
      params.append('limit', '10000');

      // ✅ Fetch payments with date range parameters
      const response = await api.get(`/gym/payments?${params.toString()}`);
      console.log('📊 Payments response:', response.data);

      let paymentsData = Array.isArray(response.data) ? response.data : [];

      // ✅ Process payments to detect strict direction (IN vs OUT), types and balance payments
      paymentsData = paymentsData.map(payment => {
        const amount = Number(payment.amount) || 0;
        let isRefund = false;

        // Strict refund check: negative amount or REFUND indicator
        if (amount < 0) {
          isRefund = true;
        }
        if (payment.notes && /refund/i.test(payment.notes)) {
          isRefund = true;
        }
        if (payment.transaction_id && (
          payment.transaction_id.toUpperCase().startsWith('REF-') ||
          payment.transaction_id.toUpperCase().includes('REFUND')
        )) {
          isRefund = true;
        }

        const isInflow = !isRefund && amount > 0;

        // Check if it's a renewal payment
        let isRenewal = false;
        if (payment.notes && /renew/i.test(payment.notes)) {
          isRenewal = true;
        }

        // Check for balance clearance payments
        const isBalance = Boolean(
          payment.is_balance_payment ||
          (payment.notes && /balance\s*(payment|collected|collection|clearance)/i.test(payment.notes)) ||
          (payment.transaction_id?.startsWith('PAY-') && !isRefund)
        );

        let paymentType = 'membership';
        let addonName = null;

        if (isRefund) {
          paymentType = 'refund';
        }
        // Check for add-on payments
        else if (payment.transaction_id?.startsWith('ADDON-PAY-') ||
          payment.transaction_id?.startsWith('ADDON-')) {
          paymentType = 'addon';
          const notes = payment.notes || '';
          const addonMatch = notes.match(/Addon payment for ([^:]+)/);
          addonName = addonMatch ? addonMatch[1].trim() : 'Addon';
        }
        // Check for PT payments
        else if (
          payment.transaction_id?.toUpperCase().startsWith('PT-') ||
          payment.transaction_id?.toUpperCase().startsWith('PT_') ||
          (payment.notes && /pt[\s\-_]payment|personal[\s\-_]training|\bpt\b/i.test(payment.notes)) ||
          payment.membership_id === null
        ) {
          paymentType = 'pt';
        }
        // Check for renewals
        else if (isRenewal) {
          paymentType = 'renewal';
        }
        // Check for balance clearance
        else if (isBalance) {
          paymentType = 'balance';
        }
        // Standard membership payment
        else {
          paymentType = 'membership';
        }

        // Safe plan name extraction (prevent objects from crashing React child rendering)
        const rawPlan = payment.membership_plan_name || payment.member?.membership_plan_name || payment.member?.plan;
        let safePlanStr = 'N/A';
        if (typeof rawPlan === 'string' && rawPlan.trim()) {
          safePlanStr = rawPlan.trim();
        } else if (rawPlan && typeof rawPlan === 'object' && rawPlan.name) {
          safePlanStr = String(rawPlan.name).trim();
        } else if (payment.member?.current_membership?.plan?.name) {
          safePlanStr = String(payment.member.current_membership.plan.name).trim();
        }

        const rawName = payment.member?.full_name || payment.member_name;
        const safeMemberName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Unknown Member';

        const rawPhone = payment.member?.phone || payment.member_phone;
        const safeMemberPhone = typeof rawPhone === 'string' || typeof rawPhone === 'number' ? String(rawPhone).trim() : '';

        return {
          ...payment,
          amount: amount,
          is_inflow: isInflow,
          is_refund: isRefund,
          is_renewal: isRenewal,
          is_balance_payment: isBalance,
          payment_type: paymentType,
          addon_name: addonName,
          member_name: safeMemberName,
          member_phone: safeMemberPhone,
          member_email: typeof payment.member?.email === 'string' ? payment.member.email : (payment.member_email || ''),
          member_plan: safePlanStr,
          member_balance: Number(payment.member?.balance_amount ?? payment.balance_amount) || 0,
          gst_amount: Number(payment.gst_amount ?? payment.tax_amount) || 0,
          original_invoice_id: payment.original_invoice_id || null,
        };
      });

      console.log('✅ Processed payments:', paymentsData.length);
      console.log('💰 Refunds found:', paymentsData.filter(p => p.is_refund).length);
      setPayments(paymentsData);
      const todaySummaryData = calculateTodaySummary(paymentsData);
      const todayDateStr = getTodayDateStr();
      if (todaySummaryData.count > 0 || (queryStart && queryEnd && queryStart <= todayDateStr && todayDateStr <= queryEnd) || (!queryStart && !queryEnd)) {
        setTodaySummary(todaySummaryData);
      }
    } catch (error) {
      console.error('❌ Error fetching payments:', error);
      setError('Failed to load payments. Please try again.');
      toast.error('Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const filterPayments = useCallback(() => {
    try {
      // Keep today's sales summary synchronized with all available payments
      const todaySummaryData = calculateTodaySummary(payments);
      const todayDateStr = getTodayDateStr();
      if (todaySummaryData.count > 0 || (startDate && endDate && startDate <= todayDateStr && todayDateStr <= endDate) || (!startDate && !endDate)) {
        setTodaySummary(todaySummaryData);
      }

      let filtered: Payment[] = [...payments];

      // ✅ Filter strictly by date range using Asia/Kolkata local date
      if (filtered.length > 0) {
        if (startDate && endDate) {
          filtered = filtered.filter((payment: Payment) => {
            const pDate = getPaymentLocalDateStr(payment.payment_date);
            return Boolean(pDate && pDate >= startDate && pDate <= endDate);
          });
        } else if (startDate) {
          filtered = filtered.filter((payment: Payment) => {
            const pDate = getPaymentLocalDateStr(payment.payment_date);
            return Boolean(pDate && pDate >= startDate);
          });
        } else if (endDate) {
          filtered = filtered.filter((payment: Payment) => {
            const pDate = getPaymentLocalDateStr(payment.payment_date);
            return Boolean(pDate && pDate <= endDate);
          });
        }
      }

      // ✅ Filter by search term (Member Name, Phone, Transaction ID, Notes)
      if (searchTerm && filtered.length > 0) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(payment => {
          const memberName = (payment.member_name || payment.member?.full_name || '').toLowerCase();
          const memberPhone = (payment.member_phone || payment.member?.phone || '').toLowerCase();
          const txnId = (payment.transaction_id || '').toLowerCase();
          const notes = (payment.notes || '').toLowerCase();
          return memberName.includes(term) || memberPhone.includes(term) || txnId.includes(term) || notes.includes(term);
        });
      }

      // ✅ Filter by payment method
      if (selectedMethod !== 'all' && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const method = payment.payment_method?.toLowerCase() || '';
          return method === selectedMethod.toLowerCase();
        });
      }

      // ✅ Filter strictly by Flow Direction (Money In vs Money Out)
      if (directionFilter !== 'all' && filtered.length > 0) {
        if (directionFilter === 'inflow') {
          filtered = filtered.filter(p => !p.is_refund && Number(p.amount) > 0);
        } else if (directionFilter === 'outflow') {
          filtered = filtered.filter(p => p.is_refund || Number(p.amount) < 0);
        }
      }

      // ✅ Filter by payment category / type
      if (paymentTypeFilter !== 'all' && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          if (paymentTypeFilter === 'membership') {
            return payment.payment_type === 'membership' && !payment.is_refund;
          } else if (paymentTypeFilter === 'pt') {
            return payment.payment_type === 'pt' && !payment.is_refund;
          } else if (paymentTypeFilter === 'addon') {
            return payment.payment_type === 'addon' && !payment.is_refund;
          } else if (paymentTypeFilter === 'renewal') {
            return payment.is_renewal === true && !payment.is_refund;
          } else if (paymentTypeFilter === 'balance') {
            return (payment.is_balance_payment === true || payment.payment_type === 'balance') && !payment.is_refund;
          } else if (paymentTypeFilter === 'refunds') {
            return payment.is_refund === true || Number(payment.amount) < 0;
          }
          return true;
        });
      }

      // ============================================================
      // ✅ CALCULATE STRICT FINANCIAL LEDGER SUMMARY
      // ============================================================

      // Strict mathematical separation: Inflows (Money In) vs Outflows (Money Out / Refunds)
      const positivePayments = filtered.filter(p => Number(p.amount) > 0 && !p.is_refund);
      const refundPayments = filtered.filter(p => Number(p.amount) < 0 || p.is_refund);

      // Gross Inflow = sum of all positive incoming payments
      const totalRevenue = positivePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Gross Outflow = sum of all refunds & reversed payments
      const totalRefunds = refundPayments.reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
      const refundCount = refundPayments.length;
      const inflowCount = positivePayments.length;

      // Strict Net Revenue Kept = Gross Inflow - Gross Outflow
      const netRevenue = totalRevenue - totalRefunds;

      const totalCount = filtered.length;
      const averagePayment = positivePayments.length > 0 ? totalRevenue / positivePayments.length : 0;

      // Payment method breakdown (only positive payments)
      const cashPayments = positivePayments
        .filter(p => p.payment_method?.toLowerCase() === 'cash')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const cardPayments = positivePayments
        .filter(p => p.payment_method?.toLowerCase() === 'card')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const upiPayments = positivePayments
        .filter(p => p.payment_method?.toLowerCase() === 'upi')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const otherPayments = positivePayments
        .filter(p => !['cash', 'card', 'upi'].includes(p.payment_method?.toLowerCase()))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const totalGST = positivePayments.reduce((sum, p) => sum + (Number(p.gst_amount) || 0), 0);

      const totalBalancePayments = positivePayments
        .filter(p => p.is_balance_payment === true || p.payment_type === 'balance')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const addonPayments = positivePayments
        .filter(p => p.payment_type === 'addon')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const addonPaymentCount = positivePayments.filter(p => p.payment_type === 'addon').length;

      // ✅ Calculate renewal payments
      const renewalPayments = positivePayments
        .filter(p => p.is_renewal === true)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const renewalCount = positivePayments.filter(p => p.is_renewal === true).length;

      // ✅ Calculate growth based on net revenue
      let growth = 0;
      if (payments.length > 0 && startDate && endDate) {
        const startD = new Date(startDate);
        const endD = new Date(endDate);
        const daysDiff = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const prevStart = new Date(startD);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        const prevEnd = new Date(startD);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStartStr = prevStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const prevEndStr = prevEnd.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        const previousPositive = payments
          .filter(p => {
            const pDate = getPaymentLocalDateStr(p.payment_date);
            return pDate &&
              pDate >= prevStartStr &&
              pDate <= prevEndStr &&
              Number(p.amount) > 0 &&
              !p.is_refund;
          })
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const previousRefunds = payments
          .filter(p => {
            const pDate = getPaymentLocalDateStr(p.payment_date);
            return pDate &&
              pDate >= prevStartStr &&
              pDate <= prevEndStr &&
              (Number(p.amount) < 0 || p.is_refund);
          })
          .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

        const previousNetRevenue = previousPositive - previousRefunds;

        growth = previousNetRevenue > 0
          ? ((netRevenue - previousNetRevenue) / previousNetRevenue * 100)
          : netRevenue > 0 ? 100 : 0;
      }

      setSummary({
        totalRevenue,
        inflowRevenue: totalRevenue,
        inflowCount,
        totalCount,
        averagePayment: averagePayment || 0,
        cashPayments,
        cardPayments,
        upiPayments,
        otherPayments,
        growth: parseFloat(growth.toFixed(1)),
        totalGST,
        totalBalancePayments,
        totalAddonPayments: addonPayments,
        addonPaymentCount,
        renewalPayments,
        renewalCount,
        totalRefunds,
        refundCount,
        netRevenue,
      });

      // ✅ Sort by date (newest first) safely without NaN
      const sortedFiltered = [...filtered].sort((a, b) => {
        const timeA = a.payment_date ? (parseUtcDate(a.payment_date)?.getTime() || 0) : 0;
        const timeB = b.payment_date ? (parseUtcDate(b.payment_date)?.getTime() || 0) : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      setFilteredPayments(sortedFiltered);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error filtering payments:', err);
      setFilteredPayments([]);
    }
  }, [payments, startDate, endDate, searchTerm, selectedMethod, directionFilter, paymentTypeFilter]);

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    if (!amount && amount !== 0) return `${currencySymbol} 0`;
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(num));

    // ✅ Show negative amounts with parentheses for refunds
    if (num < 0) {
      return `(${currencySymbol} ${formatted})`;
    }
    return `${currencySymbol} ${formatted}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    try {
      const str = String(dateString).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        const date = new Date(y, m - 1, d, 12, 0, 0);
        return date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      const d = parseUtcDate(dateString);
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  const formatTimeOnly = (dateString: any) => {
    if (!dateString) return '';
    try {
      const str = String(dateString).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return '';
      if (str.includes('T00:00:00') || str.endsWith(' 00:00:00')) return '';
      const d = parseUtcDate(dateString);
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  const formatDateTime = (dateString: any) => {
    if (!dateString) return '';
    try {
      const d = parseUtcDate(dateString);
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  // Safe clipboard copy that works across both HTTPS and HTTP/insecure contexts
  const handleCopyTxn = (txnId: string) => {
    if (!txnId) return;
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(txnId);
        toast.success('Txn ID copied');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = txnId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast.success('Txn ID copied');
      }
    } catch (e) {
      toast.error('Failed to copy ID');
    }
  };

  // ===== TOGGLE SELECTION MODE =====
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPayments(new Set());
  };

  // ===== SELECT ALL VISIBLE =====
  const selectAllVisible = () => {
    const allIds = filteredPayments.map(p => p.id);
    setSelectedPayments(new Set(allIds));
  };

  // ===== DESELECT ALL =====
  const deselectAll = () => {
    setSelectedPayments(new Set());
  };

  // ===== TOGGLE PAYMENT SELECTION =====
  const togglePaymentSelection = (paymentId: number | string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  // ===== SINGLE PAYMENT DELETE =====
  const handleSingleDelete = async (paymentId: number | string, paymentAmount: number | string, memberName?: string) => {
    const numAmount = Number(paymentAmount) || 0;
    const isRefund = numAmount < 0;
    const amountDisplay = isRefund ? `refund of ${formatCurrency(Math.abs(numAmount))}` : `payment of ${formatCurrency(numAmount)}`;
    const safeName = memberName || 'Member';

    if (!window.confirm(
      `Are you sure you want to delete the ${amountDisplay} for ${safeName}?\n\n` +
      `This action cannot be undone and will update the member's balance.`
    )) {
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete(`/gym/payments/${paymentId}`);

      if (response.data) {
        toast.success(`${isRefund ? 'Refund' : 'Payment'} of ${formatCurrency(Math.abs(numAmount))} deleted successfully`);

        // ✅ Refresh the payments list
        await fetchPayments();

        // ✅ Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('paymentDeleted', {
          detail: { paymentId, memberId: response.data.member_id }
        }));
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      const err = error as any;
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  // ===== BULK DELETE =====
  const handleBulkDelete = async () => {
    const paymentIds = Array.from(selectedPayments);
    const selectedPaymentsData = filteredPayments.filter(p => selectedPayments.has(p.id));
    const totalAmount = selectedPaymentsData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    setShowDeleteConfirm(false);
    setDeleting(true);

    try {
      const response = await api.delete('/gym/payments/bulk-delete', {
        data: { payment_ids: paymentIds }
      });

      toast.success(response.data.message);
      setSelectionMode(false);
      setSelectedPayments(new Set());
      await fetchPayments();
    } catch (error) {
      console.error('Error bulk deleting payments:', error);
      const err = error as any;
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to delete payments');
    } finally {
      setDeleting(false);
    }
  };

  // ===== GET PAYMENT TYPE BADGE =====
  const getPaymentTypeBadge = (payment: any) => {
    if (payment.is_refund) {
      return { label: 'Refund', color: 'bg-rose-100 text-rose-700 border border-rose-200' };
    }
    if (payment.is_renewal) {
      return { label: 'Renewal', color: 'bg-purple-100 text-purple-700 border border-purple-200' };
    }
    switch (payment.payment_type) {
      case 'addon':
        return { label: 'Add-On', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' };
      case 'pt':
        return { label: 'PT', color: 'bg-blue-100 text-blue-700 border border-blue-200' };
      case 'balance':
        return { label: 'Balance Payment', color: 'bg-teal-100 text-teal-700 border border-teal-200' };
      default:
        if (payment.is_balance_payment) {
          return { label: 'Balance Payment', color: 'bg-teal-100 text-teal-700 border border-teal-200' };
        }
        return { label: 'Membership', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    }
  };

  // ===== GET PAYMENT METHOD ICON =====
  const getPaymentMethodIcon = (method: any) => {
    const icons: Record<string, string> = {
      cash: '💰',
      card: '💳',
      upi: '📱',
      bank: '🏦',
      online: '🌐',
      credit: '💳'
    };
    const key = typeof method === 'string' ? method.toLowerCase().trim() : '';
    return icons[key] || '💵';
  };

  // ===== GET STATUS BADGE =====
  const getStatusBadge = (status: any) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      overdue: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-500', icon: XCircle },
    };
    const statusKey = typeof status === 'string' && status.trim() ? status.trim().toLowerCase() : 'paid';
    const config = statusConfig[statusKey] || statusConfig.paid;
    const Icon = config.icon;
    const displayLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {displayLabel}
      </span>
    );
  };

  // ===== HANDLE EXPORT =====
  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.error('No data to export for the selected date range');
      return;
    }

    try {
      const startDateFormatted = startDate ? formatDate(startDate) : 'All Records';
      const endDateFormatted = endDate ? formatDate(endDate) : 'All Records';
      const exportDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const totalRevenue = summary.totalRevenue;
      const totalRefunds = summary.totalRefunds;
      const netRevenue = summary.netRevenue;
      const totalTransactions = filteredPayments.length;

      const halfRate = gstRate / 2;
      const taxableAmount = gstRate === 0
        ? totalRevenue
        : (summary.totalGST > 0 ? totalRevenue - summary.totalGST : totalRevenue / (1 + gstRate / 100));
      const gstCollected = gstRate === 0
        ? 0
        : (summary.totalGST > 0 ? summary.totalGST : totalRevenue - taxableAmount);
      const cgstAmount = gstCollected / 2;
      const sgstAmount = gstCollected / 2;

      const csvRows = [];

      csvRows.push(['"PAYMENT REPORT"']);
      csvRows.push(['']);
      csvRows.push(['"Gym Information:"']);
      csvRows.push([`"Gym Name:","${gymName.replace(/"/g, '""')}"`]);
      csvRows.push([`"GST Number:","${gymGST}"`]);
      csvRows.push(['']);
      csvRows.push(['"Report Information:"']);
      csvRows.push([`"Generated On:","${exportDate}"`]);
      csvRows.push([`"Date Range:","${startDateFormatted} to ${endDateFormatted}"`]);
      csvRows.push(['']);
      csvRows.push(['"Financial Summary:"']);
      csvRows.push([`"Total Revenue:","${formatCurrency(totalRevenue)}"`]);
      csvRows.push([`"Total Refunds:","${formatCurrency(totalRefunds)}"`]);
      csvRows.push([`"Net Revenue:","${formatCurrency(netRevenue)}"`]);
      csvRows.push([`"Total Transactions:","${totalTransactions}"`]);
      csvRows.push([`"Refund Count:","${summary.refundCount}"`]);
      csvRows.push(['']);
      csvRows.push(['"GST Summary:"']);
      csvRows.push([`"GST Rate:","${gstRate}% (CGST ${gstRate / 2}% + SGST ${gstRate / 2}%)"`]);
      csvRows.push([`"Total GST Collected:","${formatCurrency(gstCollected)}"`]);
      csvRows.push([`"Taxable Amount (excl. GST):","${formatCurrency(taxableAmount)}"`]);
      csvRows.push([`"CGST (${gstRate / 2}%):","${formatCurrency(cgstAmount)}"`]);
      csvRows.push([`"SGST (${gstRate / 2}%):","${formatCurrency(sgstAmount)}"`]);
      csvRows.push(['']);
      csvRows.push(['"Balance Payment Summary:"']);
      csvRows.push([`"Total Balance Payments:","${formatCurrency(summary.totalBalancePayments)}"`]);
      csvRows.push([`"Balance Payment Count:","${filteredPayments.filter(p => p.is_balance_payment && Number(p.amount) > 0).length}"`]);
      csvRows.push(['']);
      csvRows.push(['"Add-On Payment Summary:"']);
      csvRows.push([`"Total Add-On Payments:","${formatCurrency(summary.totalAddonPayments)}"`]);
      csvRows.push([`"Add-On Payment Count:","${summary.addonPaymentCount}"`]);
      csvRows.push(['']);
      csvRows.push(['"Renewal Payment Summary:"']);
      csvRows.push([`"Total Renewal Payments:","${formatCurrency(summary.renewalPayments)}"`]);
      csvRows.push([`"Renewal Payment Count:","${summary.renewalCount}"`]);
      csvRows.push(['']);
      csvRows.push(['"Refund Summary:"']);
      csvRows.push([`"Total Refunds:","${formatCurrency(summary.totalRefunds)}"`]);
      csvRows.push([`"Refund Count:","${summary.refundCount}"`]);
      csvRows.push(['']);

      csvRows.push(['"Payment Method Breakdown"']);
      csvRows.push(['"Method","Amount","Count","Percentage"']);
      const methodBreakdown = [
        { method: 'Cash', amount: summary.cashPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'cash' && Number(p.amount) > 0).length },
        { method: 'Card', amount: summary.cardPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'card' && Number(p.amount) > 0).length },
        { method: 'UPI', amount: summary.upiPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'upi' && Number(p.amount) > 0).length },
        { method: 'Other', amount: summary.otherPayments, count: filteredPayments.filter(p => !['cash', 'card', 'upi'].includes(p.payment_method?.toLowerCase()) && Number(p.amount) > 0).length }
      ];
      methodBreakdown.forEach(item => {
        const percentage = totalRevenue > 0 ? (item.amount / totalRevenue * 100).toFixed(2) : '0';
        csvRows.push([`"${item.method}"`, `"${formatCurrency(item.amount)}"`, item.count, `"${percentage}%"`]);
      });
      csvRows.push(['']);

      csvRows.push(['"Detailed Transactions"']);
      csvRows.push([
        '"Date"',
        '"Transaction ID"',
        '"Direction (IN/OUT)"',
        '"Member Name"',
        '"Member Phone"',
        '"Member Email"',
        '"Member Plan"',
        '"Amount"',
        '"Payment Method"',
        '"Status"',
        '"Payment Time"',
        '"GST Amount"',
        `"CGST (${gstRate / 2}%)"`,
        `"SGST (${gstRate / 2}%)"`,
        '"Is Balance Payment"',
        '"Is Renewal"',
        '"Is Refund"',
        '"Payment Type"',
        '"Notes"'
      ]);

      filteredPayments.forEach(payment => {
        const dateStr = formatDate(payment.payment_date) || 'N/A';
        let timeStr = 'N/A';
        try {
          const d = parseUtcDate(payment.payment_date);
          if (d && !isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }
        } catch (e) {}

        const isRefund = payment.is_refund || Number(payment.amount) < 0;
        const directionStr = isRefund ? 'OUT (Refund)' : 'IN (Collection)';

        const typeLabel = isRefund ? 'REFUND' :
          payment.is_renewal ? 'Renewal' :
            payment.payment_type === 'addon' ? 'Add-On' :
              payment.payment_type === 'pt' ? 'PT' :
                payment.is_balance_payment ? 'Balance Payment' : 'Membership';

        const absVal = Math.abs(Number(payment.amount) || 0);
        const signedAmount = isRefund ? -absVal : absVal;
        const memberPlanText = typeof payment.member_plan === 'string' ? payment.member_plan : 'N/A';
        const memberNameText = typeof payment.member_name === 'string' ? payment.member_name : (payment.member?.full_name || 'Unknown Member');

        csvRows.push([
          `"${dateStr}"`,
          `"${payment.transaction_id || `PAY-${payment.id}`}"`,
          `"${directionStr}"`,
          `"${memberNameText.replace(/"/g, '""')}"`,
          `"${payment.member_phone || payment.member?.phone || 'N/A'}"`,
          `"${payment.member_email || payment.member?.email || 'N/A'}"`,
          `"${memberPlanText}"`,
          `"${signedAmount}"`,
          `"${(payment.payment_method || 'N/A').toUpperCase()}"`,
          `"${payment.status || 'Completed'}"`,
          `"${timeStr}"`,
          `"${payment.gst_amount || 0}"`,
          `"${((payment.gst_amount || 0) / 2).toFixed(2)}"`,
          `"${((payment.gst_amount || 0) / 2).toFixed(2)}"`,
          `"${payment.is_balance_payment ? 'Yes' : 'No'}"`,
          `"${payment.is_renewal ? 'Yes' : 'No'}"`,
          `"${isRefund ? 'Yes' : 'No'}"`,
          `"${typeLabel}"`,
          `"${(payment.notes || '').replace(/"/g, '""')}"`
        ]);
      });

      csvRows.push(['']);
      csvRows.push(['"Final Summary"']);
      csvRows.push([`"Total Records:","${filteredPayments.length}"`]);
      csvRows.push([`"Total Revenue:","${formatCurrency(totalRevenue)}"`]);
      csvRows.push([`"Total Refunds:","${formatCurrency(totalRefunds)}"`]);
      csvRows.push([`"Net Revenue:","${formatCurrency(netRevenue)}"`]);
      csvRows.push([`"Total GST (${gstRate}%):","${formatCurrency(gstCollected)}"`]);
      csvRows.push([`"Total Balance Payments:","${formatCurrency(summary.totalBalancePayments)}"`]);
      csvRows.push([`"Total Add-On Payments:","${formatCurrency(summary.totalAddonPayments)}"`]);
      csvRows.push([`"Total Renewal Payments:","${formatCurrency(summary.renewalPayments)}"`]);
      csvRows.push(['']);
      csvRows.push(['"Declaration:"']);
      csvRows.push([`"This report is generated by ${gymName} (GST: ${gymGST})"`]);
      csvRows.push([`"All payments are recorded as per the selected date range: ${startDateFormatted} to ${endDateFormatted}"`]);

      const csvString = csvRows.map(row => row.join(',')).join('\n');

      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const sTag = startDate || 'all';
      const eTag = endDate || 'all';
      const fileName = `payment_report_${sTag}_to_${eTag}_GST_${gymGST.replace(/[^a-zA-Z0-9]/g, '')}.csv`;
      link.href = url;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredPayments.length} transactions with GST and refund details!`);
    } catch (err) {
      console.error('Error exporting:', err);
      toast.error('Failed to export data');
    }
  };

  // ===== GST RATE MODAL =====
  const GstRateModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowGstModal(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">GST Rate Setting</h3>
          <button onClick={() => setShowGstModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Select the applicable GST rate for your gym. Currently: <span className="font-semibold text-purple-700">{gstRate}%</span>
        </p>
        <div className="space-y-3">
          {[0, 5, 18].map((rate) => (
            <button
              key={rate}
              disabled={updatingGst}
              onClick={() => {
                setUpdatingGst(true);
                api.put('/gym/my-gym/gst-rate', { gst_rate: rate })
                  .then(() => {
                    setGstRate(rate);
                    if (setUser) {
                      setUser((prev: any) => prev ? { ...prev, gst_rate: rate } : prev);
                    }
                    setShowGstModal(false);
                    toast.success(`GST rate updated to ${rate}%`);
                  })
                  .catch(() => toast.error('Failed to update GST rate'))
                  .finally(() => setUpdatingGst(false));
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${gstRate === rate
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-purple-300 text-gray-700'
                }`}
            >
              <div className="text-left">
                <p className="font-semibold">
                  {rate === 0 ? '0% GST (Exempt)' : `${rate}% GST`}
                </p>
                <p className="text-xs text-gray-500">
                  {rate === 0 ? 'No GST charges applied' : `CGST ${rate / 2}% + SGST ${rate / 2}%`}
                </p>
              </div>
              {gstRate === rate && <CheckCircle className="h-5 w-5 text-purple-600" />}
            </button>
          ))}
        </div>
        {updatingGst && <p className="text-center text-sm text-gray-400 mt-4">Updating...</p>}
      </div>
    </div>
  );

  // ===== DATE PICKER MODAL =====
  const DatePickerModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowDatePicker(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Select {datePickerType === 'start' ? 'From' : 'To'} Date
          </h3>
          <button
            onClick={() => setShowDatePicker(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-4">
          <CustomDatePicker
            value={datePickerType === 'start' ? startDate : endDate}
            onChange={(val) => {
              if (datePickerType === 'start') {
                setStartDate(val);
                if (val && endDate && val > endDate) setEndDate(val);
              } else {
                setEndDate(val);
                if (val && startDate && val < startDate) setStartDate(val);
              }
              setShowDatePicker(false);
            }}
            placeholder={`Select ${datePickerType === 'start' ? 'From' : 'To'} Date`}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              const today = getTodayDateStr();
              if (datePickerType === 'start') {
                setStartDate(today);
                if (endDate && today > endDate) setEndDate(today);
              } else {
                setEndDate(today);
                if (startDate && today < startDate) setStartDate(today);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
              if (datePickerType === 'start') {
                setStartDate(date);
              } else {
                setEndDate(date);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              const date = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
              if (datePickerType === 'start') {
                setStartDate(date);
              } else {
                setEndDate(date);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Last 30 Days
          </button>
        </div>
      </div>
    </div>
  );

  // ===== DELETE CONFIRM MODAL =====
  const DeleteConfirmModal = () => {
    const selectedCount = selectedPayments.size;
    const selectedData = filteredPayments.filter(p => selectedPayments.has(p.id));
    const totalAmount = selectedData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const isRefund = totalAmount < 0;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowDeleteConfirm(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
            </div>
            <button onClick={() => setShowDeleteConfirm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong className="text-red-600">{selectedCount}</strong> payment{selectedCount !== 1 ? 's' : ''}?
          </p>

          <div className="bg-red-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-800 mb-2">⚠️ This action will:</p>
            <ul className="text-sm text-red-700 space-y-1 ml-4">
              <li>• Permanently remove these payment records</li>
              <li>• Update member balances (reverse the amounts)</li>
              <li>• Cannot be undone</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-sm font-semibold text-red-800">
                Total amount to reverse: {isRefund ? formatCurrency(totalAmount) : formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedCount} Payment{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER SUMMARY CARDS WITH STRICT FINANCIAL LEDGER ACCURACY =====
  const renderSummaryCards = () => {
    const todayStr = getTodayDateStr();
    const isTodayFiltered = startDate === todayStr && endDate === todayStr;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* 🔥 Today's Collection Card (Highlighted Daily Inflow vs Outflow) */}
        <div
          onClick={() => {
            setStartDate(todayStr);
            setEndDate(todayStr);
          }}
          className={`relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all cursor-pointer group border-2 ${isTodayFiltered ? 'border-white ring-2 ring-emerald-300' : 'border-transparent'
            }`}
          title="Click to view only today's transactions"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
              Today's Sales
            </span>
          </div>
          <p className="text-xs text-emerald-100 font-medium mb-0.5">Today's Net Collection</p>
          <p className="text-2xl font-black tracking-tight">
            {formatCurrency(todaySummary.netRevenue)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 text-xs text-emerald-50 space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span className="text-emerald-100">In: +{formatCurrency(todaySummary.grossRevenue)} ({todaySummary.count})</span>
              {todaySummary.totalRefunds > 0 && (
                <span className="text-amber-200 font-semibold">Out: -{formatCurrency(todaySummary.totalRefunds)} ({todaySummary.refundCount})</span>
              )}
            </div>
            <div className="text-[11px] opacity-90 truncate">
              Cash: {formatCurrency(todaySummary.cash)} | UPI: {formatCurrency(todaySummary.upi)}
            </div>
          </div>
        </div>

        {/* ✅ Total Money In (Gross Inflow) */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <ArrowUpRight className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-100">
              Money In
            </span>
          </div>
          <p className="text-xs opacity-90 mb-0.5 font-medium truncate" title={
            startDate && endDate
              ? (startDate === endDate ? `Gross Inflow (${formatDate(startDate)})` : `Gross Inflow (${formatDate(startDate)} - ${formatDate(endDate)})`)
              : startDate
                ? `Gross Inflow (From ${formatDate(startDate)})`
                : endDate
                  ? `Gross Inflow (Up to ${formatDate(endDate)})`
                  : 'Gross Inflow (All Time)'
          }>
            Total Money In (Inflow)
          </p>
          <p className="text-2xl font-black tracking-tight text-white">
            +{formatCurrency(summary.totalRevenue)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs opacity-90">
            <span>{summary.inflowCount || (summary.totalCount - summary.refundCount)} payments</span>
            <span>Avg: {formatCurrency(summary.averagePayment)}</span>
          </div>
        </div>

        {/* ✅ Total Money Out (Gross Outflow / Refunds) */}
        <div className="bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <ArrowDownLeft className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-400/30 border border-rose-300/40 text-rose-100">
              Money Out
            </span>
          </div>
          <p className="text-xs opacity-90 mb-0.5 font-medium">Total Money Out (Refunds)</p>
          <p className="text-2xl font-black tracking-tight text-white">
            {summary.totalRefunds > 0 ? `-${formatCurrency(summary.totalRefunds)}` : formatCurrency(0)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs opacity-90">
            <span>{summary.refundCount} refund{summary.refundCount !== 1 ? 's' : ''} deducted</span>
            <span>
              {summary.totalCount > 0 ? ((summary.totalRefunds / (summary.totalRevenue + summary.totalRefunds || 1)) * 100).toFixed(1) : 0}% of gross
            </span>
          </div>
        </div>

        {/* ✅ Net Collection (Revenue - Refunds Kept) */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
              Net Kept
            </span>
          </div>
          <p className="text-xs opacity-90 mb-0.5 font-medium">Net Collection (Kept)</p>
          <p className="text-2xl font-black tracking-tight text-white">
            {formatCurrency(summary.netRevenue)}
          </p>
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs opacity-90">
            <span>Inflow − Outflow</span>
            <span className="font-semibold text-emerald-100">
              {summary.totalRevenue > 0 ? ((summary.netRevenue / summary.totalRevenue) * 100).toFixed(0) : 100}% kept
            </span>
          </div>
        </div>

        {/* ✅ GST Card */}
        <div
          onClick={() => setShowGstModal(true)}
          className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer group"
          title="Click to view or edit GST rate"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
              <Building className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
              {gstRate}% GST
            </span>
          </div>
          <p className="text-xs opacity-90 mb-0.5 font-medium">GST Collected</p>
          <p className="text-2xl font-black tracking-tight">{formatCurrency(summary.totalGST)}</p>
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs opacity-90">
            <span>CGST + SGST</span>
            <span className="text-[11px] underline opacity-90">Settings</span>
          </div>
        </div>
      </div>
    );
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPayments.length);
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Auto-clamp currentPage when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ===== MAIN RENDER =====
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Payments</h3>
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => fetchPayments()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const selectedCount = selectedPayments.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CreditCard className="h-8 w-8" />
                Payment Transactions
              </h1>
              <p className="text-blue-100 mt-2">
                GST: {gymGST} ({gstRate === 0 ? '0% — Exempt' : `${gstRate}% — CGST ${gstRate / 2}% + SGST ${gstRate / 2}%`}) | {gymName}
              </p>
            </div>

            {/* Quick Today's Sales Badge in Header */}
            <button
              onClick={() => {
                const todayStr = getTodayDateStr();
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className="text-left bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-4 py-2 flex items-center gap-3 backdrop-blur-sm transition-all shadow-inner"
              title="Click to filter transactions for today"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">Today's Collection</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-white">{formatCurrency(todaySummary.netRevenue)}</span>
                </div>
              </div>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
              title="Record a payment with custom or back date for an existing member"
            >
              <PlusCircle className="h-5 w-5" />
              Add Payment
            </button>
            <button
              onClick={() => setShowGstModal(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all font-medium"
              title="Change GST Rate"
            >
              <Building className="h-5 w-5" />
              GST {gstRate}%
            </button>
            <button
              onClick={() => fetchPayments()}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${selectionMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
                }`}
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="h-5 w-5" />
                  Select Mode
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5" />
                  Bulk Delete
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={filteredPayments.length === 0}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">Selection Mode Active</p>
              <p className="text-sm text-blue-700">
                {selectedCount} payment{selectedCount !== 1 ? 's' : ''} selected
                {selectedCount > 0 && ` • Total: ${formatCurrency(
                  filteredPayments.filter(p => selectedPayments.has(p.id)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                )}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAllVisible}
              className="px-3 py-1.5 text-sm bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Select All ({filteredPayments.length})
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedCount === 0 || deleting}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedCount})
            </button>
            <button
              onClick={toggleSelectionMode}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Direct Date Inputs with Fast Year/Month Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                From Date
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  if (val && endDate && val > endDate) {
                    setEndDate(val);
                  }
                }}
                placeholder="From Date"
              />
            </div>

            <div className="flex items-center pt-5 text-gray-400">
              <ArrowRight className="h-4 w-4" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                To Date
              </label>
              <CustomDatePicker
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  if (val && startDate && val < startDate) {
                    setStartDate(val);
                  }
                }}
                placeholder="To Date"
              />
            </div>

            {(startDate || endDate) && (
              <div className="pt-5">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1"
                  title="Clear date filter to view all records"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Date
                </button>
              </div>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const todayStr = getTodayDateStr();
                setStartDate(todayStr);
                setEndDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs flex items-center gap-1.5 ${startDate === getTodayDateStr() && endDate === getTodayDateStr()
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Today
            </button>
            <button
              onClick={() => {
                const yesterdayStr = getYesterdayDateStr();
                setStartDate(yesterdayStr);
                setEndDate(yesterdayStr);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs ${startDate === getYesterdayDateStr() && endDate === getYesterdayDateStr()
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                const todayStr = getTodayDateStr();
                const startOfWeek = getStartOfWeekStr();
                setStartDate(startOfWeek);
                setEndDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs ${startDate === getStartOfWeekStr() && endDate === getTodayDateStr()
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              This Week
            </button>
            <button
              onClick={() => {
                const todayStr = getTodayDateStr();
                const [year, month] = todayStr.split('-');
                setStartDate(`${year}-${month}-01`);
                setEndDate(todayStr);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs ${startDate === `${getTodayDateStr().split('-')[0]}-${getTodayDateStr().split('-')[1]}-01` && endDate === getTodayDateStr()
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                const lastMonth = getLastMonthRange();
                setStartDate(lastMonth.start);
                setEndDate(lastMonth.end);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs ${startDate === getLastMonthRange().start && endDate === getLastMonthRange().end
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Last Month
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all font-semibold text-xs ${!startDate && !endDate
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All Time
            </button>

            {/* Quick Full Year Jump Selector */}
            <div className="relative">
              <select
                aria-label="Filter by full year"
                onChange={(e) => {
                  const yr = e.target.value;
                  if (yr) {
                    setStartDate(`${yr}-01-01`);
                    setEndDate(`${yr}-12-31`);
                  }
                }}
                value={
                  startDate && endDate && startDate.startsWith(endDate.substring(0, 4)) && startDate.endsWith('-01-01') && endDate.endsWith('-12-31')
                    ? startDate.substring(0, 4)
                    : ''
                }
                className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                title="Quick jump to any full year"
              >
                <option value="">Full Year...</option>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Date Range Total Revenue Pill */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-gray-900">
              {startDate && endDate
                ? (startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`)
                : startDate
                  ? `From ${formatDate(startDate)} onwards`
                  : endDate
                    ? `Up to ${formatDate(endDate)}`
                    : 'All Recorded Dates'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Revenue (Sum):</span>
              <span className="text-base font-extrabold text-blue-700">{formatCurrency(summary.totalRevenue)}</span>
            </div>
            {summary.totalRefunds > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-500 uppercase tracking-wider font-semibold">Refunds:</span>
                <span className="text-sm font-bold text-red-600">-{formatCurrency(summary.totalRefunds)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
              <span className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Net Revenue:</span>
              <span className="text-base font-extrabold text-emerald-700">{formatCurrency(summary.netRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name, phone, or Txn ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Method Filters */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['all', 'cash', 'card', 'upi'].map((method) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`px-3 py-1.5 rounded-lg capitalize text-xs font-semibold transition-all ${selectedMethod === method
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {method === 'all' ? 'All Methods' : method}
              </button>
            ))}
          </div>

          {/* Direction Filter Tabs (Money In vs Money Out) */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All Flow
            </button>
            <button
              onClick={() => setDirectionFilter('inflow')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionFilter === 'inflow'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
                }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
              Money In ({summary.inflowCount || summary.totalCount - summary.refundCount})
            </button>
            <button
              onClick={() => setDirectionFilter('outflow')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${directionFilter === 'outflow'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50'
                }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              Money Out ({summary.refundCount})
            </button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-1 border-l border-gray-200 pl-3">
            <button
              onClick={() => setPaymentTypeFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All Types
            </button>
            <button
              onClick={() => setPaymentTypeFilter('membership')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'membership'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Membership
            </button>
            <button
              onClick={() => setPaymentTypeFilter('pt')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'pt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              PT
            </button>
            <button
              onClick={() => setPaymentTypeFilter('addon')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'addon'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Add-Ons
            </button>
            <button
              onClick={() => setPaymentTypeFilter('renewal')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'renewal'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Renewals
            </button>
            <button
              onClick={() => setPaymentTypeFilter('balance')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${paymentTypeFilter === 'balance'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Balance
            </button>
          </div>

          {(searchTerm || selectedMethod !== 'all' || directionFilter !== 'all' || paymentTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMethod('all');
                setDirectionFilter('all');
                setPaymentTypeFilter('all');
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {selectionMode && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                      onChange={selectAllVisible}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date & Txn ID</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Member</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Flow & Amount</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Method</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Category</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPayments.length === 0 ? (
                <tr>
                  <td colSpan={selectionMode ? 8 : 7} className="px-6 py-12 text-center text-gray-500">
                    <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm">No payments found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                currentPayments.map((payment, idx) => {
                  const isRefund = payment.is_refund || Number(payment.amount) < 0;
                  const typeInfo = getPaymentTypeBadge(payment);
                  const txnId = payment.transaction_id || `PAY-${payment.id}`;
                  const absAmount = Math.abs(Number(payment.amount) || 0);
                  const memberName = typeof payment.member_name === 'string' ? payment.member_name : (payment.member?.full_name || 'Unknown Member');
                  const memberPlan = typeof payment.member_plan === 'string' ? payment.member_plan : 'N/A';

                  return (
                    <tr
                      key={payment.id ? `pay-${payment.id}` : `pay-row-${idx}`}
                      className={`transition-colors border-b border-gray-100 ${isRefund
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-rose-500'
                          : 'hover:bg-gray-50/80 border-l-4 border-transparent'
                        }`}
                    >
                      {selectionMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPayments.has(payment.id)}
                            onChange={() => togglePaymentSelection(payment.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {/* Date & Txn ID */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{formatDate(payment.payment_date)}</p>
                          {formatTimeOnly(payment.payment_date) && (
                            <p className="text-xs text-gray-400">{formatTimeOnly(payment.payment_date)}</p>
                          )}
                          <div className="mt-1 flex items-center gap-1">
                            <span
                              className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${isRefund
                                  ? 'bg-rose-100/70 text-rose-800 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              title={txnId}
                            >
                              {txnId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTxn(txnId);
                              }}
                              className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                              title="Copy Transaction ID"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Member Info */}
                      <td className="px-5 py-4">
                        <div>
                          <p className={`font-bold text-sm ${isRefund ? 'text-rose-900' : 'text-gray-900'}`}>
                            {memberName}
                          </p>
                          {payment.member_phone && (
                            <p className="text-xs text-gray-500 font-medium">{String(payment.member_phone)}</p>
                          )}
                          {memberPlan && memberPlan !== 'N/A' && (
                            <span className="inline-block mt-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-semibold">
                              {memberPlan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Direction & Amount */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isRefund ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                                <ArrowDownLeft className="h-3 w-3 stroke-[3]" />
                                OUT
                              </span>
                              <span className="text-base font-black text-rose-600 font-mono tracking-tight">
                                - {currencySymbol} {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0 }).format(absAmount)}
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-500 font-semibold mt-0.5 pl-0.5">
                              Refund / Outflow
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <ArrowUpRight className="h-3 w-3 stroke-[3]" />
                                IN
                              </span>
                              <span className="text-base font-black text-emerald-600 font-mono tracking-tight">
                                + {currencySymbol} {new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0 }).format(absAmount)}
                              </span>
                            </div>
                            {Number(payment.gst_amount || 0) > 0 && (
                              <p className="text-[11px] text-purple-600 font-medium mt-0.5 pl-0.5">
                                GST: {formatCurrency(payment.gst_amount || 0)}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{getPaymentMethodIcon(payment.payment_method)}</span>
                          <span className={`text-sm font-semibold capitalize ${isRefund ? 'text-rose-700' : 'text-gray-700'}`}>
                            {payment.payment_method || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {payment.addon_name && (
                          <span className="text-xs text-gray-500 block mt-0.5 font-medium">({payment.addon_name})</span>
                        )}
                        {payment.is_balance_payment && !isRefund && (
                          <span className="text-[11px] bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full inline-block mt-0.5 font-semibold">
                            Balance
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleSingleDelete(payment.id, payment.amount, payment.member_name || 'Member')}
                          disabled={deleting}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete payment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredPayments.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  {selectionMode && <td></td>}
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-600" />
                      <span>
                        Totals for Selected Range ({filteredPayments.length} txns: {summary.inflowCount || summary.totalCount - summary.refundCount} In, {summary.refundCount} Out)
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <span>Inflow:</span> <span>+{formatCurrency(summary.totalRevenue)}</span>
                      </p>
                      {summary.totalRefunds > 0 && (
                        <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                          <span>Outflow:</span> <span>-{formatCurrency(summary.totalRefunds)}</span>
                        </p>
                      )}
                      <p className="text-sm font-black text-slate-900 border-t border-slate-300 pt-0.5 flex items-center gap-1">
                        <span>Net:</span> <span>{formatCurrency(summary.netRevenue)}</span>
                      </p>
                    </div>
                  </td>
                  <td colSpan={4} className="px-5 py-4 text-xs text-slate-600 text-right">
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                      <span><strong className="text-slate-800">Cash:</strong> {formatCurrency(summary.cashPayments)}</span>
                      <span>•</span>
                      <span><strong className="text-slate-800">UPI:</strong> {formatCurrency(summary.upiPayments)}</span>
                      <span>•</span>
                      <span><strong className="text-slate-800">Card:</strong> {formatCurrency(summary.cardPayments)}</span>
                      {summary.totalGST > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-purple-700"><strong className="text-purple-900">GST:</strong> {formatCurrency(summary.totalGST)}</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{filteredPayments.length}</span> payments
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddPaymentModal && (
        <AddPaymentModal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          onPaymentSuccess={(newPaymentDate) => {
            fetchPayments();
            fetchTodaySummary();
            if (newPaymentDate) {
              if (startDate && newPaymentDate < startDate) {
                setStartDate(newPaymentDate);
                toast.success(`Date range expanded to ${newPaymentDate} to show the new payment`);
              } else if (endDate && newPaymentDate > endDate) {
                setEndDate(newPaymentDate);
                toast.success(`Date range expanded to ${newPaymentDate} to show the new payment`);
              }
            }
          }}
        />
      )}
      {showDatePicker && <DatePickerModal />}
      {showGstModal && <GstRateModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default Payments;