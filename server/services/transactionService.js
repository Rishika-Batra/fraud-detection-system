/**
 * transactionService.js
 * Contains the core business logic for processing and ingesting transactions.
 * Orchestrates validation, risk scoring (delegated to scoringEngine), and database persistence.
 */

const { Transaction } = require('../models');
const { validateTransaction } = require('./transactionValidator');
const { scoreTransaction } = require('./scoringEngine');

/**
 * Ingests a single transaction or an array of transactions.
 * @param {Object|Array} payload - The raw incoming transaction data.
 * @returns {Object} An object detailing the success/failure of the ingest operation.
 */
async function ingestTransactions(payload) {
  const isArray = Array.isArray(payload);
  const items = isArray ? payload : [payload];

  // Limit array size to 500 items to prevent server overload / abuse
  if (items.length > 500) {
    throw { status: 400, message: "Payload exceeds maximum limit of 500 transactions" };
  }

  if (items.length === 0) {
    throw { status: 400, message: "Payload cannot be empty" };
  }

  const validItemsToSave = [];
  const rejectedItems = [];

  for (let i = 0; i < items.length; i++) {
    const rawTx = items[i];

    // Strip client-supplied risk scores to prevent tampering.
    // The server must control all risk metrics.
    const sanitizedTx = {
      account_id: rawTx.account_id,
      amount: rawTx.amount,
      currency: rawTx.currency,
      merchant: rawTx.merchant,
      transaction_type: rawTx.transaction_type,
      region: rawTx.region,
      timestamp: rawTx.timestamp
    };

    // 1. Run validation
    const errors = validateTransaction(sanitizedTx);
    
    if (errors.length > 0) {
      rejectedItems.push({ index: i, errors, data: rawTx });
      continue;
    }

    // 2. Call the scoring engine to evaluate risk
    const riskResult = scoreTransaction(sanitizedTx);
    
    // Attach the server-calculated risk fields
    sanitizedTx.risk_score = riskResult.score;
    sanitizedTx.risk_level = riskResult.level;
    sanitizedTx.risk_factors = JSON.stringify(riskResult.factors);
    
    validItemsToSave.push(sanitizedTx);
  }

  // --- Formatting the response based on single vs array payload ---

  if (!isArray) {
    if (rejectedItems.length > 0) {
      // Single transaction failed validation (Returns 400 behavior)
      throw { status: 400, message: "Validation failed", details: rejectedItems[0].errors };
    }
    
    // Single transaction passed, save it
    const saved = await Transaction.create(validItemsToSave[0]);
    return { isArray: false, saved };
  }

  // Array behavior
  if (validItemsToSave.length === 0) {
    // All transactions in the array failed validation (Returns 400 behavior)
    throw { status: 400, message: "All transactions failed validation", details: rejectedItems };
  }

  // Save the valid ones using bulkCreate for efficiency (Returns 201 behavior)
  const saved = await Transaction.bulkCreate(validItemsToSave);
  return { isArray: true, saved, rejected: rejectedItems };
}

module.exports = { ingestTransactions };
