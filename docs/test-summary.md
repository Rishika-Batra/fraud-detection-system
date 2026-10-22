# Test Summary Report: Fraud Detection Management Dashboard

**Course:** CS311L Software Engineering | **Instructor:** Mr. Sachin Kumar Rai
**Originally prepared by:** Rishabh Jain (Testing), 16 October 2026
**Updated by:** Rishika Batra (Developer), 22 October 2026, to cover the CSV upload feature

## 1. Environment
Node 24, Jest 30 + Supertest (backend), Vitest 2.1.9 + jsdom + React Testing Library (frontend), GitHub Actions CI (runs on every push and on PRs to main). Backend tests use an in-memory SQLite database.

## 2. Results

| Area | Suites / Files | Tests | Passed | Failed |
|---|---|---|---|---|
| Backend (Jest) | 3 | 54 | 54 | 0 |
| Frontend (Vitest) | 6 | 34 | 34 | 0 |
| **Total** | **9** | **88** | **88** | **0** |

Backend suites: `tests/scoringEngine.test.js` (23 unit tests for fraud risk scoring), `tests/flow.test.js` (10 integration tests of the API flow), `tests/csvUpload.test.js` (21 tests of the CSV upload endpoint).
Frontend files: `dashboard.test.jsx` (3), `caseDetail.test.jsx` (6), `cases.test.jsx` (4), `login.test.jsx` (2), `upload.test.jsx` (7), `formatMoney.test.jsx` (12).

Since the first version of this report (40 tests), 48 tests were added for the CSV upload feature, the currency formatting helper and the removal of mock-data fallbacks on the Cases pages.

## 3. Backend code coverage (`npx jest --coverage`)

| Metric | 16 Oct | 22 Oct |
|---|---|---|
| Statements | 36.01% | 55.00% |
| Branches | 20.00% | 41.46% |
| Functions | 40.77% | 62.93% |
| Lines | 39.65% | 59.28% |

Well covered: `scoringEngine.js`, `scoringRules.js`, `scoringConfig.js` (100%), `auditLogger.js` (92.3%), `transactionValidator.js` (91.3%), `csvImportService.js` (90.3%), `middleware/auth.js` (86.4%), `routes/transactions.js` (70.5%).
Weakly covered: `routes/audit.js` (11.3%), `caseService.js` (26.1%), `reportService.js` (33.0%), `routes/reports.js` (36.4%), `routes/cases.js` (40.0%), `caseWorkflow.js` (41.2%), `authService.js` (44.7%).
Frontend coverage was not measured.

## 4. Feature areas tested
- **Fraud risk scoring:** thoroughly tested (unit tests, 100% coverage).
- **Transaction ingestion, auth, case creation, audit logging:** covered by the integration flow tests, with partial coverage.
- **CSV upload:** validation, header matching, duplicate detection, dry run, role restrictions, size limits and the source filter are covered by 21 backend tests and 7 frontend tests.
- **Dashboard, case list, case detail, login and upload screens:** covered by frontend component tests, including error and empty states.
- **Reports and audit-log retrieval:** weakly tested (see limitations).

See `docs/traceability-matrix.md` for the requirement-to-test mapping.

## 5. Manual verification (22 October 2026)
The CSV upload was also tested end to end in the browser with the sample file `docs/sample-data/sample-transactions.csv`, logged in as an analyst:
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
| #23 | Dashboard, Audit Logs and Reports pages fall back to sample data when the API fails (Audit Logs is the most serious) | High for Audit Logs, Medium for the others | Open, assigned to Rishika Batra |

## 7. Known limitations
- Overall backend coverage is 55%. Audit routes, case service, report service and several route branches are weakly tested.
- Frontend coverage was not measured. The Dashboard, Audit Logs and Reports pages have limited tests.
- Defect #23 is open: three pages can still show sample data when the API fails.
- No automated end-to-end browser tests, performance tests or security tests were run. The upload endpoint was reviewed manually for size limits, role restrictions and spreadsheet-formula escaping in exports.
- Fraud scoring compares raw amounts and does not convert between currencies.
- Uploaded timestamps without a timezone are treated as UTC.
- All automated test data is synthetic. The upload feature accepts real data, but no real dataset has been uploaded and tested yet.

## 8. Conclusion
All 88 automated tests pass and CI is green. The core scoring logic is well verified, and the CSV upload feature is covered by automated and manual tests. Testing found two defects that were fixed (#13, #14), and one further defect (#23) remains open. Before real data is used, the sample-data fallbacks on the Dashboard, Audit Logs and Reports pages should be removed and the weakly covered report and case services should get more tests.

**Sign-off:** Rishabh Jain (Testing Team) for the original report; Rishika Batra (Developer) for the 22 October update.
