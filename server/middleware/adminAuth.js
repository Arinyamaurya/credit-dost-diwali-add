const crypto = require('crypto');

/**
 * Constant-time admin token authentication middleware.
 * Expects 'x-admin-token' header matching ADMIN_TOKEN.
 */
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken) {
    return res.status(500).json({
      ok: false,
      error: 'ADMIN_TOKEN is not configured on the server.',
    });
  }

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: Missing x-admin-token header.',
    });
  }

  const tokenBuffer = Buffer.from(String(token));
  const expectedBuffer = Buffer.from(String(expectedToken));

  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden: Invalid admin token.',
    });
  }

  next();
}

module.exports = { adminAuth };
