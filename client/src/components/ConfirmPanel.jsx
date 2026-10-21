import React from 'react';
import { CheckCircle, AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react';

/**
 * ConfirmPanel: Shown upon successful lead capture
 * Displays captured details, amount, gold payment button linking to gateway,
 * clear fallback message if no payment link configured, and edit details button.
 */
export const ConfirmPanel = ({ lead, plan, onEdit }) => {
  const isPartner = plan.kind === 'partner';
  const amountText = isPartner ? '₹1,500' : '₹3,000 + GST';

  return (
    <div className="confirm-panel" role="region" aria-label="Lead confirmation details">
      <div className="confirm-status-badge">
        <CheckCircle size={18} />
        <span>Spot Reserved Successfully</span>
      </div>

      <div>
        <h3 className="confirm-heading">Details received. One step left.</h3>
        <p className="confirm-lede">
          Please confirm your details below and proceed to complete your festive payment.
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
        <div className="confirm-summary-row">
          <span className="confirm-summary-label">Offer Amount:</span>
          <span className="confirm-summary-val" style={{ color: '#2c1a66', fontSize: '1.05rem' }}>
            {amountText}
          </span>
        </div>
      </div>

      {lead.paymentLink && lead.paymentLink.trim().length > 0 ? (
        <a
          href={lead.paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pay-link"
        >
          <span>Pay {amountText}</span>
          <ExternalLink size={18} />
        </a>
      ) : (
        <div className="payment-warning-box" role="alert" style={{ background: '#fff8e1', border: '1px solid #ffe082', color: '#b26a00' }}>
          <AlertTriangle size={20} />
          <span>
            Your spot is reserved. Our team will contact you shortly at <strong>{lead.mobile}</strong> with the payment link.
          </span>
        </div>
      )}

      <button type="button" onClick={onEdit} className="btn-edit-details">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} />
          <span>Edit details</span>
        </span>
      </button>
    </div>
  );
};
