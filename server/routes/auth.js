const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/auth/login
// Authenticates a user and returns a JWT token.
// No middleware needed — this is the entry point for getting a token.
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const result = await authService.login(username, password);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

// POST /api/auth/logout
// Requires authentication. Since JWTs are stateless (the server doesn't store sessions),
// the server simply confirms logout. The client is responsible for discarding the token.
// NOTE: Audit logging for login/logout will be added in the audit step.
router.post('/logout', authenticate, (req, res) => {
  return res.json({ message: 'Logged out' });
});

// GET /api/auth/me
// Requires authentication. Returns the current user's info without the password hash.
router.get('/me', authenticate, (req, res) => {
  // req.user is set by the authenticate middleware and already excludes password_hash
  return res.json(req.user);
});

// POST /api/auth/users
// Admin only: create a new user.
// authorize('admin') checks that req.user.role === 'admin' after authenticate runs.
router.post('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const user = await authService.createUser({ username, password, role });
    return res.status(201).json(user);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details
      });
    }
    next(error);
  }
});

// GET /api/auth/users
// Admin only: list all users. Password hashes are never returned.
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { User } = require('../models');
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'created_at'] // Explicitly exclude password_hash
    });
    return res.json(users);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

