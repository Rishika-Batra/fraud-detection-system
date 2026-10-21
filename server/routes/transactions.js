const express = require('express');
const router = express.Router();
const multer = require('multer');
const transactionService = require('../services/transactionService');
const csvImportService = require('../services/csvImportService');
const { authenticate, authorize } = require('../middleware/auth');

// Multer in-memory storage for handling multipart/form-data CSV uploads (5 MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/transactions/upload
// Upload and ingest transactions from a CSV file.
// Supports dry_run mode, custom header mappings, automated deduplication, and risk scoring.
// Restricted to analyst and supervisor roles.
router.post(
  '/upload',
  authenticate,
  authorize('analyst', 'supervisor'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File size exceeds maximum limit of 5 MB' });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please upload a CSV file using the "file" field.' });
      }

      const isDryRun = req.query.dry_run === 'true' || req.query.dry_run === true || req.body.dry_run === 'true';
      const mapping = req.body.mapping;

      const result = await csvImportService.processCsvBuffer(
        req.file.buffer,
        {
          mapping,
          dry_run: isDryRun,
          fileName: req.file.originalname
        },
        req.user.id
      );

      const statusCode = isDryRun ? 200 : 201;
      return res.status(statusCode).json(result);
    } catch (error) {
      if (error.status) {
        const payload = { error: error.message };
        if (error.details) payload.details = error.details;
        if (error.columns) payload.columns = error.columns;
        return res.status(error.status).json(payload);
      }
      next(error);
    }
  }
);

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
