import React from 'react';
import { CheckCircle, AlertTriangle, ArrowLeft, Loader2, Lock, PartyPopper } from 'lucide-react';
import { formatInr } from '../config';
import { useRazorpayCheckout } from '../hooks/useRazorpayCheckout';

/**
 * ConfirmPanel: Shown upon successful lead capture.
 * Displays captured details and the amount breakdown, opens Razorpay Checkout
 * for payment, and shows the payment result.
 */
export const ConfirmPanel = ({ lead, plan, onEdit, onPaid }) => {
  const { phase, error, paymentId, pay } = useRazorpayCheckout({ lead, onPaid });

  // Prefer server-issued amounts; fall back to plan config for older saved leads
  const gstPaise = lead.gstPaise ?? plan.gstPaise;
  const totalPaise = lead.amountPaise ?? plan.basePaise + plan.gstPaise;
  const basePaise = totalPaise - gstPaise;
  const totalText = formatInr(totalPaise);

  const isPaid = phase === 'success';
  const isBusy = phase === 'creating' || phase === 'open' || phase === 'verifying' || phase === 'confirming';

  const payButtonLabel = {
    creating: 'Starting secure payment...',
    open: 'Complete payment in the window...',
    verifying: 'Verifying payment...',
    confirming: 'Confirming payment...',
  }[phase] || (error ? `Retry payment of ${totalText}` : `Pay ${totalText} securely`);

  return (
    <div className="confirm-panel" role="region" aria-label="Lead confirmation details">
      <div className="confirm-status-badge">
        <CheckCircle size={18} />
        <span>{isPaid ? 'Payment Successful' : 'Spot Reserved Successfully'}</span>
      </div>

      <div>
        <h3 className="confirm-heading">
          {isPaid ? 'Payment received. Happy Diwali!' : 'Details received. One step left.'}
        </h3>
        <p className="confirm-lede">
          {isPaid
            ? `Your spot is confirmed. A payment receipt has been sent to ${lead.email}.`
            : 'Please confirm your details below and proceed to complete your festive payment.'}
        </p>
      </div>

      <div className="confirm-summary-table">
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Selected Offer:</span>
          <span className="confirm-summary-val">{plan.title}</span>
        </div>
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Full Name:</span>
          <span className="confirm-summary-val">{lead.name}</span>
        </div>
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Mobile Number:</span>
          <span className="confirm-summary-val">+91 {lead.mobile}</span>
        </div>
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Email Address:</span>
          <span className="confirm-summary-val">{lead.email}</span>
        </div>
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Location:</span>
          <span className="confirm-summary-val">{lead.city} ({lead.pin})</span>
        </div>
        {gstPaise > 0 && (
          <>
            <div className="confirm-summary-row">
              <span className="confirm-summary-label">Offer Price:</span>
              <span className="confirm-summary-val">{formatInr(basePaise)}</span>
            </div>
            <div className="confirm-summary-row">
              <span className="confirm-summary-label">GST (18%):</span>
              <span className="confirm-summary-val">{formatInr(gstPaise)}</span>
            </div>
          </>
        )}
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">{isPaid ? 'Amount Paid:' : 'Total Payable:'}</span>
          <span className="confirm-summary-val" style={{ color: '#2c1a66', fontSize: '1.05rem' }}>
            {totalText}
          </span>
        </div>
        {isPaid && paymentId && (
          <div className="confirm-summary-row">
            <span className="confirm-summary-label">Payment ID:</span>
            <span className="confirm-summary-val">{paymentId}</span>
          </div>
        )}
      </div>

      {error && phase !== 'success' && (
        <div className="payment-warning-box" role="alert">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {isPaid ? (
        <div className="payment-success-box" role="status">
          <PartyPopper size={20} />
          <span>
            Thank you for your payment! A member of our team will contact you on{' '}
            <strong>+91 {lead.mobile}</strong> within 24 hours.
          </span>
        </div>
      ) : phase === 'review' ? null : phase === 'expired' ? (
        !error && (
          <div className="payment-warning-box" role="alert">
            <AlertTriangle size={20} />
            <span>This reservation has expired. Please contact our team on WhatsApp to restore your spot.</span>
          </div>
        )
      ) : (
        <>
          <button type="button" className="btn-pay-link" onClick={pay} disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            <span>{payButtonLabel}</span>
          </button>
          <p className="form-fineprint" style={{ textAlign: 'center' }}>
            Secured by Razorpay · UPI, cards, net banking and wallets accepted
          </p>
        </>
      )}

      {!isPaid && !isBusy && phase !== 'review' && (
        <button type="button" onClick={onEdit} className="btn-edit-details">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} />
            <span>Edit details</span>
          </span>
        </button>
      )}
    </div>
  );
};
