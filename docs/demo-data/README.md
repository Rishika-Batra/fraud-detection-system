# Demo & Sample Data Documentation

**Project:** SentinelGuard — Fraud Detection Management System  
**Author:** Rohit Arya (Requirement Engineer)  
**Location:** `docs/demo-data/`  
**Dataset Version:** 1.0  
**Status:** Validated & Production-Safe Synthetic Data  

---

## 1. Overview & Objectives

This directory contains realistic, privacy-safe demo and testing datasets designed for the SentinelGuard Fraud Detection Management System. The data models the transactional activity, fraud investigation lifecycle, security audit logging, and role-based operational desk.

### Key Characteristics:
- **100% Synthetic & Safe:** All account IDs, customer identifiers, names, phone numbers, and amounts are completely fictional. No real personal data or production credentials exist.
- **Strict SQLite Schema Parity:** Fully compatible with `server/db/schema.sql` and Sequelize models (`User`, `Transaction`, `Case`, `CaseNote`, `AuditLog`).
- **Complete Dual Formats:** All datasets are provided in both **JSON** and **CSV** formats for versatile testing, postman seeding, frontend mocking, or database imports.
- **Programmatically Validated:** Verified with `validate_demo_data.py` for referential integrity, primary key uniqueness, enum constraints, and temporal coherence.

---

## 2. Directory Structure

```
docs/demo-data/
├── README.md                 # This documentation file
├── generate_data.py          # Deterministic data generation script
├── validate_demo_data.py     # Automated schema & referential integrity auditor
├── users.json                # User accounts & roles (JSON)
├── users.csv                 # User accounts & roles (CSV)
├── transactions.json         # Normal & fraudulent transactions (JSON)
├── transactions.csv          # Normal & fraudulent transactions (CSV)
├── cases.json                # Fraud investigation cases (JSON)
├── cases.csv                 # Fraud investigation cases (CSV)
├── case-notes.json           # Investigation timeline notes & evidence references (JSON)
├── case-notes.csv            # Investigation timeline notes & evidence references (CSV)
├── audit-logs.json           # System security activity & audit trail (JSON)
└── audit-logs.csv            # System security activity & audit trail (CSV)
```

---

## 3. Data Schema & Entities Breakdown

### 3.1. Users (`users.json` / `users.csv`)
Represents system actors across the three authorized platform roles:

| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique user ID |
| `username` | VARCHAR(255) | NOT NULL, UNIQUE | System login name |
| `password_hash`| VARCHAR(255) | NOT NULL | Standard bcrypt hash (10 salt rounds) for demo password |
| `role` | VARCHAR(50) | CHECK ('analyst', 'supervisor', 'admin') | RBAC operational role |
| `created_at` | DATETIME | ISO 8601 UTC | Account creation timestamp |

**Included Demo Accounts:**
- `admin_rohit` (Role: `admin`)
- `analyst_priya` (Role: `analyst`)
- `analyst_arjun` (Role: `analyst`)
- `analyst_kavita` (Role: `analyst`)
- `supervisor_vikram` (Role: `supervisor`)
- `supervisor_neha` (Role: `supervisor`)

*All demo users share a secure test bcrypt hash representing `Sentinel@Demo2026`.*

---

### 3.2. Transactions (`transactions.json` / `transactions.csv`)
Contains 40 realistic financial transactions spanning retail purchases, ATM cash withdrawals, UPI/NEFT transfers, and deposits across major Indian metro hubs (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad).

| Field | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique transaction record ID (1001–1040) |
| `account_id` | VARCHAR(255) | NOT NULL | Fictional account identifier (`ACC1011`–`ACC1040`) |
| `amount` | DECIMAL(10,2)| CHECK (> 0) | Transaction value in INR |
| `currency` | VARCHAR(10) | NOT NULL | `INR` (Indian Rupee) |
| `merchant` | VARCHAR(255) | Plausible merchant | Merchant or settlement rail (e.g. Swiggy, Amazon, ATM SBI) |
| `transaction_type` | VARCHAR(50) | CHECK ('purchase', 'transfer', 'withdrawal', 'deposit') | Transaction classification |
| `region` | VARCHAR(100) | Valid region | Geographical location of the terminal |
| `timestamp` | DATETIME | ISO 8601 UTC | UTC execution timestamp |
| `risk_score` | INTEGER | 0 to 100 | Calculated risk points from scoring engine |
| `risk_level` | VARCHAR(50) | CHECK ('low', 'medium', 'high') | Categorization (`low`: 0–39, `medium`: 40–69, `high`: 70–100) |
| `risk_factors` | TEXT | JSON string array | Evaluated triggered risk reasons |
| `is_flagged` | BOOLEAN | 0 or 1 | Flagged state for active fraud investigation |

#### Synthetic Fraud Patterns Simulated:
1. **Velocity Burst Attack (Account `ACC1028`):** 6 rapid card testing purchases within 4 minutes at `Amazon India` (Transactions 1018–1023), triggering the 5-in-10-min velocity threshold (+25 pts).
2. **Geographical Hop / Impossible Speed (Account `ACC1029`):** ATM withdrawal in Mumbai at 14:00 (Tx 1024) followed by a high-value purchase in Kolkata at 14:15 (Tx 1025), triggering the 60-min region hop rule (+25 pts).
3. **High-Value Odd-Hour Transfer (Account `ACC1030`):** INR 300,000 round-sum crypto transfer at 03:10 AM UTC (Tx 1026), triggering Very High Amount (+35 pts), Round Number (+10 pts), Odd Hours (+15 pts), and Large Transfer (+15 pts) for a total risk score of 85 (`high`).
4. **Legitimate Retail Baselines:** Low-risk groceries, restaurant orders, and salary deposits with score 0 and `is_flagged: 0`.

---

### 3.3. Cases (`cases.json` / `cases.csv`)
Tracks investigations for the 12 flagged transactions. Conforms strictly to the canonical 5-stage case workflow:

```text
[flagged] ---> [investigating] ---> [resolved] ---> [closed]
                      |                   ^
                      v                   |
                  [escalated] -------------+ (Supervisor only)
                      |
                      +---------------------------> [closed]
```

**Distribution in Dataset:**
- `flagged` (2 cases: Case 1, Case 2): Fresh alerts, unassigned (`assigned_to: null`).
- `investigating` (3 cases: Case 3, Case 4, Case 5): Assigned to analysts actively gathering evidence.
- `escalated` (3 cases: Case 6, Case 7, Case 8): Assigned to senior supervisors for AML / FIU reporting.
- `resolved` (2 cases: Case 9, Case 10): Legitimate customer confirmations / resolved false positives.
- `closed` (2 cases: Case 11, Case 12): Chargeback completed or final police FIR filed (`closed_at` populated).

---

### 3.4. Case Notes (`case-notes.json` / `case-notes.csv`)
Contains 16 chronological investigation logs added by analysts and supervisors. Includes references to simulated supporting artifacts (`call-recording-*.mp3`, `geo-ip-trace-*.png`, `police-fir-*.pdf`).

---

### 3.5. Audit Logs (`audit-logs.json` / `audit-logs.csv`)
Contains 30 security audit records covering the standard audit lifecycle:
- `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`
- `USER_CREATED`
- `TRANSACTION_INGESTED`, `TRANSACTION_VIEWED`, `TRANSACTION_FLAGGED`
- `CASE_CREATED`, `CASE_STATUS_CHANGED`, `CASE_NOTE_ADDED`, `CASE_ASSIGNED`
- `REPORT_EXPORTED`

Includes tamper-resistance details (sanitized JSON objects with all passwords and tokens stripped).

---

## 4. How to Validate the Dataset

Run the automated integrity audit script:

```bash
# From workspace root
py docs/demo-data/validate_demo_data.py
```

The script verifies:
1. Primary key uniqueness across all tables.
2. 100% referential integrity across all foreign keys.
3. Enum adherence (`roles`, `transaction_types`, `risk_levels`, `case_statuses`, `audit_actions`).
4. Temporal ordering (`created_at <= updated_at <= closed_at`).
5. Parity between JSON and CSV versions.

---

## 5. Integration Note for Backend Lead (Rishika Batra)

> [!NOTE]
> **Coordination & Safety Notice:**
> The existing `server/db/seed.js` script is owned and maintained by **Rishika Batra**. It uses an algorithmic PRNG (`mulberry32`) to dynamically synthesize ~300 records upon execution.
>
> In accordance with team file-ownership rules, Rohit Arya has **not modified or overwritten** `server/db/seed.js` or `server/db/schema.sql`.
>
> **Proposed Integration Options:**
> 1. **Standalone Postman / QA Ingestion:** QA Lead Rishabh Jain can ingest `transactions.json` directly through the `POST /api/transactions` endpoint to verify batch processing without touching the database file.
> 2. **Optional Seed Import Hook:** If Rishika Batra wishes to support static demo dataset seeding alongside dynamic PRNG generation, the following code snippet can be added to `seed.js`:
>    ```javascript
>    // Optional static seed hook
>    if (process.env.SEED_SOURCE === 'STATIC') {
>      const staticTx = require('../../docs/demo-data/transactions.json');
>      await Transaction.bulkCreate(staticTx);
>    }
>    ```
