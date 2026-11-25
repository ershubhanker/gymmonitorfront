// src/components/UpgradePlanModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  ArrowRight,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Tag,
  Receipt,
  Sparkles,
  Clock,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function UpgradePlanModal({
  isOpen,
  onClose,
  member,
  plans = [],
  onSuccess
}) {
  const { user } = useAuth();
  const currencySymbol = user?.currency_symbol || '₹';

  const currentMembership = member?.current_membership;
  const currentPlan = currentMembership?.plan;
  const currentPlanPrice = Number(currentPlan?.discounted_price || currentPlan?.price || 0);
  const currentTotalPaid = Number(currentMembership?.amount_paid || 0);

  // Form state
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), []);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [changeDate, setChangeDate] = useState(todayStr);
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [creditMode, setCreditMode] = useState('full'); // 'full' | 'prorated' | 'custom'
  const [customCredit, setCustomCredit] = useState('');
  const [discountApplied, setDiscountApplied] = useState('');
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [notes, setNotes] = useState('');
  const [isAmountManuallyEdited, setIsAmountManuallyEdited] = useState(false);

  // Calculation / preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter available upgrade plans (plans other than the current plan)
  const availablePlans = useMemo(() => {
    if (!Array.isArray(plans)) return [];
    return plans.filter(p => !currentPlan || String(p.id) !== String(currentPlan.id));
  }, [plans, currentPlan]);

  const selectedNewPlan = useMemo(() => {
    return plans.find(p => String(p.id) === String(selectedPlanId)) || null;
  }, [plans, selectedPlanId]);

  const newPlanPrice = Number(selectedNewPlan?.discounted_price || selectedNewPlan?.price || 0);

  // Fetch prorated preview from backend when plan or change date changes
  useEffect(() => {
    if (!isOpen || !member?.id || !selectedPlanId) {
      setPreviewData(null);
      return;
    }

    let isMounted = true;
    setPreviewLoading(true);

    api.post(`/gym/members/${member.id}/change-plan/preview`, {
      member_id: member.id,
      new_plan_id: parseInt(selectedPlanId, 10),
      change_date: changeDate,
    })
      .then(res => {
        if (isMounted) {
          setPreviewData(res.data);
        }
      })
      .catch(err => {
        console.warn('Preview calculation error:', err);
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, member?.id, selectedPlanId, changeDate]);

  // Determine effective credit
  const effectiveCredit = useMemo(() => {
    if (creditMode === 'full') {
      return currentTotalPaid;
    }
    if (creditMode === 'prorated') {
      if (previewData && previewData.refund_amount !== undefined) {
        return Math.min(currentTotalPaid, Math.max(0, Number(previewData.refund_amount)));
      }
      return currentTotalPaid;
    }
    if (creditMode === 'custom') {
      const val = parseFloat(customCredit);
      return isNaN(val) ? 0 : Math.max(0, val);
    }
    return currentTotalPaid;
  }, [creditMode, currentTotalPaid, previewData, customCredit]);

  // Net amount payable for upgrade
  const manualDiscount = parseFloat(discountApplied) || 0;
  const netUpgradeAmount = Math.max(0, Math.round((newPlanPrice - effectiveCredit - manualDiscount) * 100) / 100);

  // Auto-sync amountPaidNow with netUpgradeAmount unless staff typed something else
  useEffect(() => {
    if (!isAmountManuallyEdited) {
      setAmountPaidNow(netUpgradeAmount > 0 ? String(netUpgradeAmount) : '0');
    }
  }, [netUpgradeAmount, isAmountManuallyEdited]);

  // Balance due
  const enteredAmountPaid = parseFloat(amountPaidNow) || 0;
  const calculatedBalanceDue = Math.max(0, Math.round((netUpgradeAmount - enteredAmountPaid) * 100) / 100);

  // Auto-fill default notes
  useEffect(() => {
    if (selectedNewPlan && currentPlan) {
      setNotes(`Upgraded from ${currentPlan.name} to ${selectedNewPlan.name} (Credit: ${currencySymbol}${effectiveCredit})`);
    }
  }, [selectedNewPlan, currentPlan, effectiveCredit, currencySymbol]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlanId) {
      toast.error('Please select a new membership plan to upgrade to');
      return;
    }

    if (enteredAmountPaid < 0) {
      toast.error('Payment amount cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        member_id: member.id,
        new_plan_id: parseInt(selectedPlanId, 10),
        change_date: changeDate,
        credit_amount: effectiveCredit,
        amount_paid: enteredAmountPaid,
        discount_applied: manualDiscount > 0 ? manualDiscount : 0,
        balance_due: calculatedBalanceDue,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes || undefined,
      };

      const res = await api.post(`/gym/members/${member.id}/change-plan`, payload);

      toast.success(
        `Plan successfully upgraded to ${selectedNewPlan?.name || 'new plan'}!`,
        { duration: 5000 }
      );

      // Dispatch global events for instant UI synchronization
      window.dispatchEvent(new CustomEvent('paymentAdded'));
      window.dispatchEvent(new CustomEvent('paymentUpdated'));
      window.dispatchEvent(new CustomEvent('memberUpdated', { detail: { memberId: member.id } }));
      window.dispatchEvent(new CustomEvent('refreshDashboard'));

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Error upgrading plan:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to upgrade plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Upgrade Membership Plan
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Option A: Ledger Flow
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Switch member to a higher plan and apply credit for previous payment
              </p>
            </div>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Current Membership Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Plan
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Active
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {member.full_name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Plan</p>
                <p className="font-bold text-slate-800">{currentPlan?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400">Plan Price</p>
                <p className="font-bold text-slate-800">{currencySymbol}{currentPlanPrice}</p>
              </div>
              <div>
                <p className="text-slate-400">Paid Previously</p>
                <p className="font-bold text-emerald-700">{currencySymbol}{currentTotalPaid}</p>
              </div>
              <div>
                <p className="text-slate-400">Days Elapsed</p>
                <p className="font-bold text-slate-800">
                  {previewData?.used_days !== undefined ? `${previewData.used_days} days` : 'Recent'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Select New Plan & Effective Date */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>1. Select New Target Plan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    New Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      setSelectedPlanId(e.target.value);
                      setIsAmountManuallyEdited(false);
                    }}
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  >
                    <option value="">-- Choose Plan to Upgrade to --</option>
                    {availablePlans.map((p) => {
                      const price = p.discounted_price || p.price;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} — {currencySymbol}{price} ({p.duration_days} days)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Upgrade Effective Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={changeDate}
                    onChange={(e) => setChangeDate(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {previewLoading && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Calculating upgrade duration and prorated credit...</span>
                </div>
              )}

              {previewData?.new_end_date && (
                <div className="text-xs bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-emerald-900">
                  <span>New Plan Validity:</span>
                  <span className="font-bold">
                    {changeDate} &rarr; {previewData.new_end_date} ({selectedNewPlan?.duration_days || 0} days)
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Credit from Previous Payment */}
            {selectedNewPlan && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>2. Credit from Previous Payment ({currencySymbol}{currentTotalPaid})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    Applying: {currencySymbol}{effectiveCredit}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreditMode('full');
                      setIsAmountManuallyEdited(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      creditMode === 'full'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-400'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Full Credit (100%)</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      {currencySymbol}{currentTotalPaid}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Best for recent plan switches</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreditMode('prorated');
                      setIsAmountManuallyEdited(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      creditMode === 'prorated'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-400'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Prorated Credit</p>
                    <p className="text-[11px] text-blue-700 font-semibold mt-0.5">
                      {currencySymbol}{previewData ? Math.round(previewData.refund_amount) : currentTotalPaid}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Deducts days already used</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreditMode('custom');
                      setIsAmountManuallyEdited(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      creditMode === 'custom'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-1 ring-emerald-400'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 text-gray-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Custom Credit</p>
                    <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                      {creditMode === 'custom' ? `${currencySymbol}${effectiveCredit}` : 'Custom ₹'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Enter any credit amount</p>
                  </button>
                </div>

                {creditMode === 'custom' && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Enter Custom Credit ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customCredit}
                      onChange={(e) => {
                        setCustomCredit(e.target.value);
                        setIsAmountManuallyEdited(false);
                      }}
                      placeholder="e.g. 2000"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Upgrade Financial Ledger */}
            {selectedNewPlan && (
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span>New Plan Price ({selectedNewPlan.name}):</span>
                  <span className="font-bold text-gray-900">{currencySymbol}{newPlanPrice}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span>Credit from Previous Plan:</span>
                  <span className="font-bold">- {currencySymbol}{effectiveCredit}</span>
                </div>

                {/* Optional additional discount */}
                <div className="flex items-center justify-between text-xs text-gray-700 pt-1">
                  <span>Additional Discount ({currencySymbol}):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountApplied}
                    onChange={(e) => {
                      setDiscountApplied(e.target.value);
                      setIsAmountManuallyEdited(false);
                    }}
                    placeholder="0"
                    className="w-24 px-2 py-0.5 text-right border border-gray-300 rounded text-xs font-semibold focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="border-t border-emerald-200/80 pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Net Upgrade Due
                    </p>
                    <p className="text-[11px] text-gray-500">Remaining to reach full plan price</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700 font-mono">
                    {currencySymbol}{new Intl.NumberFormat('en-IN').format(netUpgradeAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Record Upgrade Payment */}
            {selectedNewPlan && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  <span>3. Record Upgrade Payment Today</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Amount Paid Now ({currencySymbol}) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountPaidNow}
                      onChange={(e) => {
                        setAmountPaidNow(e.target.value);
                        setIsAmountManuallyEdited(true);
                      }}
                      required
                      disabled={submitting}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all capitalize"
                    >
                      <option value="cash">💰 Cash</option>
                      <option value="upi">📱 UPI</option>
                      <option value="card">💳 Card</option>
                      <option value="bank">🏦 Bank</option>
                      <option value="online">🌐 Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={submitting}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {calculatedBalanceDue > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 flex items-center justify-between font-medium">
                    <span>Remaining Balance Due:</span>
                    <span className="font-bold font-mono">{currencySymbol}{calculatedBalanceDue}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Upgraded from 1 Month to 3+1 Months"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Dual Payment Ledger Explanation */}
            {selectedNewPlan && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Receipt className="h-3.5 w-3.5 text-blue-600" />
                  Audit Trail & Payment Ledger Guarantee
                </p>
                <ul className="space-y-0.5 text-[11px] text-blue-800/90 pl-5 list-disc">
                  <li>
                    <strong>Previous Payment:</strong> Retains {currencySymbol}{currentTotalPaid} on its original payment date in member history.
                  </li>
                  <li>
                    <strong>Upgrade Payment:</strong> Creates a new payment of {currencySymbol}{enteredAmountPaid} on {paymentDate}.
                  </li>
                  <li>
                    <strong>New Total Paid:</strong> Reflects {currencySymbol}{effectiveCredit + enteredAmountPaid} on {selectedNewPlan.name}.
                  </li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedPlanId}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing Upgrade...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Confirm Upgrade ({currencySymbol}{enteredAmountPaid})
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
