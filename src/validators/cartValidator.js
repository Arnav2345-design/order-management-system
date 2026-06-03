// src/validators/cartValidator.js

const { z } = require('zod');

const addCartItemSchema = z.object({
  productId: z.string()
    .uuid('productId must be a valid UUID'),

  quantity: z.coerce.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

module.exports = { addCartItemSchema, updateCartItemSchema };