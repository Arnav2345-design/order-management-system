// src/controllers/addressController.js

const addressService = require('../services/addressService');

async function getAddresses(req, res, next) {
  try {
    const addresses = await addressService.getAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { addresses } });
  } catch (err) {
    next(err);
  }
}

async function addAddress(req, res, next) {
  try {
    const {
      label, addressLine1, addressLine2,
      city, state, postalCode, country, isDefault
    } = req.body;

    const address = await addressService.addAddress(req.user.id, {
      label, addressLine1, addressLine2,
      city, state, postalCode, country, isDefault
    });

    res.status(201).json({ status: 'success', data: { address } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAddresses, addAddress };