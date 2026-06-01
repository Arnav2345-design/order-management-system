// src/config/index.js

const { z } = require('zod');

// ── Define the schema ─────────────────────────────────────────────
// z.object() defines the shape of our config.
// Each field has a type and optional constraints.
// If any required field is missing, zod throws with a clear message.

const schema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DB_HOST:     z.string().min(1),
  DB_PORT:     z.string().transform(Number).default('5432'),
  DB_USER:     z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME:     z.string().min(1),

  // JWT
  JWT_SECRET:     z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),

  // Razorpay
  RAZORPAY_KEY_ID:        z.string().min(1),
  RAZORPAY_KEY_SECRET:    z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

// ── Validate process.env against the schema ───────────────────────
// safeParse returns { success, data, error } instead of throwing.
// This lets us format the error message ourselves.
const result = schema.safeParse(process.env);

if (!result.success) {
  // Format zod's error into a readable list of missing/invalid variables
  const formatted = result.error.issues
    .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // console.error here because logger.js might not be set up yet
  // We crash immediately — a misconfigured app should never start
  console.error('Invalid environment configuration:\n' + formatted);
  process.exit(1);
}

// ── Export the validated, type-converted config ───────────────────
// Everything downstream imports from here — never from process.env directly
const env = result.data;

module.exports = {
  nodeEnv:  env.NODE_ENV,
  port:     env.PORT,          // number, not string

  db: {
    host:     env.DB_HOST,
    port:     env.DB_PORT,     // number, not string
    user:     env.DB_USER,
    password: env.DB_PASSWORD,
    name:     env.DB_NAME,
  },

  jwt: {
    secret:    env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,      // number, not string
  },

  razorpay: {
    keyId:         env.RAZORPAY_KEY_ID,
    keySecret:     env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },
};