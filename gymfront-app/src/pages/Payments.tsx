// src/pages/Payments.jsx
import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState('start');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCount: 0,
    averagePayment: 0,
    cashPayments: 0,
    cardPayments: 0,
    upiPayments: 0,
    otherPayments: 0,
    growth: 0
  });

  const currencySymbol = user?.currency_symbol || '₹';

  useEffect(() => {
    // Set default date range to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    fetchPayments();
  }, []);

  useEffect(() => {
    if (payments.length > 0 || startDate) {
      filterPayments();
    }
  }, [payments, startDate, endDate, searchTerm, selectedMethod]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/gym/payments?limit=1000');
      console.log('Payments response:', response.data);
      
      // Ensure we have an array and member data is properly structured
      let paymentsData = Array.isArray(response.data) ? response.data : [];
      
      // Process payments to ensure member_name is available
      paymentsData = paymentsData.map(payment => ({
        ...payment,
        member_name: payment.member?.full_name || payment.member_name || 'Unknown Member',
        member_phone: payment.member?.phone || '',
        member_email: payment.member?.email || ''
      }));
      
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payments. Please try again.');
      toast.error('Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    try {
      let filtered = [...payments];

      // Filter by date range
      if (startDate && endDate && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const paymentDate = payment.payment_date?.split('T')[0];
          return paymentDate && paymentDate >= startDate && paymentDate <= endDate;
        });
      }

      // Filter by search term (member name)
      if (searchTerm && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const memberName = payment.member_name || payment.member?.full_name || '';
          return memberName.toLowerCase().includes(searchTerm.toLowerCase());
        });
      }

      // Filter by payment method
      if (selectedMethod !== 'all' && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const method = payment.payment_method?.toLowerCase() || '';
          return method === selectedMethod.toLowerCase();
        });
      }

      // Calculate summary
      const totalRevenue = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalCount = filtered.length;
      const averagePayment = totalCount > 0 ? totalRevenue / totalCount : 0;
      
      const cashPayments = filtered
        .filter(p => p.payment_method?.toLowerCase() === 'cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const cardPayments = filtered
        .filter(p => p.payment_method?.toLowerCase() === 'card')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const upiPayments = filtered
        .filter(p => p.payment_method?.toLowerCase() === 'upi')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const otherPayments = filtered
        .filter(p => !['cash', 'card', 'upi'].includes(p.payment_method?.toLowerCase()))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate growth
      let growth = 0;
      if (payments.length > 0 && startDate && endDate) {
        const daysDiff = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
        const previousPeriodStart = new Date(startDate);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff);
        const previousPeriodEnd = new Date(startDate);
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
        
        const previousRevenue = payments
          .filter(p => {
            const paymentDate = p.payment_date?.split('T')[0];
            return paymentDate && 
                   paymentDate >= previousPeriodStart.toISOString().split('T')[0] && 
                   paymentDate <= previousPeriodEnd.toISOString().split('T')[0];
          })
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        growth = previousRevenue > 0 
          ? ((totalRevenue - previousRevenue) / previousRevenue * 100)
          : totalRevenue > 0 ? 100 : 0;
      }

      setSummary({
        totalRevenue,
        totalCount,
        averagePayment,
        cashPayments,
        cardPayments,
        upiPayments,
        otherPayments,
        growth
      });

      // Sort by date (newest first)
      const sortedFiltered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.payment_date);
        const dateB = new Date(b.payment_date);
        return dateB - dateA;
      });
      
      setFilteredPayments(sortedFiltered);
    } catch (err) {
      console.error('Error filtering payments:', err);
      setFilteredPayments([]);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return `${currencySymbol} 0`;
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${currencySymbol} ${formatted}`;
  };

  const handleDateChange = (date) => {
    if (datePickerType === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    setShowDatePicker(false);
  };

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const csvData = filteredPayments.map(p => ({
        'Date': p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : 'N/A',
        'Member Name': p.member_name || p.member?.full_name || 'Unknown',
        'Amount': p.amount || 0,
        'Payment Method': p.payment_method?.toUpperCase() || 'N/A',
        'Transaction ID': p.transaction_id || 'N/A',
        'Status': p.status || 'Completed'
      }));

      const csvHeaders = Object.keys(csvData[0]).join(',');
      const csvRows = csvData.map(row => Object.values(row).join(','));
      const csvString = [csvHeaders, ...csvRows].join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${startDate}_to_${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export started!');
    } catch (err) {
      console.error('Error exporting:', err);
      toast.error('Failed to export data');
    }
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💰',
      card: '💳',
      upi: '📱',
      bank: '🏦'
    };
    return icons[method?.toLowerCase()] || '💵';
  };

  const DatePickerModal = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowDatePicker(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Select {datePickerType === 'start' ? 'Start' : 'End'} Date
          </h3>
          <button 
            onClick={() => setShowDatePicker(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <input
          type="date"
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={datePickerType === 'start' ? startDate : endDate}
          onChange={(e) => handleDateChange(e.target.value)}
          max={datePickerType === 'start' ? endDate : undefined}
          min={datePickerType === 'end' ? startDate : undefined}
        />
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              const today = new Date();
              const date = today.toISOString().split('T')[0];
              handleDateChange(date);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => {
              const lastWeek = new Date();
              lastWeek.setDate(lastWeek.getDate() - 7);
              handleDateChange(lastWeek.toISOString().split('T')[0]);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              handleDateChange(lastMonth.toISOString().split('T')[0]);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Last 30 Days
          </button>
        </div>
      </div>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-3">
          <Wallet className="h-8 w-8 opacity-80" />
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            summary.growth >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'
          }`}>
            {summary.growth >= 0 ? '↑' : '↓'} {Math.abs(summary.growth).toFixed(1)}%
          </span>
        </div>
        <p className="text-sm opacity-80 mb-1">Total Revenue</p>
        <p className="text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
        <p className="text-xs opacity-70 mt-2">{summary.totalCount} transactions</p>
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-3">
          <TrendingUp className="h-8 w-8 opacity-80" />
        </div>
        <p className="text-sm opacity-80 mb-1">Average Payment</p>
        <p className="text-3xl font-bold">{formatCurrency(summary.averagePayment)}</p>
        <p className="text-xs opacity-70 mt-2">per transaction</p>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-3">
          <CreditCard className="h-8 w-8 opacity-80" />
        </div>
        <p className="text-sm opacity-80 mb-1">Payment Methods</p>
        <div className="space-y-1 mt-2">
          <div className="flex justify-between text-xs">
            <span>Cash</span>
            <span className="font-semibold">{formatCurrency(summary.cashPayments)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Card</span>
            <span className="font-semibold">{formatCurrency(summary.cardPayments)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>UPI</span>
            <span className="font-semibold">{formatCurrency(summary.upiPayments)}</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-3">
          <Users className="h-8 w-8 opacity-80" />
        </div>
        <p className="text-sm opacity-80 mb-1">Date Range</p>
        <p className="text-lg font-semibold">
          {startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Start'} - 
          {endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'End'}
        </p>
        <button
          onClick={() => {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
          }}
          className="mt-2 text-xs bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30 transition-colors"
        >
          Reset to current month
        </button>
      </div>
    </div>
  );

  const renderPaymentCard = (payment) => {
    const isExpanded = expandedPayment === payment.id;
    // Get member name from multiple possible sources
    const memberName = payment.member_name || 
                      payment.member?.full_name || 
                      payment.member?.name || 
                      'Unknown Member';
    
    return (
      <div 
        key={payment.id} 
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden"
      >
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpandedPayment(isExpanded ? null : payment.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {memberName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{memberName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Date not available'}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {getPaymentMethodIcon(payment.payment_method)} {payment.payment_method?.toUpperCase() || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
              </p>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                <p className="text-sm font-mono text-gray-700">{payment.transaction_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                <p className="text-sm flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 font-medium">{payment.status || 'Completed'}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Member Phone</p>
                <p className="text-sm text-gray-700">{payment.member_phone || payment.member?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment Time</p>
                <p className="text-sm text-gray-700">
                  {payment.payment_date ? new Date(payment.payment_date).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
            
            {payment.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{payment.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Payment Transactions
            </h1>
            <p className="text-blue-100 mt-2">View and manage all payment transactions</p>
          </div>
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

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <button
                onClick={() => {
                  setDatePickerType('start');
                  setShowDatePicker(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'Select date'}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 mt-6" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <button
                onClick={() => {
                  setDatePickerType('end');
                  setShowDatePicker(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
              >
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'Select date'}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                setStartDate(startOfWeek.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(startOfMonth.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                setStartDate(startOfYear.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {['all', 'cash', 'card', 'upi'].map((method) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  selectedMethod === method
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method === 'all' ? 'All Methods' : method}
              </button>
            ))}
          </div>
          
          {(searchTerm || selectedMethod !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMethod('all');
              }}
              className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Transactions ({filteredPayments.length})
          </h2>
          <p className="text-sm text-gray-500">
            Showing payments from {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'start'} to {endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'end'}
          </p>
        </div>
        
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {payments.length === 0 
                ? 'No payment records found in the system.' 
                : 'No payments recorded in the selected date range.'}
            </p>
            {payments.length === 0 ? (
              <button
                onClick={() => fetchPayments()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            ) : (
              <button
                onClick={() => {
                  const today = new Date();
                  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset to current month
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map(payment => renderPaymentCard(payment))}
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && <DatePickerModal />}
    </div>
  );
};

export default Payments;