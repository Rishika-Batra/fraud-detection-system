require('dotenv').config();
const { sequelize, User, Transaction, Case, CaseNote } = require('../models');
const { hashPassword } = require('../services/authService');

async function seedDB() {
  try {
    await sequelize.authenticate();
    console.log('Connected to SQLite database.');
    await sequelize.sync({ alter: true });

    // 1. Seed Demo Users
    const demoUsers = [
      { username: 'analyst', password: 'password123', role: 'analyst' },
      { username: 'supervisor', password: 'password123', role: 'supervisor' },
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'Rishika', password: 'password123', role: 'supervisor' },
      { username: 'rishika', password: 'password123', role: 'supervisor' },
    ];

    for (const u of demoUsers) {
      const existing = await User.findOne({ where: { username: u.username } });
      if (!existing) {
        const password_hash = await hashPassword(u.password);
        const created = await User.create({
          username: u.username,
          password_hash,
          role: u.role
        });
        console.log(`Created demo user: ${created.username} (${created.role})`);
      } else {
        console.log(`User ${u.username} already exists.`);
      }
    }

    // 2. Seed Initial Transactions & Cases if empty
    const txCount = await Transaction.count();
    if (txCount === 0) {
      console.log('Seeding initial sample transactions...');
      const analystUser = await User.findOne({ where: { role: 'analyst' } });

      const tx1 = await Transaction.create({
        account_id: 'ACC-88392',
        amount: 48500.00,
        currency: 'INR',
        merchant: 'CryptoX Exchange',
        transaction_type: 'transfer',
        region: 'IN-WEST',
        risk_score: 88,
        risk_level: 'high',
        risk_factors: JSON.stringify(['High amount for account profile', 'Unusual location region']),
        is_flagged: true
      });

      const tx2 = await Transaction.create({
        account_id: 'ACC-44910',
        amount: 1240.50,
        currency: 'INR',
        merchant: 'TechGear Store',
        transaction_type: 'purchase',
        region: 'IN-NORTH',
        risk_score: 22,
        risk_level: 'low',
        risk_factors: JSON.stringify([]),
        is_flagged: false
      });

      const tx3 = await Transaction.create({
        account_id: 'ACC-12093',
        amount: 75200.00,
        currency: 'INR',
        merchant: 'Luxury Watches Ltd',
        transaction_type: 'purchase',
        region: 'IN-WEST',
        risk_score: 92,
        risk_level: 'high',
        risk_factors: JSON.stringify(['High amount purchase', 'First time merchant']),
        is_flagged: true
      });

      // Seed cases for flagged transactions
      const case1 = await Case.create({
        transaction_id: tx1.id,
        assigned_to: analystUser ? analystUser.id : null,
        status: 'investigating'
      });

      await CaseNote.create({
        case_id: case1.id,
        user_id: analystUser ? analystUser.id : 1,
        note: 'Automated rule engine flagged high velocity crypto transfer. Initiated cardholder contact.'
      });

      const case2 = await Case.create({
        transaction_id: tx3.id,
        assigned_to: null,
        status: 'flagged'
      });

      console.log('Sample transactions and cases seeded successfully.');
    }

    console.log('Database initialization & seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
}

seedDB();
