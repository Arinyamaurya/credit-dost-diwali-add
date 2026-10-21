const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { leadsToCsv } = require('../utils/csv');
const { rollbackSpotAtomic } = require('../services/spots');
const sheets = require('../services/sheets');

/**
 * GET /api/admin/leads
 * Paginated leads list with optional kind and status filtering.
 */
router.get('/leads', async (req, res, next) => {
  try {
    const { kind, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (kind && (kind === 'partner' || kind === 'customer')) {
      query.kind = kind;
    }
    if (status && ['pending', 'paid', 'cancelled', 'expired'].includes(status)) {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [leads, totalCount] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Lead.countDocuments(query),
    ]);

    return res.status(200).json({
      ok: true,
      data: leads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/leads.csv
 * Excel-safe, UTF-8 BOM CSV export of all leads.
 */
router.get('/leads.csv', async (req, res, next) => {
  try {
    const leads = await Lead.find({}).sort({ createdAt: -1 }).lean();
    const csvData = leadsToCsv(leads);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="credit-dost-diwali-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/leads/:id
 * Manually update lead status (e.g. mark paid or cancelled).
 * If cancelled and mode is "submitted", frees the spot.
 */
router.patch('/leads/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['pending', 'paid', 'cancelled', 'expired'].includes(status)) {
      return res.status(400).json({
        ok: false,
        error: 'Status must be one of: pending, paid, cancelled, expired',
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ ok: false, error: 'Lead not found' });
    }

    const previousStatus = lead.status;
    lead.status = status;

    if (status === 'paid' && !lead.paidAt) {
      lead.paidAt = new Date();
    }
    if (status === 'paid' && previousStatus !== 'paid') {
      lead.paymentSource = 'admin';
    }

    await lead.save();

    // If cancelled or expired from pending/submitted, free the spot
    const mode = process.env.SPOT_COUNT_MODE || 'submitted';
    if (mode === 'submitted') {
      if ((status === 'cancelled' || status === 'expired') && (previousStatus === 'pending' || previousStatus === 'paid')) {
        await rollbackSpotAtomic(lead.kind);
      }
    }

    sheets.syncLead(lead);

    return res.status(200).json({ ok: true, lead });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/sheets/resync
 * Push leads to the Google Sheet. Default: only leads whose last sync failed.
 * ?full=1 re-sends every lead (use once after connecting a new sheet to backfill).
 */
router.post('/sheets/resync', async (req, res, next) => {
  try {
    if (!sheets.isConfigured()) {
      return res.status(503).json({
        ok: false,
        code: 'SHEETS_NOT_CONFIGURED',
        error: 'Set SHEETS_WEBHOOK_URL and SHEETS_WEBHOOK_SECRET in server/.env',
      });
    }
    const full = req.query.full === '1' || req.query.full === 'true';
    const result = await sheets.resyncLeads({ full });
    return res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats
 * Aggregated analytics: totals per kind and status, revenue estimate, and leads per day.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [countsByKindAndStatus, dailyLeads] = await Promise.all([
      Lead.aggregate([
        {
          $group: {
            _id: { kind: '$kind', status: '$status' },
            count: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
      ]),
      Lead.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Aggregate summary
    let totalLeads = 0;
    let paidLeads = 0;
    let estimatedRevenue = 0;

    const breakdown = {
      partner: { total: 0, pending: 0, paid: 0, cancelled: 0, expired: 0 },
      customer: { total: 0, pending: 0, paid: 0, cancelled: 0, expired: 0 },
    };

    countsByKindAndStatus.forEach((item) => {
      const { kind, status } = item._id;
      if (breakdown[kind] && breakdown[kind][status] !== undefined) {
        breakdown[kind][status] = item.count;
        breakdown[kind].total += item.count;
      }
      totalLeads += item.count;
      if (status === 'paid') {
        paidLeads += item.count;
        estimatedRevenue += item.revenue;
      }
    });

    return res.status(200).json({
      ok: true,
      stats: {
        totalLeads,
        paidLeads,
        estimatedRevenue,
        breakdown,
        leadsPerDay: dailyLeads.map((d) => ({ date: d._id, leads: d.count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
