import { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Check,
  Zap,
  Shield,
  IndianRupee,
  Loader2,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react';
import api from '../services/api';
import { useRazorpayCheckout } from '../hooks/useRazorpayCheckout';

const planFeatures = [
  'Unlimited Member Management',
  'Member Balance & Payment Tracking',
  'Gym Daily Expense Tracking',
  'Biometric Device Integration',
  'Staff Attendance Management',
  'Member Attendance Tracking',
  'Real-time Revenue Tracking',
  'Advanced Analytics & Reports',
  'Enterprise-grade Security',
  'Automated Expiry & Payment Reminders',
];

const STATUS_STYLES = {
  active:        { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Active',       icon: CheckCircle2 },
  created:       { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Pending',      icon: AlertTriangle },
  authenticated: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Authenticated', icon: AlertTriangle },
  pending:       { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Payment Due',  icon: AlertTriangle },
  halted:        { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Halted',       icon: XCircle },
  cancelled:     { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200',   label: 'Cancelled',    icon: XCircle },
  completed:     { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200',   label: 'Completed',    icon: XCircle },
  expired:       { bg: 'bg-gray-100',  text: 'text-gray-700',   border: 'border-gray-200',   label: 'Expired',      icon: XCircle },
};

export default function BillingSettings() {
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [status, setStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }
  const [cancelling, setCancelling] = useState(false);

  const isYearly = billingCycle === 'yearly';
  const basePrice = isYearly ? 3600 : 399;
  const gstRate = 0.18;
  const gstAmount = Math.round(basePrice * gstRate);
  const totalPrice = basePrice + gstAmount;
  const period = isYearly ? '/year' : '/month';

  const hasActiveSubscription =
    status?.has_subscription &&
    ['active', 'authenticated', 'pending'].includes(status.status);

  // ── Fetch billing status + invoices (safe: user is authenticated) ──
  const fetchBilling = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const [statusRes, invoicesRes] = await Promise.all([
        api.get('/gym/billing/status'),
        api.get('/gym/billing/invoices'),
      ]);
      setStatus(statusRes.data);
      setInvoices(invoicesRes.data?.invoices || []);
    } catch (err) {
      setStatusError(
        err?.response?.data?.detail || err.message || 'Could not load billing info'
      );
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // ── Razorpay checkout with inline callbacks ──
  const { startCheckout, loading: checkoutLoading, error: checkoutError } =
    useRazorpayCheckout({
      onSuccess: async () => {
        setFeedback({ type: 'success', message: 'Subscription activated successfully!' });
        await fetchBilling();
      },
      onFailure: (reason) => {
        setFeedback({ type: 'error', message: `Payment failed: ${reason}` });
      },
    });

  const handleSubscribe = () => {
    setFeedback(null);
    startCheckout(billingCycle);
  };

  const handleCancel = async (immediately) => {
    if (!window.confirm(
      immediately
        ? 'Cancel immediately? You will lose access right away.'
        : 'Cancel at end of billing cycle? You keep access until the period ends.'
    )) return;

    setCancelling(true);
    setFeedback(null);
    try {
      const { data } = await api.post('/gym/billing/cancel', { immediately });
      setFeedback({ type: 'success', message: data.message || 'Subscription cancelled.' });
      await fetchBilling();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || err.message || 'Cancel failed',
      });
    } finally {
      setCancelling(false);
    }
  };

  // ── Loading state ──
  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading billing information...
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <XCircle className="h-5 w-5" /> Could not load billing
          </div>
          <p className="text-sm">{statusError}</p>
          <button
            onClick={fetchBilling}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = status?.has_subscription
    ? STATUS_STYLES[status.status] || STATUS_STYLES.created
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500">Manage your GymMonitor Pro subscription</p>
        </div>
      </div>

      {/* ── Feedback banner ── */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 border flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
      {checkoutError && !feedback && (
        <div className="rounded-2xl p-4 border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm font-medium">{checkoutError}</span>
        </div>
      )}

      {/* ── Current subscription summary ── */}
      {status?.has_subscription && statusInfo && (
        <div className={`rounded-2xl border ${statusInfo.border} ${statusInfo.bg} p-6`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className={`inline-flex items-center gap-2 ${statusInfo.text} font-semibold text-sm mb-2`}>
                <statusInfo.icon className="h-4 w-4" />
                {statusInfo.label}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                GymMonitor Pro — {status.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                ₹{status.total_amount?.toLocaleString('en-IN')} billed per{' '}
                {status.billing_cycle === 'yearly' ? 'year' : 'month'}
              </p>
              {status.current_period_end && (
                <p className="text-xs text-gray-500 mt-2">
                  {status.cancel_at_cycle_end ? 'Access ends' : 'Next renewal'}:{' '}
                  {new Date(status.current_period_end).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {hasActiveSubscription && !status.cancel_at_cycle_end && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCancel(false)}
                  disabled={cancelling}
                  className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-white transition-all disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel at cycle end'}
                </button>
                <button
                  onClick={() => handleCancel(true)}
                  disabled={cancelling}
                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Cancel immediately
                </button>
              </div>
            )}

            {status.cancel_at_cycle_end && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Cancellation scheduled
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── New subscription / upgrade section ── */}
      {!hasActiveSubscription && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-center">
            <span className="text-white text-xs font-bold tracking-wider uppercase">
              {isYearly ? 'Best Value · Save ₹1,188/year' : 'Flexible · Pay as you go'}
            </span>
          </div>

          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">GymMonitor Pro</h2>
              <p className="text-sm text-gray-500 mt-1">
                Complete gym management for growing gyms
              </p>
            </div>

            {/* Billing toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center bg-gray-50 rounded-full p-1.5 border border-gray-200">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    !isYearly
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                    isYearly
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yearly
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isYearly ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    SAVE 25%
                  </span>
                </button>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-start justify-center gap-1">
                <span className="text-2xl font-bold text-gray-700 mt-2">₹</span>
                <span className="text-5xl font-black text-gray-900 tracking-tight leading-none">
                  {basePrice.toLocaleString('en-IN')}
                </span>
                <span className="text-base font-medium text-gray-500 self-end mb-1">
                  {period}
                </span>
              </div>
            </div>

            <div className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                <span>Base price</span>
                <span className="font-medium">₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2.5">
                <span>GST (18%)</span>
                <span className="font-medium">₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-800">Total payable</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <ul className="grid sm:grid-cols-2 gap-2.5 mb-8">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Subscribe Now
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Secured by Razorpay · Recurring billing · Cancel anytime
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> SSL Secured
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" /> Instant Activation
              </div>
              <div className="flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4" /> Made for India
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Billing history ── */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Billing history</h3>
            <span className="text-xs text-gray-400">{invoices.length} payment{invoices.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg ${
                      inv.status === 'success'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {inv.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      ₹{inv.amount?.toLocaleString('en-IN')} ·{' '}
                      {inv.billing_cycle === 'yearly' ? 'Annual' : 'Monthly'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {inv.paid_at
                        ? new Date(inv.paid_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                      {inv.razorpay_payment_id && (
                        <span className="ml-2 font-mono text-[10px] text-gray-400">
                          {inv.razorpay_payment_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      inv.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : inv.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                  {/* Hook this to a real invoice download endpoint when you build one */}
                  <button
                    title="Download receipt (coming soon)"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}