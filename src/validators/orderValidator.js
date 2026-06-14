// src/validators/orderValidator.js

const { z } = require('zod');
const { ORDER_STATUSES } = require('../utils/constants');
const { stripHtml } = require('../utils/sanitize');
const config = require('../config');

const createOrderSchema = z.object({
  addressId: z.string()
    .uuid('addressId must be a valid UUID'),

  notes: z.string()
    .max(500, 'Notes must be under 500 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(
    ORDER_STATUSES,
    { errorMap: () => ({ message: 'Invalid order status' }) }
  ),
});

// Query string parameters for GET /api/orders (pagination).
//
// Query strings are ALWAYS strings — even ?page=2 arrives as the
// string "2", not the number 2. z.coerce.number() converts it.
//
// - page:  which "page" of results to return (1-indexed — page 1 is
//          the first page, not page 0)
// - limit: how many orders per page
//
// We cap `limit` at config.pagination.maxLimit so a client can't
// request ?limit=1000000 and force the database to load every order
// a user has ever placed in one query.
const paginationQuerySchema = z.object({
  page: z.coerce.number()
    .int('page must be a whole number')
    .positive('page must be at least 1')
    .default(1),

  limit: z.coerce.number()
    .int('limit must be a whole number')
    .positive('limit must be at least 1')
    .max(config.pagination.maxLimit, `limit cannot exceed ${config.pagination.maxLimit}`)
    .default(config.pagination.defaultLimit),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, paginationQuerySchema };