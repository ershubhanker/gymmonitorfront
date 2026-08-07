// src/pages/Payments.tsx - Complete with all functions

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  Download, 
  Search,
  ChevronDown,
  X,TrendingUp,
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
  Tag, Dumbbell
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
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  
  // Delete-related state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [summary, setSummary] = useState({
    totalRevenue: 0,
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
    addonPaymentCount: 0
  });

  const currencySymbol = user?.currency_symbol || '₹';
  const gymGST = user?.gym_gst_number || user?.gst_number || 'Not Available';
  const gymName = user?.gym_name || 'Gym Management System';
  const [gstRate, setGstRate] = useState<number>(user?.gst_rate || 5.0);
  const [showGstModal, setShowGstModal] = useState(false);
  const [updatingGst, setUpdatingGst] = useState(false);

  useEffect(() => {
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
  }, [payments, startDate, endDate, searchTerm, selectedMethod, paymentTypeFilter]);

  // Exit selection mode when payments change
  useEffect(() => {
    setSelectionMode(false);
    setSelectedPayments(new Set());
  }, [payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/gym/payments?limit=1000');
      console.log('Payments response:', response.data);
      
      let paymentsData = Array.isArray(response.data) ? response.data : [];
      
      paymentsData = paymentsData.map(payment => {
        let paymentType = 'membership';
        let addonName = null;
        
        // ✅ Check for addon payment by transaction_id prefix
        if (payment.transaction_id?.startsWith('ADDON-PAY-') || 
            payment.transaction_id?.startsWith('ADDON-')) {
          paymentType = 'addon';
          // Try to extract addon name from notes
          const notes = payment.notes || '';
          const addonMatch = notes.match(/Addon payment for ([^:]+)/);
          if (addonMatch) {
            addonName = addonMatch[1].trim();
          } else {
            addonName = 'Addon';
          }
        } 
        // ✅ Check for PT payment
        else if (payment.transaction_id?.startsWith('PT-') || 
                 payment.notes?.includes('PT Payment') ||
                 payment.membership_id === null) {
          paymentType = 'pt';
        }
        
        return {
          ...payment,
          member_name: payment.member?.full_name || payment.member_name || 'Unknown Member',
          member_phone: payment.member?.phone || '',
          member_email: payment.member?.email || '',
          member_plan: payment.member?.membership_plan_name || payment.member?.plan || 'N/A',
          member_balance: payment.member?.balance_amount || payment.balance_amount || 0,
          gst_amount: payment.gst_amount || payment.tax_amount || 0,
          is_balance_payment: payment.is_balance_payment || false,
          original_invoice_id: payment.original_invoice_id || null,
          payment_type: paymentType,
          addon_name: addonName
        };
      });
      
      console.log('Processed payments with types:', paymentsData.map(p => ({ id: p.id, type: p.payment_type, addon: p.addon_name })));
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

      if (startDate && endDate && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const paymentDate = payment.payment_date?.split('T')[0];
          return paymentDate && paymentDate >= startDate && paymentDate <= endDate;
        });
      }

      if (searchTerm && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const memberName = payment.member_name || payment.member?.full_name || '';
          return memberName.toLowerCase().includes(searchTerm.toLowerCase());
        });
      }

      if (selectedMethod !== 'all' && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          const method = payment.payment_method?.toLowerCase() || '';
          return method === selectedMethod.toLowerCase();
        });
      }

      if (paymentTypeFilter !== 'all' && filtered.length > 0) {
        filtered = filtered.filter(payment => {
          if (paymentTypeFilter === 'membership') {
            return payment.payment_type === 'membership';
          } else if (paymentTypeFilter === 'pt') {
            return payment.payment_type === 'pt';
          } else if (paymentTypeFilter === 'addon') {
            return payment.payment_type === 'addon';
          }
          return true;
        });
      }

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

      const totalGST = filtered.reduce((sum, p) => sum + (p.gst_amount || 0), 0);
      
      const totalBalancePayments = filtered
        .filter(p => p.is_balance_payment === true)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const addonPayments = filtered
        .filter(p => p.payment_type === 'addon')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const addonPaymentCount = filtered.filter(p => p.payment_type === 'addon').length;

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
        growth,
        totalGST,
        totalBalancePayments,
        totalAddonPayments: addonPayments,
        addonPaymentCount
      });

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

  // ===== TOGGLE SELECTION MODE =====
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPayments(new Set());
    setExpandedPayment(null);
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
  const togglePaymentSelection = (paymentId) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  // ===== SINGLE PAYMENT DELETE =====
  const handleSingleDelete = async (paymentId, paymentAmount, memberName) => {
    if (!window.confirm(`Are you sure you want to delete the payment of ${formatCurrency(paymentAmount)} for ${memberName}?\n\nThis action cannot be undone and will update the member's balance.`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/gym/payments/${paymentId}`);
      toast.success(`Payment of ${formatCurrency(paymentAmount)} deleted successfully`);
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  // ===== BULK DELETE =====
  const handleBulkDelete = async () => {
    const paymentIds = Array.from(selectedPayments);
    const selectedPaymentsData = filteredPayments.filter(p => selectedPayments.has(p.id));
    const totalAmount = selectedPaymentsData.reduce((sum, p) => sum + p.amount, 0);
    
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
      toast.error(error.response?.data?.detail || 'Failed to delete payments');
    } finally {
      setDeleting(false);
    }
  };

  // ===== GET PAYMENT METHOD ICON =====
  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💰',
      card: '💳',
      upi: '📱',
      bank: '🏦'
    };
    return icons[method?.toLowerCase()] || '💵';
  };

  // ===== HANDLE EXPORT =====
  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.error('No data to export for the selected date range');
      return;
    }

    try {
      const startDateFormatted = startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'N/A';
      const endDateFormatted = endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'N/A';
      const exportDate = new Date().toLocaleString('en-IN');
      
      const totalAmount = summary.totalRevenue;
      const totalTransactions = filteredPayments.length;
      const averageAmount = totalAmount / totalTransactions;
      
      const halfRate = gstRate / 2;
      const taxableAmount = summary.totalGST > 0
        ? totalAmount - summary.totalGST
        : totalAmount / (1 + gstRate / 100);
      const gstCollected = summary.totalGST > 0
        ? summary.totalGST
        : totalAmount - taxableAmount;
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
      csvRows.push([`"Total Revenue:","${formatCurrency(totalAmount)}"`]);
      csvRows.push([`"Total Transactions:","${totalTransactions}"`]);
      csvRows.push([`"Average Payment:","${formatCurrency(averageAmount)}"`]);
      csvRows.push(['']);
      csvRows.push(['"GST Summary:"']);
      csvRows.push([`"GST Rate:","${gstRate}% (CGST ${gstRate/2}% + SGST ${gstRate/2}%)"`]);
      csvRows.push([`"Total GST Collected:","${formatCurrency(gstCollected)}"`]);
      csvRows.push([`"Taxable Amount (excl. GST):","${formatCurrency(taxableAmount)}"`]);
      csvRows.push([`"CGST (${gstRate/2}%):","${formatCurrency(cgstAmount)}"`]);
      csvRows.push([`"SGST (${gstRate/2}%):","${formatCurrency(sgstAmount)}"`]);
      csvRows.push(['']);
      csvRows.push(['"Balance Payment Summary:"']);
      csvRows.push([`"Total Balance Payments:","${formatCurrency(summary.totalBalancePayments)}"`]);
      csvRows.push([`"Balance Payment Count:","${filteredPayments.filter(p => p.is_balance_payment).length}"`]);
      csvRows.push(['']);
      csvRows.push(['"Add-On Payment Summary:"']);
      csvRows.push([`"Total Add-On Payments:","${formatCurrency(summary.totalAddonPayments)}"`]);
      csvRows.push([`"Add-On Payment Count:","${summary.addonPaymentCount}"`]);
      csvRows.push(['']);
      
      csvRows.push(['"Payment Method Breakdown"']);
      csvRows.push(['"Method","Amount","Count","Percentage"']);
      const methodBreakdown = [
        { method: 'Cash', amount: summary.cashPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'cash').length },
        { method: 'Card', amount: summary.cardPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'card').length },
        { method: 'UPI', amount: summary.upiPayments, count: filteredPayments.filter(p => p.payment_method?.toLowerCase() === 'upi').length },
        { method: 'Other', amount: summary.otherPayments, count: filteredPayments.filter(p => !['cash', 'card', 'upi'].includes(p.payment_method?.toLowerCase())).length }
      ];
      methodBreakdown.forEach(item => {
        const percentage = totalAmount > 0 ? (item.amount / totalAmount * 100).toFixed(2) : '0';
        csvRows.push([`"${item.method}"`, `"${formatCurrency(item.amount)}"`, item.count, `"${percentage}%"`]);
      });
      csvRows.push(['']);
      
      csvRows.push(['"Detailed Transactions"']);
      csvRows.push([
        '"Date"',
        '"Member Name"',
        '"Member Phone"',
        '"Member Email"',
        '"Member Plan"',
        '"Amount"',
        '"Payment Method"',
        '"Transaction ID"',
        '"Status"',
        '"Payment Time"',
        '"GST Amount"',
        `"CGST (${gstRate/2}%)"`,
        `"SGST (${gstRate/2}%)"`,
        '"Is Balance Payment"',
        '"Original Invoice ID"',
        '"Member Balance After"',
        '"Payment Type"',
        '"Notes"'
      ]);
      
      filteredPayments.forEach(payment => {
        const paymentDate = payment.payment_date ? new Date(payment.payment_date) : null;
        const dateStr = paymentDate ? paymentDate.toLocaleDateString('en-IN') : 'N/A';
        const timeStr = paymentDate ? paymentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        
        const paymentTypeLabel = payment.payment_type === 'addon' ? 'Add-On' : payment.payment_type === 'pt' ? 'PT' : 'Membership';
        
        csvRows.push([
          `"${dateStr}"`,
          `"${(payment.member_name || payment.member?.full_name || 'Unknown Member').replace(/"/g, '""')}"`,
          `"${payment.member_phone || payment.member?.phone || 'N/A'}"`,
          `"${payment.member_email || payment.member?.email || 'N/A'}"`,
          `"${payment.member_plan || 'N/A'}"`,
          `"${payment.amount || 0}"`,
          `"${(payment.payment_method || 'N/A').toUpperCase()}"`,
          `"${payment.transaction_id || 'N/A'}"`,
          `"${payment.status || 'Completed'}"`,
          `"${timeStr}"`,
          `"${payment.gst_amount || 0}"`,
          `"${((payment.gst_amount || 0) / 2).toFixed(2)}"`,
          `"${((payment.gst_amount || 0) / 2).toFixed(2)}"`,
          `"${payment.is_balance_payment ? 'Yes' : 'No'}"`,
          `"${payment.original_invoice_id || 'N/A'}"`,
          `"${payment.member_balance || 0}"`,
          `"${paymentTypeLabel}"`,
          `"${(payment.notes || '').replace(/"/g, '""')}"`
        ]);
      });
      
      csvRows.push(['']);
      csvRows.push(['"Final Summary"']);
      csvRows.push([`"Total Records:","${filteredPayments.length}"`]);
      csvRows.push([`"Total Amount:","${formatCurrency(totalAmount)}"`]);
      csvRows.push([`"Total GST (${gstRate}%):","${formatCurrency(gstCollected)}"`]);
      csvRows.push([`"Total Balance Payments:","${formatCurrency(summary.totalBalancePayments)}"`]);
      csvRows.push([`"Total Add-On Payments:","${formatCurrency(summary.totalAddonPayments)}"`]);
      csvRows.push(['']);
      csvRows.push(['"Declaration:"']);
      csvRows.push([`"This report is generated by ${gymName} (GST: ${gymGST})"`]);
      csvRows.push([`"All payments are recorded as per the selected date range: ${startDateFormatted} to ${endDateFormatted}"`]);
      
      const csvString = csvRows.map(row => row.join(',')).join('\n');
      
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fileName = `payment_report_${startDate}_to_${endDate}_GST_${gymGST.replace(/[^a-zA-Z0-9]/g, '')}.csv`;
      link.href = url;
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Exported ${filteredPayments.length} transactions with GST details!`);
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
          {[5, 18].map((rate) => (
            <button
              key={rate}
              disabled={updatingGst}
              onClick={() => {
                setUpdatingGst(true);
                api.put('/gym/my-gym/gst-rate', { gst_rate: rate })
                  .then(() => {
                    setGstRate(rate);
                    setShowGstModal(false);
                    toast.success(`GST rate updated to ${rate}%`);
                  })
                  .catch(() => toast.error('Failed to update GST rate'))
                  .finally(() => setUpdatingGst(false));
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                gstRate === rate
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-purple-300 text-gray-700'
              }`}
            >
              <div className="text-left">
                <p className="font-semibold">{rate}% GST</p>
                <p className="text-xs text-gray-500">CGST {rate/2}% + SGST {rate/2}%</p>
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
          onChange={(e) => {
            if (datePickerType === 'start') {
              setStartDate(e.target.value);
            } else {
              setEndDate(e.target.value);
            }
            setShowDatePicker(false);
          }}
          max={datePickerType === 'start' ? endDate : undefined}
          min={datePickerType === 'end' ? startDate : undefined}
        />
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              const today = new Date();
              const date = today.toISOString().split('T')[0];
              if (datePickerType === 'start') {
                setStartDate(date);
              } else {
                setEndDate(date);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => {
              const lastWeek = new Date();
              lastWeek.setDate(lastWeek.getDate() - 7);
              const date = lastWeek.toISOString().split('T')[0];
              if (datePickerType === 'start') {
                setStartDate(date);
              } else {
                setEndDate(date);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              const date = lastMonth.toISOString().split('T')[0];
              if (datePickerType === 'start') {
                setStartDate(date);
              } else {
                setEndDate(date);
              }
              setShowDatePicker(false);
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
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
    const totalAmount = selectedData.reduce((sum, p) => sum + p.amount, 0);

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
              <li>• Update member balances (add back the deleted amounts)</li>
              <li>• Cannot be undone</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-sm font-semibold text-red-800">
                Total amount to reverse: {formatCurrency(totalAmount)}
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

  // ===== RENDER SUMMARY CARDS =====
  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <Wallet className="h-6 w-6 opacity-80" />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            summary.growth >= 0 ? 'bg-green-400/30' : 'bg-red-400/30'
          }`}>
            {summary.growth >= 0 ? '↑' : '↓'} {Math.abs(summary.growth).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs opacity-80 mb-0.5">Total Revenue</p>
        <p className="text-xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
        <p className="text-xs opacity-70 mt-1">{summary.totalCount} transactions</p>
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <Building className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-xs opacity-80 mb-0.5">GST Collected</p>
        <p className="text-xl font-bold">{formatCurrency(summary.totalGST)}</p>
        <p className="text-xs opacity-70 mt-1">CGST + SGST</p>
      </div>

      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-xs opacity-80 mb-0.5">Balance Payments</p>
        <p className="text-xl font-bold">{formatCurrency(summary.totalBalancePayments)}</p>
        <p className="text-xs opacity-70 mt-1">
          {filteredPayments.filter(p => p.is_balance_payment).length} transactions
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <Tag className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-xs opacity-80 mb-0.5">Add-On Payments</p>
        <p className="text-xl font-bold">{formatCurrency(summary.totalAddonPayments)}</p>
        <p className="text-xs opacity-70 mt-1">
          {summary.addonPaymentCount} transactions
        </p>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-2">
          <CreditCard className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-xs opacity-80 mb-0.5">Payment Methods</p>
        <div className="space-y-0.5 mt-1">
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
    </div>
  );

  // ===== RENDER PAYMENT CARD =====
  const renderPaymentCard = (payment) => {
    const isExpanded = expandedPayment === payment.id;
    const isSelected = selectedPayments.has(payment.id);
    const memberName = payment.member_name || 
                      payment.member?.full_name || 
                      payment.member?.name || 
                      'Unknown Member';
    
    const getPaymentTypeBadge = (type) => {
      switch(type) {
        case 'addon':
          return { label: 'Add-On', color: 'bg-purple-100 text-purple-700', icon: Tag };
        case 'pt':
          return { label: 'PT', color: 'bg-blue-100 text-blue-700', icon: Dumbbell };
        default:
          return { label: 'Membership', color: 'bg-green-100 text-green-700', icon: CreditCard };
      }
    };
    const typeInfo = getPaymentTypeBadge(payment.payment_type);
    const TypeIcon = typeInfo.icon;
    
    return (
      <div 
        key={payment.id} 
        className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all border overflow-hidden ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            {selectionMode && (
              <button
                onClick={() => togglePaymentSelection(payment.id)}
                className="flex-shrink-0"
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            )}
            
            <div 
              className="flex items-center gap-4 flex-1 cursor-pointer"
              onClick={() => !selectionMode && setExpandedPayment(isExpanded ? null : payment.id)}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {memberName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{memberName}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                    <TypeIcon className="h-3 w-3" />
                    {typeInfo.label}
                  </span>
                  {payment.addon_name && (
                    <span className="text-xs text-purple-600">({payment.addon_name})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                  {payment.is_balance_payment && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        Balance Payment
                      </span>
                    </>
                  )}
                  {payment.gst_amount > 0 && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        GST: {formatCurrency(payment.gst_amount)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
                </p>
              </div>
              
              {!selectionMode && (
                <button
                  onClick={() => handleSingleDelete(payment.id, payment.amount, memberName)}
                  disabled={deleting}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete payment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {isExpanded && !selectionMode && (
            <div className="border-t border-gray-100 mt-4 pt-4 bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                  <p className="text-sm font-mono text-gray-700">{payment.transaction_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Payment Type</p>
                  <p className="text-sm flex items-center gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeInfo.label}
                    </span>
                  </p>
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
                <div>
                  <p className="text-xs text-gray-500 mb-1">Member Balance</p>
                  <p className="text-sm text-gray-700">{formatCurrency(payment.member_balance || 0)}</p>
                </div>
                {payment.payment_type === 'addon' && payment.addon_name && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Add-On</p>
                    <p className="text-sm text-gray-700">{payment.addon_name}</p>
                  </div>
                )}
                {payment.is_balance_payment && payment.original_invoice_id && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Original Invoice ID</p>
                    <p className="text-sm font-mono text-gray-700">{payment.original_invoice_id}</p>
                  </div>
                )}
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
      </div>
    );
  };

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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Payment Transactions
            </h1>
            <p className="text-blue-100 mt-2">
              GST: {gymGST} ({gstRate}% — CGST {gstRate/2}% + SGST {gstRate/2}%) | {gymName}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGstModal(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all"
              title="Change GST Rate"
            >
              <Building className="h-5 w-5" />
              GST {gstRate}%
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                selectionMode 
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
                  filteredPayments.filter(p => selectedPayments.has(p.id)).reduce((sum, p) => sum + p.amount, 0)
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

      {/* Filters - Updated with Payment Type Filter */}
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
                className={`px-3 py-1.5 rounded-lg capitalize text-sm transition-colors ${
                  selectedMethod === method
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method === 'all' ? 'All Methods' : method}
              </button>
            ))}
          </div>

          <div className="flex gap-1 border-l border-gray-200 pl-4">
            <button
              onClick={() => setPaymentTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                paymentTypeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setPaymentTypeFilter('membership')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                paymentTypeFilter === 'membership'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Membership
            </button>
            <button
              onClick={() => setPaymentTypeFilter('pt')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                paymentTypeFilter === 'pt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setPaymentTypeFilter('addon')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                paymentTypeFilter === 'addon'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Add-Ons
            </button>
          </div>
          
          {(searchTerm || selectedMethod !== 'all' || paymentTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMethod('all');
                setPaymentTypeFilter('all');
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Showing from {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'start'} to {endDate ? new Date(endDate).toLocaleDateString('en-IN') : 'end'}</span>
            {paymentTypeFilter !== 'all' && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Filter: {paymentTypeFilter === 'addon' ? 'Add-On' : paymentTypeFilter === 'pt' ? 'PT' : 'Membership'}
              </span>
            )}
          </div>
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

      {/* Modals */}
      {showDatePicker && <DatePickerModal />}
      {showGstModal && <GstRateModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default Payments;