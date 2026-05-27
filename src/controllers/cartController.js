// src/controllers/cartController.js

const cartService = require('../services/cartService');

/**
 * GET /api/cart
 * Returns the authenticated user's cart with all items.
 */
async function getCart(req, res, next) {
  try {
    // req.user is set by the authenticate middleware (from Day 5).
    // It contains the decoded JWT payload, which includes the user's id.
    const cart = await cartService.getOrCreateCart(req.user.id);

    res.status(200).json({
      status: 'success',
      data: { cart },
    });
  } catch (err) {
    // Pass errors to our global error handler middleware (from Day 4).
    next(err);
  }
}

/**
 * POST /api/cart/items
 * Body: { productId, quantity }
 * Adds a product to the cart (or increases quantity if already present).
 */
async function addItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;

    // Validate that both fields were actually sent.
    // The service will do deeper validation (stock check, etc.),
    // but we do this basic check at the controller level so we
    // fail fast before even calling the service.
    if (!productId || quantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'productId and quantity are required',
      });
    }

    // parseInt converts the quantity to a whole number.
    // If the user sends "3.7" or "abc", parseInt handles it:
    // parseInt("3.7") → 3, parseInt("abc") → NaN
    const parsedQuantity = parseInt(quantity, 10);

    // NaN check: if parsing failed, reject the request.
    if (isNaN(parsedQuantity)) {
      return res.status(400).json({
        status: 'error',
        message: 'quantity must be a number',
      });
    }

    const cart = await cartService.addItemToCart(req.user.id, productId, parsedQuantity);

    res.status(200).json({
      status: 'success',
      data: { cart },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cart/items/:itemId
 * Body: { quantity }
 * Sets the quantity of a specific cart item to an exact value.
 */
async function updateItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'quantity is required',
      });
    }

    const parsedQuantity = parseInt(quantity, 10);

    if (isNaN(parsedQuantity)) {
      return res.status(400).json({
        status: 'error',
        message: 'quantity must be a number',
      });
    }

    const cart = await cartService.updateCartItem(req.user.id, itemId, parsedQuantity);

    res.status(200).json({
      status: 'success',
      data: { cart },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart/items/:itemId
 * Removes a specific item from the cart.
 */
async function removeItem(req, res, next) {
  try {
    const { itemId } = req.params;

    const cart = await cartService.removeCartItem(req.user.id, itemId);

    res.status(200).json({
      status: 'success',
      data: { cart },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
};