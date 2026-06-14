//src/app.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const { generalLimiter, authLimiter, orderLimiter } = require('./middleware/rateLimiter');
const correlationId = require('./middleware/correlationId');
const config = require('./config');

const app = express();

// ── Correlation ID ───────────────────────────────────────────────
// Must be first — every subsequent middleware and log line needs it
app.use(correlationId);

// ── Security middleware ──────────────────────────────────────────
app.use(helmet({
  // Content Security Policy — tells browsers which sources are trusted
  // Prevents XSS attacks by blocking inline scripts and unknown origins
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
  // Prevents browsers from MIME-sniffing — forces them to respect
  // the Content-Type header, preventing content injection attacks
  noSniff: true,
  // Forces HTTPS — tells browsers to only connect via HTTPS for 1 year
  // Only enable in production — would break local HTTP development
  hsts: config.nodeEnv === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  // Prevents your app from being embedded in iframes
  // Protects against clickjacking attacks
  frameguard: { action: 'deny' },
}));

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────────
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    // buf is the raw Buffer (bytes) before JSON parsing.
    // We attach it to req so the webhook handler can use it
    // for HMAC signature verification.
    // Every request gets this, but only the webhook route uses it.
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Request logging ──────────────────────────────────────────────
app.use(requestLogger);

// ── Rate limiting ─────────────────────────────────────────────────
// General limiter applied to all routes
app.use(generalLimiter);

// Stricter limiter applied only to auth endpoints
app.use('/api/auth', authLimiter);

// ── Routes ───────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// ── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// ── Error handler ────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;