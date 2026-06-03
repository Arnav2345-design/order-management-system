// src/validators/productValidator.js

const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Name must be under 255 characters')
    .trim(),

  description: z.string()
    .max(2000, 'Description must be under 2000 characters')
    .trim()
    .optional(),

  // coerce converts the string "99.99" to the number 99.99
  // This handles JSON numbers and string numbers from forms
  price: z.coerce.number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),

  stockQuantity: z.coerce.number()
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative'),

  sku: z.string()
    .min(1, 'SKU is required')
    .max(100, 'SKU must be under 100 characters')
    .trim(),

  category: z.string()
    .max(100, 'Category must be under 100 characters')
    .trim()
    .optional(),
});

const updateProductSchema = createProductSchema.partial();
// .partial() makes all fields optional — for PATCH requests
// you only need to send the fields you want to update

module.exports = { createProductSchema, updateProductSchema };