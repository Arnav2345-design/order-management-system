// src/validators/authValidator.js

const { z } = require('zod');

const registerSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be under 100 characters')
    .trim(),

  lastName: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be under 100 characters')
    .trim(),

  email: z.string()
    .email('Must be a valid email address')
    .toLowerCase()
    // toLowerCase() normalises "John@EXAMPLE.com" to "john@example.com"
    // so duplicate email checks work correctly
    .trim(),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be under 100 characters'),
});

const loginSchema = z.object({
  email: z.string()
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),

  password: z.string()
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };