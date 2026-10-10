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

module.exports = router;
