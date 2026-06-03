// src/validators/paymentValidator.js

const { z } = require('zod');

const initiatePaymentSchema = z.object({
  orderId: z.string()
    .uuid('orderId must be a valid UUID'),

  method: z.enum(['cod', 'razorpay'], {
    errorMap: () => ({ message: 'Payment method must be cod or razorpay' }),
  }),
});

const verifyPaymentSchema = z.object({
  orderId: z.string()
    .uuid('orderId must be a valid UUID'),

  razorpayOrderId: z.string()
    .min(1, 'razorpayOrderId is required'),

  razorpayPaymentId: z.string()
    .min(1, 'razorpayPaymentId is required'),

  razorpaySignature: z.string()
    .min(1, 'razorpaySignature is required'),
});

module.exports = { initiatePaymentSchema, verifyPaymentSchema };