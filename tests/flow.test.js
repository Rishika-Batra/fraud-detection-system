process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/index');
const { sequelize, User, Transaction, Case, AuditLog } = require('../server/models');
const { hashPassword } = require('../server/services/authService');

describe('End-to-End System Integration Flow (tests/flow.test.js)', () => {
  let analystUser;
  let token;

  beforeAll(async () => {
    // Recreate clean in-memory database schema before tests run
    await sequelize.sync({ force: true });

    // Create an analyst user directly via the User model
    const password = 'analyst_password_123';
    const password_hash = await hashPassword(password);
    analystUser = await User.create({
      username: 'flow_analyst',
      password_hash,
      role: 'analyst'
    });

    // Log in as the analyst to obtain a JWT token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'flow_analyst',
        password: password
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user).toBeDefined();
    expect(loginRes.body.user.role).toBe('analyst');

    token = loginRes.body.token;
  });

  afterAll(async () => {
    // Close the database connection to avoid open handles
    await sequelize.close();
  });

  describe('Full Operational Workflow', () => {
    let lowRiskTransaction;
    let highRiskTransaction;
    let autoCreatedCase;

    test('1. Post a low-risk transaction: scored, not flagged, and no case is created', async () => {
      const lowRiskPayload = {
        account_id: 'ACC-LOW-1001',
        amount: 1500, // Small amount, non-round
        currency: 'INR',
        merchant: 'Organic Supermarket',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-10-15T14:00:00.000Z' // Normal business hours (14:00 UTC)
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(lowRiskPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.account_id).toBe('ACC-LOW-1001');
      expect(res.body.risk_score).toBe(0);
      expect(res.body.risk_level).toBe('low');
      expect(res.body.is_flagged).toBe(false);

      lowRiskTransaction = res.body;

      // Assert that no case was created for this low-risk transaction
      const linkedCase = await Case.findOne({
        where: { transaction_id: lowRiskTransaction.id }
      });
      expect(linkedCase).toBeNull();
    });

    test('2. Post a high-risk transaction: flagged and an investigation case is created automatically', async () => {
      // High-risk transaction parameters:
      // - amount: 300,000 (very high amount +35, round number +10)
      // - transaction_type: transfer (+15)
      // - timestamp: 03:00 UTC (odd hours +15)
      // Total risk score = 75 (risk_level = 'high', score >= 70)
      const highRiskPayload = {
        account_id: 'ACC-HIGH-9001',
        amount: 300000,
        currency: 'INR',
        merchant: 'Offshore Wealth Exchange',
        transaction_type: 'transfer',
        region: 'East',
        timestamp: '2026-10-15T03:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(highRiskPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.risk_score).toBeGreaterThanOrEqual(70);
      expect(res.body.risk_level).toBe('high');
      expect(res.body.is_flagged).toBe(true);

      highRiskTransaction = res.body;

      // Verify that an investigation case was automatically created for this transaction
      autoCreatedCase = await Case.findOne({
        where: { transaction_id: highRiskTransaction.id }
      });

      expect(autoCreatedCase).not.toBeNull();
      expect(autoCreatedCase.transaction_id).toBe(highRiskTransaction.id);
      expect(autoCreatedCase.status).toBe('flagged');
    });

    test('3. Fetch the case and verify it properly links to the transaction evidence', async () => {
      expect(autoCreatedCase).toBeDefined();

      const res = await request(app)
        .get(`/api/cases/${autoCreatedCase.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(autoCreatedCase.id);
      expect(res.body.transaction_id).toBe(highRiskTransaction.id);
      expect(res.body.status).toBe('flagged');

      // Verify the associated transaction evidence is populated
      expect(res.body.transaction).toBeDefined();
      expect(res.body.transaction.id).toBe(highRiskTransaction.id);
      expect(res.body.transaction.account_id).toBe('ACC-HIGH-9001');
      expect(res.body.transaction.amount).toBe(300000);
      expect(res.body.transaction.risk_level).toBe('high');
      expect(res.body.transaction.is_flagged).toBe(true);
    });

    test('4. Move the case lifecycle from open (flagged) -> investigating -> resolved', async () => {
      expect(autoCreatedCase).toBeDefined();

      // Step A: Transition from flagged -> investigating
      const investigatingRes = await request(app)
        .patch(`/api/cases/${autoCreatedCase.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'investigating',
          note: 'Analyst assigned; initiating review of high-value transfer'
        });

      expect(investigatingRes.status).toBe(200);
      expect(investigatingRes.body.status).toBe('investigating');
      expect(investigatingRes.body.assigned_to).toBe(analystUser.id);

      // Verify note was saved with author attribution
      expect(Array.isArray(investigatingRes.body.CaseNotes)).toBe(true);
      expect(investigatingRes.body.CaseNotes.length).toBeGreaterThanOrEqual(1);
      expect(investigatingRes.body.CaseNotes[0].note).toBe('Analyst assigned; initiating review of high-value transfer');

      // Step B: Transition from investigating -> resolved
      const resolvedRes = await request(app)
        .patch(`/api/cases/${autoCreatedCase.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'resolved',
          note: 'Transaction verified with account holder. Confirmed fraud; card blocked.'
        });

      expect(resolvedRes.status).toBe(200);
      expect(resolvedRes.body.status).toBe('resolved');

      // Verify final database state
      const updatedCaseInDb = await Case.findByPk(autoCreatedCase.id);
      expect(updatedCaseInDb.status).toBe('resolved');
    });

    test('5. Check that audit log rows exist for each critical step in the flow', async () => {
      // Query all audit logs recorded in order
      const logs = await AuditLog.findAll({
        order: [['id', 'ASC']]
      });

      expect(logs.length).toBeGreaterThan(0);

      const actions = logs.map(l => l.action);

      // 1) Analyst Login audit entry
      expect(actions).toContain('LOGIN_SUCCESS');

      // 2) Low-risk and high-risk ingestion audit entries
      const ingestedLogs = logs.filter(l => l.action === 'TRANSACTION_INGESTED');
      expect(ingestedLogs.length).toBeGreaterThanOrEqual(2);

      // 3) High-risk auto-flagging and case creation audit entries
      expect(actions).toContain('TRANSACTION_FLAGGED');
      expect(actions).toContain('CASE_CREATED');

      const caseCreatedLog = logs.find(l => l.action === 'CASE_CREATED' && l.entity_id === autoCreatedCase.id);
      expect(caseCreatedLog).toBeDefined();
      expect(caseCreatedLog.entity_type).toBe('Case');

      // 4) Case status transitions audit entries (flagged -> investigating and investigating -> resolved)
      const statusLogs = logs.filter(l => l.action === 'CASE_STATUS_CHANGED' && l.entity_id === autoCreatedCase.id);
      expect(statusLogs.length).toBe(2);

      expect(statusLogs[0].details).toEqual(expect.objectContaining({
        from: 'flagged',
        to: 'investigating'
      }));

      expect(statusLogs[1].details).toEqual(expect.objectContaining({
        from: 'investigating',
        to: 'resolved'
      }));
    });
  });

  describe('Validation & Bad Input Rejection (HTTP 400)', () => {
    test('rejects transactions with negative amount with 400 Bad Request', async () => {
      const negativePayload = {
        account_id: 'ACC-ERR-001',
        amount: -250, // Negative amount is invalid
        currency: 'INR',
        merchant: 'Store',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-10-15T12:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(negativePayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.details).toEqual(
        expect.arrayContaining(['amount must be a number greater than 0'])
      );
    });

    test('rejects transactions with zero amount with 400 Bad Request', async () => {
      const zeroPayload = {
        account_id: 'ACC-ERR-002',
        amount: 0,
        currency: 'INR',
        merchant: 'Store',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-10-15T12:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(zeroPayload);

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining(['amount must be a number greater than 0'])
      );
    });

    test('rejects transactions with missing sender (account_id) with 400 Bad Request', async () => {
      const missingSenderPayload = {
        // account_id (sender) is intentionally omitted
        amount: 1500,
        currency: 'INR',
        merchant: 'Store',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-10-15T12:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(missingSenderPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.details).toEqual(
        expect.arrayContaining(['account_id is required'])
      );
    });

    test('rejects invalid currency code with 400 Bad Request', async () => {
      const invalidCurrencyPayload = {
        account_id: 'ACC-ERR-003',
        amount: 1500,
        currency: 'invalid_curr', // Not a 3-letter uppercase code
        merchant: 'Store',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-10-15T12:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidCurrencyPayload);

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining(['currency must be a 3-letter uppercase code'])
      );
    });

    test('rejects missing timestamp with 400 Bad Request', async () => {
      const missingTimestampPayload = {
        account_id: 'ACC-ERR-004',
        amount: 1500,
        currency: 'INR',
        merchant: 'Store',
        transaction_type: 'purchase',
        region: 'North'
        // timestamp missing
      };

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(missingTimestampPayload);

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining(['timestamp is required'])
      );
    });
  });
});
