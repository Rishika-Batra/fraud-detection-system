/**
 * authService.js
 * Contains the core business logic for authentication and user management.
 *
 * Key concepts for viva:
 * - bcrypt: A password-hashing function that adds a random "salt" before hashing,
 *   so even identical passwords produce different hashes. This protects against
 *   rainbow-table attacks. The "10 salt rounds" means 2^10 iterations of hashing.
 * - JWT (JSON Web Token): A compact, self-contained token that encodes a JSON payload
 *   (here: id, username, role) and is signed with a secret key. The server doesn't
 *   need to store sessions — the token itself proves identity. It has an expiry time.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logAction, ACTIONS } = require('./auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRY = '8h'; // Token expires in 8 hours

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 * The salt is randomly generated and embedded in the resulting hash string,
 * so you don't need to store it separately.
 *
 * @param {string} plain - The plaintext password
 * @returns {Promise<string>} The bcrypt hash
 */
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * Authenticates a user by username and password.
 * Returns a JWT token and safe user info on success.
 *
 * Security note: On failure we always return the same generic message
 * ("Invalid username or password") so an attacker cannot tell whether
 * the username exists or the password was wrong.
 *
 * @param {string} username
 * @param {string} password - Plaintext password to compare
 * @returns {Promise<{ token: string, user: { id, username, role } }>}
 */
async function login(username, password) {
  // 1. Look up the user by username (using scope to read password_hash for comparison)
  const user = await User.scope('withPassword').findOne({ where: { username } });

  if (!user) {
    // User not found — return generic message (never reveal that the username doesn't exist)
    await logAction({ userId: null, action: ACTIONS.LOGIN_FAILED, entityType: 'User', details: { username } });
    throw { status: 401, message: 'Invalid username or password' };
  }

  // 2. Compare the supplied password against the stored bcrypt hash
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    // Wrong password — same generic message
    await logAction({ userId: null, action: ACTIONS.LOGIN_FAILED, entityType: 'User', details: { username } });
    throw { status: 401, message: 'Invalid username or password' };
  }

  // 3. Generate a JWT containing the user's identity and role
  // The token payload is NOT encrypted — anyone can decode it.
  // But the signature ensures it hasn't been tampered with.
  const tokenPayload = { id: user.id, username: user.username, role: user.role };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  // 4. Log the successful login
  await logAction({ userId: user.id, action: ACTIONS.LOGIN_SUCCESS, entityType: 'User', entityId: user.id });

  // 5. Return the token and a safe user object (never include password_hash)
  return {
    token,
    user: { id: user.id, username: user.username, role: user.role }
  };
}

/**
 * Creates a new user with validated input.
 *
 * @param {Object} data - { username, password, role }
 * @param {number|null} actorId - the user ID creating the new user (null if system/CLI)
 * @returns {Promise<{ id, username, role, created_at }>}
 */
async function createUser({ username, password, role }, actorId = null) {
  const errors = [];

  // Validate username length
  if (!username || username.length < 3) {
    errors.push('username must be at least 3 characters');
  }

  // Validate password length
  if (!password || password.length < 8) {
    errors.push('password must be at least 8 characters');
  }

  // Validate role against allowed ENUM values
  const validRoles = ['analyst', 'supervisor', 'admin'];
  if (!validRoles.includes(role)) {
    errors.push(`role must be one of: ${validRoles.join(', ')}`);
  }

  if (errors.length > 0) {
    throw { status: 400, message: 'Validation failed', details: errors };
  }

  // Check for duplicate username
  const existing = await User.findOne({ where: { username } });
  if (existing) {
    throw { status: 409, message: 'Username already exists' };
  }

  // Hash the password before storing (never store plaintext passwords)
  const password_hash = await hashPassword(password);

  const user = await User.create({ username, password_hash, role });

  // Log the action
  await logAction({ 
    userId: actorId, 
    action: ACTIONS.USER_CREATED, 
    entityType: 'User', 
    entityId: user.id, 
    details: { role: user.role } 
  });

  // Return safe user object (never return password_hash)
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

module.exports = { login, hashPassword, createUser };

