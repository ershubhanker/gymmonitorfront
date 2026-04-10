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
  Loader2,
  Eye,
  Plus,
  X,
  RefreshCw
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
  const [processingPayment, setProcessingPayment] = useState(false);
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
      
      setMembers(membersRes.data || []);
      setOverview(overviewRes.data);
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
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(paymentAmount) > member.balance_due) {
      toast.error(`Payment amount cannot exceed balance due of ${formatCurrency(member.balance_due)}`);
      return;
    }
    
    setProcessingPayment(true);
    try {
      await api.post(`/gym/memberships/${member.membership_id}/partial-payment`, {
        membership_id: member.membership_id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes
      });
      
      toast.success(`Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully!`);
      closeModal();
      fetchBalanceData();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to record payment');
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
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => (
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
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
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
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
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