// src/routes/cartRoutes.js

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/authenticate');

// Every cart route requires authentication.
// We apply the middleware once at the router level here —
// it applies automatically to every route defined below.
// This is cleaner than adding authenticate to each route individually.
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.put('/items/:itemId', cartController.updateItem);
router.delete('/items/:itemId', cartController.removeItem);

module.exports = router;