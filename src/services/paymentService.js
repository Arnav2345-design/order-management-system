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
    razorpayKeyId: config.razorpay.keyId,
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
    .createHmac('sha256', config.razorpay.keySecret )
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
/**
 * Process a Razorpay webhook event.
 *
 * Two responsibilities:
 *   1. Verify the HMAC signature — proves the request is genuinely from Razorpay
 *   2. Idempotently update payment + order status — safe to run multiple times
 */
 async function processWebhook(rawBody, signature) {
 
  // ── Step 1: Verify signature ──────────────────────────────────────────────
  // Razorpay signs every webhook payload with your webhook secret.
  // We recompute the signature and compare — if they match, it's genuine.
  const webhookSecret =config.razorpay.webhookSecret ;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)        // rawBody is the Buffer from req.rawBody
    .digest('hex');

  // timingSafeEqual prevents timing attacks — same reason as in verifyPayment
  const sigBuffer      = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    throw new AppError('Invalid webhook signature', 400);
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new AppError('Invalid webhook signature', 400);
  }

  // ── Step 2: Parse the event ───────────────────────────────────────────────
  // rawBody is a Buffer — convert to string then parse as JSON
  const event = JSON.parse(rawBody.toString());

  // We only handle payment.captured for now.
  // Returning early for other event types is correct — it tells Razorpay
  // we received the event successfully, so it stops retrying.
  if (event.event !== 'payment.captured') {
    return { received: true, processed: false };
  }

  // ── Step 3: Extract identifiers from the event payload ───────────────────
  const razorpayPaymentId = event.payload.payment.entity.id;

  // ── Step 4: Idempotency check ─────────────────────────────────────────────
  // Look up the payment by Razorpay's payment ID.
  // We use gateway_payment_id here, not our internal UUID, because
  // Razorpay only knows its own IDs — not ours.
  const existingPayment = await paymentRepository.findByGatewayPaymentId(
    razorpayPaymentId
  );

  // If we don't recognise this payment ID at all, return 200 silently.
  // Could be a test event or from a different environment.
  if (!existingPayment) {
    // Check by gateway_order_id instead — during initiation we stored
    // the razorpay order id in gateway_order_id, but gateway_payment_id
    // is only filled after capture. So look up via gateway_order_id.
    const razorpayOrderId = event.payload.payment.entity.order_id;
    const pendingPayment = await paymentRepository.findByGatewayOrderId(
      razorpayOrderId
    );

    if (!pendingPayment) {
      return { received: true, processed: false };
    }

    // Already completed — idempotent return
    if (pendingPayment.status === 'completed') {
      return { received: true, processed: false, reason: 'already_processed' };
    }

    // ── Step 5: Update payment + order in a transaction ───────────────────
    const pool = require('../config/database');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE payments
         SET status = 'completed',
             gateway_payment_id = $1,
             metadata = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          razorpayPaymentId,
          JSON.stringify(event.payload.payment.entity),
          pendingPayment.id,
        ]
      );

      await client.query(
        `UPDATE orders
         SET status = 'confirmed',
             updated_at = NOW()
         WHERE id = $1`,
        [pendingPayment.order_id]
      );

      await client.query('COMMIT');
      return { received: true, processed: true };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Payment found by gateway_payment_id — already processed
  if (existingPayment.status === 'completed') {
    return { received: true, processed: false, reason: 'already_processed' };
  }

  return { received: true, processed: false };
}
module.exports = { initiatePayment, verifyPayment, getPaymentByOrderId, processWebhook };