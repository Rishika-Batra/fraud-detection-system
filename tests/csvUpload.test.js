process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const app = require('../server/index');
const { sequelize, User, Transaction, Case, AuditLog } = require('../server/models');
const { hashPassword } = require('../server/services/authService');

describe('CSV Upload Integration Tests (tests/csvUpload.test.js)', () => {
  let analystToken;
  let adminToken;
  let analystUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // 1. Create Analyst User
    const analystPassword = 'analyst_secure_password';
    const analystHash = await hashPassword(analystPassword);
    analystUser = await User.create({
      username: 'csv_analyst',
      password_hash: analystHash,
      role: 'analyst'
    });

    const analystLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'csv_analyst', password: analystPassword });
    analystToken = analystLogin.body.token;

    // 2. Create Admin User
    const adminPassword = 'admin_secure_password';
    const adminHash = await hashPassword(adminPassword);
    await User.create({
      username: 'csv_admin',
      password_hash: adminHash,
      role: 'admin'
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'csv_admin', password: adminPassword });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Authentication & Role Authorization', () => {
    test('rejects upload with 401 Unauthorized when no token is provided', async () => {
      const csvData = 'account_id,amount,currency,merchant,transaction_type,region,timestamp\nSYN-001,100,INR,Shop,purchase,North,2026-09-10 10:00:00';
      const res = await request(app)
        .post('/api/transactions/upload')
        .attach('file', Buffer.from(csvData), 'test.csv');

      expect(res.status).toBe(401);
    });

    test('rejects upload with 403 Forbidden for admin role (analysts/supervisors only)', async () => {
      const csvData = 'account_id,amount,currency,merchant,transaction_type,region,timestamp\nSYN-001,100,INR,Shop,purchase,North,2026-09-10 10:00:00';
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvData), 'test.csv');

      expect(res.status).toBe(403);
    });
  });

  describe('File Validation & Bad Files Handling', () => {
    test('rejects request with 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No file uploaded');
    });

    test('rejects empty file with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(''), 'empty.csv');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('empty');
    });

    test('rejects file containing only whitespace with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from('   \n  \n  '), 'whitespace.csv');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('empty');
    });

    test('rejects file containing only header and no data rows with 400 Bad Request', async () => {
      const csvData = 'account_id,amount,currency,merchant,transaction_type,region,timestamp\n';
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'header_only.csv');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('no data rows');
    });

    test('rejects oversized file (>5 MB) with 413 Payload Too Large', async () => {
      // 5 MB + 100 KB buffer
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024 * 100, 'a');
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', largeBuffer, 'huge.csv');

      expect(res.status).toBe(413);
      expect(res.body.error).toContain('5 MB');
    });

    test('rejects file missing a required column with a clear column report', async () => {
      // Missing 'currency' column
      const csvData = 'account_id,amount,merchant,transaction_type,region,timestamp\nSYN-ACC-01,500,Retail,purchase,North,2026-09-10 12:00:00';
      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'missing_col.csv');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('currency');
      expect(res.body.columns).toBeDefined();
      expect(res.body.columns.missing).toContain('currency');
      expect(res.body.columns.matched).toHaveProperty('account_id');
    });
  });

  describe('Header Aliases & Mapping Overrides', () => {
    test('matches smart header aliases correctly', async () => {
      // Headers using aliases: account, amt, ccy, vendor, type, country, date
      const csvData = [
        'account,amt,ccy,vendor,type,country,date',
        'SYN-ALIAS-101,"1,250.00",inr,Apex Retail,Purchase,North,2026-09-11 14:00:00'
      ].join('\n');

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'aliases.csv');

      expect(res.status).toBe(201);
      expect(res.body.saved_count).toBe(1);
      expect(res.body.columns.matched).toEqual(
        expect.objectContaining({
          account: 'account_id',
          amt: 'amount',
          ccy: 'currency',
          vendor: 'merchant',
          type: 'transaction_type',
          country: 'region',
          date: 'timestamp'
        })
      );

      const savedTx = await Transaction.findOne({ where: { account_id: 'SYN-ALIAS-101' } });
      expect(savedTx).not.toBeNull();
      expect(savedTx.amount).toBe(1250);
      expect(savedTx.currency).toBe('INR');
      expect(savedTx.merchant).toBe('Apex Retail');
      expect(savedTx.transaction_type).toBe('purchase');
      expect(savedTx.source).toBe('uploaded');
    });

    test('supports optional mapping JSON to override header detection', async () => {
      const csvData = [
        'ClientRef,TotalValue,Code,Store,Kind,Zone,LoggedAt',
        'SYN-MAP-201,3400,EUR,Continental Goods,transfer,East,2026-09-12 10:30:00'
      ].join('\n');

      const customMapping = JSON.stringify({
        ClientRef: 'account_id',
        TotalValue: 'amount',
        Code: 'currency',
        Store: 'merchant',
        Kind: 'transaction_type',
        Zone: 'region',
        LoggedAt: 'timestamp'
      });

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .field('mapping', customMapping)
        .attach('file', Buffer.from(csvData), 'custom_mapping.csv');

      expect(res.status).toBe(201);
      expect(res.body.saved_count).toBe(1);

      const savedTx = await Transaction.findOne({ where: { account_id: 'SYN-MAP-201' } });
      expect(savedTx).not.toBeNull();
      expect(savedTx.amount).toBe(3400);
      expect(savedTx.currency).toBe('EUR');
    });
  });

  describe('Row Validation & Partial Rejection by Line Number', () => {
    test('rejects bad rows by line number (negative amount, bad currency, bad type, future date, ambiguous format) while saving valid rows', async () => {
      const csvLines = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp', // Line 1: Header
        'SYN-VAL-GOOD,1000,INR,Valid Merchant,purchase,North,2026-09-15 10:00:00', // Line 2: Valid
        'SYN-VAL-BAD1,-500,INR,Bad Amount Store,purchase,North,2026-09-15 10:00:00', // Line 3: Negative amount
        'SYN-VAL-BAD2,1000,INVALID,Bad Currency Store,purchase,North,2026-09-15 10:00:00', // Line 4: Bad currency
        'SYN-VAL-BAD3,1000,INR,Bad Type Store,unsupported_type,North,2026-09-15 10:00:00', // Line 5: Bad type
        'SYN-VAL-BAD4,1000,INR,Future Store,purchase,North,2099-01-01 10:00:00', // Line 6: Future date
        'SYN-VAL-BAD5,1000,INR,Ambiguous Date Store,purchase,North,15/09/2026' // Line 7: Ambiguous date format
      ];

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvLines.join('\n')), 'validation_test.csv');

      expect(res.status).toBe(201);
      expect(res.body.total_rows).toBe(6);
      expect(res.body.saved_count).toBe(1);
      expect(res.body.rejected_count).toBe(5);

      const rejected = res.body.rejected;
      expect(rejected).toHaveLength(5);

      // Line 3: negative amount
      const line3 = rejected.find(r => r.line === 3);
      expect(line3).toBeDefined();
      expect(line3.errors).toContain('amount must be a number greater than 0');

      // Line 4: bad currency
      const line4 = rejected.find(r => r.line === 4);
      expect(line4).toBeDefined();
      expect(line4.errors).toContain('currency must be a 3-letter uppercase code');

      // Line 5: bad transaction type
      const line5 = rejected.find(r => r.line === 5);
      expect(line5).toBeDefined();
      expect(line5.errors[0]).toContain('transaction_type must be one of:');

      // Line 6: future date
      const line6 = rejected.find(r => r.line === 6);
      expect(line6).toBeDefined();
      expect(line6.errors).toContain('timestamp cannot be in the future');

      // Line 7: ambiguous date format
      const line7 = rejected.find(r => r.line === 7);
      expect(line7).toBeDefined();
      expect(line7.errors).toContain('timestamp format is ambiguous (must be ISO 8601 or YYYY-MM-DD HH:mm:ss)');

      // Good row was saved
      const savedGoodTx = await Transaction.findOne({ where: { account_id: 'SYN-VAL-GOOD' } });
      expect(savedGoodTx).not.toBeNull();
      expect(savedGoodTx.source).toBe('uploaded');
    });
  });

  describe('Duplicate Detection (Within File & Across Re-Uploads)', () => {
    test('skips duplicates within the file and on subsequent re-upload without throwing errors', async () => {
      const csvData = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp',
        'SYN-DUP-001,750,INR,Daily Essentials,purchase,North,2026-09-14 11:30:00',
        'SYN-DUP-001,750,INR,Daily Essentials,purchase,North,2026-09-14 11:30:00' // Duplicate within file
      ].join('\n');

      // First Upload
      const res1 = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'duplicates.csv');

      expect(res1.status).toBe(201);
      expect(res1.body.total_rows).toBe(2);
      expect(res1.body.saved_count).toBe(1);
      expect(res1.body.duplicate_count).toBe(1);
      expect(res1.body.rejected_count).toBe(0);

      // Re-upload exact same file
      const res2 = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'duplicates.csv');

      expect(res2.status).toBe(201);
      expect(res2.body.total_rows).toBe(2);
      expect(res2.body.saved_count).toBe(0);
      expect(res2.body.duplicate_count).toBe(2);
      expect(res2.body.rejected_count).toBe(0);

      // Verify DB contains exactly 1 record
      const count = await Transaction.count({ where: { account_id: 'SYN-DUP-001' } });
      expect(count).toBe(1);
    });
  });

  describe('Dry Run Mode', () => {
    test('dry_run parses and reports valid rows and errors but persists nothing to DB', async () => {
      const csvData = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp',
        'SYN-DRY-999,999.50,INR,Cloud Services,purchase,West,2026-09-16 09:00:00',
        'SYN-DRY-ERR,-10,INR,Bad Store,purchase,West,2026-09-16 09:00:00'
      ].join('\n');

      const res = await request(app)
        .post('/api/transactions/upload?dry_run=true')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'dry_run.csv');

      expect(res.status).toBe(200);
      expect(res.body.dry_run).toBe(true);
      expect(res.body.upload_batch).toBeNull();
      expect(res.body.saved_count).toBe(0);
      expect(res.body.valid_count).toBe(1);
      expect(res.body.rejected_count).toBe(1);
      expect(res.body.preview).toHaveLength(1);
      expect(res.body.preview[0].account_id).toBe('SYN-DRY-999');

      // Ensure nothing was saved in the database
      const dbTx = await Transaction.findOne({ where: { account_id: 'SYN-DRY-999' } });
      expect(dbTx).toBeNull();
    });
  });

  describe('High-Risk Scoring & Case Auto-Creation', () => {
    test('scores uploaded rows and automatically creates investigation cases for high-risk transactions', async () => {
      // High-risk trigger:
      // - amount: 300,000 (very high amount +35, round number +10)
      // - transaction_type: transfer (+15)
      // - timestamp: 03:00 UTC (odd hours +15)
      // Score = 75 (high risk >= 70)
      const csvData = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp',
        'SYN-HIGH-RISK-99,300000,INR,Offshore Exchange,transfer,East,2026-09-18 03:00:00'
      ].join('\n');

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'high_risk.csv');

      expect(res.status).toBe(201);
      expect(res.body.saved_count).toBe(1);

      const savedTx = await Transaction.findOne({ where: { account_id: 'SYN-HIGH-RISK-99' } });
      expect(savedTx).not.toBeNull();
      expect(savedTx.risk_level).toBe('high');
      expect(savedTx.risk_score).toBeGreaterThanOrEqual(70);
      expect(savedTx.is_flagged).toBe(true);
      expect(savedTx.source).toBe('uploaded');
      expect(savedTx.upload_batch).toMatch(/^upload-/);

      // Verify automated case creation
      const linkedCase = await Case.findOne({ where: { transaction_id: savedTx.id } });
      expect(linkedCase).not.toBeNull();
      expect(linkedCase.status).toBe('flagged');

      // Verify audit log for CSV upload
      const auditLog = await AuditLog.findOne({
        where: { action: 'CSV_UPLOADED' },
        order: [['id', 'DESC']]
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog.user_id).toBe(analystUser.id);
      expect(auditLog.details).toEqual(
        expect.objectContaining({
          saved_count: 1,
          upload_batch: res.body.upload_batch
        })
      );
    });
  });

  describe('Source Filtering on GET /api/transactions', () => {
    beforeAll(async () => {
      // Seed an explicit demo transaction
      await Transaction.create({
        account_id: 'SYN-DEMO-FILTER',
        amount: 400,
        currency: 'INR',
        merchant: 'Demo Shop',
        transaction_type: 'purchase',
        region: 'North',
        timestamp: '2026-09-10 10:00:00',
        source: 'demo'
      });
    });

    test('filters transactions by source=demo', async () => {
      const res = await request(app)
        .get('/api/transactions?source=demo')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(tx => {
        expect(tx.source).toBe('demo');
      });
    });

    test('filters transactions by source=uploaded', async () => {
      const res = await request(app)
        .get('/api/transactions?source=uploaded')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(tx => {
        expect(tx.source).toBe('uploaded');
      });
    });

    test('rejects invalid source filter with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/transactions?source=unknown_source')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(400);
      expect(res.body.details).toContain('source must be one of: demo, uploaded');
    });
  });

  describe('Timestamp UTC Normalization', () => {
    test('treats timestamps without offset as UTC, ensuring space and T separators produce the exact same stored instant', async () => {
      // One row with 'YYYY-MM-DD HH:mm:ss' and one row with 'YYYY-MM-DDTHH:mm:ss'
      const csvData = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp',
        'SYN-TIME-SPACE,1200,INR,Time Shop,purchase,North,2026-09-20 14:30:00',
        'SYN-TIME-ISO,1200,INR,Time Shop,purchase,North,2026-09-20T14:30:00'
      ].join('\n');

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'timestamps.csv');

      expect(res.status).toBe(201);
      expect(res.body.saved_count).toBe(2);

      const txSpace = await Transaction.findOne({ where: { account_id: 'SYN-TIME-SPACE' } });
      const txIso = await Transaction.findOne({ where: { account_id: 'SYN-TIME-ISO' } });

      expect(txSpace).not.toBeNull();
      expect(txIso).not.toBeNull();

      const timeSpace = new Date(txSpace.timestamp).getTime();
      const timeIso = new Date(txIso.timestamp).getTime();

      expect(timeSpace).toBe(timeIso);
      expect(new Date(txSpace.timestamp).toISOString()).toBe('2026-09-20T14:30:00.000Z');
      expect(new Date(txIso.timestamp).toISOString()).toBe('2026-09-20T14:30:00.000Z');
    });
  });

  describe('Total Rows Add-Up Invariant with Ingestion Rejection', () => {
    test('maintains saved_count + rejected_count + duplicate_count === total_rows when ingestTransactions rejects a row', async () => {
      const transactionService = require('../server/services/transactionService');
      const origIngest = transactionService.ingestTransactions;

      // Mock ingestTransactions to simulate a rejection of the second item in batch
      const spy = jest.spyOn(transactionService, 'ingestTransactions').mockImplementation(async (items, actorId) => {
        if (items.length > 1) {
          const savedItems = [items[0]];
          const rejectedItems = [{ index: 1, errors: ['Simulated downstream ingestion rejection'], data: items[1] }];
          return {
            isArray: true,
            saved: savedItems,
            rejected: rejectedItems
          };
        }
        return origIngest(items, actorId);
      });

      // CSV has 4 rows:
      // Line 1: Header
      // Line 2: Valid row (will be saved)
      // Line 3: Valid row (will be rejected by mocked ingestTransactions)
      // Line 4: In-file duplicate of Line 2 (skipped as duplicate)
      // Line 5: Bad row (rejected at CSV validation stage)
      const csvData = [
        'account_id,amount,currency,merchant,transaction_type,region,timestamp',
        'SYN-INV-01,100,INR,Shop A,purchase,North,2026-09-21 10:00:00', // Line 2: saved
        'SYN-INV-02,200,INR,Shop B,purchase,North,2026-09-21 10:00:00', // Line 3: ingestion rejected
        'SYN-INV-01,100,INR,Shop A,purchase,North,2026-09-21 10:00:00', // Line 4: duplicate
        'SYN-INV-03,-99,INR,Shop C,purchase,North,2026-09-21 10:00:00'  // Line 5: csv validation rejected
      ].join('\n');

      const res = await request(app)
        .post('/api/transactions/upload')
        .set('Authorization', `Bearer ${analystToken}`)
        .attach('file', Buffer.from(csvData), 'invariant.csv');

      spy.mockRestore();

      expect(res.status).toBe(201);
      expect(res.body.total_rows).toBe(4);
      expect(res.body.saved_count).toBe(1);
      expect(res.body.duplicate_count).toBe(1);
      expect(res.body.rejected_count).toBe(2);

      // Invariant check: saved + rejected + duplicate === total
      expect(res.body.saved_count + res.body.rejected_count + res.body.duplicate_count).toBe(res.body.total_rows);

      // Verify line numbers in rejected
      const rejLines = res.body.rejected.map(r => r.line);
      expect(rejLines).toContain(3); // Line 3 rejected during ingestion
      expect(rejLines).toContain(5); // Line 5 rejected during CSV validation
    });
  });

  describe('Spreadsheet Formula Injection Neutralization in CSV Export', () => {
    const { escapeCsvValue } = require('../server/services/reportService');

    test('escapeCsvValue prefixes cells starting with dangerous characters (=, +, -, @, tab, CR) with single quote', () => {
      expect(escapeCsvValue('=1+1')).toBe(`"'=1+1"`);
      expect(escapeCsvValue('+123')).toBe(`"'+123"`);
      expect(escapeCsvValue('-50')).toBe(`"'-50"`);
      expect(escapeCsvValue('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(escapeCsvValue('\tcalc')).toBe(`"'\tcalc"`);
      expect(escapeCsvValue('\rcalc')).toBe(`"'\rcalc"`);

      // Normal strings
      expect(escapeCsvValue('North')).toBe('North');
      expect(escapeCsvValue('East, Zone')).toBe('"East, Zone"');
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    test('neutralizes formula injection in transaction region when exporting cases to CSV', async () => {
      // 1. Create a transaction with a formula-like region and high risk so a case is created
      const highRiskTx = await Transaction.create({
        account_id: 'SYN-INJECT-ACC',
        amount: 300000,
        currency: 'INR',
        merchant: 'Safe Merchant',
        transaction_type: 'transfer',
        region: '=SUM(1+1)',
        timestamp: '2026-09-22T03:00:00.000Z',
        risk_score: 85,
        risk_level: 'high',
        is_flagged: true,
        source: 'uploaded'
      });

      await Case.create({
        transaction_id: highRiskTx.id,
        status: 'flagged'
      });

      // 2. Request cases CSV export
      const res = await request(app)
        .get('/api/reports/export?format=csv&type=cases')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain(`"'=SUM(1+1)"`);
    });
  });
});
