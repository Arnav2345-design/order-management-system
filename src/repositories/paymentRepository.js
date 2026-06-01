// src/repositories/paymentRepository.js

const db = require('../config/database');

/**
 * Create a new payment record.
 * Called when a customer initiates a payment.
 */
async function create({ orderId, amount, method, gatewayOrderId, idempotencyKey }) {
  const result = await db.query(
    `INSERT INTO payments (
       id, order_id, amount, status, method,
       gateway_order_id, idempotency_key,
       created_at, updated_at
     )
     VALUES (
       gen_random_uuid(), $1, $2, 'pending', $3,
       $4, $5,
       NOW(), NOW()
     )
     RETURNING *`,
    [orderId, amount, method, gatewayOrderId || null, idempotencyKey]
  );
  return result.rows[0];
}

/**
 * Find a payment by the order it belongs to.
 * One order has exactly one payment record.
 */
async function findByOrderId(orderId) {
  const result = await db.query(
    'SELECT * FROM payments WHERE order_id = $1',
    [orderId]
  );
  return result.rows[0] || null;
}

/**
 * Find a payment by its own ID.
 */
async function findById(id) {
  const result = await db.query(
    'SELECT * FROM payments WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Mark a payment as completed after successful verification.
 * Also stores the gateway's payment ID and any metadata Razorpay sent back.
 */
async function markCompleted(id, { gatewayPaymentId, metadata }) {
  const result = await db.query(
    `UPDATE payments
     SET status = 'completed',
         gateway_payment_id = $1,
         metadata = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [gatewayPaymentId, JSON.stringify(metadata), id]
  );
  return result.rows[0] || null;
}

/**
 * Mark a payment as failed.
 * Called when Razorpay verification fails or payment is declined.
 */
async function markFailed(id) {
  const result = await db.query(
    `UPDATE payments
     SET status = 'failed', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}
/**
 * Find a payment by Razorpay's payment ID (gateway_payment_id).
 * Used in webhook processing — after capture, Razorpay sends its own
 * payment ID. We look up whether we've already processed it.
 */
async function findByGatewayPaymentId(gatewayPaymentId) {
  const result = await db.query(
    'SELECT * FROM payments WHERE gateway_payment_id = $1',
    [gatewayPaymentId]
  );
  return result.rows[0] || null;
}

/**
 * Find a payment by Razorpay's order ID (gateway_order_id).
 * Used in webhook processing — at the time the webhook arrives,
 * gateway_payment_id may not be set yet (it's set after capture).
 * But gateway_order_id was stored during initiation, so we use that
 * to find the pending payment record.
 */
async function findByGatewayOrderId(gatewayOrderId) {
  const result = await db.query(
    'SELECT * FROM payments WHERE gateway_order_id = $1',
    [gatewayOrderId]
  );
  return result.rows[0] || null;
}
module.exports = {
  create,
  findByOrderId,
  findById,
  markCompleted,
  markFailed,
  findByGatewayPaymentId,
  findByGatewayOrderId,
};