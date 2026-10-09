const express = require('express');
const router = express.Router();

// Placeholder route for auth
router.get('/', (req, res) => {
  res.json({ message: "Auth route not implemented yet" });
});

module.exports = router;
