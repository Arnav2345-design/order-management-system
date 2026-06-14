// src/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');
const config = require('../config');

// General limiter — applied to all routes
// 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes in milliseconds
  max: 100,                   // maximum requests per window per IP
  standardHeaders: true,      // return rate limit info in RateLimit-* headers
  legacyHeaders: false,       // disable the old X-RateLimit-* headers
  
  skip: () => config.nodeEnv === 'test',

  store: new RedisStore({
    // sendCommand is how rate-limit-redis talks to your Redis client
    // It passes the Redis command and arguments — ioredis handles the rest
    sendCommand: (...args) => redis.call(...args),
  }),

  // Custom response when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
    });
  },
});

// Auth limiter — stricter, applied only to login and register
// 10 requests per 15 minutes per IP
// This slows down brute force password attacks significantly
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),

  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts, please try again in 15 minutes',
    });
  },
});

// Order limiter — applied only to POST /api/orders (placing an order)
// 20 requests per 15 minutes per IP
//
// Why a separate limiter for this one endpoint?
// The general limiter (100/15min) covers casual browsing — GET requests
// to view products, cart, orders, etc. But placing an order touches the
// database multiple times in a single transaction (insert order, insert
// order_items, update product stock, clear cart) and can trigger a
// payment flow. A script that hammers this endpoint could exhaust stock
// rows or spam the payment gateway far faster than it could spam a
// simple GET. A tighter, endpoint-specific limit catches that abuse
// without making the general limit (which applies to every route)
// uncomfortably strict for normal use.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,

  skip: () => config.nodeEnv === 'test',

  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),

  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many order requests, please try again later',
    });
  },
});

module.exports = { generalLimiter, authLimiter, orderLimiter };