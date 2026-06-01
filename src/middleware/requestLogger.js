// src/middleware/requestLogger.js

const logger = require('../config/logger');

// This middleware logs every HTTP request as a structured JSON object.
// It replaces the morgan text-based logger with winston structured logging.

function requestLogger(req, res, next) {
  // Record when the request arrived
  const startTime = Date.now();

  // res.finish fires when the response has been fully sent to the client.
  // We log after the response because we need the status code and
  // response time — which are only known after the response is sent.
  res.on('finish', () => {
    // Skip health check endpoint — it fires every 30 seconds in production
    // and would flood your logs with useless noise
    if (req.url === '/health') return;

    const responseTime = Date.now() - startTime;

    // Log level based on status code:
    // 5xx = error (server fault), 4xx = warn (client fault), rest = info
    const level =
      res.statusCode >= 500 ? 'error' :
      res.statusCode >= 400 ? 'warn' :
      'info';

    logger[level](`${req.method} ${req.url}`, {
      // Every field here becomes a searchable key in your log aggregator
      correlationId: req.correlationId,
      method:        req.method,
      url:           req.url,
      statusCode:    res.statusCode,
      responseTime:  `${responseTime}ms`,
      // Only log userId if the user is authenticated
      userId:        req.user?.id || null,
    });
  });

  next();
}

module.exports = requestLogger;