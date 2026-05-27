const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: { message: 'firstName, lastName, email, and password are required' }
      });
    }

    const { user, token } = await authService.register({ firstName, lastName, email, password });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: 'email and password are required' }
      });
    }

    const { user, token } = await authService.login({ email, password });
    res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };