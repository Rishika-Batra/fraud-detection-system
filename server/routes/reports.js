const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { authenticate, authorize } = require('../middleware/auth');

// Apply middleware to all routes in this router
// All report endpoints are for supervisor and admin only (analysts get 403)
router.use(authenticate, authorize('supervisor', 'admin'));

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const result = await reportService.getSummary(req.query);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, details: error.details });
    next(error);
  }
});

// GET /api/reports/trends
router.get('/trends', async (req, res, next) => {
  try {
    const result = await reportService.getTrends(req.query);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, details: error.details });
    next(error);
  }
});

// GET /api/reports/heatmap
router.get('/heatmap', async (req, res, next) => {
  try {
    const result = await reportService.getHeatmap(req.query);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, details: error.details });
    next(error);
  }
});

// GET /api/reports/export
// Streams CSV or PDF download
router.get('/export', async (req, res, next) => {
  try {
    await reportService.exportData(req, res);
    // exportData handles res.send/res.pipe directly, so no res.json() here.
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, details: error.details });
    next(error);
  }
});

module.exports = router;

