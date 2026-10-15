# Master Test Plan: Fraud Detection Management Dashboard

**Project**: SentinelGuard Fraud Detection Management System  
**Document**: Test Plan & Verification Strategy  
**Version**: 1.0.0  
**Date**: October 2026  
**Status**: Approved  

---

## 1. Purpose and Scope

### 1.1 Purpose
The purpose of this Test Plan is to define the testing strategy, verification methods, test environment configuration, test case traceability, and quality benchmarks for the **Fraud Detection Management Dashboard (SentinelGuard)**. This document serves as the master blueprint to ensure that the system reliably ingests transactions, accurately calculates fraud risk scores, enforces strict role-based access control (RBAC), manages the investigation case lifecycle through robust state machine transitions, maintains an immutable security audit trail, and renders intuitive frontend visual analytics.

### 1.2 Scope

#### In-Scope
The test plan covers all core components across both the frontend React client and the backend Node.js/Express service:
- **Upstream Transaction Ingestion & Ingestion API**: Payload validation, single and batch transaction persistence, schema enforcement, and simulated streaming feed modal.
- **Rule-Based Scoring Engine**: Pluggable risk evaluation algorithms, multi-factor scoring rules (high amount, rapid frequency, unusual hours, high-risk merchant/location), score capping (0–100), and risk tier categorization (`low`, `medium`, `high`).
- **Data Access & Persistence Layer**: SQLite database interactions managed via Sequelize ORM, relational model constraints, transactional rollbacks, cascade behaviors, and index performance.
- **Authentication & RBAC**: JWT credential verification, token expiration (8 hours), password hashing (`bcryptjs`), and role authorization policies across `analyst`, `supervisor`, and `admin` roles.
- **Case Investigation Workflow**: Manual transaction flagging, investigation state transitions (`flagged` → `investigating` → `resolved`/`escalated` → `closed`), supervisor re-assignment, and chronological analyst notes.
- **Security Audit Logging**: Synchronous and asynchronous logging of security and operational events (logins, logouts, transactions, status mutations, assignments, exports) with role-restricted audit search and filtering.
- **Dashboard & Analytics UI**: Interactive React dashboard components, KPI metric summaries, Recharts trend lines, risk heatmap aggregation matrices, and report export streaming (CSV and PDF).
- **Automated CI Integration**: Test automation in Continuous Integration pipelines, execution exit codes, and regression prevention.

#### Out-of-Scope
- Production live banking payment gateway settlement integrations (simulated in sandbox).
- External identity provider federation (e.g., SAML/SSO or OAuth2 third-party providers).
- Distributed message streaming broker stress testing (e.g., Apache Kafka cluster failover).
- End-user hardware compatibility testing beyond modern evergreen web browsers (Chrome, Firefox, Safari, Edge).

---

## 2. Test Types

To ensure full test pyramid coverage, the SentinelGuard system employs four distinct testing types:

```
          / \
         /   \
        / UI  \        <-- UI / Component & Flow Tests (React, Modals, Charts)
       /-------\
      / Integr- \      <-- Integration Tests (Supertest + Express + SQLite)
     /   ation   \
    /-------------\
   /     Unit      \   <-- Unit Tests (Scoring Rules, Validators, Workflow)
  /-----------------\
  [ CI Automation ]    <-- Continuous Integration Harness (All stages automated)
```

### 2.1 Unit Testing
- **Focus**: Isolation testing of pure business logic, algorithmic score computations, input validation routines, and state transition validation without external dependencies.
- **Coverage**:
  - `scoringEngine.js` and `scoringRules.js`: Point accumulation, threshold evaluation, maximum score capping at 100, and factor explanation arrays.
  - `transactionValidator.js`: Payload structure validation, data type enforcement, timestamp checks, and boundary handling.
  - `caseWorkflow.js`: Valid and invalid state transitions, role-based transition restrictions (blocking admins from case transitions, restricting supervisor escalations).
- **Execution Tool**: Jest with isolated in-memory test mocks.

### 2.2 Integration Testing
- **Focus**: Verification of cross-layer integration between HTTP route controllers, authentication/authorization middleware, service layers, Sequelize ORM models, and the database engine.
- **Coverage**:
  - Transaction ingestion endpoints (`POST /api/transactions`) handling single objects and batch arrays.
  - Transaction retrieval and filtering (`GET /api/transactions`, `GET /api/transactions/:id`).
  - Auth workflows (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, user creation).
  - Case management endpoints (`GET /api/cases`, `PATCH /api/cases/:id/status`, `POST /api/cases/:id/notes`, `PATCH /api/cases/:id/assign`).
  - Audit logging persistence verification on all mutating API calls.
  - Reports and analytics aggregation endpoints (`GET /api/reports/summary`, `trends`, `heatmap`, `export`).
- **Execution Tool**: Supertest paired with Jest, executing against an ephemeral in-memory SQLite database.

### 2.3 UI Testing
- **Focus**: End-to-end user experience, interactive DOM elements, client-side routing, state management via React Context, dynamic chart rendering, and asynchronous data presentation.
- **Coverage**:
  - `DashboardPage.jsx`: Real-time transaction tables, risk badge rendering, filter bars, detail modal inspection, and transaction flagging modal.
  - `CasesPage.jsx` & `CaseDetailPage.jsx`: Workflow status tab filtering, investigation workspace, timeline notes submission, and re-assignment select menus.
  - `ReportsPage.jsx`: Dynamic KPI cards, Recharts time-series graphs, risk heatmaps, and CSV/PDF export download triggers.
  - `LoginPage.jsx`: Form validation, authentication state preservation, and RBAC-gated UI elements.
- **Execution Tool**: React component and DOM integration test suites (React Testing Library / Jest DOM / Browser testing subagents).

### 2.4 CI (Continuous Integration) Testing
- **Focus**: Automated pipeline orchestration ensuring that every commit and pull request runs all verification stages before merging into the main branch.
- **Pipeline Stages**:
  1. **Lint & Static Analysis**: Enforcing coding conventions and syntax standards.
  2. **Unit Test Suite**: Fast-feedback execution of pure algorithmic and business rule tests.
  3. **Integration Test Suite**: Automated execution of all API endpoint suites against in-memory SQLite with zero external dependencies.
  4. **Frontend Build Verification**: `vite build` verification ensuring production assets bundle without errors.
  5. **Exit Code & Gate Enforcement**: Non-zero exit code on any failure immediately blocks branch merging.

---

## 3. Test Environment

The test environment is engineered for high execution velocity, zero side-effects, full determinism, and complete reproducibility across local developer machines and CI runners.

### 3.1 Core Architecture & Stack
| Component | Technology | Version / Specification | Role in Testing |
|:---|:---|:---|:---|
| **Runtime Environment** | Node.js | `>= 18.x LTS` | Host execution runtime for backend server and test harnesses |
| **Test Runner & Framework** | Jest | `^29.x` | Test discovery, runner, assertion library (`expect`), mock system, and coverage reporting |
| **HTTP Assertion Library** | Supertest | `^6.x` | Fluent HTTP testing of Express routes without binding to physical network ports |
| **Ephemeral Database** | SQLite (In-Memory) | `sqlite3` via Sequelize ORM | Ultra-fast in-memory database (`:memory:`) providing total suite isolation |
| **Object Relational Mapper** | Sequelize | `^6.37.x` | Schema synchronization (`sync({ force: true })`), transactional isolation, and model querying |
| **Frontend Test Harness** | Vitest / React Testing Library | Modern DOM Test Stack | Virtual DOM component rendering, user event simulation, and UI assertion |

### 3.2 In-Memory SQLite Isolation Strategy
To prevent test pollution, race conditions, and disk persistence contamination, the integration test suites run against an ephemeral in-memory SQLite instance:
- **Database Configuration**:
  ```javascript
  // Set dynamically in test setup
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = ':memory:';
  process.env.JWT_SECRET = 'sentinelguard-test-jwt-secret-key-2026';
  ```
- **Lifecycle Hooks**:
  - `beforeAll`: Synchronize database schema via `sequelize.sync({ force: true })` and seed prerequisite roles/users.
  - `beforeEach`: Wrap or clean state between individual test cases to ensure strict test independence.
  - `afterAll`: Close Sequelize connection pool (`await sequelize.close()`) to prevent open handle leaks.

### 3.3 Test Environment Variables & Configuration
| Variable | Value for Testing | Purpose |
|:---|:---|:---|
| `NODE_ENV` | `test` | Suppresses verbose console logs; disables production safeguards |
| `DB_PATH` | `:memory:` | Directs Sequelize to instantiate ephemeral SQLite in RAM |
| `PORT` | `5001` (or dynamic ephemeral port) | Local server test port |
| `JWT_SECRET` | `sentinelguard-test-jwt-secret-key-2026` | Deterministic secret for signing and validating test JWT tokens |

---

## 4. Requirements Traceability Matrix

The following traceability table maps every functional requirement (FR-01 through FR-11) directly to its architectural module, verification test type, corresponding test file, and expected result.

| FR ID | Requirement | Module | Test Type | Test File | Expected Result |
|:---|:---|:---|:---|:---|:---|
| **FR-01** | Upstream Transaction Ingestion & Ingestion API | Transaction Service (`server/routes/transactions.js`, `server/services/transactionService.js`, `server/services/transactionValidator.js`) | Integration | `tests/transactions.test.js` | Single transaction payloads and batch transaction arrays are validated, stored in SQLite, and return HTTP `201 Created` with scored records. Malformed payloads (missing required fields, negative amounts, invalid types) return HTTP `400 Bad Request` with structured error details. |
| **FR-02** | Rule-Based Fraud Risk Scoring Engine | Scoring Engine (`server/services/scoringEngine.js`, `server/services/scoringRules.js`) | Unit | `tests/scoringEngine.test.js` | Individual rule functions evaluate transaction attributes (transaction velocity, high amount thresholds, unusual operational hours, risky merchant category/region), assign designated risk points, accumulate total score capped at 100, and produce an array of explanatory risk factor strings. |
| **FR-03** | Risk Tier Classification & Scorer Extensibility | Scoring Engine (`server/services/scoringEngine.js`, `server/config/scoringConfig.js`) | Unit | `tests/scoringEngine.test.js` | Calculated numerical scores are accurately mapped into risk level tiers: `low` (0–39), `medium` (40–69), and `high` (70–100). The pluggable scorer interface (`setScorer`) permits swapping the default rule engine with an alternative/ML scorer without impacting calling services. |
| **FR-04** | Relational Data Persistence & Association Integrity | Data Access Layer (`server/models/*`, SQLite / Sequelize ORM) | Integration | Covered by the integration tests (`tests/transactions.test.js`, `tests/cases.test.js`, `tests/auth.test.js`) | Relational database schema enforces foreign key constraints, default timestamps (`created_at`, `updated_at`), transactional integrity, and entity associations (Transaction ↔ Case ↔ CaseNote ↔ User ↔ AuditLog). Rollbacks occur cleanly on transaction failure without orphan records. |
| **FR-05** | User Authentication & Role-Based Access Control (RBAC) | Authentication Service & Middleware (`server/routes/auth.js`, `server/services/authService.js`, `server/middleware/auth.js`) | Integration | `tests/auth.test.js` | Valid user credentials yield signed JWT (8-hour expiry) and user payload; invalid credentials return HTTP `401 Unauthorized`. RBAC middleware permits authorized access and returns HTTP `403 Forbidden` when analysts attempt administrative endpoints or admins attempt case mutations. Sensitive hashes (`password_hash`) are excluded from responses. |
| **FR-06** | Security Activity & System Audit Logging | Audit Logging Service (`server/routes/audit.js`, `server/services/auditLogger.js`, `server/models/AuditLog.js`) | Integration | `tests/cases.test.js` | Mutating system operations (user logins, logouts, case creation, status transitions, analyst notes, supervisor re-assignments, report exports) generate immutable audit records. Authorized users (Supervisor/Admin) can query and paginate audit logs via `GET /api/audit`. |
| **FR-07** | Case Workflow & Investigation Management | Case Service & Workflow Engine (`server/routes/cases.js`, `server/services/caseService.js`, `server/services/caseWorkflow.js`) | Integration | `tests/cases.test.js` | Manual flagging creates an investigation case in `flagged` status. Allowed transitions (`flagged` → `investigating` → `resolved`/`escalated` → `closed`) succeed and auto-assign active analyst. Disallowed transitions and non-supervisor escalations return HTTP `400 Bad Request`. Supervisors can re-assign cases, and notes append chronologically. |
| **FR-08** | Real-Time Transaction Monitoring Dashboard | Frontend Dashboard (`client/src/pages/DashboardPage.jsx`, `client/src/components/*`) | UI | UI tests (`client/src/pages/DashboardPage.test.jsx`) | Renders real-time transaction table with color-coded risk level badges (`low`, `medium`, `high`), dynamic search, type/region filter dropdowns, transaction detail modal with risk breakdown, and ingestion simulation modal. Manual flagging updates UI state and indicates linked case creation. |
| **FR-09** | Fraud Analytics & KPI Summary Visualizations | Frontend Reports & Summary Cards (`client/src/pages/ReportsPage.jsx`, `client/src/components/StatCard.jsx`) | UI | UI tests (`client/src/pages/ReportsPage.test.jsx`) | Displays operational KPI summary metrics (total volume, flagged count, average risk score, high-risk percentage). Renders interactive Recharts line graph illustrating fraud trends over daily and weekly intervals with dynamic date-range selector. |
| **FR-10** | Risk Heatmap Matrix & Data Export Service | Frontend Reports & Export Service (`client/src/pages/ReportsPage.jsx`, `server/routes/reports.js`, `server/services/reportService.js`) | UI | UI tests (`client/src/pages/ReportsPage.test.jsx`) | Displays regional and transaction type risk cross-tabulation heatmap. Export action buttons trigger backend generation, downloading structured CSV (`cases-*.csv`) and binary formatted PDF (`fraud_summary-*.pdf`) files with appropriate HTTP headers (`Content-Disposition: attachment`). |
| **FR-11** | End-to-End Requirement Traceability & Governance | Quality Assurance & Documentation (`docs/test-plan.md`, `docs/traceability-matrix.md`) | CI | This document (`docs/test-plan.md`) | Provides 100% bidirectional traceability between functional requirements (FR-01 to FR-11), implementation modules, automated test suites, test types, and verifiable acceptance criteria. Serves as the quality gate standard for release qualification. |

---

## 5. Test Suite Specifications

### 5.1 `tests/transactions.test.js` (Ingestion & Filtering Integration)
- **Target Functional Requirements**: FR-01, FR-04
- **Key Test Cases**:
  - `POST /api/transactions` with valid single transaction: verifies HTTP 201, auto-scoring execution, risk score assignment, and SQLite persistence.
  - `POST /api/transactions` with array payload: verifies batch processing, reporting counts of saved vs. rejected items.
  - `POST /api/transactions` with malformed data (negative amount, missing merchant, invalid currency): verifies HTTP 400 with descriptive error array.
  - `GET /api/transactions`: verifies pagination (`page`, `limit`), sorting (`timestamp`, `risk_score`), and filtering (`risk_level`, `type`, `region`).
  - `GET /api/transactions/:id`: verifies retrieval of specific transaction and associated case object (or null).
  - `PATCH /api/transactions/:id/flag`: verifies analyst/supervisor can flag transaction, verifying case creation and audit entry.

### 5.2 `tests/scoringEngine.test.js` (Risk Scoring Engine Unit)
- **Target Functional Requirements**: FR-02, FR-03
- **Key Test Cases**:
  - Rule execution: `high_amount` triggers points when transaction amount exceeds ₹50,000.
  - Rule execution: `unusual_hour` evaluates transactions occurring between 01:00 and 05:00 UTC.
  - Rule execution: `rapid_frequency` flags multiple transactions originating from same card within 5 minutes.
  - Rule execution: `high_risk_region` and `suspicious_merchant` trigger appropriately.
  - Score ceiling: Verifies that cumulative points exceeding 100 are strictly capped at 100.
  - Score floor: Verifies that negative point accumulations are bounded at 0.
  - Risk tier mapping: Verifies boundary conditions for `low` (39 vs 40), `medium` (69 vs 70), and `high`.
  - Pluggable engine: Verifies `setScorer` replaces the default scorer function.

### 5.3 `tests/auth.test.js` (Authentication & RBAC Integration)
- **Target Functional Requirements**: FR-04, FR-05
- **Key Test Cases**:
  - `POST /api/auth/login`: valid username/password returns HTTP 200 with signed JWT containing `{ id, username, role }`.
  - `POST /api/auth/login`: invalid credentials return HTTP 401 Unauthorized.
  - Protected endpoints without `Authorization: Bearer <token>` return HTTP 401 Unauthorized.
  - Tampered or expired JWT tokens return HTTP 401 Unauthorized.
  - RBAC verification: Analysts accessing admin user management endpoints (`POST /api/auth/users`) receive HTTP 403 Forbidden.
  - RBAC verification: Admins attempting case state mutation (`PATCH /api/cases/:id/status`) receive HTTP 403 Forbidden.
  - Password security: Verifies `password_hash` is never serialized in responses for `GET /api/auth/me` or `GET /api/auth/users`.

### 5.4 `tests/cases.test.js` (Case Workflow & Audit Logging Integration)
- **Target Functional Requirements**: FR-04, FR-06, FR-07
- **Key Test Cases**:
  - Workflow state machine: Valid transition `flagged` → `investigating` automatically assigns case to requesting analyst.
  - Workflow state machine: Valid transition `investigating` → `resolved` or `escalated`.
  - Workflow state machine: Invalid transition (e.g., `flagged` → `closed`) rejected with HTTP 400 Bad Request.
  - Escalation permissions: Analyst attempting to transition an `escalated` case back to `investigating` receives HTTP 403 / 400; supervisor succeeds.
  - Case notes: `POST /api/cases/:id/notes` appends new note with author attribution and timestamp.
  - Supervisor re-assignment: `PATCH /api/cases/:id/assign` by supervisor updates `assigned_to` and records audit entry.
  - Audit logging verification: Queries `AuditLog` table to verify records exist for every executed action (`CASE_CREATED`, `CASE_STATUS_CHANGED`, `CASE_NOTE_ADDED`, `CASE_ASSIGNED`).

### 5.5 UI Component & Flow Tests (Dashboard, Cases, Reports)
- **Target Functional Requirements**: FR-08, FR-09, FR-10
- **Key Test Cases**:
  - `DashboardPage`: renders transaction data grid, applies search filter, opens transaction detail modal, and triggers manual flag modal.
  - `CasesPage` & `CaseDetailPage`: renders case status tabs, filters by status, validates button enabling/disabling based on workflow state.
  - `ReportsPage`: renders summary KPI cards with formatted INR currency, renders Recharts trend SVG elements, and renders risk heatmap matrix.
  - Export flow: Clicking "Export Cases (CSV)" and "Export Fraud Summary (PDF)" initiates HTTP download with valid blob responses.

---

## 6. Defect Severity & Classification

Defects encountered during automated or exploratory testing are categorized by severity:

| Severity Level | Definition | Response Expectation | Block Release? |
|:---|:---|:---|:---:|
| **P0 - Critical** | Crash, data loss, security bypass, unauthorized access, broken scoring engine, or test suite failure | Immediate hotfix; all progress blocked until resolved | **YES** |
| **P1 - Major** | Core workflow blocked (e.g., case transition fails, CSV export fails, flag button non-functional) with no workaround | Must be resolved before milestone qualification | **YES** |
| **P2 - Moderate** | Non-critical UI glitch, formatting anomaly, or missing non-essential validation message | Scheduled for resolution in current sprint | Conditional |
| **P3 - Minor** | Cosmetic defect, minor alignment issue, or typo in non-critical label | Backlog resolution | No |

---

## 7. Entry and Exit Criteria

### 7.1 Entry Criteria
Testing phases may commence only when the following prerequisites are fulfilled:
1. **Environment Readiness**: Node.js (`>= 18.x LTS`) installed, all project dependencies installed via `npm install` across both `server/` and `client/`.
2. **Configuration Availability**: Test environment variables (`NODE_ENV=test`, `DB_PATH=:memory:`, `JWT_SECRET`) configured and verified.
3. **Database Migration State**: In-memory SQLite database synchronization routines (`sequelize.sync`) execute cleanly without SQL syntax or model definition errors.
4. **Code Baseline**: Application code compiles cleanly without fatal syntax errors; core services (`scoringEngine`, `transactionService`, `caseService`, `authService`) available for import.
5. **Baseline Fixtures**: Deterministic test fixtures (mock users, default transactions, seed data factories) prepared.

### 7.2 Exit Criteria
Testing is deemed complete and the release candidate is approved when all of the following benchmarks are satisfied:
1. **100% Test Pass Rate**: All automated test suites (`tests/transactions.test.js`, `tests/scoringEngine.test.js`, `tests/auth.test.js`, `tests/cases.test.js`, and UI suites) pass with zero failures and zero unhandled errors (`exit code 0`).
2. **Zero Open Critical / Major Defects**: There are no open P0 (Critical) or P1 (Major) bugs in the issue tracker or test reports.
3. **Traceability Fulfillment**: Every functional requirement from FR-01 through FR-11 is verified against its mapped test files with documented passing evidence.
4. **Code Coverage Thresholds**:
   - Minimum **85%** statement coverage across core business services (`server/services/`).
   - Minimum **90%** branch coverage across the fraud scoring rules engine (`scoringRules.js`, `scoringEngine.js`).
5. **CI Pipeline Clean Run**: Continuous Integration pipeline completes the full build, lint, and test cycle without manual overrides or skipped tests.
6. **Formal Quality Sign-Off**: Verification sign-off received from QA, Frontend, and Backend leads.

### 7.3 Suspension and Resumption Criteria
- **Suspension**: Testing is suspended if a blocking P0 defect prevents test execution (e.g., database schema initialization fails or auth middleware systematically rejects valid tokens).
- **Resumption**: Testing resumes once the offending defect is patched, committed, and verified via an isolated regression run.

---

## 8. Governance and Sign-Off

| Role | Name | Responsibilities | Status |
|:---|:---|:---|:---:|
| **Frontend & Architecture Lead** | Rishika Nigam | UI test suite verification, client integration, and build qualification | Approved |
| **Backend & Scoring Lead** | Rishika Batra | Scoring engine accuracy, API contracts, in-memory SQLite setup | Approved |
| **SRS & Requirements Lead** | Rohit | Functional requirement alignment and acceptance criteria validation | Approved |
| **QA & Test Lead** | Rishabh Jain | Test plan stewardship, test execution governance, exit criteria verification | Approved |
