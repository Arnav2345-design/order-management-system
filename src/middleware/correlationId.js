// src/middleware/correlationId.js

const crypto = require('crypto');

// This middleware runs on every request before anything else.
// It generates a unique ID for the request and attaches it to req.
// Every log line produced during this request will include this ID.
// This lets you trace all activity for a single request in your logs.

function correlationId(req, res, next) {
  // Check if the caller sent a correlation ID in the request header.
  // This is useful when a frontend or another service wants to trace
  // a request end-to-end across multiple systems.
  // If they didn't send one, we generate our own.
  const id = req.headers['x-correlation-id'] || crypto.randomUUID();

  // Attach to req so all middleware and controllers can access it
  req.correlationId = id;

  // Also send it back in the response header so the caller can
  // use it to correlate their logs with ours
  res.setHeader('x-correlation-id', id);

  next();
}

module.exports = correlationId;