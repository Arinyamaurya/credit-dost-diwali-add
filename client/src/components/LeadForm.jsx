import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, CONTACT_PHONE } from '../config';
import { ConfirmPanel } from './ConfirmPanel';
import { AlertCircle, Loader2, Sparkle, CheckCircle, MessageCircle } from 'lucide-react';

// Validation regexes
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PIN_REGEX = /^[1-9]\d{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}\s.'-]{2,60}$/u;

export const LeadForm = ({ plan, isSoldOut = false, onLeadSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    city: '',
    pin: '',
    website: '', // honeypot
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [submittedLead, setSubmittedLead] = useState(null);
  const [localSoldOut, setLocalSoldOut] = useState(false);
  const [isOfferClosed, setIsOfferClosed] = useState(false);

  const storageKey = `cd_diwali_${plan.kind}`;

  // Restore previous submission from localStorage on reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.kind === plan.kind && parsed.name) {
          setSubmittedLead(parsed);
        }
      }
    } catch {
      // Ignore localStorage exceptions
    }
  }, [storageKey, plan.kind]);

  const fieldRefs = {
    name: useRef(null),
    mobile: useRef(null),
    email: useRef(null),
    city: useRef(null),
    pin: useRef(null),
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) {
          return 'Please enter your full name (at least 2 characters).';
        }
        if (!NAME_REGEX.test(value.trim())) {
          return 'Name should contain letters only.';
        }
        return '';
      case 'mobile':
        if (!value) {
          return 'Mobile number is required.';
        }
        if (!MOBILE_REGEX.test(value)) {
          return 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
        }
        return '';
      case 'email':
        if (!value) {
          return 'Email address is required.';
        }
        if (!EMAIL_REGEX.test(value.trim())) {
          return 'Please enter a valid email address.';
        }
        return '';
      case 'city':
        if (!value || value.trim().length < 2) {
          return 'Please enter your city name.';
        }
        return '';
      case 'pin':
        if (!value) {
          return 'PIN code is required.';
        }
        if (!PIN_REGEX.test(value)) {
          return 'Enter a valid 6-digit Indian PIN code.';
        }
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitized = value;

    if (name === 'mobile') {
      sanitized = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pin') {
      sanitized = value.replace(/\D/g, '').slice(0, 6);
    }

    setFormData((prev) => ({ ...prev, [name]: sanitized }));

    if (touched[name]) {
      const err = validateField(name, sanitized);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // Validate all fields
    const newErrors = {};
    const fieldsToValidate = ['name', 'mobile', 'email', 'city', 'pin'];
    let firstInvalidField = null;

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) {
        newErrors[f] = err;
        if (!firstInvalidField) firstInvalidField = f;
      }
    });

    setErrors(newErrors);
    setTouched({
      name: true,
      mobile: true,
      email: true,
      city: true,
      pin: true,
    });

    if (firstInvalidField) {
      if (fieldRefs[firstInvalidField]?.current) {
        fieldRefs[firstInvalidField].current.focus();
      }
      return;
    }

    // Bot detection via honeypot
    if (formData.website.trim().length > 0) {
      return;
    }

    setIsSubmitting(true);

    // Extract UTM source / campaign from URL query params
    let trafficSource = '';
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source');
      const utmCampaign = params.get('utm_campaign');
      if (utmSource || utmCampaign) {
        trafficSource = [utmSource, utmCampaign].filter(Boolean).join('_');
      }
    }

    try {
      const payload = {
        kind: plan.kind,
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        pin: formData.pin.trim(),
        website: formData.website,
        source: trafficSource,
      };

      const res = await axios.post(`${API_URL}/api/leads`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.data?.ok) {
        const leadRecord = {
          ...payload,
          id: res.data.leadId,
          amount: res.data.amount,
          amountPaise: res.data.amountPaise,
          gstPaise: res.data.gstPaise,
        };

        // Remember in localStorage wrapped in try/catch
        try {
          localStorage.setItem(storageKey, JSON.stringify(leadRecord));
        } catch {
          // Ignore storage quota errors
        }

        setSubmittedLead(leadRecord);

        // Immediately update parent spots meter without waiting for stream
        if (onLeadSuccess) {
          onLeadSuccess(plan.kind, res.data.spots);
        }
      }
    } catch (err) {
      console.error('Lead form submission error:', err);
      const res = err.response;
      const status = res?.status;
      const data = res?.data;

      if (status === 400 && data?.errors) {
        // Map per-field errors from server
        setErrors((prev) => ({ ...prev, ...data.errors }));
        setServerError('Please correct the highlighted field errors below.');
      } else if (status === 409 && data?.code === 'ALREADY_REGISTERED') {
        // Inline friendly message under mobile field
        setErrors((prev) => ({
          ...prev,
          mobile: 'You have already reserved a spot for this festive offer with this number or email.',
        }));
        setServerError(null);
      } else if (status === 409 && data?.code === 'SOLD_OUT') {
        setLocalSoldOut(true);
        if (onLeadSuccess) {
          onLeadSuccess(plan.kind, { claimed: 100, total: 100, remaining: 0 });
        }
      } else if (status === 410 && data?.code === 'OFFER_CLOSED') {
        setIsOfferClosed(true);
      } else if (status === 429) {
        setServerError('Too many attempts from this connection. Please try again in a few minutes.');
      } else {
        setServerError(
          data?.error ||
          'Unable to reach server. Please check your connection and try again. Your typed details have been preserved.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDetails = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setSubmittedLead(null);
  };

  // Persist paid state so a reload shows the success view
  const handlePaid = useCallback((paymentId) => {
    setSubmittedLead((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, paid: true, paymentId: paymentId || prev.paymentId || null };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, [storageKey]);

  // 1. If lead is already submitted and confirmed
  if (submittedLead) {
    return (
      <ConfirmPanel
        lead={submittedLead}
        plan={plan}
        onEdit={handleEditDetails}
        onPaid={handlePaid}
      />
    );
  }

  // 2. If sold out
  if (isSoldOut || localSoldOut) {
    const waText = encodeURIComponent(
      `Hello Credit Dost, I am interested in joining the waitlist for the Diwali ${plan.title}. Please let me know if any spot opens up.`
    );
    const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;

    return (
      <div
        className="lead-form-wrapper"
        style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          background: 'rgba(194, 24, 91, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(194, 24, 91, 0.3)',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪔</div>
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.35rem',
            color: '#ff80ab',
            fontWeight: 800,
            marginBottom: '0.75rem',
          }}
        >
          All 100 Spots Fully Claimed!
        </h3>
        <p style={{ color: 'var(--ink)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          This festive privilege is now fully booked. You can join the priority waitlist on WhatsApp to be notified if any reservation expires.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary-gold"
          style={{
            width: '100%',
            maxWidth: '320px',
            margin: '0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <MessageCircle size={18} />
          <span>Join WhatsApp Waitlist</span>
        </a>
      </div>
    );
  }

  // 3. If offer concluded
  if (isOfferClosed) {
    return (
      <div
        className="lead-form-wrapper"
        style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          background: 'rgba(44, 26, 102, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(44, 26, 102, 0.25)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            color: 'var(--plum-700)',
            fontWeight: 800,
            marginBottom: '0.5rem',
          }}
        >
          Festive Offer Concluded
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          The Diwali campaign window has officially closed. Thank you for your immense interest in Credit Dost.
        </p>
      </div>
    );
  }

  return (
    <div className="lead-form-wrapper">
      <h3 className="form-heading">
        <Sparkle size={18} color="#2c1a66" />
        <span>{plan.formHeading}</span>
      </h3>

      {serverError && (
        <div className="form-general-error" role="alert" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      <form className="lead-form" onSubmit={handleSubmit} noValidate>
        {/* Honeypot field (hidden from real users) */}
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={handleChange}
          tabIndex="-1"
          autoComplete="off"
          className="honeypot-input"
          aria-hidden="true"
        />

        {/* Full Name */}
        <div className="form-group">
          <label htmlFor={`name-${plan.id}`} className="form-label">
            Full Name *
          </label>
          <input
            id={`name-${plan.id}`}
            name="name"
            type="text"
            ref={fieldRefs.name}
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. Rahul Sharma"
            className="form-input"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `name-err-${plan.id}` : undefined}
            required
          />
          {errors.name && (
            <p id={`name-err-${plan.id}`} className="field-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div className="form-group">
          <label htmlFor={`mobile-${plan.id}`} className="form-label">
            Mobile Number (WhatsApp) *
          </label>
          <input
            id={`mobile-${plan.id}`}
            name="mobile"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            ref={fieldRefs.mobile}
            value={formData.mobile}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="10-digit number (e.g. 9876543210)"
            className="form-input"
            aria-invalid={Boolean(errors.mobile)}
            aria-describedby={errors.mobile ? `mobile-err-${plan.id}` : undefined}
            required
          />
          {errors.mobile && (
            <p id={`mobile-err-${plan.id}`} className="field-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.mobile}</span>
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="form-group">
          <label htmlFor={`email-${plan.id}`} className="form-label">
            Email Address *
          </label>
          <input
            id={`email-${plan.id}`}
            name="email"
            type="email"
            ref={fieldRefs.email}
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g. rahul@example.com"
            className="form-input"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `email-err-${plan.id}` : undefined}
            required
          />
          {errors.email && (
            <p id={`email-err-${plan.id}`} className="field-error" role="alert">
              <AlertCircle size={14} />
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        {/* City and Pincode Row */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`city-${plan.id}`} className="form-label">
              City *
            </label>
            <input
              id={`city-${plan.id}`}
              name="city"
              type="text"
              ref={fieldRefs.city}
              value={formData.city}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Jaipur"
              className="form-input"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? `city-err-${plan.id}` : undefined}
              required
            />
            {errors.city && (
              <p id={`city-err-${plan.id}`} className="field-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.city}</span>
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor={`pin-${plan.id}`} className="form-label">
              PIN Code *
            </label>
            <input
              id={`pin-${plan.id}`}
              name="pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              ref={fieldRefs.pin}
              value={formData.pin}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 302001"
              className="form-input"
              aria-invalid={Boolean(errors.pin)}
              aria-describedby={errors.pin ? `pin-err-${plan.id}` : undefined}
              required
            />
            {errors.pin && (
              <p id={`pin-err-${plan.id}`} className="field-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.pin}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn-submit-gold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Securing your spot...</span>
            </>
          ) : (
            <span>{plan.ctaText}</span>
          )}
        </button>

        <p className="form-fineprint">{plan.finePrint}</p>
      </form>
    </div>
  );
};
