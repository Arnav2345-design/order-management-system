// src/routes/addressRoutes.js

const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authenticate = require('../middleware/authenticate');

// All address routes require authentication
router.use(authenticate);

router.get('/', addressController.getAddresses);
router.post('/', addressController.addAddress);

module.exports = router;