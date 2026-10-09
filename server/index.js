// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import route modules
const transactionRoutes = require('./routes/transactions');
const caseRoutes = require('./routes/cases');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

const app = express();

// Middleware: Enable CORS for cross-origin requests from the frontend
app.use(cors());
// Middleware: Parse incoming JSON requests (replaces body-parser)
app.use(express.json());

// API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

// Mount routers
app.use('/api/transactions', transactionRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// 404 Handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging
  // Always return a JSON format error response
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
