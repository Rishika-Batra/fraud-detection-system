/**
 * scoringEngine.js
 * Evaluates the risk of a transaction using a configurable rule-based engine.
 * Supports a pluggable architecture, allowing the default rule-based scorer
 * to be replaced by an ML model in the future without changing the caller code.
 */

const { RULES } = require('./scoringRules');
const config = require('../config/scoringConfig');

/**
 * Maps a numerical score to a risk level category.
 */
function getRiskLevel(score) {
  if (score <= config.LEVELS.low.max) return 'low';
  if (score <= config.LEVELS.medium.max) return 'medium';
  return 'high';
}

/**
 * The default rule-based scoring engine.
 * Iterates through all rules, sums up points (capped at 100), and records reasons.
 */
function defaultScorer(transaction, context) {
  let totalScore = 0;
  const factors = [];

  for (const rule of RULES) {
    try {
      const result = rule(transaction, context);
      if (result) {
        totalScore += result.points;
        factors.push(result.reason);
      }
    } catch (error) {
      // If a rule throws, log it and skip to the next one to avoid crashing the whole engine.
      console.warn(`Rule execution failed: ${error.message}`, error);
    }
  }

  // Cap the maximum score at 100
  const finalScore = Math.min(totalScore, 100);

  return {
    score: finalScore,
    level: getRiskLevel(finalScore),
    factors: factors
  };
}

// Current active scorer. By default, it's our rule-based engine.
let activeScorer = defaultScorer;

/**
 * Evaluates a transaction's risk. Delegates to the currently active scorer.
 */
function scoreTransaction(transaction, context) {
  return activeScorer(transaction, context);
}

/**
 * Pluggable architecture support: 
 * Allows swapping the default rule-based engine with an alternative (e.g., an ML model)
 * seamlessly during initialization, without needing to change transactionService logic.
 */
function setScorer(fn) {
  activeScorer = fn;
}

module.exports = { scoreTransaction, setScorer };
