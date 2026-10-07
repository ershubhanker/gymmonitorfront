// src/utils/pendingCheckout.js

const KEY = 'pendingCheckout';

/**
 * Remember that the user tried to subscribe before they were logged in.
 * Called from PricingPage when a guest clicks the CTA.
 */
export function rememberPendingCheckout(billingCycle = 'yearly') {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        billingCycle,
        setAt: Date.now(),
      })
    );
  } catch (e) {
    // sessionStorage may be unavailable (private mode) — fail silently
    console.warn('Could not persist pending checkout:', e);
  }
}

/**
 * Read the pending checkout intent, if any.
 * Returns null if not set or if it's older than 30 minutes (stale).
 */
export function getPendingCheckout() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Stale after 30 min — user probably forgot
    if (Date.now() - (data.setAt || 0) > 30 * 60 * 1000) {
      clearPendingCheckout();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the pending checkout flag.
 * Call this after the checkout modal opens, or after a successful/failed payment.
 */
export function clearPendingCheckout() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

export function hasPendingCheckout() {
  return getPendingCheckout() !== null;
}