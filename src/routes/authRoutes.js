// src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Logout requires authentication — you must be logged in to log out.
// authenticate runs first, attaches req.jti, then logout deletes that session.
router.post('/logout', authenticate, authController.logout);

module.exports = router;