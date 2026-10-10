const express = require('express');
const router = express.Router();
const transactionService = require('../services/transactionService');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/transactions
// Ingests simulated transaction data.
// Any authenticated user can POST — this simulates an upstream data feed pushing transactions
// into the system. In production this would be a service account or internal API key.
router.post('/', authenticate, async (req, res, next) => {
  try {
    const result = await transactionService.ingestTransactions(req.body, req.user.id);
    
    if (!result.isArray) {
      // Return 201 Created with the single saved record
      return res.status(201).json(result.saved);
    } else {
      // Return 201 Created with the saved and rejected arrays
      return res.status(201).json({
        saved: result.saved,
        rejected: result.rejected
      });
    }
  } catch (error) {
    // Handle our known 400 validation/payload errors directly
    if (error.status === 400) {
      return res.status(400).json({
        error: error.message,
        details: error.details
      });
    }
    // Pass other unexpected errors to the centralized error handler in index.js
    next(error);
  }
});

// GET /api/transactions
// Lists transactions with optional filtering, sorting, and pagination.
// All query-param validation and query building lives in the service/model layers.
// Accessible by analyst, supervisor, and admin roles.
router.get('/', authenticate, authorize('analyst', 'supervisor', 'admin'), async (req, res, next) => {
  try {
    const result = await transactionService.listTransactions(req.query);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details
      });
    }
    next(error);
  }
});

// GET /api/transactions/:id
// Returns a single transaction by ID including its linked Case (or null if no case exists).
// Accessible by analyst, supervisor, and admin roles.
router.get('/:id', authenticate, authorize('analyst', 'supervisor', 'admin'), async (req, res, next) => {
  try {
    const result = await transactionService.getTransactionById(req.params.id, req.user.id);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

// PATCH /api/transactions/:id/flag
// Analyst and supervisor only. Sets is_flagged=true and creates a Case.
router.patch('/:id/flag', authenticate, authorize('analyst', 'supervisor'), async (req, res, next) => {
  try {
    const newCase = await transactionService.flagTransaction(req.params.id, req.user.id);
    return res.status(201).json(newCase);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;
