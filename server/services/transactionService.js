/**
 * transactionService.js
 * Contains the core business logic for processing and ingesting transactions.
 * Orchestrates validation, risk scoring (delegated to scoringEngine), and database persistence.
 */

const { Transaction } = require('../models');
const { validateTransaction } = require('./transactionValidator');
const { scoreTransaction } = require('./scoringEngine');
const { logAction, ACTIONS } = require('./auditLogger');

/**
 * Ingests a single transaction or an array of transactions.
 * @param {Object|Array} payload - The raw incoming transaction data.
 * @param {number} actorId - The ID of the authenticated user performing this action.
 * @returns {Object} An object detailing the success/failure of the ingest operation.
 */
async function ingestTransactions(payload, actorId) {
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

    // 2. Fetch context (recent transactions for this account)
    // We look back 60 minutes, which is our largest time window (REGION_CHANGE_WINDOW_MINUTES)
    const txTime = new Date(sanitizedTx.timestamp);
    const windowStartMs = txTime.getTime() - (60 * 60 * 1000); 
    const sinceDate = new Date(windowStartMs);
    
    // Fetch context from DB
    const recentTransactions = await Transaction.findRecentByAccount(sanitizedTx.account_id, sinceDate);
    const context = { recentTransactions };

    // 3. Call the scoring engine to evaluate risk
    const riskResult = scoreTransaction(sanitizedTx, context);
    
    // Attach the server-calculated risk fields
    // NOTE: risk_factors will be converted to a string when saving via Sequelize.
    sanitizedTx.risk_score = riskResult.score;
    sanitizedTx.risk_level = riskResult.level;
    sanitizedTx.risk_factors = JSON.stringify(riskResult.factors); 
    
    validItemsToSave.push(sanitizedTx);
  }

  // --- Formatting the response based on single vs array payload ---

  const formatSavedTransaction = (tx) => {
    // When returning, parse the risk_factors back into an array to meet response format requirements
    const formatted = tx.toJSON ? tx.toJSON() : tx;
    if (typeof formatted.risk_factors === 'string') {
      try {
        formatted.risk_factors = JSON.parse(formatted.risk_factors);
      } catch (e) {
        formatted.risk_factors = [];
      }
    }
    return formatted;
  };

  if (!isArray) {
    if (rejectedItems.length > 0) {
      // Single transaction failed validation (Returns 400 behavior)
      throw { status: 400, message: "Validation failed", details: rejectedItems[0].errors };
    }
    
    // Single transaction passed, save it
    // Create uses the model setter, but we stringified it above.
    const saved = await Transaction.create(validItemsToSave[0]);

    await logAction({
      userId: actorId,
      action: ACTIONS.TRANSACTION_INGESTED,
      entityType: 'Transaction',
      entityId: saved.id,
      details: { score: saved.risk_score }
    });

    return { isArray: false, saved: formatSavedTransaction(saved) };
  }

  // Array behavior
  if (validItemsToSave.length === 0) {
    // All transactions in the array failed validation (Returns 400 behavior)
    throw { status: 400, message: "All transactions failed validation", details: rejectedItems };
  }

  // Save the valid ones using bulkCreate for efficiency (Returns 201 behavior)
  const savedItems = await Transaction.bulkCreate(validItemsToSave);

  await logAction({
    userId: actorId,
    action: ACTIONS.TRANSACTION_INGESTED,
    entityType: 'Transaction',
    details: { 
      ids: savedItems.map(s => s.id), 
      scores: savedItems.map(s => s.risk_score) 
    }
  });

  return { 
    isArray: true, 
    saved: savedItems.map(formatSavedTransaction), 
    rejected: rejectedItems 
  };
}

// ──────────────────────────────────────────────────────────────
// READ helpers (FR-01 list & detail)
// ──────────────────────────────────────────────────────────────

/**
 * Validates and parses query parameters for GET /api/transactions.
 * Every parameter is validated; an invalid one throws a 400 error with a clear message.
 * Returns a clean filters object that Transaction.search() can consume directly.
 */
function parseAndValidateQueryParams(query) {
  const errors = [];
  const filters = {};

  // --- Date range ---
  if (query.from) {
    const d = new Date(query.from);
    if (isNaN(d.getTime())) errors.push("from must be a valid ISO date");
    else filters.from = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (isNaN(d.getTime())) errors.push("to must be a valid ISO date");
    else filters.to = d;
  }

  // --- Amount range ---
  if (query.min_amount !== undefined) {
    const v = Number(query.min_amount);
    if (isNaN(v)) errors.push("min_amount must be a number");
    else filters.min_amount = v;
  }
  if (query.max_amount !== undefined) {
    const v = Number(query.max_amount);
    if (isNaN(v)) errors.push("max_amount must be a number");
    else filters.max_amount = v;
  }

  // --- Risk score range ---
  if (query.min_risk !== undefined) {
    const v = Number(query.min_risk);
    if (isNaN(v) || v < 0 || v > 100) errors.push("min_risk must be a number between 0 and 100");
    else filters.min_risk = v;
  }
  if (query.max_risk !== undefined) {
    const v = Number(query.max_risk);
    if (isNaN(v) || v < 0 || v > 100) errors.push("max_risk must be a number between 0 and 100");
    else filters.max_risk = v;
  }

  // --- Risk level ---
  if (query.risk_level) {
    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(query.risk_level)) {
      errors.push("risk_level must be one of: low, medium, high");
    } else {
      filters.risk_level = query.risk_level;
    }
  }

  // --- Exact-match string filters ---
  if (query.region)           filters.region = query.region;
  if (query.account_id)       filters.account_id = query.account_id;

  if (query.transaction_type) {
    const validTypes = ['purchase', 'transfer', 'withdrawal', 'deposit'];
    if (!validTypes.includes(query.transaction_type)) {
      errors.push("transaction_type must be one of: purchase, transfer, withdrawal, deposit");
    } else {
      filters.transaction_type = query.transaction_type;
    }
  }

  // --- Boolean flag ---
  if (query.is_flagged !== undefined) {
    if (query.is_flagged !== 'true' && query.is_flagged !== 'false') {
      errors.push("is_flagged must be true or false");
    } else {
      filters.is_flagged = query.is_flagged === 'true';
    }
  }

  // --- Sorting ---
  if (query.sort_by) {
    const validSorts = ['timestamp', 'amount', 'risk_score'];
    if (!validSorts.includes(query.sort_by)) {
      errors.push("sort_by must be one of: timestamp, amount, risk_score");
    } else {
      filters.sort_by = query.sort_by;
    }
  }
  if (query.order) {
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(query.order.toLowerCase())) {
      errors.push("order must be asc or desc");
    } else {
      filters.order = query.order.toUpperCase();
    }
  }

  // --- Pagination ---
  if (query.page !== undefined) {
    const v = Number(query.page);
    if (!Number.isInteger(v) || v < 1) errors.push("page must be a positive integer");
    else filters.page = v;
  }
  if (query.limit !== undefined) {
    const v = Number(query.limit);
    if (!Number.isInteger(v) || v < 1) errors.push("limit must be a positive integer");
    else if (v > 100) errors.push("limit cannot exceed 100");
    else filters.limit = v;
  }

  // If any validation errors were found, throw them all at once
  if (errors.length > 0) {
    throw { status: 400, message: "Invalid query parameters", details: errors };
  }

  return filters;
}

/**
 * Lists transactions with filtering, sorting and pagination.
 * Delegates query building entirely to Transaction.search() in the model layer.
 *
 * @param {Object} query - Raw req.query object from Express
 * @returns {{ data: Object[], pagination: Object }}
 */
async function listTransactions(query) {
  // Validate and parse raw query strings into typed filter values
  const filters = parseAndValidateQueryParams(query);

  // Delegate the actual DB query to the model helper
  const { rows, count } = await Transaction.search(filters);

  const page  = filters.page  || 1;
  const limit = filters.limit || 20;

  return {
    data: rows, // risk_factors is already parsed by the model getter; amount by its getter
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit)
    }
  };
}

/**
 * Fetches a single transaction by ID, including its linked Case (or null).
 *
 * @param {string} rawId - The id param from the URL (still a string)
 * @param {number} actorId - The user viewing the transaction
 * @returns {Object} The transaction with its Case included
 */
async function getTransactionById(rawId, actorId) {
  // Validate that the id is numeric
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    throw { status: 400, message: "Transaction id must be a positive integer" };
  }

  // Delegate to the model helper which joins the Case table
  const transaction = await Transaction.findByIdWithCase(id);

  if (!transaction) {
    throw { status: 404, message: "Transaction not found" };
  }

  await logAction({ 
    userId: actorId, 
    action: ACTIONS.TRANSACTION_VIEWED, 
    entityType: 'Transaction', 
    entityId: transaction.id 
  });

  // Format the response — risk_factors and amount are already handled by model getters.
  // Normalize the Case key: Sequelize uses the model name "Case" as the include key.
  const result = transaction.toJSON();
  result.case = result.Case || null;
  delete result.Case;

  return result;
}

module.exports = { ingestTransactions, listTransactions, getTransactionById };

