// Balance.jsx - Updated with PT Balance Collection Support
import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  IndianRupee,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  Plus,
  X,
  RefreshCw,
  CalendarDays,
  History,
  Trash2,
  Dumbbell
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Balance = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // ===== Clear Balance State =====
  const [showClearBalanceModal, setShowClearBalanceModal] = useState(false);
  const [memberToClear, setMemberToClear] = useState(null);
  const [clearingBalance, setClearingBalance] = useState(false);
  const [clearBalanceNotes, setClearBalanceNotes] = useState('');
  const [clearBalanceType, setClearBalanceType] = useState('all');
  
  // ===== NEW: Payment allocation state =====
  const [paymentAllocation, setPaymentAllocation] = useState({
    membership: 0,
    pt: 0
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [overview, setOverview] = useState({
    total_balance_due: 0,
    members_with_balance: 0,
    overdue_count: 0,
    upcoming_payments: 0,
    total_pt_balance: 0,
    members_with_pt_balance: 0
  });

  const currencySymbol = user?.currency_symbol || '₹';

  const formatCurrency = (amount) => {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${currencySymbol} ${formatted}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchBalanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (!showPaidOnly) params.append('has_balance', 'true');
      
      const [membersRes, overviewRes] = await Promise.all([
        api.get(`/gym/members/balances?${params.toString()}`),
        api.get('/gym/balance/overview')
      ]);
      
      const membersData = membersRes.data || [];
      const totalPtBalance = membersData.reduce((sum, m) => sum + (m.pt_balance || 0), 0);
      const membersWithPtBalance = membersData.filter(m => (m.pt_balance || 0) > 0).length;
      
      const sortedMembers = membersData.sort((a, b) => {
        const totalA = (a.balance_due || 0) + (a.pt_balance || 0);
        const totalB = (b.balance_due || 0) + (b.pt_balance || 0);
        if (totalA > 0 && totalB > 0) {
          return totalB - totalA;
        }
        if (totalA > 0 && totalB === 0) return -1;
        if (totalA === 0 && totalB > 0) return 1;
        return b.member_id - a.member_id;
      });
      
      setMembers(sortedMembers);
      setOverview({
        ...overviewRes.data,
        total_pt_balance: totalPtBalance,
        members_with_pt_balance: membersWithPtBalance
      });
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching balance data:', error);
      toast.error('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceData();
  }, [searchTerm, showPaidOnly]);

  // ===== Fetch payment history for a member =====
  const fetchPaymentHistory = async (memberId) => {
    setLoadingHistory(true);
    setPaymentHistory([]);
    try {
      const response = await api.get(`/gym/members/${memberId}/balance`);
      console.log('Balance API response:', response.data);
      
      let historyData = [];
      
      if (response.data) {
        if (response.data.payment_history && Array.isArray(response.data.payment_history)) {
          historyData = response.data.payment_history;
        } else if (response.data.payments && Array.isArray(response.data.payments)) {
          historyData = response.data.payments;
        } else if (response.data.history && Array.isArray(response.data.history)) {
          historyData = response.data.history;
        } else if (Array.isArray(response.data)) {
          historyData = response.data;
        }
      }
      
      if (historyData.length === 0) {
        try {
          const paymentsResponse = await api.get(`/gym/payments?member_id=${memberId}&limit=50`);
          console.log('Payments API response:', paymentsResponse.data);
          
          if (paymentsResponse.data) {
            if (Array.isArray(paymentsResponse.data)) {
              historyData = paymentsResponse.data;
            } else if (paymentsResponse.data.items && Array.isArray(paymentsResponse.data.items)) {
              historyData = paymentsResponse.data.items;
            }
          }
        } catch (paymentsError) {
          console.log('Payments endpoint failed, trying membership endpoint...');
          
          try {
            const membershipResponse = await api.get(`/gym/members/${memberId}`);
            console.log('Member details response:', membershipResponse.data);
            
            if (membershipResponse.data && membershipResponse.data.current_membership) {
              const membershipId = membershipResponse.data.current_membership.id;
              
              const memberPaymentsResponse = await api.get(`/gym/payments?membership_id=${membershipId}&limit=50`);
              console.log('Membership payments response:', memberPaymentsResponse.data);
              
              if (memberPaymentsResponse.data) {
                if (Array.isArray(memberPaymentsResponse.data)) {
                  historyData = memberPaymentsResponse.data;
                } else if (memberPaymentsResponse.data.items && Array.isArray(memberPaymentsResponse.data.items)) {
                  historyData = memberPaymentsResponse.data.items;
                }
              }
            }
          } catch (memberError) {
            console.log('All endpoints failed, using empty array');
          }
        }
      }
      
      if (!Array.isArray(historyData)) {
        historyData = [];
      }
      
      const formattedHistory = historyData.map(item => ({
        id: item.id || `payment_${Date.now()}_${Math.random()}`,
        amount: item.amount || item.paid_amount || item.payment_amount || 0,
        payment_method: item.payment_method || item.method || 'N/A',
        payment_date: item.payment_date || item.created_at || item.transaction_date || new Date().toISOString(),
        notes: item.notes || item.remarks || item.description || '',
        status: item.status || 'completed'
      }));
      
      formattedHistory.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      
      setPaymentHistory(formattedHistory);
      
      if (formattedHistory.length === 0) {
        toast.info('No payment history found for this member');
      }
      
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
      toast.error('Could not load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // ===== Calculate remaining after payment =====
  const getTotalBalance = (member) => {
    return (member.balance_due || 0) + (member.pt_balance || 0);
  };

  // ===== Calculate allocation based on payment amount =====
  const calculateAllocation = (amount, member) => {
    if (!member || !amount || parseFloat(amount) <= 0) {
      return { membership: 0, pt: 0 };
    }
    
    const amountNum = parseFloat(amount);
    const membershipBalance = member.balance_due || 0;
    const ptBalance = member.pt_balance || 0;
    
    // If there's no membership balance but there is PT balance,
    // allocate everything to PT
    if (membershipBalance === 0 && ptBalance > 0) {
      const ptPayment = Math.min(amountNum, ptBalance);
      return { membership: 0, pt: ptPayment };
    }
    
    // If there's membership balance but no PT balance,
    // allocate everything to membership
    if (membershipBalance > 0 && ptBalance === 0) {
      const membershipPayment = Math.min(amountNum, membershipBalance);
      return { membership: membershipPayment, pt: 0 };
    }
    
    // If both have balances, first pay membership, then PT
    let membershipPayment = Math.min(amountNum, membershipBalance);
    let remainingAfterMembership = amountNum - membershipPayment;
    let ptPayment = Math.min(remainingAfterMembership, ptBalance);
    
    return { membership: membershipPayment, pt: ptPayment };
  };

  // ===== Update allocation when amount changes =====
  useEffect(() => {
    if (selectedMember && paymentAmount) {
      const amount = parseFloat(paymentAmount);
      if (amount > 0) {
        const allocation = calculateAllocation(amount, selectedMember);
        setPaymentAllocation(allocation);
      } else {
        setPaymentAllocation({ membership: 0, pt: 0 });
      }
    } else {
      setPaymentAllocation({ membership: 0, pt: 0 });
    }
  }, [paymentAmount, selectedMember]);

  const isFullPayment = selectedMember &&
    parseFloat(paymentAmount) > 0 &&
    parseFloat(paymentAmount) >= getTotalBalance(selectedMember);

    const handlePartialPayment = async (member) => {
      setErrorDetails(null);
      
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }
      
      const totalBalance = getTotalBalance(member);
      if (amount > totalBalance) {
        toast.error(`Payment amount cannot exceed total balance of ${formatCurrency(totalBalance)}`);
        return;
      }
      
      setProcessingPayment(true);
      
      try {
        let paymentDateTime;
        if (paymentDate) {
          paymentDateTime = new Date(paymentDate);
          if (!paymentDate.includes('T')) {
            paymentDateTime.setHours(12, 0, 0, 0);
          }
        } else {
          paymentDateTime = new Date();
        }
        
        const allocation = calculateAllocation(amount, member);
        let membershipPaymentAmount = allocation.membership;
        let ptPaymentAmount = allocation.pt;
        
        console.log('Payment allocation:', { membershipPaymentAmount, ptPaymentAmount });
        console.log('Member balances:', { 
          membershipBalance: member.balance_due, 
          ptBalance: member.pt_balance 
        });
        
        let membershipPaymentSuccess = false;
        let ptPaymentSuccess = false;
        let errorMessages = [];
        
        // 1. Process membership payment (if there's membership balance to pay)
        if (membershipPaymentAmount > 0 && member.membership_id) {
          try {
            const response = await api.post(`/gym/memberships/${member.membership_id}/partial-payment`, {
              membership_id: member.membership_id,
              amount: membershipPaymentAmount,
              payment_method: paymentMethod,
              notes: paymentNotes || 'Membership payment',
              payment_date: paymentDateTime.toISOString()
            });
            console.log('Membership payment response:', response.data);
            membershipPaymentSuccess = true;
          } catch (membershipError) {
            console.error('Membership payment failed:', membershipError);
            errorMessages.push('Failed to record membership payment');
            // Don't return immediately - try PT payment anyway
          }
        } else if (member.balance_due === 0 && member.membership_id) {
          // Membership balance is already 0, mark as success
          membershipPaymentSuccess = true;
          console.log('Membership balance is already 0, skipping membership payment');
        }
        
        // 2. Process PT payment (always try if there's PT balance to pay)
        if (ptPaymentAmount > 0 && member.pt_session_id) {
          try {
            const response = await api.post(`/gym/personal-training/${member.pt_session_id}/payment`, {
              amount: ptPaymentAmount,
              payment_method: paymentMethod,
              notes: paymentNotes || 'PT payment',
              payment_date: paymentDateTime.toISOString()
            });
            console.log('PT payment response:', response.data);
            ptPaymentSuccess = true;
          } catch (ptError) {
            console.error('PT payment failed:', ptError);
            errorMessages.push('Failed to record PT payment');
          }
        } else if (member.pt_balance === 0 && member.pt_session_id) {
          // PT balance is already 0, mark as success
          ptPaymentSuccess = true;
          console.log('PT balance is already 0, skipping PT payment');
        }
        
        // Check if at least one payment succeeded
        if (!membershipPaymentSuccess && !ptPaymentSuccess) {
          // If both failed, show error
          const errorMsg = errorMessages.join('; ') || 'No payment was processed';
          toast.error(errorMsg);
          setProcessingPayment(false);
          return;
        }
        
        const remainingBalance = totalBalance - amount;
        const isFull = amount >= totalBalance;
        
        // Build success message
        let successMessage = (
          <div>
            <p className="font-bold">✓ Payment Recorded Successfully!</p>
            <p className="text-sm mt-1">Amount: {formatCurrency(amount)}</p>
            <p className="text-sm text-gray-600">Date: {formatDateTime(paymentDateTime)}</p>
          </div>
        );
        
        if (membershipPaymentAmount > 0) {
          successMessage = (
            <>
              {successMessage}
              <p className="text-sm text-blue-600">Membership: {formatCurrency(membershipPaymentAmount)}</p>
            </>
          );
        }
        
        if (ptPaymentAmount > 0) {
          successMessage = (
            <>
              {successMessage}
              <p className="text-sm text-purple-600">PT: {formatCurrency(ptPaymentAmount)}</p>
            </>
          );
        }
        
        successMessage = (
          <>
            {successMessage}
            {isFull && <p className="text-sm text-green-600">All balances cleared!</p>}
            {!isFull && (
              <p className="text-sm text-amber-600">Remaining balance: {formatCurrency(remainingBalance)}</p>
            )}
          </>
        );
        
        toast.success(successMessage, { duration: 5000 });
        
        closeModal();
        await fetchBalanceData();
        
      } catch (error) {
        console.error('Payment error details:', error);
        
        let errorMessage = 'Failed to record payment';
        let statusCode = error.response?.status;
        let serverDetail = error.response?.data?.detail;
        
        if (statusCode === 401) {
          errorMessage = 'Your session has expired. Please login again.';
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (statusCode === 403) {
          errorMessage = 'You do not have permission to record payments';
        } else if (statusCode === 404) {
          errorMessage = 'Membership or PT session not found. Please refresh the page and try again.';
        } else if (statusCode === 422) {
          errorMessage = 'Validation error: ' + (serverDetail || 'Please check the payment details');
        } else if (statusCode === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        if (serverDetail && typeof serverDetail === 'string') {
          errorMessage = serverDetail;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        toast.error(errorMessage);
        
        setErrorDetails({
          status: statusCode,
          message: serverDetail,
          requestData: {
            membership_id: member.membership_id,
            pt_session_id: member.pt_session_id,
            amount: amount,
            payment_method: paymentMethod,
            payment_date: paymentDate
          }
        });
        
      } finally {
        setProcessingPayment(false);
      }
    };

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedMember(null);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentMethod('cash');
    setPaymentDate('');
    setNextPaymentDate('');
    setErrorDetails(null);
    setPaymentHistory([]);
    setShowPaymentHistory(false);
    setShowClearBalanceModal(false);
    setMemberToClear(null);
    setClearBalanceType('all');
    setPaymentAllocation({ membership: 0, pt: 0 });
  };

  const openPaymentModal = (member) => {
    setSelectedMember(member);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentMethod('cash');
    const today = new Date();
    setPaymentDate(today.toISOString().split('T')[0]);
    setNextPaymentDate('');
    setErrorDetails(null);
    setPaymentHistory([]);
    setShowPaymentHistory(false);
    setPaymentAllocation({ membership: 0, pt: 0 });
    setShowPaymentModal(true);
  };

  // ===== Clear Balance Modal =====
  const openClearBalanceModal = (member) => {
    setMemberToClear(member);
    setClearBalanceNotes('');
    setClearBalanceType('all');
    setShowClearBalanceModal(true);
  };

  const handleClearBalance = async () => {
    if (!memberToClear) return;
    
    setClearingBalance(true);
    try {
      const amountToClear = getTotalBalance(memberToClear);
      
      if (amountToClear <= 0) {
        toast.info('This member has no balance to clear');
        setShowClearBalanceModal(false);
        setMemberToClear(null);
        setClearingBalance(false);
        return;
      }
      
      const allocation = calculateAllocation(amountToClear, memberToClear);
      
      // Clear membership balance
      if (allocation.membership > 0 && memberToClear.membership_id) {
        await api.post(`/gym/memberships/${memberToClear.membership_id}/partial-payment`, {
          membership_id: memberToClear.membership_id,
          amount: allocation.membership,
          payment_method: 'adjustment',
          notes: clearBalanceNotes || `Membership balance cleared - ${formatCurrency(allocation.membership)} adjusted`,
          payment_date: new Date().toISOString()
        });
        console.log('✅ Membership balance cleared');
      }
      
      // Clear PT balance
      if (allocation.pt > 0 && memberToClear.pt_session_id) {
        await api.post(`/gym/personal-training/${memberToClear.pt_session_id}/payment`, {
          amount: allocation.pt,
          payment_method: 'adjustment',
          notes: clearBalanceNotes || `PT balance cleared - ${formatCurrency(allocation.pt)} adjusted`,
          payment_date: new Date().toISOString()
        });
        console.log('✅ PT balance cleared');
      }
      
      toast.success(
        <div>
          <p className="font-bold">✓ Balance Cleared Successfully!</p>
          <p className="text-sm mt-1">Amount: {formatCurrency(amountToClear)}</p>
          <p className="text-sm text-green-600">All balances are now ₹0</p>
          {allocation.pt > 0 && (
            <p className="text-sm text-purple-600">✓ PT balance cleared</p>
          )}
          {clearBalanceNotes && (
            <p className="text-sm text-gray-600 mt-1">Note: {clearBalanceNotes}</p>
          )}
        </div>,
        { duration: 5000 }
      );
      
      setShowClearBalanceModal(false);
      setMemberToClear(null);
      await fetchBalanceData();
      
    } catch (error) {
      console.error('Clear balance error:', error);
      toast.error(error.response?.data?.detail || 'Failed to clear balance');
    } finally {
      setClearingBalance(false);
    }
  };

  // ===== Toggle payment history =====
  const togglePaymentHistory = async (member) => {
    if (showPaymentHistory && selectedMember?.member_id === member.member_id && showPaymentModal) {
      setShowPaymentHistory(false);
      return;
    }
    
    if (!showPaymentModal) {
      setSelectedMember(member);
      setShowPaymentModal(true);
      setTimeout(async () => {
        setShowPaymentHistory(true);
        await fetchPaymentHistory(member.member_id);
      }, 100);
      return;
    }
    
    setSelectedMember(member);
    setShowPaymentHistory(true);
    await fetchPaymentHistory(member.member_id);
  };

  const getStatusBadge = (member) => {
    const totalBalance = getTotalBalance(member);
    if (totalBalance <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </span>
      );
    } else if (member.payment_status === 'overdue' || (member.next_payment_date && new Date(member.next_payment_date) < new Date())) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getSuggestedDates = () => {
    const suggestions = [];
    const today = new Date();
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    suggestions.push(nextWeek);
    
    const nextTwoWeeks = new Date(today);
    nextTwoWeeks.setDate(today.getDate() + 14);
    suggestions.push(nextTwoWeeks);
    
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    suggestions.push(nextMonth);
    
    return suggestions;
  };

  // Pagination calculations
  const totalPages = Math.ceil(members.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, members.length);
  const currentMembers = members.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Balance Tracker</h1>
        <p className="text-gray-500 mt-1">Track and manage member payment dues including PT balances</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance Due</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(overview.total_balance_due + (overview.total_pt_balance || 0))}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{overview.members_with_balance} members have dues</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Members with Balance</p>
              <p className="text-2xl font-bold text-orange-600">{overview.members_with_balance}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Need to collect payment</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Payments</p>
              <p className="text-2xl font-bold text-red-600">{overview.overdue_count}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Past due date</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming Payments</p>
              <p className="text-2xl font-bold text-green-600">{overview.upcoming_payments}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Due in next 7 days</p>
        </div>

        {/* PT Balance Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PT Balance</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(overview.total_pt_balance || 0)}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Dumbbell className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{overview.members_with_pt_balance || 0} members have PT dues</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPaidOnly}
                onChange={(e) => setShowPaidOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show paid members only
            </label>
            <button
              onClick={fetchBalanceData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Balance Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PT Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : currentMembers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No members found matching your search' : 'No members with balance due'}
                  </td>
                </tr>
              ) : (
                currentMembers.map((member) => {
                  const totalBalance = getTotalBalance(member);
                  return (
                    <tr key={member.member_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{member.member_name}</p>
                          <p className="text-sm text-gray-500">{member.member_phone}</p>
                          {member.member_email && (
                            <p className="text-xs text-gray-400">{member.member_email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{member.plan_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(member.start_date).toLocaleDateString()} - {new Date(member.end_date).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className={`text-sm font-medium ${member.balance_due > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(member.balance_due || 0)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {member.has_pt_balance ? (
                            <p className={`text-sm font-medium ${member.pt_balance > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                              {formatCurrency(member.pt_balance || 0)}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                          {member.has_pt_balance && (
                            <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className={`text-sm font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(totalBalance)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.next_payment_date ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              {new Date(member.next_payment_date).toLocaleDateString()}
                            </p>
                            {new Date(member.next_payment_date) < new Date() && totalBalance > 0 && (
                              <p className="text-xs text-red-500">Overdue!</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {totalBalance > 0 && (
                            <button
                              onClick={() => openPaymentModal(member)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Collect
                            </button>
                          )}
                          <button
                            onClick={() => togglePaymentHistory(member)}
                            className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            title="View Payment History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {totalBalance > 0 && (
                            <button
                              onClick={() => openClearBalanceModal(member)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors"
                              title="Clear Balance"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Clear
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && members.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{members.length}</span> members
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

      {/* Payment Modal with PT Support */}
      {showPaymentModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Member Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Member Details</p>
                <p className="font-semibold text-gray-900">{selectedMember.member_name}</p>
                <p className="text-sm text-gray-500">{selectedMember.member_phone}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Plan:</span>
                    <span className="font-medium text-gray-800">{selectedMember.plan_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Membership Balance:</span>
                    <span className="font-medium text-orange-600">{formatCurrency(selectedMember.balance_due || 0)}</span>
                  </div>
                  {selectedMember.has_pt_balance && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
                        PT Balance:
                      </span>
                      <span className="font-medium text-purple-600">{formatCurrency(selectedMember.pt_balance || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5 mt-1.5">
                    <span className="text-gray-700">Total Balance Due:</span>
                    <span className="text-red-600">{formatCurrency(getTotalBalance(selectedMember))}</span>
                  </div>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date <span className="text-gray-400 text-xs">(Select date)</span>
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="0.00"
                    min="0.01"
                    max={getTotalBalance(selectedMember)}
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(getTotalBalance(selectedMember)))}
                    className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Pay Full ({formatCurrency(getTotalBalance(selectedMember))})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(Math.floor(getTotalBalance(selectedMember) / 2)))}
                    className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Pay Half ({formatCurrency(Math.floor(getTotalBalance(selectedMember) / 2))})
                  </button>
                </div>

                {/* Payment Allocation Breakdown */}
                {paymentAmount && parseFloat(paymentAmount) > 0 && selectedMember && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Payment Allocation</p>
                    <div className="space-y-1 text-sm">
                      {paymentAllocation.membership > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Membership:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(paymentAllocation.membership)}</span>
                        </div>
                      )}
                      {paymentAllocation.pt > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 flex items-center gap-1">
                            <Dumbbell className="h-3 w-3 text-purple-400" />
                            PT:
                          </span>
                          <span className="font-medium text-purple-600">{formatCurrency(paymentAllocation.pt)}</span>
                        </div>
                      )}
                      {paymentAllocation.membership === 0 && paymentAllocation.pt === 0 && (
                        <p className="text-xs text-gray-400">No allocation (amount exceeds total balance)</p>
                      )}
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-medium">
                        <span className="text-gray-700">Total:</span>
                        <span className="text-gray-900">{formatCurrency(parseFloat(paymentAmount) || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment feedback */}
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className={`mt-2 p-3 rounded-lg text-sm ${isFullPayment ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    {isFullPayment ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Full payment — all balances will be cleared ✓</span>
                        </div>
                        {selectedMember.has_pt_balance && (
                          <p className="text-xs text-purple-600 pl-6">✓ PT balance will be cleared</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-amber-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Partial payment</span>
                        </div>
                        <div className="flex justify-between text-xs pl-6">
                          <span>Remaining balance after this payment:</span>
                          <span className="font-bold text-red-600">{formatCurrency(getTotalBalance(selectedMember) - parseFloat(paymentAmount))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                </select>
              </div>

              {/* Next Payment Date - Only show for partial payments */}
              {!isFullPayment && parseFloat(paymentAmount) > 0 && getTotalBalance(selectedMember) - parseFloat(paymentAmount) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Payment Date
                    <span className="text-gray-400 text-xs ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={nextPaymentDate}
                      onChange={(e) => setNextPaymentDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  
                  {/* Suggested dates */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1.5">Suggested dates:</p>
                    <div className="flex gap-2 flex-wrap">
                      {getSuggestedDates().map((date, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setNextPaymentDate(date.toISOString().split('T')[0])}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          {formatDate(date.toISOString().split('T')[0])}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows="2"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="e.g. Partial payment, rest to be paid next week..."
                />
              </div>

              {/* Payment History Section */}
              <div className="border rounded-lg overflow-hidden">
                <div 
                  className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    if (showPaymentHistory) {
                      setShowPaymentHistory(false);
                    } else {
                      setShowPaymentHistory(true);
                      fetchPaymentHistory(selectedMember.member_id);
                    }
                  }}
                >
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    Payment History
                    <span className="text-xs text-gray-400 font-normal">({paymentHistory.length} payments)</span>
                  </span>
                  <span className="text-xs text-blue-600">
                    {showPaymentHistory ? 'Hide ▲' : 'Show ▼'}
                  </span>
                </div>
                
                {showPaymentHistory && (
                  <div>
                    {loadingHistory ? (
                      <div className="p-6 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                        <p className="text-xs text-gray-400 mt-2">Loading payment history...</p>
                      </div>
                    ) : paymentHistory.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="text-gray-300 mb-2">
                          <History className="h-10 w-10 mx-auto" />
                        </div>
                        <p className="text-sm text-gray-400">No payment records found</p>
                        <p className="text-xs text-gray-300 mt-1">Payments will appear here once recorded</p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                        {paymentHistory.map((payment, index) => (
                          <div key={payment.id || index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  payment.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  <CreditCard className={`h-4 w-4 ${
                                    payment.amount > 0 ? 'text-green-600' : 'text-red-600'
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 capitalize">
                                      {payment.payment_method}
                                    </span>
                                    {payment.status && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        payment.status === 'completed' || payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {payment.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {formatDateTime(payment.payment_date)}
                                </p>
                                {payment.notes && (
                                  <p className="text-xs text-gray-400 max-w-[180px] truncate mt-0.5">
                                    {payment.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error Display */}
              {errorDetails && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Debug Info:</p>
                  <p className="text-xs text-red-600">Status: {errorDetails.status}</p>
                  <p className="text-xs text-red-600 break-all">Message: {errorDetails.message || 'No details'}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl sticky bottom-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePartialPayment(selectedMember)}
                disabled={processingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {processingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {processingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Balance Confirmation Modal */}
      {showClearBalanceModal && memberToClear && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Clear Balance</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClearBalanceModal(false);
                  setMemberToClear(null);
                  setClearBalanceNotes('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">Member:</span>
                  <span className="font-semibold text-gray-900">{memberToClear.member_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-700 font-medium">Membership Balance:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(memberToClear.balance_due || 0)}</span>
                </div>
                {memberToClear.has_pt_balance && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-700 font-medium flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
                      PT Balance:
                    </span>
                    <span className="font-medium text-purple-600">{formatCurrency(memberToClear.pt_balance || 0)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-semibold border-t border-red-200 pt-2 mt-2">
                  <span className="text-gray-700">Total Balance to Clear:</span>
                  <span className="font-bold text-red-600">{formatCurrency(getTotalBalance(memberToClear))}</span>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>This will clear all balances for this member including 
                    {memberToClear.has_pt_balance ? ' membership and PT balances' : ' membership balance'}.
                    The balance will be set to ₹0.</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows="2"
                  value={clearBalanceNotes}
                  onChange={(e) => setClearBalanceNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="e.g. Balance cleared due to adjustment, discount applied, etc."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowClearBalanceModal(false);
                  setMemberToClear(null);
                  setClearBalanceNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearBalance}
                disabled={clearingBalance}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {clearingBalance ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {clearingBalance ? 'Clearing...' : 'Clear All Balances'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balance;