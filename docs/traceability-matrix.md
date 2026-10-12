# Requirement Traceability Matrix (RTM)

**Project**: SentinelGuard Fraud Detection Management System  
**Frontend & Architecture Lead**: Rishika Nigam  
**Backend & Scoring Lead**: Rishika Batra  
**SRS & Requirements Lead**: Rohit  
**QA & Test Lead**: Rishabh Jain  

---

## SRS Alignment & Cross-Reference Note
This matrix has been aligned with the canonical **Software Requirements Specification (SRS)** numbering defined by Rohit:
- **FR-01**: Transaction Monitoring & Retrieval
- **FR-02**: Upstream Transaction Ingestion Feed
- **FR-03 & FR-04**: Rule-Based Fraud Scoring Engine & Risk Categorization
- **FR-05**: Transaction Flagging & Investigation Initiation
- **FR-06**: Case Workflow & Investigation Management
- **FR-07**: Analytics Dashboard & Fraud Trends Reporting
- **FR-08**: Role-Based Access Control (RBAC) & Authentication
- **FR-09**: Audit Logging & Security Activity Trail
- **FR-10**: Data Export Service (CSV & PDF)

*(Note: Prior work-plan sprint tags 08/09/10 have been mapped to their formal SRS requirement numbers below).*

---

## Traceability Matrix

| SRS Req ID | Work Plan Ref | Requirement Description | Frontend Component / Page | Backend API Endpoint / Service | Verification Method | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| **FR-01.1** | WP-08.1 | Transaction monitoring data table with real-time risk indicators, amounts, types, and region filters | `DashboardPage.jsx`, `RiskBadge.jsx` | `GET /api/transactions` (`transactionService.getTransactions`) | UI Table Render, Filter & Sort Verification | **Implemented** |
| **FR-01.2** | WP-08.2 | Transaction detailed evidence view with rule evaluation risk factors breakdown | `DashboardPage.jsx` (Detail Modal) | `GET /api/transactions/:id` (`transactionService.getTransactionById`) | Modal detail inspection & rule list verify | **Implemented** |
| **FR-02.1** | WP-08.5 | Simulated upstream transaction ingestion feed modal | `DashboardPage.jsx` (Ingest Modal) | `POST /api/transactions` (`transactionService.ingestTransactions`) | Ingestion form submission & scoring check | **Implemented** |
| **FR-03.1** | WP-08.6 | Scoring engine visualization (score gauge 0–100, risk factors) | `DashboardPage.jsx`, `RiskBadge.jsx` | Scored via backend rules engine | Badge rendering & risk bar inspection | **Implemented** |
| **FR-04.1** | WP-08.7 | Risk tier classification (`low`, `medium`, `high`) visual badges | `RiskBadge.jsx`, `DashboardPage.jsx` | Data model `risk_level` attribute | Color & threshold badge tests | **Implemented** |
| **FR-05.1** | WP-08.3 | Manual transaction flagging with automated investigation case creation | `DashboardPage.jsx` (Flag Button) | `PATCH /api/transactions/:id/flag` (`transactionService.flagTransaction`) | Flag button click & Case creation verification | **Implemented** |
| **FR-06.1** | WP-09.1 | Investigation case desk list with workflow status filter tabs and assignee indicators | `CasesPage.jsx`, `StatusBadge.jsx` | `GET /api/cases` (`caseService.getCases`) | Status tab filtering & list rendering | **Implemented** |
| **FR-06.2** | WP-09.2 | Detailed Case Investigation Workspace with linked transaction evidence context | `CaseDetailPage.jsx` | `GET /api/cases/:id` (`caseService.getCaseById`) | Deep-link workspace navigation & evidence review | **Implemented** |
| **FR-06.3** | WP-09.3 | Workflow state machine transitions (`flagged` → `investigating` → `resolved`/`escalated` → `closed`) | `CaseDetailPage.jsx` | `PATCH /api/cases/:id/status` (`caseService.updateStatus`) | State diagram transitions & validation tests | **Implemented** |
| **FR-06.4** | WP-09.4 | Investigation notes chronological timeline & entry logging | `CaseDetailPage.jsx` | `POST /api/cases/:id/notes` (`caseService.addNote`) | Note submission & timeline render | **Implemented** |
| **FR-06.5** | WP-09.5 | Supervisor case re-assignment to analysts | `CaseDetailPage.jsx` | `PATCH /api/cases/:id/assign` (`caseService.assignCase`) | Reassign select dropdown & supervisor check | **Implemented** |
| **FR-07.1** | WP-10.1 | Real-time KPI summary metrics (total volume, flagged count, avg risk score) | `DashboardPage.jsx`, `ReportsPage.jsx`, `StatCard.jsx` | `GET /api/reports/summary`, `GET /api/transactions` | Top KPI cards calculation test | **Implemented** |
| **FR-07.2** | WP-10.2 | Fraud & risk trends over time line chart (daily / weekly aggregation) | `ReportsPage.jsx` (Recharts) | `GET /api/reports/trends` (`reportService.getTrends`) | Recharts trend line render & date range filter | **Implemented** |
| **FR-07.3** | WP-10.3 | Regional & transaction type risk heatmap aggregation matrix | `ReportsPage.jsx` | `GET /api/reports/heatmap` (`reportService.getHeatmap`) | Heatmap table matrix render | **Implemented** |
| **FR-08.1** | WP-AUTH.1 | JWT-based authentication login desk with demo quick-login | `LoginPage.jsx`, `AuthContext.jsx` | `POST /api/auth/login` (`authService.login`) | Login flow, token persistence in localStorage | **Implemented** |
| **FR-08.2** | WP-AUTH.2 | Role-Based Access Control (`analyst`, `supervisor`, `admin`) route gating & UI button permissions | `AuthContext.jsx`, `AppLayout.jsx` | `GET /api/auth/me` | Role authorization check on sensitive controls | **Implemented** |
| **FR-08.3** | WP-AUTH.3 | Admin user account administration | `authService.getUsers`, `authService.createUser` | `GET /api/auth/users`, `POST /api/auth/users` | User list retrieval & assignment verification | **Implemented** |
| **FR-09.1** | WP-AUDIT.1 | Security & system audit log viewer page (Supervisor/Admin only) | `AuditLogsPage.jsx` | `GET /api/audit` (`auditService.getLogs`) | Audit log table render, filter by actor/action | **Implemented** |
| **FR-09.2** | WP-AUDIT.2 | Automatic logging of logins, transitions, notes, re-assignments, and exports | `server/services/auditLogger.js` | Integrated across all mutating endpoints | Audit log verification on state mutation | **Implemented** |
| **FR-10.1** | WP-10.4 | Case investigation report export in CSV format | `ReportsPage.jsx` | `GET /api/reports/export?format=csv&type=cases` (`reportService.exportData`) | Blob download trigger (`cases-*.csv`) | **Implemented** |
| **FR-10.2** | WP-10.5 | Executive fraud summary report export in PDF format | `ReportsPage.jsx` | `GET /api/reports/export?format=pdf&type=fraud_summary` (`reportService.exportData`) | Binary PDF stream download (`fraud_summary-*.pdf`) | **Implemented** |
