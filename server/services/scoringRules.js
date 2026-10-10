/**
 * scoringRules.js
 * Contains small, pure functions for evaluating risk factors.
 * Each rule evaluates a transaction and its context, returning points and a reason if triggered.
 */

const config = require('../config/scoringConfig');

// 1. High amount rule: Flags transactions with unusually large amounts.
const ruleHighAmount = (transaction, context) => {
  if (transaction.amount >= config.VERY_HIGH_AMOUNT) {
    return { points: 35, reason: `Amount exceeds very high threshold (${config.VERY_HIGH_AMOUNT})` };
  }
  if (transaction.amount >= config.HIGH_AMOUNT) {
    return { points: 20, reason: `Amount exceeds high threshold (${config.HIGH_AMOUNT})` };
  }
  return null;
};

// 2. Round-number amount rule: Fraudsters sometimes test with round numbers (e.g., 10000).
const ruleRoundNumber = (transaction, context) => {
  if (transaction.amount > 0 && transaction.amount % 10000 === 0) {
    return { points: 10, reason: 'Amount is a round multiple of 10,000' };
  }
  return null;
};

// 3. Odd-hour transaction rule: Flags transactions made during unusual hours (1 AM to 5 AM).
const ruleOddHours = (transaction, context) => {
  const txDate = new Date(transaction.timestamp);
  const hour = txDate.getUTCHours(); // Assuming UTC for consistency
  if (hour >= config.ODD_HOURS.start && hour <= config.ODD_HOURS.end) {
    return { points: 15, reason: `Transaction occurred during odd hours (${config.ODD_HOURS.start}-${config.ODD_HOURS.end} UTC)` };
  }
  return null;
};

// 4. Velocity rule: Too many transactions in a short window indicates potential card testing.
const ruleVelocity = (transaction, context) => {
  if (!context || !context.recentTransactions) return null;
  
  const txTime = new Date(transaction.timestamp).getTime();
  const windowStart = txTime - (config.VELOCITY_WINDOW_MINUTES * 60 * 1000);
  
  const recentCount = context.recentTransactions.filter(tx => {
    const time = new Date(tx.timestamp).getTime();
    return time >= windowStart && time <= txTime;
  }).length;

  if (recentCount >= config.VELOCITY_LIMIT) {
    return { points: 25, reason: `High velocity: ${recentCount} transactions within ${config.VELOCITY_WINDOW_MINUTES} minutes` };
  }
  return null;
};

// 5. Region change rule: Sudden changes in region within a short window suggest account takeover or stolen card.
const ruleRegionChange = (transaction, context) => {
  if (!context || !context.recentTransactions || context.recentTransactions.length === 0) return null;
  
  const txTime = new Date(transaction.timestamp).getTime();
  const windowStart = txTime - (config.REGION_CHANGE_WINDOW_MINUTES * 60 * 1000);
  
  const recentInWindow = context.recentTransactions.filter(tx => {
    const time = new Date(tx.timestamp).getTime();
    return time >= windowStart && time <= txTime;
  });

  // Check if any recent transaction in the window had a different region
  const differentRegionTx = recentInWindow.find(tx => tx.region !== transaction.region);
  
  if (differentRegionTx) {
    return { points: 25, reason: `Region changed from ${differentRegionTx.region} to ${transaction.region} within ${config.REGION_CHANGE_WINDOW_MINUTES} minutes` };
  }
  return null;
};

// 6. Large withdrawal or transfer rule: High risk actions typically involve moving funds out.
const ruleLargeTransfer = (transaction, context) => {
  if (['withdrawal', 'transfer'].includes(transaction.transaction_type) && transaction.amount >= config.HIGH_AMOUNT) {
    return { points: 15, reason: `Large ${transaction.transaction_type} at or above high threshold` };
  }
  return null;
};

const RULES = [
  ruleHighAmount,
  ruleRoundNumber,
  ruleOddHours,
  ruleVelocity,
  ruleRegionChange,
  ruleLargeTransfer
];

module.exports = { RULES };
