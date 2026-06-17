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
  CalendarDays
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
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [overview, setOverview] = useState({
    total_balance_due: 0,
    members_with_balance: 0,
    overdue_count: 0,
    upcoming_payments: 0
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
      
      // Sort members by balance (highest first) or by member_id (newest first)
      // Let's sort by member_id descending to show latest entries at top
      const sortedMembers = (membersRes.data || []).sort((a, b) => {
        // If there's a next_payment_date, sort by that (overdue first)
        if (a.balance_due > 0 && b.balance_due > 0) {
          // Sort by balance due (highest first)
          return b.balance_due - a.balance_due;
        }
        // If one has balance and other doesn't, put the one with balance first
        if (a.balance_due > 0 && b.balance_due === 0) return -1;
        if (a.balance_due === 0 && b.balance_due > 0) return 1;
        // If both have no balance, sort by member_id (newest first)
        return b.member_id - a.member_id;
      });
      
      setMembers(sortedMembers);
      setOverview(overviewRes.data);
      
      // Reset to first page when data changes
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

  const handlePartialPayment = async (member) => {
    // Reset error details
    setErrorDetails(null);
    
    // Validate payment amount
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    if (amount > member.balance_due) {
      toast.error(`Payment amount cannot exceed balance due of ${formatCurrency(member.balance_due)}`);
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // Log the request for debugging
      console.log('Sending payment request:', {
        membership_id: member.membership_id,
        amount: amount,
        payment_method: paymentMethod,
        notes: paymentNotes
      });
      
      // Make sure we're using the correct endpoint
      const response = await api.post(`/gym/memberships/${member.membership_id}/partial-payment`, {
        membership_id: member.membership_id,
        amount: amount,
        payment_method: paymentMethod,
        notes: paymentNotes,
        payment_date: new Date().toISOString()
      });
      
      console.log('Payment response:', response.data);
      
      // If there's a remaining balance and next payment date is set, update the payment schedule
      const isFullPayment = amount >= member.balance_due;
      const remainingBalance = member.balance_due - amount;
      
      if (!isFullPayment && remainingBalance > 0 && nextPaymentDate) {
        try {
          await api.put(`/gym/memberships/${member.membership_id}/payment-schedule`, {
            membership_id: member.membership_id,
            next_payment_date: nextPaymentDate,
            notes: paymentNotes || `Next payment scheduled for ${formatDate(nextPaymentDate)}`
          });
          console.log('Payment schedule updated:', nextPaymentDate);
        } catch (scheduleError) {
          console.warn('Could not update payment schedule:', scheduleError);
          // Don't fail the main payment if schedule update fails
        }
      }
      
      // Show success message with details
      toast.success(
        <div>
          <p className="font-bold">✓ Payment Recorded Successfully!</p>
          <p className="text-sm mt-1">Amount: {formatCurrency(amount)}</p>
          {isFullPayment && <p className="text-sm text-green-600">Balance cleared!</p>}
          {!isFullPayment && (
            <>
              <p className="text-sm text-amber-600">Remaining balance: {formatCurrency(remainingBalance)}</p>
              {nextPaymentDate && (
                <p className="text-sm text-blue-600">Next payment scheduled: {formatDate(nextPaymentDate)}</p>
              )}
            </>
          )}
        </div>,
        { duration: 5000 }
      );
      
      // Close modal and refresh data
      closeModal();
      await fetchBalanceData();
      
    } catch (error) {
      console.error('Payment error details:', error);
      
      // Extract detailed error message
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
        errorMessage = 'Membership not found. Please refresh the page and try again.';
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
      
      // Set error details for debugging
      setErrorDetails({
        status: statusCode,
        message: serverDetail,
        requestData: {
          membership_id: member.membership_id,
          amount: amount,
          payment_method: paymentMethod
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
    setNextPaymentDate('');
    setErrorDetails(null);
  };

  const getStatusBadge = (status, balanceDue) => {
    if (balanceDue <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </span>
      );
    } else if (status === 'overdue') {
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

  // Derived values for payment modal
  const remainingAfterPayment = selectedMember
    ? Math.max(0, selectedMember.balance_due - (parseFloat(paymentAmount) || 0))
    : 0;
  const isPartialPayment =
    selectedMember &&
    parseFloat(paymentAmount) > 0 &&
    parseFloat(paymentAmount) < selectedMember.balance_due;
  const isFullPayment =
    selectedMember &&
    parseFloat(paymentAmount) > 0 &&
    parseFloat(paymentAmount) >= selectedMember.balance_due;

  // Get minimum date for next payment (today + 1 day)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get suggested next payment dates
  const getSuggestedDates = () => {
    const suggestions = [];
    const today = new Date();
    
    // Next week
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    suggestions.push(nextWeek);
    
    // Next 2 weeks
    const nextTwoWeeks = new Date(today);
    nextTwoWeeks.setDate(today.getDate() + 14);
    suggestions.push(nextTwoWeeks);
    
    // Next month
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
        <p className="text-gray-500 mt-1">Track and manage member payment dues</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Balance Due</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(overview.total_balance_due)}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Due</th>
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
                currentMembers.map((member) => (
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
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(member.total_amount)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-green-600">{formatCurrency(member.amount_paid)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className={`text-sm font-bold ${member.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(member.balance_due)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member.payment_status, member.balance_due)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.next_payment_date ? (
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(member.next_payment_date).toLocaleDateString()}
                          </p>
                          {new Date(member.next_payment_date) < new Date() && member.balance_due > 0 && (
                            <p className="text-xs text-red-500">Overdue!</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {member.balance_due > 0 && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setPaymentAmount('');
                            setPaymentNotes('');
                            setPaymentMethod('cash');
                            setNextPaymentDate('');
                            setErrorDetails(null);
                            setShowPaymentModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Collect Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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
              <span className="text-gray-400 ml-2">(showing {itemsPerPage} per page)</span>
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
        
        {/* Show total count when only one page */}
        {!loading && members.length > 0 && totalPages <= 1 && (
          <div className="px-6 py-4 border-t">
            <div className="text-sm text-gray-700">
              Showing all <span className="font-medium">{members.length}</span> members
              <span className="text-gray-400 ml-2">(showing {itemsPerPage} per page)</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal with Next Payment Date */}
      {showPaymentModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
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
                    <span className="text-gray-500">Total Amount:</span>
                    <span className="font-medium text-gray-800">{formatCurrency(selectedMember.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Already Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedMember.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5 mt-1.5">
                    <span className="text-gray-700">Balance Due:</span>
                    <span className="text-red-600">{formatCurrency(selectedMember.balance_due)}</span>
                  </div>
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
                    max={selectedMember.balance_due}
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(selectedMember.balance_due))}
                    className="flex-1 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Pay Full ({formatCurrency(selectedMember.balance_due)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(Math.floor(selectedMember.balance_due / 2)))}
                    className="flex-1 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Pay Half ({formatCurrency(Math.floor(selectedMember.balance_due / 2))})
                  </button>
                </div>

                {/* Payment feedback */}
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className={`mt-2 p-3 rounded-lg text-sm ${isFullPayment ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    {isFullPayment ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">Full payment — balance will be cleared ✓</span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-amber-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">Partial payment</span>
                        </div>
                        <div className="flex justify-between text-xs pl-6">
                          <span>Remaining balance after this payment:</span>
                          <span className="font-bold text-red-600">{formatCurrency(remainingAfterPayment)}</span>
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
              {!isFullPayment && parseFloat(paymentAmount) > 0 && remainingAfterPayment > 0 && (
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
                  
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Set a date for when the customer will pay the remaining {formatCurrency(remainingAfterPayment)}
                  </p>
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

              {/* Summary for partial payment with date */}
              {!isFullPayment && nextPaymentDate && parseFloat(paymentAmount) > 0 && remainingAfterPayment > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Payment Summary:</p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div className="flex justify-between">
                      <span>Today's payment:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(paymentAmount))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining balance:</span>
                      <span className="font-medium">{formatCurrency(remainingAfterPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next payment due:</span>
                      <span className="font-medium">{formatDate(nextPaymentDate)}</span>
                    </div>
                  </div>
                </div>
              )}

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
                {processingPayment ? 'Recording...' : isPartialPayment ? 'Record Partial Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balance;