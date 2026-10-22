const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise = null;

/**
 * Injects Razorpay Checkout.js once and resolves with window.Razorpay.
 * A failed load is not cached, so the next attempt retries.
 */
export function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Razorpay SDK unavailable'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load Razorpay Checkout'));
    };
    document.body.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}
