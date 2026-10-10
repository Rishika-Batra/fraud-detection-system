# Requirement Traceability Matrix (RTM)

**Project**: Fraud Detection Management Dashboard  
**Lead & Author**: Rishika Nigam (Frontend & Architecture Lead)

| Requirement ID | Requirement Description | Frontend Component / Page | API Endpoint / Service | Verification Method | Status |
|---|---|---|---|---|---|
| **FR-08.1** | Transaction Monitoring Table with identifiers, merchant, region, type, risk score & badges | `DashboardPage.jsx`, `RiskBadge.jsx` | `GET /api/transactions` (`transactionService.getTransactions`) | UI Table Render & Filter Verification | **Implemented** |
| **FR-08.2** | Transaction Details View with Risk Factors evaluation breakdown | `DashboardPage.jsx` (Modal) | `GET /api/transactions/:id` (`transactionService.getTransactionById`) | Detail Modal Inspection | **Implemented** |
| **FR-08.3** | Manual Transaction Flagging for Investigation | `DashboardPage.jsx` | `PATCH /api/transactions/:id/flag` (`transactionService.flagTransaction`) | Flag button click & Case creation check | **Implemented** |
| **FR-08.4** | Real-time Dashboard KPI Summary Metrics | `DashboardPage.jsx`, `StatCard.jsx` | `GET /api/transactions` | Summary Card Calculations | **Implemented** |
| **FR-09.1** | Case Desk List with status filter tabs and assignee indicators | `CasesPage.jsx`, `StatusBadge.jsx` | `GET /api/cases` (`caseService.getCases`) | Status Tab Navigation Test | **Implemented** |
| **FR-09.2** | Detailed Case Investigation Workspace with linked transaction context | `CaseDetailPage.jsx` | `GET /api/cases/:id` (`caseService.getCaseById`) | Deep link `/cases/:id` verification | **Implemented** |
| **FR-09.3** | Workflow Status Transitions with RBAC validation | `CaseDetailPage.jsx` | `PATCH /api/cases/:id/status` (`caseService.updateStatus`) | State Diagram Transition execution | **Implemented** |
| **FR-09.4** | Investigation Audit Notes logging & timeline | `CaseDetailPage.jsx` | `POST /api/cases/:id/notes` (`caseService.addNote`) | Note submission & timeline render | **Implemented** |
| **FR-09.5** | Case Re-assignment control for Supervisors | `CaseDetailPage.jsx` | `PATCH /api/cases/:id/assign` (`caseService.assignCase`) | Reassign select dropdown test | **Implemented** |
| **FR-10.1** | Fraud Trends Line Chart (Daily/Weekly) | `ReportsPage.jsx` (Recharts) | `GET /api/reports/trends` (`reportService.getTrends`) | Recharts Trend line render | **Implemented** |
| **FR-10.2** | Risk Distribution Bar Chart | `ReportsPage.jsx` (Recharts) | `GET /api/reports/summary` (`reportService.getSummary`) | Risk level breakdown check | **Implemented** |
| **FR-10.3** | Regional & Transaction Type Risk Heatmap Matrix | `ReportsPage.jsx` | `GET /api/reports/heatmap` (`reportService.getHeatmap`) | Heatmap table matrix render | **Implemented** |
| **FR-10.4** | CSV and PDF Export Downloads | `ReportsPage.jsx` | `GET /api/reports/export` (`reportService.exportData`) | Blob download trigger | **Implemented** |
