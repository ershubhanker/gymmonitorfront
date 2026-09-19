import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

/**
 * Two ways to use this hook:
 *
 *  1) Gym owner self-checkout (Pricing / Billing pages)
 *       const { startCheckout, loading, error } = useRazorpayCheckout();
 *       startCheckout('monthly' | 'yearly');
 *     -> creates the subscription on the backend, opens Razorpay, verifies the
 *        payment, then redirects to /payment/success or /payment/failed.
 *
 *  2) Admin-initiated checkout (SubscriptionManager)
 *       const { openWithCheckoutData } = useRazorpayCheckout({});
 *       openWithCheckoutData(dataFromAdminEndpoint, (result) => { ... });
 *     -> the admin endpoint already created the subscription; this only opens
 *        Razorpay + verifies. It never redirects (the admin stays on the
 *        dashboard) and reports back through the callback:
 *          result = { success: true, ... }
 *          result = { success: false, dismissed: true }
 *          result = { success: false, error: '...' }
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Pull the most useful human-readable message out of an axios/FastAPI error. */
function extractErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) return detail.map((d) => d.msg).join(', ');
  return err?.message || fallback;
}

function goToFailed(reason) {
  window.location.href = `/payment/failed?reason=${encodeURIComponent(reason)}`;
}

/** Turn the backend's checkout payload into Razorpay Checkout options. */
function buildOptions(data, description) {
  const key = data.key_id || data.key || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) throw new Error('Razorpay key is not configured.');
  if (!data.subscription_id) throw new Error('Server did not return a subscription id.');

  return {
    key,
    subscription_id: data.subscription_id,
    name: 'Gym Monitor',
    description,
    image: data.image,
    prefill: {
      name: data.customer_name || data.prefill?.name || '',
      email: data.customer_email || data.prefill?.email || '',
      contact: data.customer_phone || data.prefill?.contact || '',
    },
    notes: data.notes || { gym: data.gym_name || '' },
    theme: { color: '#4f46e5' },
  };
}

export function useRazorpayCheckout(/* options (unused, accepted for compatibility) */) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false); // guards against double-clicks

  const finish = useCallback(() => {
    inFlight.current = false;
    setLoading(false);
  }, []);

  /**
   * Shared core: open the Razorpay modal for an already-created subscription.
   *  onPaid(response)  -> Razorpay reported success (verify + navigate/notify)
   *  onDismiss()       -> user closed the modal without paying
   */
  const openModal = useCallback(async (data, description, { onPaid, onDismiss }) => {
    const ok = await loadRazorpayScript();
    if (!ok) {
      throw new Error(
        'Could not load Razorpay. Check your internet connection or disable ad-blockers and try again.'
      );
    }

    const options = {
      ...buildOptions(data, description),
      handler: (response) => onPaid(response),
      modal: { ondismiss: () => onDismiss() },
    };

    const rzp = new window.Razorpay(options);

    // A failed attempt (declined card, UPI timeout...) keeps the modal open so
    // the customer can retry with another method. Just log it.
    rzp.on('payment.failed', (resp) => {
      console.warn('Razorpay payment.failed:', resp?.error);
    });

    rzp.open();
  }, []);

  // ───────────────────────────────────────────────────────────────────
  // 1) Owner self-checkout
  // ───────────────────────────────────────────────────────────────────
  const startCheckout = useCallback(
    async (billingCycle = 'monthly') => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);

      let modalOpened = false;
      try {
        const { data } = await api.post('/gym/billing/create-subscription', {
          billing_cycle: billingCycle,
        });

        const description = `GymMonitor Pro - ${
          billingCycle === 'yearly' ? 'Yearly' : 'Monthly'
        } Subscription`;

        await openModal(data, description, {
          onPaid: async (response) => {
            const subId = response.razorpay_subscription_id || data.subscription_id;
            const params = new URLSearchParams({
              subscription_id: subId,
              payment_id: response.razorpay_payment_id,
            });
            try {
              await api.post('/gym/billing/verify-payment', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: subId,
                razorpay_signature: response.razorpay_signature,
              });
            } catch (verifyErr) {
              console.error('Payment verification error:', verifyErr);
              if (verifyErr?.response?.status === 400) {
                goToFailed('verification_failed'); // signature mismatch: not paid
                return;
              }
              // Network / 5xx: customer HAS paid; the webhook will activate the
              // subscription, so don't tell them it failed.
              params.set('verification', 'pending');
            }
            window.location.href = `/payment/success?${params.toString()}`;
          },
          onDismiss: () => finish(), // closing the popup is not a failure
        });
        modalOpened = true;
      } catch (err) {
        console.error('Razorpay checkout error:', err);
        const message = extractErrorMessage(err, 'Checkout failed');
        setError(message);
        goToFailed(message); // pass the REAL reason through
      } finally {
        if (!modalOpened) finish();
      }
    },
    [openModal, finish]
  );

  // ───────────────────────────────────────────────────────────────────
  // 2) Admin-initiated checkout (data already created by the admin endpoint)
  // ───────────────────────────────────────────────────────────────────
  const openWithCheckoutData = useCallback(
    async (data, onResult) => {
      const report = (result) => {
        try {
          if (typeof onResult === 'function') onResult(result);
        } catch (cbErr) {
          console.error('openWithCheckoutData callback error:', cbErr);
        }
      };

      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);

      let modalOpened = false;
      try {
        await openModal(data, 'GymMonitor Pro Subscription', {
          onPaid: async (response) => {
            const subId = response.razorpay_subscription_id || data.subscription_id;
            try {
              // Backend resolves the gym from the subscription for super admins
              await api.post('/gym/billing/verify-payment', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: subId,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Payment received. Subscription activated.');
              finish();
              report({ success: true, payment_id: response.razorpay_payment_id });
            } catch (verifyErr) {
              console.error('Payment verification error:', verifyErr);
              finish();
              if (verifyErr?.response?.status === 400) {
                const msg = 'Payment could not be verified (signature mismatch).';
                setError(msg);
                toast.error(msg);
                report({ success: false, error: msg });
              } else {
                // Paid at Razorpay but our confirmation call failed; the webhook
                // will activate it. Refresh the state and tell the admin.
                toast('Payment received. Activation may take a moment.', { icon: '⏳' });
                report({ success: true, verification: 'pending', payment_id: response.razorpay_payment_id });
              }
            }
          },
          onDismiss: () => {
            finish();
            report({ success: false, dismissed: true });
          },
        });
        modalOpened = true;
      } catch (err) {
        console.error('Razorpay checkout error:', err);
        const message = extractErrorMessage(err, 'Checkout failed');
        setError(message);
        toast.error(message);
        report({ success: false, error: message });
      } finally {
        if (!modalOpened) finish();
      }
    },
    [openModal, finish]
  );

  return { startCheckout, openWithCheckoutData, loading, error };
}