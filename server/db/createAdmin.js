/**
 * createAdmin.js
 * CLI script to create the first admin user.
 * Usage: node db/createAdmin.js <username> <password>
 *
 * This is needed because admin creation is itself an admin-only action in the API,
 * so the very first admin must be bootstrapped from the command line.
 */

require('dotenv').config();
const { sequelize, User } = require('../models');
const { hashPassword } = require('../services/authService');

async function createAdmin() {
  const args = process.argv.slice(2); // Strip 'node' and script path

  if (args.length < 2) {
    console.error('Usage: node db/createAdmin.js <username> <password>');
    process.exit(1);
  }

  const [username, password] = args;

  // Validate password length
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    process.exit(1);
  }

  try {
    // Sync database (creates tables if they don't exist yet)
    await sequelize.sync();

    // Check for duplicate username
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      console.error(`Error: User "${username}" already exists.`);
      process.exit(1);
    }

    // Hash password and create admin user (never store plaintext passwords)
    const password_hash = await hashPassword(password);
    const user = await User.create({ username, password_hash, role: 'admin' });

    console.log(`Admin user created successfully: { id: ${user.id}, username: "${user.username}", role: "${user.role}" }`);
  } catch (error) {
    console.error('Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createAdmin();
