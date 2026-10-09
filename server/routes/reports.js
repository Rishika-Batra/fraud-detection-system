const express = require('express');
const router = express.Router();

// Placeholder route for reports
router.get('/', (req, res) => {
  res.json({ message: "Reports route not implemented yet" });
});

module.exports = router;
