// src/controllers/orderController.js

const orderService = require('../services/orderService');

async function placeOrder(req, res, next) {
  try {
    const { addressId, notes } = req.body;

    if (!addressId) {
      return res.status(400).json({
        status: 'error',
        message: 'addressId is required',
      });
    }

    const order = await orderService.placeOrder(req.user.id, { addressId, notes });
    res.status(201).json({ status: 'success', data: { order } });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    // req.validatedQuery.page and .limit are already validated, coerced
    // to numbers, and defaulted by the validateQuery middleware.
    const { page, limit } = req.validatedQuery;
    const { orders, pagination } = await orderService.getMyOrders(req.user.id, { page, limit });
    res.status(200).json({ status: 'success', data: { orders, pagination } });
  } catch (err) {
    next(err);
  }
}

async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(
      req.user.id,
      req.params.id,
      req.user.role
    );
    res.status(200).json({ status: 'success', data: { order } });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'status is required',
      });
    }

    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.status(200).json({ status: 'success', data: { order } });
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, getMyOrders, getOrderById, updateOrderStatus };