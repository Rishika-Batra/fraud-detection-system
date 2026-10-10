const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit
// Lists audit log entries, newest first.
// Allowed for supervisor and admin only.
router.get('/', authenticate, authorize('supervisor', 'admin'), async (req, res, next) => {
  try {
    const { user_id, action, entity_type, entity_id, from, to, page, limit } = req.query;
    const filters = {};
    const errors = [];

    // --- Validation ---
    
    if (user_id !== undefined) {
      const v = Number(user_id);
      if (isNaN(v)) errors.push("user_id must be a number");
      else filters.user_id = v;
    }
    
    if (action) filters.action = action;
    if (entity_type) filters.entity_type = entity_type;
    
    if (entity_id !== undefined) {
      const v = Number(entity_id);
      if (isNaN(v)) errors.push("entity_id must be a number");
      else filters.entity_id = v;
    }
    
    if (from) {
      const d = new Date(from);
      if (isNaN(d.getTime())) errors.push("from must be a valid ISO date");
      else filters.from = d;
    }
    
    if (to) {
      const d = new Date(to);
      if (isNaN(d.getTime())) errors.push("to must be a valid ISO date");
      else filters.to = d;
    }
    
    let pageNum = 1;
    if (page !== undefined) {
      pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum < 1) errors.push("page must be a positive integer");
    }
    filters.page = pageNum;

    let limitNum = 20;
    if (limit !== undefined) {
      limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum < 1) errors.push("limit must be a positive integer");
      else if (limitNum > 100) errors.push("limit cannot exceed 100");
    }
    filters.limit = limitNum;

    if (errors.length > 0) {
      return res.status(400).json({ error: "Invalid query parameters", details: errors });
    }

    // --- Model Query ---
    const { rows, count } = await AuditLog.search(filters);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        total_pages: Math.ceil(count / limitNum)
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
