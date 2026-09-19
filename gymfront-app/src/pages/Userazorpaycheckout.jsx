// src/hooks/useRazorpayCheckout.js
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout({ onSuccess, onFailure } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = useCallback(
    async (billingCycle = 'monthly') => {
      setLoading(true);
      setError(null);

      try {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error('Failed to load Razorpay SDK. Check your connection.');

        const { data } = await api.post('/gym/billing/create-subscription', {
          billing_cycle: billingCycle,
        });

        if (!data?.subscription_id) throw new Error('Backend did not return a subscription_id');
        const keyId = data.key_id || data.key;
        if (!keyId) throw new Error('Backend did not return a Razorpay key');

        const options = {
          key: keyId,
          subscription_id: data.subscription_id,
          name: data.name || data.gym_name || 'GymMonitor',
          description: data.description || `GymMonitor Pro — ${billingCycle}`,
          image: data.image,
          prefill: data.prefill || {
            name: data.customer_name,
            email: data.customer_email,
            contact: data.customer_phone,
          },
          notes: data.notes || {},
          theme: { color: '#4f46e5' },

          handler: async function (response) {
            try {
              const verify = await api.post('/gym/billing/verify-payment', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Subscription activated successfully! 🎉');
              if (typeof onSuccess === 'function') {
                await onSuccess({
                  ...verify.data,
                  subscription_id: response.razorpay_subscription_id,
                  payment_id: response.razorpay_payment_id,
                });
              }
            } catch (verifyErr) {
              console.error('Payment verification failed:', verifyErr);
              const msg = verifyErr?.response?.data?.detail || 'Payment was made but verification failed.';
              toast.error(msg);
              if (typeof onFailure === 'function') {
                onFailure({ reason: 'verification_failed', error: verifyErr });
              }
            }
          },

          modal: {
            ondismiss: function () {
              toast('Checkout cancelled', { icon: 'ℹ️' });
              if (typeof onFailure === 'function') onFailure({ reason: 'cancelled' });
            },
          },
        };

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', function (resp) {
          const reason = resp?.error?.description || resp?.error?.reason || 'payment_failed';
          toast.error(`Payment failed: ${reason}`);
          if (typeof onFailure === 'function') onFailure({ reason: 'payment_failed', detail: reason });
        });

        rzp.open();
      } catch (err) {
        console.error('Razorpay checkout error:', err);
        const msg = err?.response?.data?.detail || err?.response?.data?.message || err.message || 'Checkout failed';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onFailure]
  );

  /**
   * Open checkout for a PRE-CREATED subscription.
   * Used by admin panel when it has already fetched {subscription_id, key_id, ...}
   * from /admin/gyms/{id}/subscription/start (or /renew, /restart online).
   */
  const openWithCheckoutData = useCallback(
    async (checkoutData, onDone) => {
      setLoading(true);
      setError(null);
      try {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error('Failed to load Razorpay SDK.');

        const keyId = checkoutData.key_id || checkoutData.key;
        if (!keyId || !checkoutData.subscription_id) {
          throw new Error('Missing checkout data (key or subscription_id)');
        }

        const options = {
          key: keyId,
          subscription_id: checkoutData.subscription_id,
          name: checkoutData.gym_name || 'GymMonitor',
          description: checkoutData.description || 'GymMonitor Pro Subscription',
          prefill: checkoutData.prefill || {},
          theme: { color: '#4f46e5' },

          handler: async function (response) {
            try {
              // Admin-side verify — same signature check as the owner
              await api.post('/gym/billing/verify-payment', {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Subscription activated!');
              if (typeof onDone === 'function') onDone({ success: true });
            } catch (e) {
              toast.error(e?.response?.data?.detail || 'Verification failed');
              if (typeof onDone === 'function') onDone({ success: false, error: e });
            }
          },

          modal: {
            ondismiss: () => {
              toast('Checkout cancelled', { icon: 'ℹ️' });
              if (typeof onDone === 'function') onDone({ success: false, reason: 'cancelled' });
            },
          },
        };

        new window.Razorpay(options).open();
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
        if (typeof onDone === 'function') onDone({ success: false, error: err });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { startCheckout, openWithCheckoutData, loading, error };
}