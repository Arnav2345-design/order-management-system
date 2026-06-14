// src/validators/addressValidator.js

const { z } = require('zod');
const { stripHtml } = require('../utils/sanitize');

const createAddressSchema = z.object({
  label: z.string()
    .max(50, 'Label must be under 50 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  addressLine1: z.string()
    .min(1, 'Address line 1 is required')
    .max(255, 'Address line 1 must be under 255 characters')
    .trim()
    .transform(stripHtml),

  addressLine2: z.string()
    .max(255, 'Address line 2 must be under 255 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City must be under 100 characters')
    .trim()
    .transform(stripHtml),

  state: z.string()
    .min(1, 'State is required')
    .max(100, 'State must be under 100 characters')
    .trim()
    .transform(stripHtml),

  postalCode: z.string()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code must be under 20 characters')
    .trim(),

  country: z.string()
    .max(100, 'Country must be under 100 characters')
    .trim()
    .transform(stripHtml)
    .default('India'),

  isDefault: z.boolean()
    .default(false),
});

module.exports = { createAddressSchema };