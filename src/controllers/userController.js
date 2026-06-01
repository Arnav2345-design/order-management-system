// src/controllers/userController.js

const userService = require('../services/userService');

async function getProfile(req, res, next) {
  try {
    // req.user.id is set by the authenticate middleware after JWT verification
    const user = await userService.getProfile(req.user.id);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await userService.updateProfile(req.user.id, {
      firstName,
      lastName,
      phone,
    });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword };