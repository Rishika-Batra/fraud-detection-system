# Test Summary Report: Fraud Detection Management Dashboard

**Course:** CS311L Software Engineering | **Instructor:** Mr. Sachin Kumar Rai
**Tested by:** Rishabh Jain (Testing) | **Date:** 16 October 2026

## 1. Environment
Node 24, Jest 30 + Supertest (backend), Vitest 2.1.9 + jsdom + React Testing Library (frontend), GitHub Actions CI (runs on every push and on PRs to main). Backend tests use an in-memory SQLite database.

## 2. Results

| Area | Suites / Files | Tests | Passed | Failed |
|---|---|---|---|---|
| Backend (Jest) | 2 | 33 | 33 | 0 |
| Frontend (Vitest) | 3 | 7 | 7 | 0 |
| **Total** | **5** | **40** | **40** | **0** |

Backend suites: `tests/scoringEngine.test.js` (23 unit tests for fraud risk scoring), `tests/flow.test.js` (10 integration tests of the API flow).
Frontend files: `dashboard.test.jsx` (3), `caseDetail.test.jsx` (2), `login.test.jsx` (2).

## 3. Backend code coverage (`npx jest --coverage`)

| Metric | Result |
|---|---|
| Statements | 36.01% |
| Branches | 20% |
| Functions | 40.77% |
| Lines | 39.65% |

Well covered: `scoringEngine.js`, `scoringRules.js`, `scoringConfig.js` (100%), `auditLogger.js` (92.3%), `transactionValidator.js` (78.3%), `middleware/auth.js` (77.3%).
Weakly covered: `reportService.js` (2.65%), `routes/audit.js` (11.3%), `routes/reports.js` (30.3%), `caseService.js` (26.1%), `transactionService.js` (27.9%), `authService.js` (44.7%).
Frontend coverage was not measured.

## 4. Feature areas tested
- **Fraud risk scoring:** thoroughly tested (unit tests, 100% coverage).
- **Transaction ingestion, auth, case creation, audit logging:** covered by the integration flow tests, with partial coverage.
- **Dashboard, case detail and login screens:** covered by frontend component tests.
- **Reports and audit-log retrieval:** almost untested (see limitations).

See `docs/traceability-matrix.md` for the requirement-to-test mapping.

## 5. Defects found
| # | Description | Severity | Status |
|---|---|---|---|
| #13 | High-risk transactions did not automatically create a case | High | Fixed (commit 40e2cf7), closed |
| #14 | Cases and Case Detail pages silently fall back to mock data when the API fails | Medium | Open, assigned to Rishika Nigam |

## 6. Known limitations
- Overall backend coverage is low (36%). Reports, audit routes and several service branches are not tested.
- Frontend coverage was not measured and only 3 screens have tests.
- No end-to-end browser tests, performance tests or security tests were run.
- Issue #14 is still open.
- All test data is synthetic. No real transaction data was used.

## 7. Conclusion
All 40 automated tests pass and CI is green. The core scoring logic is well verified and the testing found and fixed one high-severity defect. The system is suitable for demonstration with synthetic data. More tests for reports and audit logging are recommended before any real-data use.

**Sign-off:** Rishabh Jain, Testing Team
