// src/services/paymentService.js

const crypto = require('crypto');
// crypto is a built-in Node.js module — no npm install needed.
// We use it to verify Razorpay's HMAC signature.

const razorpay = require('../config/razorpay');
const paymentRepository = require('../repositories/paymentRepository');
const orderRepository = require('../repositories/orderRepository');
const AppError = require('../utils/AppError');

/**
 * Initiate a payment for an order.
 * 
 * For COD: creates a pending payment record immediately, no gateway involved.
 * For Razorpay: creates a Razorpay order via their API, then stores the result.
 */
async function initiatePayment(userId, { orderId, method }) {
  // ── Validate the order exists and belongs to this user ────────────────────
  const order = await orderRepository.findById(orderId);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.user_id !== userId) {
    throw new AppError('Order not found', 404);
  }

  // ── Prevent duplicate payments ────────────────────────────────────────────
  // If a payment already exists for this order, don't create another one.
  const existingPayment = await paymentRepository.findByOrderId(orderId);

  if (existingPayment && existingPayment.status === 'completed') {
    throw new AppError('This order has already been paid', 400);
  }

  // ── Validate payment method ───────────────────────────────────────────────
  const validMethods = ['cod', 'razorpay'];
  if (!validMethods.includes(method)) {
    throw new AppError('Payment method must be cod or razorpay', 400);
  }

  // ── Idempotency key ───────────────────────────────────────────────────────
  // An idempotency key is a unique value that prevents duplicate operations.
  // Real-world analogy: it's like a receipt number. If you submit the same
  // payment form twice (e.g. double-click), the second submission is ignored
  // because the receipt number already exists.
  // We combine orderId + method to make a key unique per order per method.
  const idempotencyKey = `${orderId}-${method}`;

  // ── Handle COD ────────────────────────────────────────────────────────────
  if (method === 'cod') {
    // For COD, we just record the payment as pending — no gateway needed.
    // The payment will be marked completed when the delivery agent collects cash.
    try {
      const payment = await paymentRepository.create({
        orderId,
        amount: order.total,
        method: 'cod',
        gatewayOrderId: null,
        idempotencyKey,
      });
      return { payment };
    } catch (err) {
      // PostgreSQL error code 23505 means unique constraint violation.
      // This happens when the idempotency key already exists — i.e. a
      // duplicate payment attempt for the same order.
      if (err.code === '23505') {
        throw new AppError('A payment for this order already exists', 409);
      }
      throw err;
    }
  }

  // ── Handle Razorpay ───────────────────────────────────────────────────────
  const amountInPaise = Math.round(parseFloat(order.total) * 100);

  const razorpayOrder = await razorpay.orders.create({

  
    amount: amountInPaise,
    currency: 'INR',
    // receipt ties the Razorpay order back to our order ID
    receipt: orderId,
    notes: {
      orderId,
      userId,
    },
  });

  // Store the payment record with the Razorpay order ID
  const payment = await paymentRepository.create({
    orderId,
    amount: order.total,
    method: 'razorpay',
    gatewayOrderId: razorpayOrder.id,
    idempotencyKey,
  });

  // Return both our payment record and the Razorpay order details.
  // The frontend needs razorpayOrder.id to open the payment UI.
  return {
    payment,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
  };
}

/**
 * Verify a Razorpay payment after the customer completes payment.
 * 
 * This is the security-critical step. Razorpay sends back three values:
 *   - razorpay_order_id  (the order we created in initiatePayment)
 *   - razorpay_payment_id (the actual payment that was made)
 *   - razorpay_signature  (an HMAC hash we must verify)
 * 
 * We recompute the signature using our secret key and compare.
 * If they match, the payment is genuine. If not, it's forged.
 */
async function verifyPayment(userId, {
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  // Find the payment record for this order
  const payment = await paymentRepository.findByOrderId(orderId);

  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  // Verify ownership
  const order = await orderRepository.findById(orderId);
  if (!order || order.user_id !== userId) {
    throw new AppError('Order not found', 404);
  }

  // ── Signature verification ────────────────────────────────────────────────
  // Razorpay's signature is an HMAC-SHA256 hash of:
  //   razorpay_order_id + "|" + razorpay_payment_id
  // signed with your Razorpay key secret.
  // 
  // We recompute this hash ourselves and compare it to what Razorpay sent.
  // If someone forged the payment notification, their signature won't match.
  const body = razorpayOrderId + '|' + razorpayPaymentId;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    // createHmac creates a Hash-based Message Authentication Code
    // 'sha256' is the hashing algorithm
    // our secret key is used to sign it
    .update(body)
    // feed the data to be signed
    .digest('hex');
    // output as a hexadecimal string

  // timingSafeEqual prevents timing attacks.
  // A regular === comparison can leak information about how many characters
  // matched before it found a difference. timingSafeEqual always takes
  // the same amount of time regardless of how much matches.
  const signatureBuffer = Buffer.from(razorpaySignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  const isValid = signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!isValid) {
    // Mark the payment as failed so we have a record of the attempt
    await paymentRepository.markFailed(payment.id);
    throw new AppError('Payment verification failed', 400);
  }

  // Signature matched — mark the payment as completed
  const completedPayment = await paymentRepository.markCompleted(payment.id, {
    gatewayPaymentId: razorpayPaymentId,
    metadata: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
  });

  return completedPayment;
}

/**
 * Get the payment record for a specific order.
 */
async function getPaymentByOrderId(userId, orderId) {
  const order = await orderRepository.findById(orderId);

  if (!order || order.user_id !== userId) {
    throw new AppError('Order not found', 404);
  }

  const payment = await paymentRepository.findByOrderId(orderId);

  if (!payment) {
    throw new AppError('No payment found for this order', 404);
  }

  return payment;
}

module.exports = { initiatePayment, verifyPayment, getPaymentByOrderId };