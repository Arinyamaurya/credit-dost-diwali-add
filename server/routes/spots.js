const express = require('express');
const router = express.Router();
const { getSpotsSummary, addSSEClient, removeSSEClient } = require('../services/spots');

/**
 * GET /api/spots
 * Returns cached/short-lived summary of spots claimed & total for both kinds.
 */
router.get('/spots', async (req, res, next) => {
  try {
    const summary = await getSpotsSummary();
    res.setHeader('Cache-Control', 'public, max-age=5');
    res.status(200).json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/spots/stream
 * Server-Sent Events (SSE) stream for real-time live spots counter updates across all active browsers.
 */
router.get('/spots/stream', async (req, res) => {
  // Setup SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // For Nginx proxy buffering bypass
  });

  // Flush initial connection
  res.write(': connected\n\n');

  // Push immediate current stats
  try {
    const summary = await getSpotsSummary();
    res.write(`data: ${JSON.stringify(summary)}\n\n`);
  } catch (err) {
    console.error('SSE initial load error:', err.message);
  }

  // Register client
  addSSEClient(res);

  // Send periodic heartbeat every 25 seconds to keep connection alive through NAT / firewalls
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    removeSSEClient(res);
  });
});

module.exports = router;
