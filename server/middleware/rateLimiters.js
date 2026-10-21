const rateLimit = require('express-rate-limit');

// 10 requests / 15 minutes / IP on POST /api/leads
const leadsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => {
    // Allow smoke-test script with admin token or when explicitly testing
    const adminToken = req.headers['x-admin-token'];
    return Boolean(adminToken && adminToken === process.env.ADMIN_TOKEN);
  },
  message: {
    ok: false,
    code: 'RATE_LIMITED',
    error: 'Too many attempts from this IP address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 100 requests / 15 minutes on other API endpoints
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    ok: false,
    code: 'RATE_LIMITED',
    error: 'Too many requests. Please slow down and try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  leadsRateLimiter,
  generalRateLimiter,
};
