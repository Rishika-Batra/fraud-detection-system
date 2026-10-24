/**
 * validateEnv.js — Production environment validation utilities.
 *
 * Exports a testable function that checks whether required environment
 * variables are set correctly before the server starts in production mode.
 * Called from index.js only inside the `require.main === module` guard,
 * so tests that import the app are never affected.
 */

/**
 * Validates that JWT_SECRET meets production security requirements.
 * @param {string|undefined} secret - The JWT_SECRET value to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateJwtSecret(secret) {
  if (!secret) {
    return { valid: false, error: 'JWT_SECRET is required in production. Set a strong random string (≥ 32 characters).' };
  }
  if (secret.length < 32) {
    return {
      valid: false,
      error: `JWT_SECRET must be at least 32 characters long (currently ${secret.length}). Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
    };
  }
  return { valid: true };
}

module.exports = { validateJwtSecret };
