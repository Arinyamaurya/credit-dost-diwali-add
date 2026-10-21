/**
 * Credit Dost Diwali Campaign Configuration
 */

// Countdown deadline: Defaulting to Diwali festive season. Change as needed.
export const OFFER_END_DATE = '2026-11-15T23:59:59+05:30';

// Contact & Support Information
export const WHATSAPP_NUMBER = '919876543210'; // Indian format with country code (91)
export const CONTACT_PHONE = '+91 98765 43210';
export const CONTACT_EMAIL = 'support@creditdost.co.in';

// API Base URL (empty string uses Vite proxy in dev; can set VITE_API_URL in production)
export const API_URL = import.meta.env.VITE_API_URL || '';

// Plan Offer Configurations
export const PLANS = {
  partner: {
    id: 'partner',
    kind: 'partner',
    badge: 'First 100 partners only',
    ribbon: 'Most popular • Best for income',
    title: 'Diwali offer: become a franchise partner',
    subtitle: 'Start your own credit consulting business, working from home.',
    price: 1500,
    priceFormatted: '₹1,500',
    oldPrice: 2000,
    oldPriceFormatted: '₹2,000',
    oldPriceLabel: 'Regular price',
    chips: [
      { text: 'Save ₹500', variant: 'savings' },
      { text: '25% OFF', variant: 'percent' },
    ],
    priceNote: 'Diwali special price. May be withdrawn without prior notice.',
    formHeading: 'Reserve your franchise spot',
    ctaText: 'Continue to pay ₹1,500',
    finePrint: 'You will complete payment on the next step.',
    benefits: [
      {
        icon: 'FileDown',
        title: 'Download credit reports without OTP',
        description: "Pull your clients' credit reports quickly, with no OTP step.",
      },
      {
        icon: 'Sparkles',
        title: 'Unlimited AI-powered credit analysis',
        description: 'Explain every report clearly, as often as you need.',
      },
      {
        icon: 'GraduationCap',
        title: 'Complete training and support',
        description: 'Learn the work and get help when you are stuck.',
      },
      {
        icon: 'TrendingUp',
        title: 'Credit score repair business opportunity',
        description: 'Offer score repair as a service under your own franchise.',
      },
      {
        icon: 'Home',
        title: 'Work from home',
        description: 'A phone or laptop and an internet connection is all you need.',
      },
      {
        icon: 'BadgeIndianRupee',
        title: 'Earn attractive commissions',
        description: 'Get paid on the clients you bring in.',
      },
    ],
  },
  customer: {
    id: 'repair',
    kind: 'customer',
    badge: 'First 100 customers only',
    ribbon: null,
    title: 'Diwali offer: credit score repair service',
    subtitle: 'Not looking for a franchise? Take charge of your own credit score.',
    price: 3000,
    priceFormatted: '₹3,000 + GST',
    oldPrice: 10000,
    oldPriceFormatted: '₹10,000',
    oldPriceLabel: 'Normal price',
    chips: [
      { text: 'Save ₹7,000', variant: 'savings' },
      { text: '70% OFF', variant: 'starburst' },
    ],
    priceNote: 'Only 100 spots, first come, first served. GST extra as applicable.',
    formHeading: 'Book your credit score spot',
    ctaText: 'Continue to pay ₹3,000 + GST',
    finePrint: 'You will complete payment on the next step.',
    benefits: [
      {
        icon: 'Zap',
        title: 'Festival price, 70% off',
        description: 'Normal price ₹10,000. Diwali price ₹3,000 plus GST.',
      },
      {
        icon: 'ShieldCheck',
        title: 'Dedicated credit score service',
        description: 'Focused work to repair and improve your credit score.',
      },
      {
        icon: 'PhoneCall',
        title: 'No franchise needed',
        description: 'Book your spot, pay, and our team will get in touch.',
      },
    ],
  },
};
