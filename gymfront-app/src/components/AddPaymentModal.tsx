import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Check, 
  User, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Building, 
  FileText, 
  Wallet, 
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomDatePicker from './CustomDatePicker';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentDate?: string) => void;
}

interface MemberOption {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
  profile_image?: string;
  avatar?: string;
  current_membership?: {
    id: number;
    plan?: { name: string };
    balance_due?: number;
    amount_paid?: number;
    status?: string;
  };
  membership_id?: number;
  balance_due?: number;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI / GPay / PhonePe', icon: Smartphone },
  { id: 'card', label: 'Card (Debit / Credit)', icon: CreditCard },
  { id: 'net_banking', label: 'Net Banking', icon: Building },
  { id: 'cheque', label: 'Cheque', icon: FileText },
  { id: 'bank_transfer', label: 'Bank Transfer / NEFT', icon: Building },
];

const getTodayDateStr = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  // Member Search State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Payment Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateStr());
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Search debounce
  useEffect(() => {
    if (!isOpen || selectedMember) return;

    if (!memberSearchQuery.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      searchMembers(memberSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery, isOpen, selectedMember]);

  // Click outside to close member search dropdown
  useEffect(() => {
    if (!showMemberDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMemberDropdown]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentDate(getTodayDateStr());
      setPaymentMethod('cash');
      setAmount('');
      setTransactionId('');
      setNotes('');
      setSelectedMember(null);
      setMemberSearchQuery('');
      setShowMemberDropdown(false);
      fetchRecentMembers();
    }
  }, [isOpen]);

  const fetchRecentMembers = async () => {
    try {
      setSearchingMembers(true);
      const res = await api.get('/gym/members?limit=10');
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setMemberResults(list);
    } catch (err) {
      console.warn('Failed to pre-fetch members:', err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const searchMembers = async (query: string) => {
    try {
      setSearchingMembers(true);
      const res = await api.get(`/gym/members?search=${encodeURIComponent(query)}&limit=15`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setMemberResults(list);
      setShowMemberDropdown(true);
    } catch (err) {
      console.warn('Failed to search members:', err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleSelectMember = (member: MemberOption) => {
    setSelectedMember(member);
    setMemberSearchQuery('');
    setShowMemberDropdown(false);

    // If member has balance due, pre-fill or suggest amount
    const balanceDue = member.current_membership?.balance_due ?? member.balance_due ?? 0;
    if (balanceDue > 0) {
      setAmount(String(balanceDue));
    }
  };

  const handleResetMember = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setAmount('');
    setShowMemberDropdown(true);
    fetchRecentMembers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMember) {
      toast.error('Please select an existing member');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than ₹0');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    setSubmitting(true);
    try {
      const membershipId = 
        selectedMember.current_membership?.id || 
        selectedMember.membership_id || 
        undefined;

      const payload = {
        member_id: selectedMember.id,
        membership_id: membershipId,
        amount: numAmount,
        payment_method: paymentMethod,
        transaction_id: transactionId.trim() || undefined,
        notes: notes.trim() || undefined,
        payment_date: paymentDate, // Stores exact chosen date (supports back dates!)
      };

      await api.post('/gym/payments', payload);

      toast.success(
        `Payment of ₹${numAmount.toLocaleString('en-IN')} recorded for ${selectedMember.full_name} (${paymentDate})`
      );

      // Notify other components & refresh ledger
      window.dispatchEvent(new CustomEvent('paymentUpdated'));
      onPaymentSuccess(paymentDate);
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to record payment';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const memberBalanceDue = selectedMember?.current_membership?.balance_due ?? selectedMember?.balance_due ?? 0;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative my-8 overflow-visible animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Add Payment</h3>
              <p className="text-xs text-gray-500">Record a payment for an existing member (back-dates supported)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Member <span className="text-red-500">*</span>
            </label>

            {!selectedMember ? (
              <div className="relative" ref={searchContainerRef}>
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onFocus={() => setShowMemberDropdown(true)}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      setShowMemberDropdown(true);
                    }}
                    placeholder="Search member by name, phone or email..."
                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    autoFocus
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberSearchQuery('');
                        setShowMemberDropdown(false);
                      }}
                      className="absolute right-8 text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {searchingMembers && (
                    <Loader2 className="absolute right-3 h-4 w-4 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showMemberDropdown && memberResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50 divide-y divide-gray-50">
                    {memberResults.map((m) => {
                      const balance = m.current_membership?.balance_due ?? m.balance_due ?? 0;
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleSelectMember(m)}
                          className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {m.full_name?.charAt(0) || 'M'}
                            </div>
                            <div className="truncate">
                              <p className="text-sm font-semibold text-gray-900 truncate">{m.full_name}</p>
                              <p className="text-xs text-gray-500">{m.phone || 'No phone'}</p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            {balance > 0 ? (
                              <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 rounded-md border border-rose-100">
                                Due: ₹{balance}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {m.current_membership?.plan?.name || 'No Plan'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Member Card */
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center shadow-inner">
                    {selectedMember.full_name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{selectedMember.full_name}</p>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-600">
                      {selectedMember.phone} {selectedMember.current_membership?.plan?.name ? `• ${selectedMember.current_membership.plan.name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {memberBalanceDue > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg">
                      Due: ₹{memberBalanceDue}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetMember}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Date with Back-Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-emerald-600 font-medium">
                Back-dating supported
              </span>
            </div>
            <CustomDatePicker
              value={paymentDate}
              onChange={(val) => setPaymentDate(val)}
              placeholder="Select payment date"
              className="w-full"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Select the date this payment was originally received (can be today or any past date).
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              {memberBalanceDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(memberBalanceDue))}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Pay Full Balance (₹{memberBalanceDue})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount paid"
                className="w-full pl-8 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="truncate">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference / Transaction ID (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Transaction / Reference ID <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. UPI Ref / UTR / Cheque Number"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Notes / Remarks <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Back-dated settlement, cash received on counter..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedMember || !amount}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;
