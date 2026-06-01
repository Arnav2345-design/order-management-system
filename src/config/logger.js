// src/config/logger.js

const winston = require('winston');

// Winston has the concept of "transports" — destinations for log output.
// Each transport can have its own format and level.
// We use two transports:
//   1. Console — for development, human-readable coloured output
//   2. File — for production, machine-readable JSON output

// Log levels in winston (lowest to highest severity):
// error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
// Setting a level means "log this level AND everything more severe"
// So level: 'info' logs info + warn + error, but not http or debug

const { combine, timestamp, json, colorize, printf } = winston.format;

// ── Development format — human readable ──────────────────────────
// printf lets you define a custom string format
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  // metadata contains any extra fields attached to the log entry
  // e.g. correlationId, userId, statusCode etc.
  const meta = Object.keys(metadata).length
    ? ' ' + JSON.stringify(metadata)
    : '';
  return `${timestamp} [${level}] ${message}${meta}`;
});

// ── Production format — JSON ──────────────────────────────────────
// json() format outputs a complete JSON object per line.
// Each line is one log entry — easy to parse programmatically.
const prodFormat = combine(
  timestamp(),
  json()
);

// ── Choose format based on environment ───────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  // In production log info and above, in development log everything
  level: isProduction ? 'info' : 'debug',

  format: isProduction
    ? prodFormat
    : combine(
        colorize(),   // adds colour to level names in terminal
        timestamp({ format: 'HH:mm:ss' }), // short timestamp for dev
        devFormat
      ),

  transports: [
    // Always log to console
    new winston.transports.Console(),

    // In production also write errors to a file
    // This gives you a persistent record even if console output is lost
    ...(isProduction
      ? [new winston.transports.File({ filename: 'logs/error.log', level: 'error' })]
      : []
    ),
  ],

  // Don't crash the process on unhandled logger errors
  exitOnError: false,
});

module.exports = logger;