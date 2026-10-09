const express = require('express');
const router = express.Router();

// Placeholder route for transactions
router.get('/', (req, res) => {
  res.json({ message: "Transactions route not implemented yet" });
});

module.exports = router;
