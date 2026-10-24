/**
 * bootstrapDemo.js — Auto-seeds demo data at server startup for hosted demos.
 *
 * This module is called after the database syncs in index.js. It seeds
 * demo data ONLY when all three conditions are met:
 *   1. ALLOW_DEMO_SEED === 'true'
 *   2. The users table is empty (first run or database was reset)
 *   3. SEED_PASSWORD is set and at least 12 characters long
 *
 * Unlike the CLI seed script (db/seed.js), this never drops tables — it only
 * inserts data into an empty database. It reuses the same data-generation
 * logic extracted from seed.js via seedDatabase().
 *
 * Security: The password value is never logged.
 */

const { User } = require('../models');
const { seedDatabase } = require('./seed');

/**
 * Conditionally seeds demo data at startup for hosted deployments.
 * Returns an object describing what happened, for testability.
 *
 * @returns {Promise<{ seeded: boolean, reason?: string }>}
 */
async function bootstrapDemo() {
  // Condition 1: ALLOW_DEMO_SEED must be explicitly 'true'
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    return { seeded: false, reason: 'ALLOW_DEMO_SEED is not true' };
  }

  // Condition 2: SEED_PASSWORD must be present and at least 12 characters
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    const msg = !seedPassword
      ? 'SEED_PASSWORD is not set'
      : `SEED_PASSWORD must be at least 12 characters (currently ${seedPassword.length})`;
    console.warn(`⚠️  Demo bootstrap skipped: ${msg}`);
    return { seeded: false, reason: msg };
  }

  // Condition 3: Users table must be empty (first run / reset database)
  const userCount = await User.count();
  if (userCount > 0) {
    return { seeded: false, reason: 'Users already exist' };
  }

  // All conditions met — seed the demo data
  console.log('🌱 Demo bootstrap: seeding demo data into empty database...');
  await seedDatabase({ password: seedPassword });
  console.log('✅ Demo bootstrap complete.');

  return { seeded: true };
}

module.exports = { bootstrapDemo };
