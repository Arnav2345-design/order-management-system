// src/middleware/errorHandler.js

const logger = require('../config/logger');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Use winston instead of console.error
  // 500+ errors are server faults — log at error level with full stack
  // 400-499 errors are client faults — log at warn level, stack not needed
  const level = statusCode >= 500 ? 'error' : 'warn';

  logger[level](`${req.method} ${req.url}`, {
    correlationId: req.correlationId,
    statusCode,
    message:       err.message,
    // Only include stack trace in non-production environments
    stack:         config.nodeEnv !== 'production' ? err.stack : undefined,
    // Include userId if available — helps trace which user hit the error
    userId:        req.user?.id || null,
  });

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      // Expose stack trace only in development
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
      // Always include correlationId in error responses —
      // the caller can send it to support to look up exactly what went wrong
      correlationId: req.correlationId,
    },
  });
};

module.exports = errorHandler;