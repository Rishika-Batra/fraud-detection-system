// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Warn if JWT_SECRET is missing or still the default placeholder value.
// This is a critical security check — a weak or missing secret compromises all tokens.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me') {
  console.warn('⚠️  WARNING: JWT_SECRET is missing or set to the default "change_me".');
  console.warn('   Set a strong, random secret in server/.env before deploying.');
}

// Import route modules
const transactionRoutes = require('./routes/transactions');
const caseRoutes = require('./routes/cases');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');

const app = express();

// ─────────────────────────────────────────────────────────
// Production settings
// ─────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Trust the first proxy (e.g. Render, Railway, Heroku) so that
  // express-rate-limit and req.ip work correctly behind a reverse proxy.
  app.set('trust proxy', 1);
}

// Middleware: Enable CORS for cross-origin requests from the frontend
app.use(cors());
// Middleware: Parse incoming JSON requests (replaces body-parser)
app.use(express.json());

// ─────────────────────────────────────────────────────────
// Login rate limiter (per-IP, POST /api/auth/login only)
// Disabled in test environment unless explicitly enabled.
// ─────────────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 10,                    // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Skip the limiter entirely in test mode unless the test enables it
  skip: () => process.env.NODE_ENV === 'test' && !app.locals._enableLoginRateLimit,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  },
});

app.use('/api/auth/login', loginLimiter);

// API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

// Mount routers
app.use('/api/transactions', transactionRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', require('./routes/audit'));

// ─────────────────────────────────────────────────────────
// Static file serving (production only)
// Serves the built React client from client/dist so the entire app
// runs as a single web service. React Router deep links are handled
// by the index.html fallback (any GET that doesn't start with /api).
// ─────────────────────────────────────────────────────────
if (isProduction) {
  const clientDistPath = process.env.CLIENT_DIST_PATH || path.join(__dirname, '..', 'client', 'dist');

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientDistPath));

  // Fallback: send index.html for any GET request that is NOT an /api route.
  // This lets React Router handle client-side routing (e.g. /dashboard, /cases/5).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next(); // Fall through to the 404 handler below
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

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

const PORT = process.env.PORT || 5001;

// Start the server only when run directly (so tests can import the app)
if (require.main === module) {
  const { sequelize } = require('./models');
  const { validateJwtSecret } = require('./config/validateEnv');
  const { bootstrapDemo } = require('./db/bootstrapDemo');

  // ── Production secret check ──
  // Refuse to start if JWT_SECRET is missing or too short in production.
  if (isProduction) {
    const result = validateJwtSecret(process.env.JWT_SECRET);
    if (!result.valid) {
      console.error(`❌ FATAL: ${result.error}`);
      process.exit(1);
    }
  }

  // ── Database sync + optional demo bootstrap ──
  sequelize.sync().then(async () => {
    console.log('Database synced.');

    // Attempt demo bootstrap (does nothing unless ALLOW_DEMO_SEED=true + empty DB + valid SEED_PASSWORD)
    try {
      await bootstrapDemo();
    } catch (err) {
      console.error('⚠️  Demo bootstrap error (non-fatal):', err.message);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('❌ Failed to sync database:', err);
    process.exit(1);
  });
}

module.exports = app;
