import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { loadRazorpay } from '../utils/loadRazorpay';

const STATUS_POLL_INTERVAL_MS = 3000;
const STATUS_POLL_ATTEMPTS = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Drives the Razorpay Checkout flow for a reserved lead.
 *
 * phase: 'idle' | 'creating' | 'open' | 'verifying' | 'success'
 *        | 'confirming' (paid but not yet confirmed — webhook will finish it)
 *        | 'review' (payment received but flagged for manual review)
 *        | 'expired' (reservation no longer payable)
 */
export function useRazorpayCheckout({ lead, onPaid }) {
  const leadId = lead?.id;
  const leadPaid = Boolean(lead?.paid);
  const [phase, setPhase] = useState(leadPaid ? 'success' : 'idle');
  const [error, setError] = useState(null);
  const [paymentId, setPaymentId] = useState(lead?.paymentId || null);
  const settledRef = useRef(false);
  const mountedRef = useRef(true);
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const markSuccess = useCallback((id) => {
    if (!mountedRef.current) return;
    setPaymentId(id || null);
    setError(null);
    setPhase('success');
    onPaidRef.current?.(id || null);
  }, []);

  /** Poll server-side status (the webhook may confirm before/instead of /verify). */
  const pollStatus = useCallback(async (attempts = STATUS_POLL_ATTEMPTS) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await axios.get(`${API_URL}/api/payments/status/${leadId}`);
        if (res.data?.status === 'paid') return 'paid';
        if (res.data?.status === 'expired' || res.data?.status === 'cancelled') return res.data.status;
      } catch {
        // keep polling
      }
      if (i < attempts - 1) await sleep(STATUS_POLL_INTERVAL_MS);
    }
    return null;
  }, [leadId]);

  // On mount (e.g. page reload), sync with the server in case the lead was paid or expired meanwhile
  useEffect(() => {
    if (!leadId || leadPaid) return;
    let cancelled = false;
    pollStatus(1).then((status) => {
      if (cancelled || !mountedRef.current) return;
      if (status === 'paid') markSuccess(null);
      else if (status === 'expired' || status === 'cancelled') setPhase('expired');
    });
    return () => {
      cancelled = true;
    };
  }, [leadId, leadPaid, pollStatus, markSuccess]);

  const verify = useCallback(async (response) => {
    settledRef.current = true;
    setPhase('verifying');
    try {
      const res = await axios.post(`${API_URL}/api/payments/verify`, response);
      if (res.data?.ok) {
        markSuccess(res.data.paymentId || response.razorpay_payment_id);
        return;
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'PAYMENT_REVIEW') {
        setPhase('review');
        setError(data.error);
        return;
      }
      if (data?.code === 'INVALID_SIGNATURE' || data?.code === 'INVALID_PAYMENT') {
        setPhase('idle');
        setError(data.error);
        return;
      }
      // Network / gateway hiccup: fall through to polling
    }

    setPhase('confirming');
    const status = await pollStatus();
    if (status === 'paid') {
      markSuccess(response.razorpay_payment_id);
    } else if (mountedRef.current) {
      setError(
        'We are still confirming your payment. If money was debited, you will receive a confirmation email shortly — no need to pay again.'
      );
    }
  }, [markSuccess, pollStatus]);

  const pay = useCallback(async () => {
    if (!leadId) return;
    setError(null);
    setPhase('creating');
    settledRef.current = false;

    let order;
    try {
      const res = await axios.post(`${API_URL}/api/payments/order`, { leadId });
      order = res.data;
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'ALREADY_PAID') {
        markSuccess(null);
        return;
      }
      if (data?.code === 'LEAD_NOT_PAYABLE' || err.response?.status === 404) {
        setPhase('expired');
        setError(data?.error || 'This reservation is no longer active.');
        return;
      }
      setPhase('idle');
      setError(
        err.response?.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : data?.error || 'Could not start payment. Please check your connection and try again.'
      );
      return;
    }

    let Razorpay;
    try {
      Razorpay = await loadRazorpay();
    } catch {
      setPhase('idle');
      setError('Could not load the payment window. Please check your connection and try again.');
      return;
    }

    const rzp = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Credit Dost',
      description: order.description,
      prefill: order.prefill,
      notes: { leadId },
      theme: { color: '#2c1a66' },
      retry: { enabled: true },
      handler: verify,
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (settledRef.current || !mountedRef.current) return;
          setPhase('idle');
          setError((prev) => prev || 'Payment was not completed. Your spot is still reserved — you can try again.');
        },
      },
    });

    rzp.on('payment.failed', (resp) => {
      const reason = resp?.error?.description || 'Payment failed';
      setError(`${reason}. You can retry with another method.`);
      axios
        .post(`${API_URL}/api/payments/failed`, { leadId, orderId: order.orderId, reason })
        .catch(() => {});
    });

    setPhase('open');
    rzp.open();
  }, [leadId, markSuccess, verify]);

  return { phase, error, paymentId, pay };
}
