require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, getDbStatus } = require('./config/db');
const { seedSpotCounters } = require('./services/spots');
const { startExpiryJob } = require('./services/expiry');
const sheets = require('./services/sheets');
const { leadsRateLimiter, generalRateLimiter } = require('./middleware/rateLimiters');
const { adminAuth } = require('./middleware/adminAuth');
const { errorHandler } = require('./middleware/errorHandler');

const leadsRouter = require('./routes/leads');
const spotsRouter = require('./routes/spots');
const adminRouter = require('./routes/admin');
const webhooksRouter = require('./routes/webhooks');
const paymentsRouter = require('./routes/payments');
const razorpay = require('./services/razorpay');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Trust proxy for real IPs on Hostinger / reverse proxies
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://visit.creditdost.co.in'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS policy', { origin }));
    },
    credentials: true,
  })
);

// 1. Mount Webhook BEFORE express.json() with express.raw() scoped only to the webhook route
app.use('/api/webhooks/payment', express.raw({ type: 'application/json' }), webhooksRouter);

// 2. Body Parser for standard JSON payloads (10kb limit)
app.use(express.json({ limit: '10kb' }));

// Health Check Endpoint (returns db connection status)
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.status(200).json({
    ok: true,
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Spots routes (GET /api/spots and GET /api/spots/stream with SSE)
app.use('/api', generalRateLimiter, spotsRouter);

// Payment routes (Razorpay order / verify / status). Mounted before the /api leads
// mount so the strict leads limiter doesn't apply to payment retries.
app.use('/api/payments', generalRateLimiter, paymentsRouter);

// Leads routes (POST /api/leads with 10 req/15min rate limiter)
app.use('/api', leadsRateLimiter, leadsRouter);

// Admin routes (Protected by x-admin-token constant-time auth)
app.use('/api/admin', generalRateLimiter, adminAuth, adminRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', error: 'Endpoint not found' });
});

// Central Error Handler (no stack traces leaked)
app.use(errorHandler);

// Connect Database, Seed Counters, and Start Server
async function startServer() {
  await connectDB();
  await seedSpotCounters();
  startExpiryJob();
  sheets.startSheetSyncJob();

  app.listen(PORT, () => {
    console.log(`✓ Credit Dost Diwali Server running on port ${PORT}`);
    console.log(`✓ Database Status: ${getDbStatus()}`);
    console.log(`✓ Allowed Client Origin: ${CLIENT_ORIGIN}`);
    if (!razorpay.isConfigured()) {
      console.warn('⚠ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — online payments disabled');
    } else {
      const mode = process.env.RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'LIVE' : 'TEST';
      console.log(`✓ Razorpay configured (${mode} mode)`);
    }
    console.log(
      sheets.isConfigured()
        ? '✓ Google Sheets sync enabled'
        : 'ℹ Google Sheets sync disabled (set SHEETS_WEBHOOK_URL and SHEETS_WEBHOOK_SECRET)'
    );
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.warn('⚠ RAZORPAY_WEBHOOK_SECRET not set — payment webhooks will be rejected');
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
