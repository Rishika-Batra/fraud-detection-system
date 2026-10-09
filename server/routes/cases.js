const express = require('express');
const router = express.Router();

// Placeholder route for cases
router.get('/', (req, res) => {
  res.json({ message: "Cases route not implemented yet" });
});

module.exports = router;
