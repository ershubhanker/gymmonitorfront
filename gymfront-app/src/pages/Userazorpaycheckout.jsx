import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * Loads the Razorpay checkout script once and reuses it.
 */
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

  const startCheckout = useCallback(async (billingCycle = 'monthly') => {
    setLoading(true);
    setError(null);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load Razorpay SDK. Check your connection.');

      // 2. Create a Razorpay subscription in 'created' state.
      //    Backend: saas_billing_routes.py → POST /gym/billing/create-subscription
      const { data } = await api.post('/gym/billing/create-subscription', {
        billing_cycle: billingCycle,
      });

      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'GymMonitor Pro',
        description:
          billingCycle === 'yearly'
            ? 'GymMonitor Pro — Annual Subscription'
            : 'GymMonitor Pro — Monthly Subscription',
        prefill: {
          name: data.customer_name || '',
          email: data.customer_email || '',
          contact: data.customer_phone || '',
        },
        notes: {
          gym_name: data.gym_name || '',
        },
        theme: { color: '#4f46e5' },

        // 3. Called by Razorpay on successful mandate authorization + first charge.
        //    We MUST verify the signature server-side before trusting this.
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/gym/billing/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (onSuccess) {
              onSuccess(verifyRes.data);
            } else {
              const params = new URLSearchParams({
                subscription_id: response.razorpay_subscription_id,
                payment_id: response.razorpay_payment_id,
              });
              window.location.href = `/payment/success?${params.toString()}`;
            }
          } catch (err) {
            const reason =
              err?.response?.data?.detail || err.message || 'verification_failed';
            if (onFailure) {
              onFailure(reason);
            } else {
              window.location.href = `/payment/failed?reason=${encodeURIComponent(reason)}`;
            }
          }
        },

        modal: {
          ondismiss: function () {
            if (onFailure) {
              onFailure('cancelled');
            } else {
              window.location.href = '/payment/failed?reason=cancelled';
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp) {
        const reason =
          resp?.error?.description || resp?.error?.reason || 'payment_failed';
        if (onFailure) {
          onFailure(reason);
        } else {
          window.location.href = `/payment/failed?reason=${encodeURIComponent(reason)}`;
        }
      });

      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      const reason =
        err?.response?.data?.detail || err.message || 'Checkout failed';
      setError(reason);
      if (onFailure) {
        onFailure(reason);
      } else {
        window.location.href = '/payment/failed?reason=verification_failed';
      }
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onFailure]);

  return { startCheckout, loading, error };
}