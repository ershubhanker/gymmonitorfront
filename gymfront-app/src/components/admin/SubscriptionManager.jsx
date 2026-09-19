// src/components/admin/SubscriptionManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown, Loader2, X, CheckCircle2, XCircle, AlertTriangle,
  Calendar, CreditCard, RefreshCw, PlayCircle, StopCircle, RotateCcw,
  IndianRupee, Clock, TrendingUp, History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useRazorpayCheckout } from '../../hooks/useRazorpayCheckout';

const STATUS_CONFIG = {
  active:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Active',        Icon: CheckCircle2 },
  created:       { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Awaiting',      Icon: Clock },
  authenticated: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Authenticated', Icon: Clock },
  pending:       { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Pending',       Icon: AlertTriangle },
  halted:        { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: 'Halted',        Icon: XCircle },
  cancelled:     { bg: 'bg-gray-100',   text: 'text-gray-700',    border: 'border-gray-200',    label: 'Cancelled',     Icon: XCircle },
  completed:     { bg: 'bg-gray-100',   text: 'text-gray-700',    border: 'border-gray-200',    label: 'Completed',     Icon: CheckCircle2 },
  expired:       { bg: 'bg-gray-100',   text: 'text-gray-700',    border: 'border-gray-200',    label: 'Expired',       Icon: XCircle },
  none:          { bg: 'bg-gray-100',   text: 'text-gray-500',    border: 'border-gray-200',    label: 'No Plan',       Icon: XCircle },
};

function fmtINR(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return withTime
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SubscriptionManager({ gymId, gymName, onClose, onChanged }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { status, title, message, url }
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog control
  const [activeAction, setActiveAction] = useState(null); // 'start' | 'renew' | 'cancel' | 'restart'
  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [restartFrom, setRestartFrom] = useState(todayISO());
  const [restartOffline, setRestartOffline] = useState(false);

  // ✅ Razorpay checkout for admin-initiated flows
  const { openWithCheckoutData } = useRazorpayCheckout({});

  const fetchState = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const path = `/gym/billing/admin/gyms/${gymId}/subscription`;
    try {
      const { data } = await api.get(path);
      setState(data);
      if (data?.subscription?.billing_cycle) {
        setSelectedCycle(data.subscription.billing_cycle);
      }
      // Pre-fill restart date with the cancelled sub's period end (honor leftover)
      if (data?.subscription?.current_period_end && data?.subscription?.status !== 'active') {
        setRestartFrom(data.subscription.current_period_end.split('T')[0]);
      } else {
        setRestartFrom(todayISO());
      }
    } catch (e) {
      // IMPORTANT: on failure do NOT fall through to the "No subscription yet"
      // screen. That would look like the gym has no plan and invite the admin
      // to start a duplicate subscription. Show the real error instead.
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      const url = `${api.defaults?.baseURL || ''}${path}`;

      let title = 'Could not load subscription';
      let message = (typeof detail === 'string' && detail) || e?.message || 'Unknown error';

      if (status === 404 && (!detail || detail === 'Not Found')) {
        // FastAPI's generic 404 = no route matched at all (not "gym not found")
        title = 'Subscription API not found (404)';
        message =
          'The server you are connected to does not have this endpoint. ' +
          'The backend is most likely running an older build. Fully stop and ' +
          'restart the API server (then click Retry). If it still fails, open ' +
          '/docs on that server and check that the /gym/billing/admin/... ' +
          'routes are listed.';
      } else if (status === 404) {
        title = 'Gym not found';
      } else if (status === 403) {
        title = 'Permission denied';
        message = 'Only a super admin can manage gym subscriptions.';
      } else if (!e?.response) {
        title = 'Cannot reach the server';
        message = 'Check that the API server is running and reachable.';
      }

      setState(null);
      setLoadError({ status, title, message, url });
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => { fetchState(); }, [fetchState]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(
        `/gym/billing/admin/gyms/${gymId}/subscription/start`,
        { billing_cycle: selectedCycle }
      );
      // Open Razorpay checkout — admin pays on behalf of the owner
      openWithCheckoutData(data, async (result) => {
        if (result.success) {
          await fetchState();
          if (onChanged) onChanged();
          setActiveAction(null);
        }
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to start subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(
        `/gym/billing/admin/gyms/${gymId}/subscription/renew`,
        { billing_cycle: selectedCycle }
      );
      openWithCheckoutData(data, async (result) => {
        if (result.success) {
          await fetchState();
          if (onChanged) onChanged();
          setActiveAction(null);
        }
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to renew subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(
      cancelImmediately
        ? 'Cancel IMMEDIATELY? Access ends right now.'
        : 'Cancel at end of current period? Access continues until then.'
    )) return;

    setActionLoading(true);
    try {
      await api.post(
        `/gym/billing/admin/gyms/${gymId}/subscription/cancel`,
        { immediately: cancelImmediately }
      );
      toast.success(cancelImmediately ? 'Cancelled immediately' : 'Cancellation scheduled');
      await fetchState();
      if (onChanged) onChanged();
      setActiveAction(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(
        `/gym/billing/admin/gyms/${gymId}/subscription/restart`,
        {
          billing_cycle: selectedCycle,
          start_from: restartFrom || null,
          charge_now: restartOffline,
        }
      );

      if (data.mode === 'offline') {
        toast.success(data.message || 'Subscription reactivated (offline)');
        await fetchState();
        if (onChanged) onChanged();
        setActiveAction(null);
      } else {
        // Online mode — open Razorpay checkout
        openWithCheckoutData(data, async (result) => {
          if (result.success) {
            await fetchState();
            if (onChanged) onChanged();
            setActiveAction(null);
          }
        });
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Restart failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────

  const sub = state?.subscription;
  const statusKey = sub?.status || 'none';
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.none;
  const StatusIcon = statusCfg.Icon;

  const canStart = !sub || ['cancelled', 'completed', 'expired'].includes(statusKey);
  const canRenew = sub && ['cancelled', 'completed', 'expired', 'halted', 'pending'].includes(statusKey);
  const canCancel = sub && ['active', 'created', 'authenticated', 'pending'].includes(statusKey);
  const canRestart = sub && ['cancelled', 'halted', 'expired', 'completed'].includes(statusKey);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl my-8 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Subscription Manager</h2>
              <p className="text-xs text-gray-400">{gymName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchState}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : loadError ? (
            // Load failed: show the real reason + retry (never "No subscription yet")
            <div className="text-center py-10">
              <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{loadError.title}</h3>
              <p className="text-gray-400 text-sm max-w-xl mx-auto mb-3">{loadError.message}</p>
              <p className="text-xs text-gray-500 font-mono break-all max-w-xl mx-auto mb-6">
                GET {loadError.url}
                {loadError.status ? ` → ${loadError.status}` : ''}
              </p>
              <button
                onClick={fetchState}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : !sub ? (
            // No subscription at all
            <div className="text-center py-10">
              <div className={`inline-flex p-4 rounded-2xl ${statusCfg.bg} mb-4`}>
                <StatusIcon className={`h-10 w-10 ${statusCfg.text}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No subscription yet</h3>
              <p className="text-gray-400 text-sm mb-6">
                This gym doesn't have any SaaS subscription. Start one below.
              </p>
              <div className="flex items-center justify-center gap-3">
                <CyclePicker value={selectedCycle} onChange={setSelectedCycle} />
                <button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Start Subscription
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Status card */}
              <div className={`rounded-2xl border ${statusCfg.border} ${statusCfg.bg} p-5 mb-5`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-7 w-7 ${statusCfg.text}`} />
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${statusCfg.text}`}>
                        {statusCfg.label}
                      </p>
                      <p className="text-lg font-bold text-gray-900 capitalize">
                        {sub.billing_cycle} plan
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total / cycle</p>
                    <p className="text-2xl font-bold text-gray-900">{fmtINR(sub.total_amount)}</p>
                    <p className="text-xs text-gray-500">
                      Base {fmtINR(sub.base_amount)} + GST {fmtINR(sub.gst_amount)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-300/40">
                  <InfoBlock label="Current Period Start" value={fmtDate(sub.current_period_start)} />
                  <InfoBlock
                    label="Current Period End"
                    value={fmtDate(sub.current_period_end)}
                    highlight={sub.status === 'active' && sub.remaining_days != null && sub.remaining_days <= 7}
                  />
                  <InfoBlock
                    label="Remaining"
                    value={
                      sub.remaining_days != null
                        ? sub.status === 'active'
                          ? `${sub.remaining_days} day${sub.remaining_days === 1 ? '' : 's'}`
                          : 'Expired'
                        : '—'
                    }
                  />
                </div>

                {sub.cancel_at_cycle_end && (
                  <div className="mt-4 bg-amber-100 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    Cancellation scheduled — access ends {fmtDate(sub.current_period_end)}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-5">
                {canCancel && (
                  <>
                    <button
                      onClick={() => { setActiveAction('cancel'); setCancelImmediately(false); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-sm font-medium transition-colors"
                    >
                      <StopCircle className="h-4 w-4" />
                      Cancel at period end
                    </button>
                    <button
                      onClick={() => { setActiveAction('cancel'); setCancelImmediately(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-sm font-medium transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel immediately
                    </button>
                  </>
                )}

                {canRenew && (
                  <button
                    onClick={() => setActiveAction('renew')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded-xl text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    New / Renew
                  </button>
                )}

                {canRestart && (
                  <button
                    onClick={() => setActiveAction('restart')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-xl text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restart from date
                  </button>
                )}

                {canStart && (
                  <button
                    onClick={() => setActiveAction('start')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white rounded-xl text-sm font-medium transition-all"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Start New
                  </button>
                )}
              </div>

              {/* Action panel */}
              {activeAction && (
                <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 mb-5">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    {activeAction === 'start' && <><PlayCircle className="h-4 w-4 text-blue-400" /> Start New Subscription</>}
                    {activeAction === 'renew' && <><RefreshCw className="h-4 w-4 text-blue-400" /> Renew / Change Plan</>}
                    {activeAction === 'cancel' && <><StopCircle className="h-4 w-4 text-red-400" /> Cancel Subscription</>}
                    {activeAction === 'restart' && <><RotateCcw className="h-4 w-4 text-emerald-400" /> Restart from Custom Date</>}
                  </h4>

                  {(activeAction === 'start' || activeAction === 'renew' || activeAction === 'restart') && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                          Billing Cycle
                        </label>
                        <CyclePicker value={selectedCycle} onChange={setSelectedCycle} big />
                      </div>

                      {activeAction === 'restart' && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                              Start new period from
                            </label>
                            <input
                              type="date"
                              value={restartFrom}
                              onChange={(e) => setRestartFrom(e.target.value)}
                              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Default is the previous period's end date, so any leftover time is honored.
                            </p>
                          </div>

                          <div className="bg-gray-700/50 rounded-lg p-3 flex items-start gap-3">
                            <input
                              id="offline-mode"
                              type="checkbox"
                              checked={restartOffline}
                              onChange={(e) => setRestartOffline(e.target.checked)}
                              className="mt-0.5 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <label htmlFor="offline-mode" className="flex-1 cursor-pointer">
                              <p className="text-sm text-white font-medium">Offline / cash mode</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Activate immediately — no Razorpay checkout. Use when payment was collected outside the system.
                              </p>
                            </label>
                          </div>
                        </>
                      )}

                      {(activeAction === 'start' || activeAction === 'renew') && (
                        <p className="text-xs text-gray-500">
                          A Razorpay checkout will open so the payment can be collected.
                        </p>
                      )}

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setActiveAction(null)}
                          className="px-4 py-2 text-gray-300 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={
                            activeAction === 'start' ? handleStart
                            : activeAction === 'renew' ? handleRenew
                            : handleRestart
                          }
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-60"
                        >
                          {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {activeAction === 'start' && 'Start Subscription'}
                          {activeAction === 'renew' && 'Renew Subscription'}
                          {activeAction === 'restart' && (restartOffline ? 'Reactivate Now' : 'Open Checkout')}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeAction === 'cancel' && (
                    <div className="space-y-4">
                      <p className="text-gray-300 text-sm">
                        {cancelImmediately
                          ? 'Access will end right now. The gym owner will be locked out until the subscription is restarted.'
                          : 'Access will continue until the end of the current period, then auto-cancel.'}
                      </p>
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setActiveAction(null)}
                          className="px-4 py-2 text-gray-300 hover:text-white text-sm"
                        >
                          Keep Subscription
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={actionLoading}
                          className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                        >
                          {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Confirm Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment history */}
              {state.recent_payments?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-400" />
                    Payment History
                  </h4>
                  <div className="bg-gray-800/40 rounded-xl overflow-hidden border border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-left text-gray-400 text-xs uppercase">
                          <th className="px-4 py-2 font-semibold">Date</th>
                          <th className="px-4 py-2 font-semibold">Amount</th>
                          <th className="px-4 py-2 font-semibold">Cycle</th>
                          <th className="px-4 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {state.recent_payments.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 text-gray-300 text-xs">{fmtDate(p.paid_at, true)}</td>
                            <td className="px-4 py-2 text-white font-medium">{fmtINR(p.amount)}</td>
                            <td className="px-4 py-2 text-gray-400 capitalize">{p.billing_cycle}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                p.status === 'success' ? 'bg-emerald-900/60 text-emerald-300'
                                : p.status === 'failed' ? 'bg-red-900/60 text-red-300'
                                : 'bg-gray-700 text-gray-300'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────

function InfoBlock({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-amber-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function CyclePicker({ value, onChange, big }) {
  return (
    <div className={`inline-flex rounded-xl p-1 ${big ? 'bg-gray-700 w-full' : 'bg-gray-700'}`}>
      {['monthly', 'yearly'].map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
            value === c
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow'
              : 'text-gray-300 hover:text-white'
          } ${big ? 'flex-1' : ''}`}
        >
          {c}
          {c === 'yearly' && <span className="ml-1.5 text-[10px] opacity-80">save 25%</span>}
        </button>
      ))}
    </div>
  );
}