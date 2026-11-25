import React, { useState, useEffect } from 'react';
import {
  X,
  Pencil,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  FileText,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { parseUtcDate } from '../utils/dateUtils';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  onPaymentUpdated: (updatedDate?: string) => void;
  currencySymbol?: string;
}

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
  } catch (e) {}
  return String(paymentDate).split('T')[0].split(' ')[0];
};

const getTodayDateStr = (): string => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const formatCurrency = (val: any, symbol = '₹'): string => {
  const num = Number(val) || 0;
  return `${symbol}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`;
};

export default function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  onPaymentUpdated,
  currencySymbol = '₹'
}: EditPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Synchronize internal form state when payment opens or changes
  useEffect(() => {
    if (payment && isOpen) {
      const rawAmt = Math.abs(Number(payment.amount) || 0);
      setAmount(rawAmt > 0 ? String(rawAmt) : '');
      setPaymentDate(getPaymentLocalDateStr(payment.payment_date) || getTodayDateStr());
      setPaymentMethod((payment.payment_method || 'cash').toLowerCase());
      setNotes(payment.notes || '');
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const origAmount = Math.abs(Number(payment.amount) || 0);
  const currAmount = parseFloat(amount) || 0;
  const diff = currAmount - origAmount;
  const memberName = payment.member_name || payment.member?.full_name || 'Member';
  const memberPhone = payment.member_phone || payment.member?.phone;
  const planName = typeof payment.member_plan === 'string' 
    ? payment.member_plan 
    : (payment.membership_plan_name || payment.membership?.plan?.name || payment.plan_name || 'N/A');
  const txnId = payment.transaction_id || `PAY-${payment.id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount greater than 0');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: notes.trim(),
      };

      const res = await api.put(`/gym/payments/${payment.id}`, payload);

      toast.success('Payment updated successfully');

      // Dispatch global paymentUpdated event for other screens/tabs
      window.dispatchEvent(
        new CustomEvent('paymentUpdated', {
          detail: {
            paymentId: payment.id,
            memberId: payment.member_id || res.data?.payment?.member_id,
            amount: numAmount,
            paymentDate,
          },
        })
      );

      onPaymentUpdated(paymentDate);
      onClose();
    } catch (err: any) {
      console.error('Error updating payment:', err);
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Payment</h3>
              <p className="text-xs text-gray-500">Update payment date, amount, method, or notes</p>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Member & Transaction info banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Member</p>
              <p className="text-sm font-bold text-slate-800">{memberName}</p>
              {memberPhone && <p className="text-xs text-slate-500">{String(memberPhone)}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Plan / Type</p>
              <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                {planName !== 'N/A' ? planName : (payment.payment_type || 'Membership')}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span>
              Txn: <strong className="font-mono">{txnId}</strong>
            </span>
            <span>
              Original Amount: <strong>{formatCurrency(origAmount, currencySymbol)}</strong>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              disabled={saving}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <p className="text-[11px] text-gray-500 mt-1">The date when this payment was actually received.</p>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Amount ({currencySymbol}) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={saving}
                placeholder="0.00"
                className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            {diff !== 0 && !isNaN(diff) && (
              <div
                className={`mt-1.5 text-xs px-2.5 py-1 rounded-lg flex items-center justify-between font-medium ${
                  diff > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span>
                  Adjustment: {diff > 0 ? `+${formatCurrency(diff, currencySymbol)}` : `-${formatCurrency(Math.abs(diff), currencySymbol)}`}
                </span>
                <span className="text-[11px] opacity-80">
                  {diff > 0 ? 'Reduces member balance' : 'Increases member balance due'}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={saving}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all capitalize"
            >
              <option value="cash">💰 Cash</option>
              <option value="upi">📱 UPI</option>
              <option value="card">💳 Card</option>
              <option value="bank">🏦 Bank Transfer</option>
              <option value="online">🌐 Online</option>
              <option value="other">💵 Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={2}
              placeholder="Reason for edit or payment notes..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
