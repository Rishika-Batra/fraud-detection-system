# SentinelGuard: Fraud Detection Management Dashboard

SentinelGuard is an enterprise fraud detection and case investigation platform. The system ingests financial transactions, evaluates them against a rule-based fraud scoring engine, automatically flags anomalies, and orchestrates an investigation lifecycle across analysts and supervisors with role-based access control (RBAC) and audit trails.

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Database Seeding](#2-database-seeding)
  - [3. Frontend Setup](#3-frontend-setup)
- [Demo Accounts & RBAC](#demo-accounts--rbac)
- [Running Tests & Quality Assurance](#running-tests--quality-assurance)
- [Documentation Directory](#documentation-directory)

---

## Key Features

- **Real-Time Transaction Monitoring & Ingestion:**
  - Ingest simulated financial transactions with instant rule scoring.
  - Interactive data tables with status, risk level, amount, and region filters.
  - Evidence inspection modal breaking down individual triggered rule factors.
- **Rule-Based Fraud Scoring Engine:**
  - Evaluates transactions on risk dimensions (amount spikes, velocity, high-risk regions, unusual hours, merchant category).
  - Normalizes risk score (0–100) with classification tiers: **Low (0–39)**, **Medium (40–69)**, and **High (70–100)**.
  - Automated case creation upon detection of high-risk transactions.
- **Case Management Workflow:**
  - State machine lifecycle: `flagged` → `investigating` → `resolved` / `escalated` → `closed`.
  - Chronological timeline for investigator notes and disposition records.
  - Supervisor reassignment workflows across analyst teams.
- **Role-Based Access Control (RBAC):**
  - Secure authentication with JSON Web Tokens (JWT) and `bcrypt` password hashing.
  - Three distinct operational roles: `analyst`, `supervisor`, and `admin`.
- **Analytics, Trends & Reporting:**
  - Executive KPI metrics (transaction volume, total flagged, average risk score).
  - Risk trends over time visualized via Recharts.
  - Regional and transaction-type risk distribution matrix.
  - Report exports: CSV (investigation cases) and PDF (executive summary generated with PDFKit).
- **Security & Audit Logging:**
  - Automatic, immutable event logging for authentications, case transitions, note submissions, reassignments, and report exports.
  - Dedicated audit log viewer restricted to Supervisors and Administrators.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, React Router 6, Recharts, Lucide React |
| **Backend** | Node.js, Express 4, Sequelize ORM 6, PDFKit |
| **Database** | SQLite 3 (persistent local file storage) / In-Memory SQLite for tests |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| **Testing** | Jest 30 & Supertest (Backend), Vitest 2.1 & React Testing Library (Frontend) |
| **CI/CD** | GitHub Actions (automated test runner on Node 24) |

---

## System Architecture

```text
 ┌──────────────────────┐         HTTP / JSON + JWT        ┌──────────────────────┐
 │  React Client (Vite) │ ◄──────────────────────────────► │ Node.js Express API  │
 │  Port 3000           │        (Proxy: /api -> 5001)     │ Port 5001            │
 └──────────────────────┘                                  └──────────┬───────────┘
                                                                      │
                         ┌────────────────────────────────────────────┼──────────────────────────────┐
                         ▼                                            ▼                              ▼
             ┌─────────────────────────┐                  ┌─────────────────────────┐    ┌─────────────────────────┐
             │   Scoring Engine        │                  │   Case & Audit Services │    │   Sequelize ORM         │
             │   Rule evaluations,     │                  │   State machine, notes, │    │   SQLite storage        │
             │   risk score 0-100      │                  │   audit logging         │    │   (db/fraud.db)         │
             └─────────────────────────┘                  └─────────────────────────┘    └─────────────────────────┘
```

---

## Project Structure

```text
fraud-detection-system/
├── .github/
│   └── workflows/
│       └── test.yml             # GitHub Actions CI workflow (Node 24)
├── client/                      # React frontend application (Vite)
│   ├── src/
│   │   ├── __tests__/           # Frontend component tests (Vitest)
│   │   ├── components/          # Reusable UI components & layouts
│   │   ├── context/             # AuthContext and state providers
│   │   ├── pages/               # Dashboard, Cases, CaseDetail, Reports, Audit, Login
│   │   └── services/            # Client-side API fetch clients
│   ├── package.json
│   └── vite.config.js           # Vite dev server configuration & API proxy
├── server/                      # Node.js / Express backend application
│   ├── db/                      # Database connection, init, and seed scripts
│   ├── middleware/              # Auth & role-checking middleware
│   ├── models/                  # Sequelize models (User, Transaction, Case, AuditLog)
│   ├── routes/                  # Express REST routes (auth, transactions, cases, reports, audit)
│   ├── services/                # Business logic, scoring engine, audit logger, reports
│   └── package.json
├── tests/                       # Backend test suites (Jest + Supertest)
│   ├── flow.test.js             # End-to-end integration flow tests
│   └── scoringEngine.test.js    # Comprehensive unit tests for scoring engine
└── docs/                        # Project documentation & requirements
    ├── api-contract.md          # REST API specifications and contracts
    ├── test-plan.md             # Test strategy, scope, and test cases
    ├── test-summary.md          # Execution report and code coverage metrics
    └── traceability-matrix.md   # SRS requirement-to-implementation mapping
```

---

## Getting Started

### Prerequisites

- **Node.js**: v24 recommended (frontend tests need Node 24; they fail on Node 20)
- **npm**: v9+

---

### 1. Backend Setup

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Note:* By default, the server runs on port **5001** (to avoid conflicts with macOS AirPlay receiver on port 5000). Ensure `JWT_SECRET` is defined.

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The API will be available at `http://localhost:5001` (health check: `http://localhost:5001/api/health`).*

---

### 2. Database Seeding

The database includes a seed utility that populates the SQLite database with realistic demo data (~300 transactions, 25 cases, 6 users across roles):

```bash
cd server

# Dry run — inspects operations without modifying data
npm run seed

# Seed database (drops and recreates tables with synthetic data)
npm run seed -- --yes

# Optional: Set a custom password for demo accounts
SEED_PASSWORD=MyCustomPassword123 npm run seed -- --yes

# Optional: Provide a fixed random seed for deterministic records
SEED_RANDOM=42 npm run seed -- --yes
```

> **Safety features:**
> - Refuses to execute when `NODE_ENV=production`.
> - Requires the `--yes` confirmation flag to apply database changes.

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```

4. Access the web dashboard in your browser at:
   ```text
   http://localhost:3000
   ```
   *(Requests to `/api/*` are automatically proxied to `http://localhost:5001` by Vite).*

---

## Demo Accounts & RBAC

When seeded with default settings, all demo accounts share the password displayed in the terminal output upon running `npm run seed -- --yes` (or the password configured via `SEED_PASSWORD`):

| Username | Role | Permissions & Access Scope |
| :--- | :--- | :--- |
| `admin` | **admin** | User administration, audit logs, analytics reports (read-only case data) |
| `supervisor1` | **supervisor** | Full analyst privileges + case reassignment, escalations, reports & audit logs |
| `supervisor2` | **supervisor** | Full analyst privileges + case reassignment, escalations, reports & audit logs |
| `analyst1` | **analyst** | Monitor transactions, ingest test data, flag alerts, manage assigned cases |
| `analyst2` | **analyst** | Monitor transactions, ingest test data, flag alerts, manage assigned cases |
| `analyst3` | **analyst** | Monitor transactions, ingest test data, flag alerts, manage assigned cases |

---

## Running Tests & Quality Assurance

### Backend Tests (Jest)

The backend uses Jest and Supertest against an in-memory SQLite database:

```bash
cd server
npm test

# Run with test coverage reporting
npx jest --coverage
```

### Frontend Tests (Vitest)

The frontend uses Vitest with React Testing Library and `jsdom`:

```bash
cd client
npm test
```

### Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/test.yml`) runs all backend and frontend test suites on every push and pull request to `main`.

---

## Documentation Directory

Additional project documentation is maintained in the `docs/` folder:

- 📑 **[API Contract](docs/api-contract.md)**: Full REST endpoints specification, request/response payloads, and status codes.
- 📋 **[Traceability Matrix (RTM)](docs/traceability-matrix.md)**: Formal SRS requirements (FR-01 to FR-11) mapped to components and APIs.
- 📋 **[Requirements Traceability Matrix (Comprehensive RTM)](docs/requirements-traceability-matrix.md)**: Complete 10-column traceability matrix covering FR-01 through FR-11 and NFR-01 through NFR-07 (Rohit Arya).
- 🔍 **[Requirements Validation Report](docs/requirements-validation-report.md)**: Detailed feature-by-feature verification against Experiment 3 User Stories (US-01 through US-11).
- 🔐 **[Auth & Audit Requirements Specification](docs/auth-audit-requirements.md)**: Specification for authentication failure handling, RBAC permission matrix, and tamper-evident audit logging.
- 📊 **[Realistic Demo Datasets](docs/demo-data/README.md)**: Fictional datasets in dual JSON and CSV formats with automated referential integrity validator (`validate_demo_data.py`).
- 🧪 **[Test Plan](docs/test-plan.md)**: Test strategy, scope, environment configurations, and test cases.
- 📊 **[Test Summary Report](docs/test-summary.md)**: Formal test execution report, pass/fail results, and code coverage.
