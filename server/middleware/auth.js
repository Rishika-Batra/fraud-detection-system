/**
 * auth.js (middleware)
 * Provides two middleware functions for protecting routes:
 *
 * 1. authenticate — verifies the JWT token and attaches req.user
 * 2. authorize(...roles) — checks whether req.user.role is in the allowed list
 *
 * Key concepts for viva:
 * - Authentication = "Who are you?" → verified by the JWT token
 * - Authorization  = "Are you allowed to do this?" → checked by comparing the user's role
 *   against the allowed roles for that endpoint
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * authenticate middleware
 * Reads the Authorization header, extracts the Bearer token, verifies it,
 * loads the corresponding user from the DB, and attaches it to req.user.
 *
 * Why load the user from DB instead of just trusting the token?
 * Because the user may have been deleted or their role changed since the token was issued.
 */
async function authenticate(req, res, next) {
  try {
    // 1. Extract the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify the token signature and check expiry
    // jwt.verify throws if the token is invalid or expired
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token is invalid or expired
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 3. Load the actual user from the database to ensure they still exist
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // 4. Attach a safe user object to the request (never include password_hash)
    req.user = { id: user.id, username: user.username, role: user.role };

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    next(error); // Pass unexpected errors to the centralized error handler
  }
}

/**
 * authorize(...allowedRoles) middleware factory
 * Returns a middleware function that checks if the authenticated user's role
 * is in the list of allowed roles. Must be used AFTER authenticate.
 *
 * Example usage: authorize('admin') or authorize('analyst', 'supervisor')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // req.user is set by the authenticate middleware above
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
