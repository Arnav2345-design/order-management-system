// src/validators/userValidator.js

const { z } = require('zod');
const { stripHtml } = require('../utils/sanitize');

// PATCH /api/users/profile
// All fields optional — the user sends only what they want to change.
// userService.updateProfile() already rejects an empty object (no
// fields at all), so we don't need .min(1) here.
const updateProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must be under 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  lastName: z.string()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name must be under 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  phone: z.string()
    .max(20, 'Phone must be under 20 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

// PATCH /api/users/profile/password
const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),

  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must be under 100 characters'),
});

module.exports = { updateProfileSchema, changePasswordSchema };
