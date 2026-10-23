# Test Summary Report: Fraud Detection Management Dashboard

**Course:** CS311L Software Engineering | **Instructor:** Mr. Sachin Kumar Rai
**Originally prepared by:** Rishabh Jain (Testing), 16 October 2026
**Updated by:** Rishika Batra (Developer), 23 October 2026, after the CSV upload feature and the removal of sample-data fallbacks

## 1. Environment
Node 24, Jest 30 + Supertest (backend), Vitest 2.1.9 + jsdom + React Testing Library (frontend), GitHub Actions CI (runs on every push and on PRs to main). Backend tests use an in-memory SQLite database.

## 2. Results

| Area | Suites / Files | Tests | Passed | Failed |
|---|---|---|---|---|
| Backend (Jest) | 3 | 54 | 54 | 0 |
| Frontend (Vitest) | 8 | 46 | 46 | 0 |
| **Total** | **11** | **100** | **100** | **0** |

Backend suites: `tests/scoringEngine.test.js` (23 unit tests for fraud risk scoring), `tests/flow.test.js` (10 integration tests of the API flow), `tests/csvUpload.test.js` (21 tests of the CSV upload endpoint).
Frontend files: dashboard, case detail, cases, login, upload, audit logs, reports and the money-formatting helper (`formatMoney`).

Since the first version of this report (40 tests), 60 tests were added for the CSV upload feature, the currency formatting helper, and the removal of mock-data fallbacks from the Cases, Case Detail, Dashboard, Audit Logs and Reports pages.

## 3. Backend code coverage (`npx jest --coverage`, measured 22 October 2026)

| Metric | 16 Oct | 22 Oct |
|---|---|---|
| Statements | 36.01% | 55.00% |
| Branches | 20.00% | 41.46% |
| Functions | 40.77% | 62.93% |
| Lines | 39.65% | 59.28% |

The backend has not changed since that measurement.
Well covered: `scoringEngine.js`, `scoringRules.js`, `scoringConfig.js` (100%), `auditLogger.js` (92.3%), `transactionValidator.js` (91.3%), `csvImportService.js` (90.3%), `middleware/auth.js` (86.4%), `routes/transactions.js` (70.5%).
Weakly covered: `routes/audit.js` (11.3%), `caseService.js` (26.1%), `reportService.js` (33.0%), `routes/reports.js` (36.4%), `routes/cases.js` (40.0%), `caseWorkflow.js` (41.2%), `authService.js` (44.7%).
Frontend coverage was not measured.

## 4. Feature areas tested
- **Fraud risk scoring:** thoroughly tested (unit tests, 100% coverage).
- **Transaction ingestion, auth, case creation, audit logging:** covered by the integration flow tests, with partial coverage.
- **CSV upload:** validation, header matching, duplicate detection, dry run, role restrictions, size limits and the source filter are covered by 21 backend tests and the upload page tests.
- **Screens:** the Dashboard, Cases, Case Detail, Audit Logs, Reports, Login and Upload screens have component tests, including loading, error and empty states. When the API fails, these pages are tested to show an error with a Try again button and never show sample data.
- **Reports and audit-log retrieval on the backend:** weakly tested (see limitations).

See `docs/traceability-matrix.md` for the requirement-to-test mapping.

## 5. Manual verification (22 October 2026)
The CSV upload was tested end to end in the browser with `docs/sample-data/sample-transactions.csv`, logged in as an analyst:
- A dry run showed 10 valid rows and all 7 columns matched, and saved nothing.
- The import saved 10 transactions marked "Uploaded"; the 3 high-risk rows (score 75) were flagged and had cases created automatically.
- Uploading the same file again reported 10 duplicates and 0 valid rows.
- The Source filter on the Dashboard showed only the uploaded rows.
- Logged in as admin, the Upload Data menu item was not shown.

## 6. Defects found
| # | Description | Severity | Status |
|---|---|---|---|
| #13 | High-risk transactions did not automatically create a case | High | Fixed (commit 40e2cf7), closed |
| #14 | Cases and Case Detail pages silently fell back to mock data when the API failed | Medium | Fixed and closed |
| #23 | Dashboard, Audit Logs and Reports pages fell back to sample data when the API failed | High for Audit Logs, Medium for the others | Fixed and closed |

## 7. Known limitations
- Overall backend coverage is 55%. Audit routes, case service, report service and several route branches are weakly tested.
- Frontend coverage was not measured. Chart rendering on the Reports page is not verified by automated tests, because charts have no size in the test environment.
- No automated end-to-end browser tests, performance tests or security tests were run. The upload endpoint was reviewed manually for size limits, role restrictions and spreadsheet-formula escaping in exports.
- Fraud scoring compares raw amounts and does not convert between currencies.
- Uploaded timestamps without a timezone are treated as UTC.
- All automated test data is synthetic. The upload feature accepts real data, but no real dataset has been uploaded and tested yet.

## 8. Conclusion
All 100 automated tests pass and CI is green. The core scoring logic is well verified, and the CSV upload feature is covered by automated and manual tests. Testing and review found three defects (#13, #14, #23), and all three are fixed and closed. Before real data is used in earnest, the weakly covered report, case and audit services should get more tests.

**Sign-off:** Rishabh Jain (Testing Team) for the original report; Rishika Batra (Developer) for the 22 and 23 October updates.
