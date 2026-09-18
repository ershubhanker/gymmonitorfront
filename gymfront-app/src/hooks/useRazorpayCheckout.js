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

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = useCallback(async (billingCycle = 'monthly') => {
    setLoading(true);
    setError(null);

    try {
      // 1. Ensure Razorpay SDK is available
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load Razorpay SDK. Check your connection.');

      // 2. Ask backend to create a subscription / order
      //    Adjust the endpoint + payload to match your Django/DRF view.
      const { data } = await api.post('/gym/billing/subscribe', {
        billing_cycle: billingCycle,
      });

      // Expected response shape (adjust if your backend differs):
      // {
      //   key: "rzp_live_xxx",
      //   subscription_id: "sub_xxx",
      //   name: "GymMonitor Pro",
      //   description: "...",
      //   prefill: { name, email, contact },
      //   notes: {...}
      // }

      const options = {
        key: data.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: data.subscription_id,
        name: data.name || 'Gym Monitor',
        description: data.description || 'GymMonitor Pro Subscription',
        image: data.image,
        prefill: data.prefill || {},
        notes: data.notes || {},
        theme: { color: '#4f46e5' },
        handler: function (response) {
          // Razorpay returns razorpay_payment_id, razorpay_subscription_id, razorpay_signature
          // Redirect to success page. Backend should verify signature via webhook.
          const params = new URLSearchParams({
            subscription_id:
              response.razorpay_subscription_id || data.subscription_id,
            payment_id: response.razorpay_payment_id,
          });
          window.location.href = `/payment/success?${params.toString()}`;
        },
        modal: {
          ondismiss: function () {
            window.location.href = '/payment/failed?reason=cancelled';
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp) {
        const reason =
          resp?.error?.description || resp?.error?.reason || 'payment_failed';
        window.location.href = `/payment/failed?reason=${encodeURIComponent(reason)}`;
      });

      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setError(err?.response?.data?.detail || err.message || 'Checkout failed');
      window.location.href = '/payment/failed?reason=verification_failed';
    } finally {
      setLoading(false);
    }
  }, []);

  return { startCheckout, loading, error };
}