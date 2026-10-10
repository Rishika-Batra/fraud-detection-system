const express = require('express');
const router = express.Router();
const caseService = require('../services/caseService');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/cases
// Lists cases with filtering and pagination.
// Each case includes a short summary of its transaction.
router.get('/', authenticate, authorize('analyst', 'supervisor', 'admin'), async (req, res, next) => {
  try {
    const result = await caseService.listCases(req.query);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, details: err.details });
    next(err);
  }
});

// GET /api/cases/:id
// Returns a single case, its full transaction, its assigned user, and all notes.
router.get('/:id', authenticate, authorize('analyst', 'supervisor', 'admin'), async (req, res, next) => {
  try {
    const result = await caseService.getCaseById(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /api/cases/:id/status
// Analyst and supervisor only.
// Admin gets 403 (caught by authorize). Validates the transition and assigns to actor if moving to investigating.
// Wraps status update and note creation in a database transaction.
router.patch('/:id/status', authenticate, authorize('analyst', 'supervisor'), async (req, res, next) => {
  try {
    const result = await caseService.updateStatus(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, details: err.details });
    next(err);
  }
});

// POST /api/cases/:id/notes
// Analyst and supervisor only. Adds a new CaseNote.
router.post('/:id/notes', authenticate, authorize('analyst', 'supervisor'), async (req, res, next) => {
  try {
    const result = await caseService.addNote(req.params.id, req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, details: err.details });
    next(err);
  }
});

// PATCH /api/cases/:id/assign
// Supervisor only. Re-assigns the case.
router.patch('/:id/assign', authenticate, authorize('supervisor'), async (req, res, next) => {
  try {
    const result = await caseService.assignCase(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, details: err.details });
    next(err);
  }
});

module.exports = router;

