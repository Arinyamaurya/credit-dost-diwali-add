const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { validateLeadInput } = require('../utils/validate');
const { claimSpotAtomic, rollbackSpotAtomic, getSpotsSummary } = require('../services/spots');
const { sendLeadNotifications } = require('../services/mailer');
const { getPrice } = require('../config/pricing');
const { syncLead } = require('../services/sheets');

/**
 * Check if the festival offer end date has elapsed.
 */
function isOfferClosed() {
  const endIso = process.env.OFFER_END_ISO;
  if (!endIso) return false;
  const deadline = new Date(endIso).getTime();
  if (isNaN(deadline)) return false;
  return Date.now() > deadline;
}

/**
 * POST /api/leads
 * Atomically claim spot and register lead.
 */
router.post('/leads', async (req, res, next) => {
  try {
    const { kind, name, mobile, email, city, pin, website, source } = req.body || {};

    // 1. Honeypot check: If non-empty, silently respond 200 without saving
    if (website && String(website).trim().length > 0) {
      return res.status(200).json({ ok: true, message: 'Received' });
    }

    // 2. Offer closed check
    if (isOfferClosed()) {
      return res.status(410).json({
        ok: false,
        code: 'OFFER_CLOSED',
        message: 'The Diwali festive offer has concluded. All festive privileges are now closed.',
      });
    }

    // 3. Server-side validation
    const validation = validateLeadInput({ kind, name, mobile, email, city, pin });
    if (!validation.isValid) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_FAILED',
        errors: validation.errors,
      });
    }

    const { sanitized } = validation;

    // 4. Pre-check: Duplicate registration check (friendly 409 ALREADY_REGISTERED before counter reservation)
    const existingLead = await Lead.findOne({
      kind: sanitized.kind,
      $or: [{ mobile: sanitized.mobile }, { email: sanitized.email }],
    });
    if (existingLead) {
      // Unpaid reservation (e.g. payment failed, storage cleared): resume it so the user can pay again
      if (existingLead.status === 'pending') {
        const spotsSummary = await getSpotsSummary();
        const kindSpots = spotsSummary[sanitized.kind];
        const currentPrice = getPrice(existingLead.kind);
        return res.status(200).json({
          ok: true,
          resumed: true,
          leadId: existingLead._id.toString(),
          kind: existingLead.kind,
          amount: currentPrice.totalPaise / 100,
          amountPaise: currentPrice.totalPaise,
          basePaise: currentPrice.basePaise,
          gstPaise: currentPrice.gstPaise,
          spots: {
            claimed: kindSpots.claimed,
            total: kindSpots.total,
            remaining: kindSpots.remaining,
          },
        });
      }

      return res.status(409).json({
        ok: false,
        code: 'ALREADY_REGISTERED',
        message: 'This mobile number or email has already reserved a spot for this offer.',
      });
    }

    // 5. Atomic spot claiming (prevents race conditions / overselling)
    const claimedCounter = await claimSpotAtomic(sanitized.kind);
    if (!claimedCounter) {
      return res.status(409).json({
        ok: false,
        code: 'SOLD_OUT',
        message: `All spots for the ${sanitized.kind === 'partner' ? 'franchise partner' : 'credit score repair'} offer have been claimed.`,
      });
    }

    // 6. Create Lead
    const price = getPrice(sanitized.kind);
    const amount = price.totalPaise / 100;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    let lead;
    try {
      lead = await Lead.create({
        kind: sanitized.kind,
        name: sanitized.name,
        mobile: sanitized.mobile,
        email: sanitized.email,
        city: sanitized.city,
        pin: sanitized.pin,
        amount,
        amountPaise: price.totalPaise,
        gstPaise: price.gstPaise,
        ip,
        userAgent,
        source: typeof source === 'string' ? source.slice(0, 100) : '',
        status: 'pending',
      });
    } catch (saveError) {
      // Roll back spot reservation so count never drifts
      await rollbackSpotAtomic(sanitized.kind);

      // Check for compound unique index duplicate key error (code 11000)
      if (saveError.code === 11000) {
        return res.status(409).json({
          ok: false,
          code: 'ALREADY_REGISTERED',
          message: 'This mobile number or email has already reserved a spot for this offer.',
        });
      }

      throw saveError;
    }

    // 7. Get fresh spots summary for immediate frontend response
    const spotsSummary = await getSpotsSummary();
    const kindSpots = spotsSummary[sanitized.kind];

    // 8. Fire email alert asynchronously (never blocking request)
    sendLeadNotifications(lead).catch((err) => {
      console.error('Async email notification error:', err.message);
    });
    syncLead(lead);

    return res.status(201).json({
      ok: true,
      leadId: lead._id.toString(),
      kind: sanitized.kind,
      amount,
      amountPaise: price.totalPaise,
      basePaise: price.basePaise,
      gstPaise: price.gstPaise,
      spots: {
        claimed: kindSpots.claimed,
        total: kindSpots.total,
        remaining: kindSpots.remaining,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
