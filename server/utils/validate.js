// Validation patterns
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PIN_REGEX = /^[1-9]\d{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Unicode letters (including Devanagari), spaces, periods, apostrophes, hyphens (min 2, max 60)
const NAME_REGEX = /^[\p{L}\s.'-]{2,60}$/u;

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  // Remove control characters except newline/tab, trim whitespace
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateLeadInput({ kind, name, mobile, email, city, pin }) {
  const errors = {};

  if (!kind || (kind !== 'partner' && kind !== 'customer')) {
    errors.kind = 'Offer kind must be either "partner" or "customer".';
  }

  const cleanName = sanitizeString(name);
  if (!cleanName || cleanName.length < 2) {
    errors.name = 'Please enter your full name (at least 2 characters).';
  } else if (!NAME_REGEX.test(cleanName)) {
    errors.name = 'Name should contain letters and spaces only.';
  }

  const cleanMobile = typeof mobile === 'string' ? mobile.replace(/\D/g, '') : '';
  if (!cleanMobile) {
    errors.mobile = 'Mobile number is required.';
  } else if (!MOBILE_REGEX.test(cleanMobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
  }

  const cleanEmail = sanitizeString(email).toLowerCase();
  if (!cleanEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  const cleanCity = sanitizeString(city);
  if (!cleanCity || cleanCity.length < 2) {
    errors.city = 'Please enter your city name (at least 2 characters).';
  }

  const cleanPin = typeof pin === 'string' ? pin.replace(/\D/g, '') : '';
  if (!cleanPin) {
    errors.pin = 'PIN code is required.';
  } else if (!PIN_REGEX.test(cleanPin)) {
    errors.pin = 'Enter a valid 6-digit Indian PIN code.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized: {
      kind,
      name: cleanName,
      mobile: cleanMobile,
      email: cleanEmail,
      city: cleanCity,
      pin: cleanPin,
    },
  };
}

module.exports = {
  validateLeadInput,
  sanitizeString,
  escapeHtml,
};
