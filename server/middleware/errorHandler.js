/**
 * Central Error Handler Middleware.
 * Catches any unhandled errors, logs them internally, and returns safe, sanitize JSON
 * without leaking internal stack traces.
 */
function errorHandler(err, req, res, next) {
  console.error('[ServerError]', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    ok: false,
    code: err.code || 'SERVER_ERROR',
    error: message,
  });
}

module.exports = { errorHandler };
