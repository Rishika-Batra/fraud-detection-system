/**
 * scoringEngine.js
 * Placeholder for the rule-based risk scoring logic.
 * Currently returns a default low-risk score for all transactions.
 * The actual rule engine will be implemented in the next step.
 */

function scoreTransaction(transaction) {
  // Placeholder return format for risk evaluation
  return {
    score: 0,
    level: 'low',
    factors: [] // Array of rule violation descriptions (if any)
  };
}

module.exports = { scoreTransaction };
