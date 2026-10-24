/**
 * deployment.test.js — Tests for production deployment features.
 *
 * Covers:
 *  • Static file serving with React Router fallback
 *  • JSON 404 for unknown /api/* routes
 *  • JWT_SECRET validation (validateEnv)
 *  • Demo bootstrap logic (bootstrapDemo)
 *  • Login rate limiter (429 after limit)
 */

// ─────────────────────────────────────────────────────────
// Test environment setup — must be before any requires
// ─────────────────────────────────────────────────────────
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-tests';
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

// ─────────────────────────────────────────────────────────
// 1. Static Serving Tests (production mode simulation)
// ─────────────────────────────────────────────────────────
describe('Static file serving in production mode', () => {
  let tmpDir;
  let prodApp;

  beforeAll(() => {
    // Create a temporary folder with a minimal index.html
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-test-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html><body>SentinelGuard</body></html>');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Build a fresh Express app in production mode with CLIENT_DIST_PATH
    // We need to re-require index.js with modified env. Use a child approach:
    // set the env vars, then require a fresh copy of index.js.
    // Jest module cache needs to be cleared for a fresh app.
    const originalNodeEnv = process.env.NODE_ENV;
    const originalClientDist = process.env.CLIENT_DIST_PATH;

    process.env.NODE_ENV = 'production';
    process.env.CLIENT_DIST_PATH = tmpDir;

    // Clear module cache for index.js and models to get a fresh app
    jest.resetModules();
    prodApp = require('../server/index');

    process.env.NODE_ENV = originalNodeEnv;
    process.env.CLIENT_DIST_PATH = originalClientDist;
  });

  test('GET / returns index.html', async () => {
    const res = await request(prodApp).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SentinelGuard');
  });

  test('GET /cases returns index.html (React Router deep link)', async () => {
    const res = await request(prodApp).get('/cases');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SentinelGuard');
  });

  test('GET /dashboard/something returns index.html', async () => {
    const res = await request(prodApp).get('/dashboard/something');
    expect(res.status).toBe(200);
    expect(res.text).toContain('SentinelGuard');
  });

  test('GET /api/does-not-exist returns JSON 404, not index.html', async () => {
    const res = await request(prodApp).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error).toBe('Endpoint not found');
  });

  test('GET /api/health still works normally', async () => {
    const res = await request(prodApp).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────────
// 2. Secret Validation Tests
// ─────────────────────────────────────────────────────────
describe('JWT_SECRET validation (validateEnv)', () => {
  let validateJwtSecret;

  beforeAll(() => {
    jest.resetModules();
    ({ validateJwtSecret } = require('../server/config/validateEnv'));
  });

  test('rejects undefined/missing secret', () => {
    const result = validateJwtSecret(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  test('rejects empty string secret', () => {
    const result = validateJwtSecret('');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  test('rejects secret shorter than 32 characters', () => {
    const result = validateJwtSecret('short-secret-only-20ch');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least 32 characters/i);
  });

  test('accepts a secret of 32+ characters', () => {
    const longSecret = 'a'.repeat(48);
    const result = validateJwtSecret(longSecret);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────
// 3. Demo Bootstrap Tests
// ─────────────────────────────────────────────────────────
describe('Demo bootstrap (bootstrapDemo)', () => {
  let sequelize, User;
  let bootstrapDemo;

  beforeAll(async () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    process.env.NODE_ENV = 'test';

    ({ sequelize, User } = require('../server/models'));
    ({ bootstrapDemo } = require('../server/db/bootstrapDemo'));
  });

  beforeEach(async () => {
    // Reset the database to a clean state before each test
    await sequelize.sync({ force: true });
    // Clean up env vars
    delete process.env.ALLOW_DEMO_SEED;
    delete process.env.SEED_PASSWORD;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('does nothing when ALLOW_DEMO_SEED is not set', async () => {
    process.env.SEED_PASSWORD = 'LongEnoughPassword12';
    const result = await bootstrapDemo();
    expect(result.seeded).toBe(false);
    expect(result.reason).toMatch(/ALLOW_DEMO_SEED/);

    const userCount = await User.count();
    expect(userCount).toBe(0);
  });

  test('does nothing when ALLOW_DEMO_SEED is not "true"', async () => {
    process.env.ALLOW_DEMO_SEED = 'false';
    process.env.SEED_PASSWORD = 'LongEnoughPassword12';
    const result = await bootstrapDemo();
    expect(result.seeded).toBe(false);
  });

  test('refuses a short SEED_PASSWORD', async () => {
    process.env.ALLOW_DEMO_SEED = 'true';
    process.env.SEED_PASSWORD = 'short';
    const result = await bootstrapDemo();
    expect(result.seeded).toBe(false);
    expect(result.reason).toMatch(/at least 12 characters/i);
  });

  test('refuses when SEED_PASSWORD is missing', async () => {
    process.env.ALLOW_DEMO_SEED = 'true';
    const result = await bootstrapDemo();
    expect(result.seeded).toBe(false);
    expect(result.reason).toMatch(/SEED_PASSWORD/);
  });

  test('seeds an empty database when all conditions are met', async () => {
    process.env.ALLOW_DEMO_SEED = 'true';
    process.env.SEED_PASSWORD = 'SecureDemoPass123';

    const userCountBefore = await User.count();
    expect(userCountBefore).toBe(0);

    const result = await bootstrapDemo();
    expect(result.seeded).toBe(true);

    const userCountAfter = await User.count();
    expect(userCountAfter).toBeGreaterThan(0);
  }, 30000);

  test('does NOT seed again when users already exist', async () => {
    process.env.ALLOW_DEMO_SEED = 'true';
    process.env.SEED_PASSWORD = 'SecureDemoPass123';

    // Seed first time
    const first = await bootstrapDemo();
    expect(first.seeded).toBe(true);

    const countAfterFirst = await User.count();

    // Try to seed again — should be a no-op
    const second = await bootstrapDemo();
    expect(second.seeded).toBe(false);
    expect(second.reason).toMatch(/already exist/i);

    const countAfterSecond = await User.count();
    expect(countAfterSecond).toBe(countAfterFirst);
  }, 30000);
});

// ─────────────────────────────────────────────────────────
// 4. Login Rate Limiter Tests
// ─────────────────────────────────────────────────────────
describe('Login rate limiter', () => {
  let app;
  let sequelize, User;
  const bcrypt = require('bcryptjs');

  beforeAll(async () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    process.env.NODE_ENV = 'test';

    app = require('../server/index');
    ({ sequelize, User } = require('../server/models'));

    await sequelize.sync({ force: true });

    // Create a test user for testing successful logins
    await User.create({
      username: 'ratelimituser',
      password_hash: await bcrypt.hash('CorrectPassword123!', 10),
      role: 'analyst',
    });

    // Enable the rate limiter for this test suite
    app.locals._enableLoginRateLimit = true;
  });

  afterAll(async () => {
    delete app.locals._enableLoginRateLimit;
    await sequelize.close();
  });

  test('successful logins do not count toward the limit', async () => {
    // Send 12 successful logins (exceeding the 10-attempt threshold)
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ratelimituser', password: 'CorrectPassword123!' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    }
  });

  test('after the limit is reached with wrong passwords, the next request returns 429', async () => {
    // Send 10 failed login requests (wrong password)
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ratelimituser', password: 'wrongpassword' });
      expect(res.status).toBe(401);
    }

    // The next request (11th) must return 429 Too Many Requests
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ratelimituser', password: 'wrongpassword' });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many login attempts/i);
  });
});

