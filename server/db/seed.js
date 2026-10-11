#!/usr/bin/env node

/**
 * seed.js — Fills the database with realistic demo data for the Fraud Detection Dashboard.
 *
 * VIVA NOTES:
 * 1. Why a seeded random generator (mulberry32)?
 *    A seeded PRNG produces the exact same sequence of "random" numbers every time it's
 *    called with the same seed. This means every `npm run seed` generates identical data,
 *    which is essential for:
 *    - Repeatable demos (the dashboard always looks the same)
 *    - Reproducible tests (assertions can rely on specific values)
 *    - Debugging (you can re-run the seeder and get the same bug)
 *
 * 2. Why refuse to run in production?
 *    The seeder drops ALL tables (sequelize.sync({ force: true })) to start from scratch.
 *    Running this in production would destroy real data — customer transactions, active
 *    investigations, audit trails — causing irreversible data loss.
 *    The NODE_ENV check is a safety net against accidental execution.
 *
 * Usage:
 *   npm run seed             # Dry run: shows what would happen, changes nothing
 *   npm run seed -- --yes    # Actually seeds the database
 *   SEED_PASSWORD=MyPass123 npm run seed -- --yes   # Use a specific password
 *   SEED_RANDOM=42 npm run seed -- --yes            # Override the random seed
 *   SEED_ANCHOR_DATE=2026-10-10T00:00:00Z npm run seed -- --yes # Override anchor date
 */

require('dotenv').config();

// ─────────────────────────────────────────────────────────
// SAFETY: Block production execution
// ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌ FATAL: Seed script refuses to run when NODE_ENV=production.');
  console.error('   This script drops and recreates ALL tables. Never run it against live data.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// SAFETY: Require --yes flag for destructive action
// ─────────────────────────────────────────────────────────
const confirmed = process.argv.includes('--yes');
if (!confirmed) {
  console.log('🔍 DRY RUN — showing what the seeder would do:\n');
  console.log('  • Drop and recreate ALL tables (sequelize.sync({ force: true }))');
  console.log('  • Create 6 users (1 admin, 3 analysts, 2 supervisors)');
  console.log('  • Generate ~300 transactions over the last 30 days');
  console.log('  • Score each transaction with the real scoring engine');
  console.log('  • Create ~25 cases with realistic status progression');
  console.log('  • Write audit log entries for all seeded actions\n');
  console.log('⚠️  This will DELETE all existing data.');
  console.log('   To proceed, run: npm run seed -- --yes');
  console.log('   To set a password: SEED_PASSWORD=MyPass123 npm run seed -- --yes');
  process.exit(0);
}

// ─────────────────────────────────────────────────────────
// Imports — reuse existing app code, not raw SQL
// ─────────────────────────────────────────────────────────
const { sequelize, User, Transaction, Case, CaseNote, AuditLog } = require('../models');
const { hashPassword } = require('../services/authService');
const { scoreTransaction } = require('../services/scoringEngine');
const { ACTIONS } = require('../services/auditLogger');

// ─────────────────────────────────────────────────────────
// Deterministic PRNG: mulberry32
// A tiny 32-bit seeded random number generator.
// Given the same seed, it always produces the same sequence.
// This makes the demo data identical across runs.
// ─────────────────────────────────────────────────────────
function mulberry32(seed) {
  let t = seed >>> 0; // ensure unsigned 32-bit integer
  return function () {
    t = (t + 0x6D2B79F5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296; // returns 0.0 – 1.0
  };
}

const RANDOM_SEED = Number(process.env.SEED_RANDOM) || 12345;
const rand = mulberry32(RANDOM_SEED);

// Helper: pick a random element from an array using the seeded PRNG
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
// Helper: random integer in [min, max] inclusive
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
// Helper: random float in [min, max)
function randFloat(min, max) { return rand() * (max - min) + min; }

// ─────────────────────────────────────────────────────────
// Time Anchor Calculation
// ─────────────────────────────────────────────────────────
let anchor;
if (process.env.SEED_ANCHOR_DATE) {
  anchor = new Date(process.env.SEED_ANCHOR_DATE);
} else {
  anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0); // Default to today 00:00 UTC
}

const realNow = new Date();
const timeOfDayOffset = realNow.getTime() - new Date(realNow.getTime()).setUTCHours(0, 0, 0, 0);
// Max time allowed is the anchor + current time of day, OR the actual current time.
const maxAllowedTime = Math.min(realNow.getTime(), anchor.getTime() + timeOfDayOffset);

// ─────────────────────────────────────────────────────────
// Constants for data generation
// ─────────────────────────────────────────────────────────
const REGIONS = ['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
const TX_TYPES = ['purchase', 'transfer', 'withdrawal', 'deposit'];

// Merchants mapped by transaction type for realism
const MERCHANTS = {
  purchase: ['Amazon', 'Flipkart', 'Swiggy', 'BigBasket', 'Myntra', 'DMart', 'Croma', 'Uber'],
  transfer: ['NEFT Transfer', 'IMPS Transfer', 'UPI Transfer', 'Wire Transfer', 'CryptoExchange'],
  withdrawal: ['ATM SBI', 'ATM HDFC', 'ATM ICICI', 'ATM Axis', 'ATM PNB'],
  deposit: ['Salary Credit', 'NEFT Deposit', 'Cash Deposit', 'Refund Credit', 'Interest Credit']
};

// Plausible case notes for variety
const CASE_NOTES = [
  'Customer confirmed the transaction by phone.',
  'Called customer — no answer, left voicemail.',
  'Customer denies making this transaction.',
  'Transaction pattern matches known fraud ring.',
  'Merchant verification completed — legitimate business.',
  'Customer provided OTP confirmation screenshot.',
  'Bank statement cross-referenced — no anomalies.',
  'Escalating due to multiple flagged transactions on same account.',
  'Customer requested account freeze pending investigation.',
  'Reviewed CCTV footage from ATM — cardholder identified.',
  'Similar pattern detected in 3 other accounts.',
  'Customer travelled to the region recently — confirmed via ticket.',
  'Waiting for merchant to respond to chargeback request.',
  'Internal review completed — false positive.',
  'Customer filed police report, reference number noted.'
];

const EVIDENCE_REFS = [
  'call-recording-001.mp3', 'call-recording-002.mp3', 'call-recording-003.mp3',
  'screenshot-otp-verify.png', 'email-thread-merchant.pdf',
  'atm-cctv-clip-04.mp4', 'bank-statement-oct.pdf',
  'police-report-FIR-2026.pdf', 'customer-id-scan.jpg',
  null, null, null, null // Some notes have no evidence
];

// ─────────────────────────────────────────────────────────
// Generate ~40 account IDs
// ─────────────────────────────────────────────────────────
const NUM_ACCOUNTS = 40;
const ACCOUNT_IDS = Array.from({ length: NUM_ACCOUNTS }, (_, i) => `ACC${1001 + i}`);

// ─────────────────────────────────────────────────────────
// Generate transaction data
// ─────────────────────────────────────────────────────────
function generateTransactions() {
  const thirtyDaysAgo = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
  const transactions = [];

  // ~270 normal transactions
  for (let i = 0; i < 270; i++) {
    const account = pick(ACCOUNT_IDS);
    const type = pick(TX_TYPES);
    const region = pick(REGIONS);
    const merchant = pick(MERCHANTS[type]);

    // Amount distribution: mostly small, some medium, rare large
    let amount;
    const r = rand();
    if (r < 0.65) {
      // 65% small: 100 – 20,000
      amount = Math.round(randFloat(100, 20000) * 100) / 100;
    } else if (r < 0.90) {
      // 25% medium: 20,000 – 50,000
      amount = Math.round(randFloat(20000, 50000) * 100) / 100;
    } else {
      // 10% large: 50,000 – 400,000
      amount = Math.round(randFloat(50000, 400000) * 100) / 100;
    }

    // Time distribution: mostly 8AM–10PM, with ~8% in odd hours (1-5 AM UTC)
    const dayOffset = randFloat(0, 30); // days ago
    const timestamp = new Date(thirtyDaysAgo.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const rHour = rand();
    if (rHour < 0.08) {
      // Odd hours: 1–5 AM UTC
      timestamp.setUTCHours(randInt(1, 5), randInt(0, 59), randInt(0, 59), 0);
    } else {
      // Normal hours: 8 AM – 10 PM UTC
      timestamp.setUTCHours(randInt(8, 22), randInt(0, 59), randInt(0, 59), 0);
    }

    timestamp.setTime(Math.min(timestamp.getTime(), maxAllowedTime));
    transactions.push({ account_id: account, amount, currency: 'INR', merchant, transaction_type: type, region, timestamp });
  }

  // ~30 deliberately suspicious transactions (~10% of total)
  // Pattern A: Velocity burst — 5+ transactions from one account in 10 minutes
  for (let burst = 0; burst < 3; burst++) {
    const account = ACCOUNT_IDS[burst]; // Use first few accounts for bursts
    const baseTime = new Date(thirtyDaysAgo.getTime() + randFloat(5, 25) * 24 * 60 * 60 * 1000);
    baseTime.setUTCHours(randInt(10, 18), randInt(0, 59), 0, 0);
    baseTime.setTime(Math.min(baseTime.getTime(), maxAllowedTime - 120 * 6 * 1000)); // Ensure room for burst

    for (let j = 0; j < 6; j++) {
      const ts = new Date(baseTime.getTime() + j * randInt(30, 120) * 1000); // 30s–2min apart
      ts.setTime(Math.min(ts.getTime(), maxAllowedTime));
      
      transactions.push({
        account_id: account,
        amount: Math.round(randFloat(500, 5000) * 100) / 100,
        currency: 'INR',
        merchant: pick(MERCHANTS.purchase),
        transaction_type: 'purchase',
        region: pick(REGIONS),
        timestamp: ts
      });
    }
  }

  // Pattern B: Region change — account transacts in two different regions within an hour
  for (let rc = 0; rc < 4; rc++) {
    const account = ACCOUNT_IDS[NUM_ACCOUNTS - 1 - rc]; // Use last few accounts
    const baseTime = new Date(thirtyDaysAgo.getTime() + randFloat(3, 28) * 24 * 60 * 60 * 1000);
    baseTime.setUTCHours(randInt(9, 20), randInt(0, 30), 0, 0);
    baseTime.setTime(Math.min(baseTime.getTime(), maxAllowedTime - 40 * 60 * 1000)); // Ensure room for second tx

    const region1 = REGIONS[rc % REGIONS.length];
    const region2 = REGIONS[(rc + 3) % REGIONS.length]; // A different region

    transactions.push({
      account_id: account, amount: Math.round(randFloat(1000, 15000) * 100) / 100,
      currency: 'INR', merchant: pick(MERCHANTS.purchase), transaction_type: 'purchase',
      region: region1, timestamp: new Date(baseTime)
    });
    
    const ts2 = new Date(baseTime.getTime() + randInt(5, 40) * 60 * 1000); // 5–40 min later
    ts2.setTime(Math.min(ts2.getTime(), maxAllowedTime));
    
    transactions.push({
      account_id: account, amount: Math.round(randFloat(2000, 25000) * 100) / 100,
      currency: 'INR', merchant: pick(MERCHANTS.purchase), transaction_type: 'purchase',
      region: region2, timestamp: ts2
    });
  }

  // Pattern C: Large round-number transfers at night
  for (let ln = 0; ln < 5; ln++) {
    const account = pick(ACCOUNT_IDS);
    const baseTime = new Date(thirtyDaysAgo.getTime() + randFloat(2, 29) * 24 * 60 * 60 * 1000);
    baseTime.setUTCHours(randInt(1, 4), randInt(0, 59), 0, 0);
    baseTime.setTime(Math.min(baseTime.getTime(), maxAllowedTime));

    const roundAmounts = [50000, 100000, 150000, 200000, 300000, 400000];
    transactions.push({
      account_id: account,
      amount: pick(roundAmounts),
      currency: 'INR',
      merchant: pick(MERCHANTS.transfer),
      transaction_type: 'transfer',
      region: pick(REGIONS),
      timestamp: baseTime
    });
  }

  // Sort chronologically — the scoring engine needs earlier transactions as context
  transactions.sort((a, b) => a.timestamp - b.timestamp);

  return transactions;
}

// ─────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Seeding database...\n');

  // ── Step 1: Drop and recreate ALL tables ──
  // We use force: true which DROPs every table and recreates it from the model definitions.
  // This is necessary because the AuditLog model has beforeDestroy/beforeUpdate hooks
  // that throw errors, making it impossible to delete rows through the ORM.
  // force: true bypasses the hooks entirely by issuing DROP TABLE at the SQL level.
  console.log('  ⏳ Dropping and recreating all tables (sequelize.sync force)...');
  await sequelize.sync({ force: true });
  console.log('  ✅ Tables recreated.\n');

  // ── Step 2: Create users ──
  // Read password from env or generate a secure random one.
  // We never store the password in the repo — it's either provided at runtime or printed once.
  const demoPassword = process.env.SEED_PASSWORD || require('crypto').randomBytes(12).toString('base64url');
  const passwordGenerated = !process.env.SEED_PASSWORD;

  const usersData = [
    { username: 'admin',       role: 'admin' },
    { username: 'analyst1',    role: 'analyst' },
    { username: 'analyst2',    role: 'analyst' },
    { username: 'analyst3',    role: 'analyst' },
    { username: 'supervisor1', role: 'supervisor' },
    { username: 'supervisor2', role: 'supervisor' }
  ];

  console.log('  ⏳ Creating users...');
  const users = {};
  for (const u of usersData) {
    const password_hash = await hashPassword(demoPassword);
    const user = await User.scope('withPassword').create({ username: u.username, password_hash, role: u.role });
    users[u.username] = user;
    // Never log the hash — only the username and role
    console.log(`     👤 ${u.username} (${u.role})`);
  }
  console.log(`  ✅ ${usersData.length} users created.\n`);

  // ── Step 3: Generate and insert transactions ──
  // We insert in chronological order so that the scoring engine can look up
  // "recent transactions" for each account and produce consistent risk scores.
  console.log('  ⏳ Generating and scoring ~300 transactions...');
  const txData = generateTransactions();

  // In-memory index of saved transactions by account, for building scoring context
  const savedByAccount = {}; // { accountId: [Transaction, ...] }
  const allSaved = [];

  for (const raw of txData) {
    // Build context: the account's transactions from the last 60 minutes,
    // exactly as the ingestion service does in transactionService.js
    const txTime = new Date(raw.timestamp).getTime();
    const windowStart = txTime - 60 * 60 * 1000;
    const recentTransactions = (savedByAccount[raw.account_id] || []).filter(tx => {
      const t = new Date(tx.timestamp).getTime();
      return t >= windowStart && t <= txTime;
    });

    // Score using the real engine — same rules, same config
    const { score, level, factors } = scoreTransaction(raw, { recentTransactions });

    const saved = await Transaction.create({
      account_id: raw.account_id,
      amount: raw.amount,
      currency: raw.currency,
      merchant: raw.merchant,
      transaction_type: raw.transaction_type,
      region: raw.region,
      timestamp: raw.timestamp,
      risk_score: score,
      risk_level: level,
      risk_factors: JSON.stringify(factors),
      is_flagged: false
    });

    // Track for future context lookups
    if (!savedByAccount[raw.account_id]) savedByAccount[raw.account_id] = [];
    savedByAccount[raw.account_id].push(saved);
    allSaved.push(saved);
  }

  // Count risk levels for summary
  const riskCounts = { low: 0, medium: 0, high: 0 };
  allSaved.forEach(tx => { riskCounts[tx.risk_level] = (riskCounts[tx.risk_level] || 0) + 1; });
  console.log(`  ✅ ${allSaved.length} transactions created.`);
  console.log(`     Risk: low=${riskCounts.low}, medium=${riskCounts.medium}, high=${riskCounts.high}\n`);

  // ── Step 4: Create cases for the highest-risk transactions ──
  // Sort by risk_score descending, pick the top ~25
  console.log('  ⏳ Creating cases for highest-risk transactions...');
  const topRisky = [...allSaved]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 25);

  const analysts = [users.analyst1, users.analyst2, users.analyst3];
  const supervisors = [users.supervisor1, users.supervisor2];
  const caseCounts = { flagged: 0, investigating: 0, resolved: 0, escalated: 0, closed: 0 };

  for (let i = 0; i < topRisky.length; i++) {
    const tx = topRisky[i];

    // Flag the transaction
    tx.is_flagged = true;
    await tx.save();

    const caseCreatedAt = new Date(new Date(tx.timestamp).getTime() + randInt(60, 600) * 1000); // 1–10 min after tx
    caseCreatedAt.setTime(Math.min(caseCreatedAt.getTime(), maxAllowedTime));

    // Create the case in flagged status
    const caseObj = await Case.create({
      transaction_id: tx.id,
      status: 'flagged',
      created_at: caseCreatedAt,
      updated_at: caseCreatedAt
    });

    // Audit: flag + case creation
    await AuditLog.create({
      user_id: pick(analysts).id,
      action: ACTIONS.TRANSACTION_FLAGGED,
      entity_type: 'Transaction',
      entity_id: tx.id,
      timestamp: caseCreatedAt
    });
    await AuditLog.create({
      user_id: pick(analysts).id,
      action: ACTIONS.CASE_CREATED,
      entity_type: 'Case',
      entity_id: caseObj.id,
      timestamp: caseCreatedAt
    });

    // Decide how far to progress this case through the workflow.
    // Distribution: ~4 flagged, ~5 investigating, ~5 escalated, ~5 resolved, ~6 closed
    let targetStatus;
    if (i < 4) targetStatus = 'flagged';
    else if (i < 9) targetStatus = 'investigating';
    else if (i < 14) targetStatus = 'escalated';
    else if (i < 19) targetStatus = 'resolved';
    else targetStatus = 'closed';

    const assignedAnalyst = analysts[i % analysts.length];
    let currentTime = new Date(caseCreatedAt.getTime() + randInt(1800, 7200) * 1000); // 30 min – 2 hr later

    // Walk through valid transitions: flagged → investigating → resolved|escalated → closed
    if (targetStatus !== 'flagged') {
      // Move to investigating
      currentTime.setTime(Math.min(currentTime.getTime(), maxAllowedTime));
      caseObj.status = 'investigating';
      caseObj.assigned_to = assignedAnalyst.id;
      caseObj.updated_at = currentTime;
      await caseObj.save();

      await AuditLog.create({
        user_id: assignedAnalyst.id,
        action: ACTIONS.CASE_STATUS_CHANGED,
        entity_type: 'Case',
        entity_id: caseObj.id,
        details: JSON.stringify({ from: 'flagged', to: 'investigating' }),
        timestamp: currentTime
      });
    }

    if (targetStatus === 'escalated' || targetStatus === 'closed') {
      // Move to escalated
      currentTime = new Date(currentTime.getTime() + randInt(3600, 86400) * 1000); // 1 hr – 1 day later
      currentTime.setTime(Math.min(currentTime.getTime(), maxAllowedTime));
      caseObj.status = 'escalated';
      caseObj.updated_at = currentTime;
      await caseObj.save();

      await AuditLog.create({
        user_id: assignedAnalyst.id,
        action: ACTIONS.CASE_STATUS_CHANGED,
        entity_type: 'Case',
        entity_id: caseObj.id,
        details: JSON.stringify({ from: 'investigating', to: 'escalated' }),
        timestamp: currentTime
      });
    }

    if (targetStatus === 'resolved') {
      // Move to resolved (from investigating)
      currentTime = new Date(currentTime.getTime() + randInt(3600, 172800) * 1000); // 1 hr – 2 days
      currentTime.setTime(Math.min(currentTime.getTime(), maxAllowedTime));
      caseObj.status = 'resolved';
      caseObj.updated_at = currentTime;
      await caseObj.save();

      await AuditLog.create({
        user_id: assignedAnalyst.id,
        action: ACTIONS.CASE_STATUS_CHANGED,
        entity_type: 'Case',
        entity_id: caseObj.id,
        details: JSON.stringify({ from: 'investigating', to: 'resolved' }),
        timestamp: currentTime
      });
    }

    if (targetStatus === 'closed') {
      // For closed: escalated → closed (supervisor closes it)
      currentTime = new Date(currentTime.getTime() + randInt(7200, 172800) * 1000);
      currentTime.setTime(Math.min(currentTime.getTime(), maxAllowedTime));
      const closingSupervisor = pick(supervisors);
      caseObj.status = 'closed';
      caseObj.closed_at = currentTime;
      caseObj.updated_at = currentTime;
      await caseObj.save();

      await AuditLog.create({
        user_id: closingSupervisor.id,
        action: ACTIONS.CASE_STATUS_CHANGED,
        entity_type: 'Case',
        entity_id: caseObj.id,
        details: JSON.stringify({ from: 'escalated', to: 'closed' }),
        timestamp: currentTime
      });
    }

    caseCounts[caseObj.status]++;

    // ── Step 4b: Add notes to ~half the non-flagged cases ──
    if (targetStatus !== 'flagged' && rand() < 0.55) {
      const numNotes = randInt(1, 3);
      let noteTime = new Date(caseCreatedAt.getTime() + randInt(600, 3600) * 1000);

      for (let n = 0; n < numNotes; n++) {
        noteTime.setTime(Math.min(noteTime.getTime(), maxAllowedTime));
        const noteAuthor = pick(analysts);

        const note = await CaseNote.create({
          case_id: caseObj.id,
          user_id: noteAuthor.id,
          note: pick(CASE_NOTES),
          evidence_reference: pick(EVIDENCE_REFS),
          created_at: noteTime
        });

        await AuditLog.create({
          user_id: noteAuthor.id,
          action: ACTIONS.CASE_NOTE_ADDED,
          entity_type: 'Case',
          entity_id: caseObj.id,
          details: JSON.stringify({ note_id: note.id }),
          timestamp: noteTime
        });

        noteTime = new Date(noteTime.getTime() + randInt(1800, 14400) * 1000); // 30 min – 4 hr between notes
      }
    }
  }

  console.log(`  ✅ ${topRisky.length} cases created.`);
  console.log(`     Status: flagged=${caseCounts.flagged}, investigating=${caseCounts.investigating}, escalated=${caseCounts.escalated}, resolved=${caseCounts.resolved}, closed=${caseCounts.closed}\n`);

  // ── Step 5: Print summary ──
  const auditCount = await AuditLog.count();

  console.log('══════════════════════════════════════════');
  console.log('        🎉 Seed Complete — Summary');
  console.log('══════════════════════════════════════════');
  console.log(`  Seed Used:     ${RANDOM_SEED}`);
  console.log(`  Anchor Date:   ${anchor.toISOString()}`);
  console.log('──────────────────────────────────────────');
  console.log(`  Users:         ${usersData.length}`);
  console.log(`  Transactions:  ${allSaved.length}  (low: ${riskCounts.low}, medium: ${riskCounts.medium}, high: ${riskCounts.high})`);
  console.log(`  Cases:         ${topRisky.length}  (flagged: ${caseCounts.flagged}, investigating: ${caseCounts.investigating}, escalated: ${caseCounts.escalated}, resolved: ${caseCounts.resolved}, closed: ${caseCounts.closed})`);
  console.log(`  Audit entries: ${auditCount}`);
  console.log('──────────────────────────────────────────');
  console.log('  Demo accounts:');
  for (const u of usersData) {
    console.log(`    ${u.username.padEnd(14)} (${u.role})`);
  }
  if (passwordGenerated) {
    console.log(`\n  🔑 Generated password: ${demoPassword}`);
    console.log('     (This is printed once and never stored. Set SEED_PASSWORD to choose your own.)');
  } else {
    console.log(`\n  🔑 Password: (from SEED_PASSWORD env variable)`);
  }
  console.log('\n  Login:');
  console.log('    curl -X POST http://localhost:5001/api/auth/login \\');
  console.log('      -H "Content-Type: application/json" \\');
  console.log(`      -d '{"username":"admin","password":"<password>"}'`);
  console.log('══════════════════════════════════════════\n');
}

// ─────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────
seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  });
