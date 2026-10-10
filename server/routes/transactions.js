const express = require('express');
const router = express.Router();
const transactionService = require('../services/transactionService');

// TODO: protect with authenticate middleware (auth comes later).
// POST /api/transactions
// Ingests simulated transaction data
router.post('/', async (req, res, next) => {
  try {
    const result = await transactionService.ingestTransactions(req.body);
    
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

// TODO: protect with authenticate middleware (auth comes later).
// GET /api/transactions
// Lists transactions with optional filtering, sorting, and pagination.
// All query-param validation and query building lives in the service/model layers.
router.get('/', async (req, res, next) => {
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

// TODO: protect with authenticate middleware (auth comes later).
// GET /api/transactions/:id
// Returns a single transaction by ID including its linked Case (or null if no case exists).
router.get('/:id', async (req, res, next) => {
  try {
    const result = await transactionService.getTransactionById(req.params.id);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = router;

