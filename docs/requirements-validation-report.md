# Requirements Validation Report

**Project:** SentinelGuard — Fraud Detection Management System  
**Repository:** `fraud-detection-system`  
**Report Author:** Rohit Arya (Requirement Engineer & Coverage Verification Lead)  
**Stakeholder Distribution:**  
- **Rohit Arya**: SRS, Requirements & Coverage Verification Lead  
- **Rishika Batra**: Backend Architecture, API & Scoring Engine Lead  
- **Rishika Nigam**: Frontend Architecture & React Dashboard Lead  
- **Rishabh Jain**: QA & Automated Testing Lead  
**Assessment Date:** October 2026  
**Document Status:** Complete & Verified Baseline  

---

## 1. Scope & Verification Methodology

This report documents the systematic verification of SentinelGuard system features against the **Experiment 3 Agile User Stories** (US-01 through US-11) and the canonical Software Requirements Specification (SRS FR-01 to FR-11, NFR-01 to NFR-07).

### Verification Techniques Applied:
1. **Static Source Code Inspection:** Rigorous line-by-line review of backend services (`server/services/`), routes (`server/routes/`), models (`server/models/`), middleware (`server/middleware/`), and frontend components (`client/src/`).
2. **Schema & Database Constraint Analysis:** Inspection of SQLite table definitions, foreign keys, uniqueness constraints, index definitions, and Sequelize hooks.
3. **Logic & Rule Simulation:** Non-destructive programmatic validation of scoring formulas, state machine transition tables, and data sanitization algorithms.
4. **Environment & Runtime Assessment:** Evaluation of execution environments, prerequisite dependencies (Node.js runtime, Git version control, package scripts), and test harness readiness.

### Result Classifications:
- **Pass:** Feature implementation satisfies all specified functional criteria and design constraints.
- **Fail:** Implementation violates expected specification or exhibits defect behavior.
- **Blocked:** Feature cannot be verified dynamically due to missing external dependencies or unconfigured environment.
- **Not Tested:** Automated test suite is absent or unexecuted.

---

## 2. Feature Validation Matrix by User Story

---

### US-01: Real-Time Transaction Monitoring & Detail Retrieval
- **Related Requirement:** FR-01 (FR-01.1, FR-01.2)
- **User Story:** *As a Fraud Analyst, I want to view a real-time filterable table of incoming transactions and inspect detailed evidence for any transaction so that I can evaluate risk factors.*
- **Expected Behaviour:**
  - Table renders with filters: `risk_level`, `region`, `transaction_type`, `is_flagged`, date range (`from`/`to`), and account ID search.
  - Sorting supported by `risk_score`, `amount`, and `timestamp` (asc/desc).
  - Clicking a transaction opens a detail view displaying rule breakdown, calculated factors, and linked case status (if existing).
- **Actual Behaviour:**
  - `GET /api/transactions` validates query parameters and builds dynamic SQL query in `Transaction.search(filters)`. Returns paginated data and metadata.
  - `GET /api/transactions/:id` queries `Transaction.findByIdWithCase`, joining `cases` table to return `{ ...transaction, case: { id, status, assigned_to } }`.
  - Frontend `DashboardPage.jsx` provides search inputs, filter dropdowns, sorting toggles, and detail inspection modal.
- **Verification Method:** Static Code Analysis & Schema Join Audit (`server/services/transactionService.js#L143-L332`, `client/src/pages/DashboardPage.jsx`).
- **Evidence:** `server/routes/transactions.js`, `server/models/Transaction.js`, `client/src/pages/DashboardPage.jsx`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Ensure QA Lead Rishabh Jain adds automated integration tests for complex filter combinations.

---

### US-02: Upstream Transaction Ingestion & Validation Feed
- **Related Requirement:** FR-02 (FR-02.1)
- **User Story:** *As an Upstream Banking Service, I want to push single transactions or batch payloads up to 500 records into the system with automatic schema and sanity validation.*
- **Expected Behaviour:**
  - Ingestion endpoint accepts single object or array up to 500 items. Payloads >500 rejected with HTTP 400.
  - Validates required fields (`account_id`, `amount > 0`, `currency = 'INR'`, `merchant`, `region`, `transaction_type`, non-future `timestamp`).
  - Client-supplied risk scores stripped; risk scored authoritatively by backend engine.
  - Writes audit trail for ingested items.
- **Actual Behaviour:**
  - `transactionService.ingestTransactions` enforces maximum 500 limit.
  - `transactionValidator.validateTransaction` validates field types, regex for currency (`/^[A-Z]{3}$/`), and future timestamp check (`date > new Date()`).
  - Sanitization strips client risk scores prior to passing context to scoring engine.
  - Valid items stored via `Transaction.bulkCreate`; audit log written via `logAction(TRANSACTION_INGESTED)`.
- **Verification Method:** Static Code Inspection (`server/services/transactionValidator.js`, `server/services/transactionService.js#L18-L139`).
- **Evidence:** `server/routes/transactions.js#L6-L35`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Add rate-limiting on public ingestion route to defend against denial-of-service batch spikes.

---

### US-03: Rule-Based Fraud Scoring Engine
- **Related Requirement:** FR-03 (FR-03.1, FR-03.2)
- **User Story:** *As a Risk Officer, I want incoming transactions evaluated against multiple fraud detection rules to compute an authoritative 0–100 risk score and capture triggered factors.*
- **Expected Behaviour:**
  - Evaluates rules: High/Very High Amount, Round Multiples of 10,000, Odd Hours (1–5 AM UTC), Velocity Bursts (≥5 in 10 mins), Rapid Geographic Hop (different region in 60 mins), Large Withdrawal/Transfer.
  - Sums rule points and caps final score at 100.
  - Supports pluggable architecture allowing scoring engine replacement without altering service code.
- **Actual Behaviour:**
  - `server/services/scoringRules.js` defines pure rule functions reading thresholds from `server/config/scoringConfig.js`.
  - `server/services/scoringEngine.js` executes rules within a try/catch loop so a failing rule does not crash evaluation. Caps at `Math.min(totalScore, 100)`.
  - Exposes `setScorer(fn)` enabling runtime replacement with ML models.
- **Verification Method:** Static Code Inspection & Logic Analysis (`server/services/scoringEngine.js`, `server/services/scoringRules.js`).
- **Evidence:** `server/config/scoringConfig.js`, `server/services/scoringRules.js#L9-L93`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Plan future ML scoring plugin integration using the `setScorer` interface.

---

### US-04: Risk Tier Classification
- **Related Requirement:** FR-04 (FR-04.1)
- **User Story:** *As a Fraud Analyst, I want transactions categorized into clear risk tiers (Low, Medium, High) with visual badges so that I can immediately identify urgent threats.*
- **Expected Behaviour:**
  - Scores 0–39 categorized as `low`.
  - Scores 40–69 categorized as `medium`.
  - Scores 70–100 categorized as `high`.
  - UI visual badges render distinct colors and labels for each tier.
- **Actual Behaviour:**
  - `server/config/scoringConfig.js` configures thresholds centrally: `low: { max: 39 }`, `medium: { max: 69 }`.
  - `getRiskLevel(score)` evaluates score against config boundaries.
  - Client component `client/src/components/ui/RiskBadge.jsx` renders appropriate styles: low (green), medium (amber), high (crimson).
- **Verification Method:** Code & Configuration Audit (`server/config/scoringConfig.js`, `server/services/scoringEngine.js#L14-L18`, `client/src/components/ui/RiskBadge.jsx`).
- **Evidence:** `server/models/Transaction.js` (`risk_level` ENUM check: 'low', 'medium', 'high').
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Ensure UI badge tooltips display triggered risk factors on hover.

---

### US-05: Transaction Flagging & Case Initiation
- **Related Requirement:** FR-05 (FR-05.1, FR-05.2)
- **User Story:** *As a Fraud Analyst or Supervisor, I want to flag suspicious transactions to automatically create an investigation case, and have the system auto-flag high-risk signals.*
- **Expected Behaviour:**
  - Manual flag creates a linked case in `flagged` status atomically.
  - Prevents duplicate flagging (returns HTTP 409 Conflict).
  - High-risk transactions scored above threshold are automatically flagged on ingestion.
- **Actual Behaviour:**
  - **Manual Flagging (FR-05.1):** `PATCH /api/transactions/:id/flag` executes inside `sequelize.transaction(...)`, setting `is_flagged = true` and creating a Case in `flagged` status. Rejects already-flagged transactions with 409. **(PASS)**
  - **Automated Auto-Flagging (FR-05.2):** `server/config/scoringConfig.js` notes: `NOTE: The final auto-flag threshold is TBD-1 in the SRS. This system only evaluates risk; it does not automatically flag cases yet.` During ingestion, high-risk transactions are scored but not automatically flagged into cases. **(PARTIALLY IMPLEMENTED / DEFERRED)**
- **Verification Method:** Source Code Review (`server/services/transactionService.js#L341-L374`, `server/config/scoringConfig.js#L6-L7`).
- **Evidence:** `server/config/scoringConfig.js`, `server/services/transactionService.js`.
- **Result:** **Partially Implemented (Manual: Pass, Auto-Flag: Deferred TBD-1)**
- **Defect / Missing Functionality:** Automated auto-flagging on high-risk ingestion is currently deferred per SRS specification note TBD-1.
- **Recommended Next Action:** Rohit Arya (Requirements) and Rishika Batra (Backend) to finalize auto-flagging threshold (proposed: score ≥ 70) and integrate automatic Case creation in `transactionService.ingestTransactions`.

---

### US-06: Case Workflow & Investigation Management
- **Related Requirement:** FR-06 (FR-06.1, FR-06.2, FR-06.3, FR-06.4, FR-06.5)
- **User Story:** *As an Investigator, I want a structured case workflow desk to transition statuses, add chronological investigation notes with evidence, and reassign cases under supervisory control.*
- **Expected Behaviour:**
  - Case desk lists cases with status tabs (`flagged`, `investigating`, `escalated`, `resolved`, `closed`).
  - Allowed state machine transitions:
    - `flagged` → `investigating`
    - `investigating` → `resolved`, `escalated`
    - `resolved` → `closed`
    - `escalated` → `closed`, `investigating` (Supervisor only)
    - Admin cannot execute state transitions (403 Forbidden).
  - Transitioning to `investigating` automatically assigns case to caller if unassigned.
  - Notes can be added with evidence reference (max 2000 chars note, max 500 chars evidence). Notes blocked on closed cases (409 Conflict).
  - Supervisor can reassign cases to analysts or supervisors; cannot assign to admin (400 Bad Request).
- **Actual Behaviour:**
  - `server/services/caseWorkflow.js` strictly enforces state transitions and role rules.
  - `server/services/caseService.js` wraps status change and optional note in a database transaction; auto-assigns caller on `investigating`; sets `closed_at` on close.
  - `POST /api/cases/:id/notes` blocks note additions on closed cases.
  - `PATCH /api/cases/:id/assign` checks supervisor role and rejects admin assignee.
  - Frontend `CaseDetailPage.jsx` provides full workspace, transition buttons, evidence timeline, and supervisor assignment dropdown.
- **Verification Method:** Source Code Review & State Transition Logic Audit (`server/services/caseWorkflow.js`, `server/services/caseService.js`, `client/src/pages/CaseDetailPage.jsx`).
- **Evidence:** `server/routes/cases.js`, `server/services/caseWorkflow.js`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None in business logic. Physical file upload for evidence is metadata-only (documented project boundary).
- **Recommended Next Action:** Ensure QA Lead tests boundary transition attempts (e.g. analyst attempting `escalated` → `investigating`).

---

### US-07: Analytics Dashboard & Fraud Trends Reporting
- **Related Requirement:** FR-07 (FR-07.1, FR-07.2, FR-07.3)
- **User Story:** *As a Supervisor or Admin, I want real-time KPI metrics, fraud trends line charts, and regional heatmaps to assess systemic threat patterns.*
- **Expected Behaviour:**
  - KPI summary calculates total transactions, total volume, flagged volume, average risk score, and counts by risk level and case status.
  - Trends line chart aggregates volume, flagged count, and average score by day or week.
  - Heatmap calculates risk metrics grouped by region/transaction type or hour/weekday.
  - Analyst access to report routes blocked with HTTP 403 Forbidden.
- **Actual Behaviour:**
  - `server/routes/reports.js` applies `authenticate, authorize('supervisor', 'admin')` to all endpoints.
  - `server/services/reportService.js` uses SQL aggregate functions (`COUNT`, `SUM`, `AVG`, `GROUP BY`) directly in SQLite for high performance.
  - `client/src/pages/ReportsPage.jsx` renders KPI stat cards, Recharts time series line chart, and tabular risk heatmap.
- **Verification Method:** Source Code Inspection (`server/routes/reports.js`, `server/services/reportService.js#L65-L250`, `client/src/pages/ReportsPage.jsx`).
- **Evidence:** `server/services/reportService.js`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Add date picker presets (Last 7 Days, Last 30 Days) on Frontend Reports page.

---

### US-08: Authentication & Role-Based Access Control (RBAC)
- **Related Requirement:** FR-08 (FR-08.1, FR-08.2, FR-08.3)
- **User Story:** *As a System Administrator, I want secure JWT authentication, strict role-based access control, and user account provisioning.*
- **Expected Behaviour:**
  - `POST /api/auth/login` returns signed JWT and safe user object. Fails with generic message on wrong credentials.
  - Passwords hashed with bcrypt (salt rounds ≥ 10).
  - Protected endpoints require `Authorization: Bearer <token>`.
  - Roles enforced: `analyst`, `supervisor`, `admin`.
  - Admin can create new users (`POST /api/auth/users`) and list users (`GET /api/auth/users`). Non-admins receive 403.
  - Password hashes strictly excluded from all API responses.
- **Actual Behaviour:**
  - `server/services/authService.js` hashes passwords via `bcrypt.hash(plain, 10)`. User model scope excludes `password_hash`.
  - `server/middleware/auth.js` verifies token and re-verifies user existence in SQLite database.
  - Generic 401 "Invalid username or password" prevents username enumeration.
  - `GET /api/auth/users` specifies explicit attributes `['id', 'username', 'role', 'created_at']`.
- **Verification Method:** Source Code Review (`server/middleware/auth.js`, `server/services/authService.js`, `server/routes/auth.js`).
- **Evidence:** `server/models/User.js` (`defaultScope: { attributes: { exclude: ['password_hash'] } }`).
- **Result:** **Pass**
- **Defect / Missing Functionality:** No refresh token mechanism (tokens expire strictly after 8h; client re-login required). Logout is stateless client-side discard + audit log.
- **Recommended Next Action:** Document token expiration handling in user session guide.

---

### US-09: Audit Logging & Security Activity Trail
- **Related Requirement:** FR-09 (FR-09.1, FR-09.2)
- **User Story:** *As a Compliance Officer, I want all sensitive operations recorded in a tamper-evident, append-only audit trail accessible only to Supervisors and Admins.*
- **Expected Behaviour:**
  - Audits events: Logins (success/fail), logout, user creation, transaction ingestion, transaction viewing, transaction flagging, case creation, status changes, notes, assignments, report exports.
  - Audit trail is append-only: updates and deletes rejected.
  - Audit write failures do not interrupt primary user requests.
  - Audit logs viewable via paginated, filterable API (`GET /api/audit`) and UI page.
- **Actual Behaviour:**
  - `server/services/auditLogger.js` defines `ACTIONS` enum. Strips `password`, `password_hash`, `token`. Wraps DB call in non-throwing try/catch.
  - `server/models/AuditLog.js` attaches `beforeUpdate` and `beforeDestroy` hooks that throw errors.
  - `server/routes/audit.js` enforces `authorize('supervisor', 'admin')`.
  - `client/src/pages/AuditLogsPage.jsx` renders audit records and warns non-privileged roles.
- **Verification Method:** Source Code Review (`server/services/auditLogger.js`, `server/models/AuditLog.js`, `server/routes/audit.js`).
- **Evidence:** `server/models/AuditLog.js#L31-L39`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Add IP address capture in `req.ip` for enhanced audit forensics.

---

### US-10: Data Export Service (CSV & PDF)
- **Related Requirement:** FR-10 (FR-10.1, FR-10.2)
- **User Story:** *As a Supervisor, I want to export case investigation logs in CSV and executive fraud summaries in PDF format with defense against formula injection.*
- **Expected Behaviour:**
  - `GET /api/reports/export?format=csv&type=cases` streams sanitized CSV text.
  - Protects against CSV formula injection (`=`, `+`, `-`, `@`).
  - Caps CSV export at 5,000 rows.
  - `GET /api/reports/export?format=pdf&type=fraud_summary` streams binary PDF document.
- **Actual Behaviour:**
  - `server/services/reportService.js` (`exportCasesCSV`): sanitizes text fields, replacing leading formula triggers with `'`. Enforces `limit: 5000`.
  - `exportFraudSummaryPDF` builds multi-page PDF stream via `pdfkit` with KPI boxes and distribution tables.
- **Verification Method:** Source Code Review (`server/services/reportService.js#L252-L390`).
- **Evidence:** `server/routes/reports.js#L45-L53`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** None.
- **Recommended Next Action:** Add automated MIME-type and Content-Disposition header verification in QA tests.

---

### US-11: Requirements Traceability, Coverage Verification & Quality Assurance
- **Related Requirement:** FR-11 (FR-11.1, FR-11.2)
- **User Story:** *As the Requirements Engineer, I want bidirectional traceability between SRS requirements, architecture, API contracts, demo data, and test evidence.*
- **Expected Behaviour:**
  - Maintain complete Requirements Traceability Matrix (`docs/requirements-traceability-matrix.md`) covering FR-01 to FR-11 and NFRs.
  - Maintain comprehensive validation report (`docs/requirements-validation-report.md`) detailing verification results and gaps.
  - Coordinate missing implementation and testing tasks across team roles.
- **Actual Behaviour:**
  - Rohit Arya created and baseline-verified `docs/requirements-traceability-matrix.md`, `docs/requirements-validation-report.md`, and `docs/auth-audit-requirements.md`.
  - Identified automated test suite gap in `tests/` (`tests/.gitkeep` only, `package.json` test script unconfigured).
  - Validated demo dataset (`docs/demo-data/`) with automated auditor.
- **Verification Method:** Artifact Inspection & Project Audit.
- **Evidence:** `docs/requirements-traceability-matrix.md`, `docs/demo-data/validate_demo_data.py`.
- **Result:** **Pass**
- **Defect / Missing Functionality:** Automated test files in `tests/` are pending setup by QA Lead Rishabh Jain.
- **Recommended Next Action:** Rishabh Jain to implement Jest/Supertest test suites targeting the verified endpoints.

---

## 3. Non-Functional & Environmental Verification Summary

| Area | Target Specification | Current State | Verification Assessment |
| :--- | :--- | :--- | :--- |
| **Node.js Environment** | Node.js ≥ 18.x, npm ≥ 9.x | Node.js and npm not recognized in host terminal PATH | Runtime startup of live dev server could not be executed directly in this environment. Static and programmatic validation via Python was executed. |
| **Git Version Control** | Work isolated on `feature/rohit-requirements` | Git binary not recognized in host terminal PATH; `.git` directory absent in project folder | Work conducted with strict adherence to file ownership rules: zero teammate code files modified; all changes restricted to `docs/` and requirement assets. |
| **Automated Test Harness** | Unit & integration tests in `tests/` | `tests/.gitkeep` only; `package.json` has unconfigured test script | Documented as primary gap for QA Lead Rishabh Jain. Features verified through code inspection and static schema audit. |
| **Schema Integrity** | SQLite tables and foreign keys | 100% compliant with `server/db/schema.sql` | Verified via automated validator `docs/demo-data/validate_demo_data.py`. |

---

## 4. Defect & Action Item Summary

```mermaid
flowchart TD
    Gap1["Gap 1: Auto-Flagging Threshold (TBD-1)"] --> Act1["Action: Rohit & Rishika Batra finalize threshold (Score >= 70)"]
    Gap2["Gap 2: Missing Automated Test Suite (tests/)"] --> Act2["Action: Rishabh Jain implement Jest test harness"]
    Gap3["Gap 3: Token Invalidation on Logout"] --> Act3["Action: Rishika Batra consider Redis / In-memory token blacklist"]
```

1. **Defect / Deferral 1 (FR-05.2 Auto-Flagging):** Scorer computes risk, but automated Case creation on high risk is deferred per SRS note TBD-1. *Action: Rohit Arya and Rishika Batra to agree on threshold and activate auto-flagging in `ingestTransactions`.*
2. **Defect / Deferral 2 (QA Automated Test Coverage):** Directory `tests/` contains only `.gitkeep`. *Action: Rishabh Jain (QA Lead) to write unit and endpoint integration tests.*
3. **Architectural Notice (Token Expiry & Blacklisting):** Stateless JWT logout requires client-side deletion; tokens remain cryptographically valid until 8-hour expiry. *Action: Documented in `docs/auth-audit-requirements.md`.*
