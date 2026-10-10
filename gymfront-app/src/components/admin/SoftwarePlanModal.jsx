// src/components/admin/SoftwarePlanModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Crown, X, Calendar, DollarSign, CheckCircle, Clock,
  AlertTriangle, Sparkles, Shield, ArrowRight, RefreshCw,
  Gift, Layers, Check, Info, IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

function toDateInput(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.length >= 10) {
    return val.substring(0, 10);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().substring(0, 10);
}

function addDays(dateStr, days) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().substring(0, 10);
}

function addMonths(dateStr, months) {
  const base = dateStr ? new Date(dateStr) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().substring(0, 10);
}

export default function SoftwarePlanModal({ gym, onClose, onSaved }) {
  const todayStr = new Date().toISOString().substring(0, 10);

  // Initial plan type detection
  const initialType = (gym?.software_plan_type || gym?.saas_plan || 'free').toLowerCase();
  const normalizedType = ['free', 'monthly', 'yearly'].includes(initialType) ? initialType : 'free';

  const [planType, setPlanType] = useState(normalizedType);
  const [customPrice, setCustomPrice] = useState(
    gym?.software_plan_price != null
      ? gym.software_plan_price
      : gym?.saas_amount != null
      ? gym.saas_amount
      : normalizedType === 'monthly'
      ? 1499
      : normalizedType === 'yearly'
      ? 14999
      : 0
  );

  const [startDate, setStartDate] = useState(
    toDateInput(gym?.software_plan_start_date) || todayStr
  );

  const [endDate, setEndDate] = useState(() => {
    if (gym?.software_plan_end_date) {
      return toDateInput(gym.software_plan_end_date);
    }
    if (normalizedType === 'monthly') return addMonths(todayStr, 1);
    if (normalizedType === 'yearly') return addMonths(todayStr, 12);
    return '';
  });

  const [noExpiry, setNoExpiry] = useState(normalizedType === 'free' && !gym?.software_plan_end_date);
  const [status, setStatus] = useState(gym?.subscription_status || 'active');
  const [saving, setSaving] = useState(false);

  // When plan type changes, suggest sensible defaults if price/end-date wasn't customized
  const handleSelectPlanType = (type) => {
    setPlanType(type);
    if (type === 'free') {
      setCustomPrice(0);
      setNoExpiry(true);
      setEndDate('');
    } else if (type === 'monthly') {
      if (customPrice === 0 || !customPrice) setCustomPrice(1499);
      setNoExpiry(false);
      setEndDate(addMonths(startDate || todayStr, 1));
    } else if (type === 'yearly') {
      if (customPrice === 0 || !customPrice || customPrice === 1499) setCustomPrice(14999);
      setNoExpiry(false);
      setEndDate(addMonths(startDate || todayStr, 12));
    }
  };

  // Compute expiry countdown / status preview
  let countdownText = 'No expiration date';
  let countdownBadge = 'bg-gray-800 text-gray-400 border-gray-700';
  if (!noExpiry && endDate) {
    const end = new Date(endDate + 'T23:59:59');
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      countdownText = `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
      countdownBadge = 'bg-red-950/70 text-red-400 border-red-800/60';
    } else if (diffDays === 0) {
      countdownText = 'Expires today';
      countdownBadge = 'bg-amber-950/70 text-amber-300 border-amber-800/60';
    } else if (diffDays <= 3) {
      countdownText = `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'} (Ending Soon)`;
      countdownBadge = 'bg-amber-950/80 text-amber-300 border-amber-700 animate-pulse';
    } else {
      countdownText = `Active · ${diffDays} days remaining`;
      countdownBadge = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!startDate) {
      toast.error('Please specify a plan start date');
      return;
    }
    if (!noExpiry && !endDate) {
      toast.error('Please specify an end date or select "No Expiry"');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan_type: planType,
        custom_price: planType === 'free' ? 0 : parseFloat(customPrice) || 0,
        start_date: startDate,
        end_date: noExpiry ? null : endDate,
        status: status,
      };

      const res = await api.put(`/admin/gyms/${gym.id}/software-plan`, payload);
      toast.success(`Plan updated for ${gym.name}!`);
      if (onSaved) {
        onSaved(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update software plan:', err);
      toast.error(err?.response?.data?.detail || 'Failed to update software plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Manage Software Plan
                <span className="text-xs font-normal text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-800/50">
                  Gym Owner SaaS
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Gym: <span className="text-gray-200 font-semibold">{gym.name}</span>
                {gym.owner_name ? ` · Owner: ${gym.owner_name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. Plan Type Selector (Free, Monthly, Yearly) */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2.5">
              1. Select Plan Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Free Plan */}
              <button
                type="button"
                onClick={() => handleSelectPlanType('free')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all relative ${
                  planType === 'free'
                    ? 'bg-gradient-to-b from-gray-800 to-gray-800/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'bg-gray-800/50 border-gray-700/80 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                {planType === 'free' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="p-2 rounded-lg bg-gray-700/70 text-emerald-400 mb-2">
                  <Gift className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-white">Free Plan</span>
                <span className="text-xs text-emerald-400 font-semibold mt-0.5">₹0 / Trial</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                  Free tier or evaluation plan with optional expiry.
                </p>
              </button>

              {/* Monthly Plan */}
              <button
                type="button"
                onClick={() => handleSelectPlanType('monthly')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all relative ${
                  planType === 'monthly'
                    ? 'bg-gradient-to-b from-blue-950/40 to-gray-800 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                    : 'bg-gray-800/50 border-gray-700/80 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                {planType === 'monthly' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="p-2 rounded-lg bg-blue-900/60 text-blue-400 mb-2">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-white">Monthly Plan</span>
                <span className="text-xs text-blue-400 font-semibold mt-0.5">Custom / Month</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                  Recurring monthly access with customizable fee.
                </p>
              </button>

              {/* Yearly Plan */}
              <button
                type="button"
                onClick={() => handleSelectPlanType('yearly')}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all relative ${
                  planType === 'yearly'
                    ? 'bg-gradient-to-b from-purple-950/40 to-gray-800 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                    : 'bg-gray-800/50 border-gray-700/80 hover:bg-gray-800 hover:border-gray-600'
                }`}
              >
                {planType === 'yearly' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="p-2 rounded-lg bg-purple-900/60 text-purple-400 mb-2">
                  <Crown className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-white">Yearly Plan</span>
                <span className="text-xs text-purple-400 font-semibold mt-0.5">Custom / Year</span>
                <p className="text-[11px] text-gray-400 mt-1 leading-tight">
                  Annual agreement with custom pricing and dates.
                </p>
              </button>

            </div>
          </div>

          {/* 2. Custom Price (Only shown / enabled for paid plans) */}
          <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700/70">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
                2. Custom Plan Price
              </label>
              {planType === 'free' ? (
                <span className="text-xs text-emerald-400 font-medium bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/50">
                  Free Tier (₹0)
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  {planType === 'monthly' ? 'Billed monthly' : 'Billed annually'}
                </span>
              )}
            </div>

            {planType === 'free' ? (
              <div className="text-sm text-gray-400 py-1">
                This gym is assigned to the Free Plan. Price is set to <strong className="text-white">₹0</strong>. Switch to Monthly or Yearly to enter a custom agreed price.
              </div>
            ) : (
              <div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Enter custom agreed price in ₹"
                    className="w-full bg-gray-900 border border-gray-600 text-white font-bold text-lg rounded-xl pl-8 pr-28 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 uppercase">
                    {planType === 'monthly' ? 'per month' : 'per year'}
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="text-[11px] text-gray-400">Quick presets:</span>
                  {(planType === 'monthly'
                    ? [999, 1499, 1999, 2999, 4999]
                    : [9999, 14999, 19999, 24999, 39999]
                  ).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomPrice(val)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        Number(customPrice) === val
                          ? 'bg-purple-900/60 text-purple-300 border-purple-600 font-bold'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      ₹{val.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                {/* Calculation breakdown */}
                {customPrice > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-gray-700/50 flex flex-wrap items-center justify-between text-xs text-gray-400">
                    <span>
                      {planType === 'monthly'
                        ? `Equivalent annual run rate: ₹${(Number(customPrice) * 12).toLocaleString('en-IN')}/year`
                        : `Equivalent monthly run rate: ₹${Math.round(Number(customPrice) / 12).toLocaleString('en-IN')}/month`}
                    </span>
                    <span className="text-emerald-400 font-medium">
                      Recorded in revenue analytics
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Start Date & End Date Configuration */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2.5">
              3. Plan Duration & Dates
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Start Date */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-semibold">Start Date</span>
                  <button
                    type="button"
                    onClick={() => setStartDate(todayStr)}
                    className="text-[11px] text-purple-400 hover:text-purple-300"
                  >
                    Set to Today
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300 font-semibold">End Date / Expiry</span>
                  {planType === 'free' && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noExpiry}
                        onChange={(e) => {
                          setNoExpiry(e.target.checked);
                          if (e.target.checked) setEndDate('');
                          else setEndDate(addMonths(startDate || todayStr, 1));
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] text-gray-400">No Expiry</span>
                    </label>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={noExpiry ? '' : endDate}
                    disabled={noExpiry}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (noExpiry) setNoExpiry(false);
                    }}
                    placeholder="YYYY-MM-DD"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    required={!noExpiry}
                  />
                </div>
              </div>

            </div>

            {/* Quick Extension buttons */}
            {!noExpiry && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="text-[11px] text-gray-400">Quick set end date:</span>
                <button
                  type="button"
                  onClick={() => setEndDate(addDays(startDate || todayStr, 30))}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setEndDate(addMonths(startDate || todayStr, 3))}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                >
                  +3 Months
                </button>
                <button
                  type="button"
                  onClick={() => setEndDate(addMonths(startDate || todayStr, 6))}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                >
                  +6 Months
                </button>
                <button
                  type="button"
                  onClick={() => setEndDate(addMonths(startDate || todayStr, 12))}
                  className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                >
                  +1 Year
                </button>
              </div>
            )}

            {/* Expiry preview pill */}
            <div className="mt-3.5 flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/60">
              <span className="text-xs text-gray-400">Plan Status Preview:</span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium border ${countdownBadge}`}>
                {countdownText}
              </span>
            </div>
          </div>

          {/* 4. Manual Status Override */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div>
              <span className="text-xs font-semibold text-gray-300 block">Subscription Status</span>
              <span className="text-[11px] text-gray-500">Auto-evaluates based on end date, or force status.</span>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 capitalize"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving Plan...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Software Plan
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
