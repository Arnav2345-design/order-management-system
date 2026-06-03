// src/validators/orderValidator.js

const { z } = require('zod');

const createOrderSchema = z.object({
  addressId: z.string()
    .uuid('addressId must be a valid UUID'),

  notes: z.string()
    .max(500, 'Notes must be under 500 characters')
    .trim()
    .optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(
    ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    { errorMap: () => ({ message: 'Invalid order status' }) }
  ),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };