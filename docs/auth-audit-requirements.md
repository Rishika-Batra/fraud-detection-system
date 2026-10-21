# Authentication, Authorization & Audit Logging Requirements Specification

**Project:** SentinelGuard — Fraud Detection Management System  
**Prepared For:** Rishika Batra (Backend & Scoring Lead)  
**Author:** Rohit Arya (Requirement Engineer)  
**Document Status:** Complete Requirements Reference  
**Last Updated:** October 2026  

---

## 1. Overview & Objective

This specification details the formal requirements for **Authentication**, **Role-Based Access Control (RBAC)**, and **Tamper-Evident Audit Logging** in the SentinelGuard platform.

It is designed to support the Backend Lead, **Rishika Batra**, by providing a definitive reference aligned with the Software Requirements Specification (SRS FR-08, FR-09), implemented API routes (`server/routes/auth.js`, `server/routes/audit.js`), security middleware (`server/middleware/auth.js`), services (`server/services/authService.js`, `server/services/auditLogger.js`), and database models (`server/models/User.js`, `server/models/AuditLog.js`).

---

## 2. Authentication Requirements

### 2.1. Login Requirements
- **Endpoint:** `POST /api/auth/login`
- **Access Level:** Public (Unauthenticated entry point)
- **Request Body (JSON):**
  ```json
  {
    "username": "string (required)",
    "password": "string (required)"
  }
  ```
- **Validation Rules:**
  1. Both `username` and `password` must be present and non-empty. If either is missing, the endpoint must return `400 Bad Request` with `{ "error": "username and password are required" }`.
  2. Input fields must be trimmed for whitespace before evaluation.
- **Successful Authentication:**
  - When credentials match, the server generates a signed JSON Web Token (JWT) and returns `200 OK`:
  ```json
  {
    "token": "<JWT_STRING>",
    "user": {
      "id": 1,
      "username": "analyst1",
      "role": "analyst"
    }
  }
  ```
  - An audit log entry with action `LOGIN_SUCCESS` must be created.

### 2.2. Failure Handling & Anti-Enumeration Defense
- **Security Requirement:** If the username does not exist in the database, OR if the password does not match the stored bcrypt hash, the server must return an identical generic HTTP status and error message:
  - **Status Code:** `401 Unauthorized`
  - **Response Body:** `{ "error": "Invalid username or password" }`
- **Rationale:** Never return messages such as "User not found" or "Incorrect password". Specific error messages allow attackers to enumerate valid usernames.
- **Audit Requirement:** On any authentication failure, an audit log entry must be created with:
  - `action`: `LOGIN_FAILED`
  - `user_id`: `null` (since user is unauthenticated or may not exist)
  - `entity_type`: `User`
  - `details`: `{ "username": "<attempted_username>" }` (Never log the submitted password!)

### 2.3. Secure Password Handling
- **Hashing Algorithm:** Passwords must be hashed using `bcrypt` (or `bcryptjs`) with a work factor of **at least 10 salt rounds** (`bcrypt.genSalt(10)`).
- **Storage Rules:**
  - Plaintext passwords must **never** be persisted to the database.
  - The SQLite `users` table must store only the resulting `password_hash` string.
- **Model Scoping Protection:**
  - The Sequelize `User` model must define a `defaultScope` that explicitly excludes `password_hash` from query results:
    ```javascript
    defaultScope: {
      attributes: { exclude: ['password_hash'] }
    }
    ```
  - Only dedicated authentication routines requiring hash comparison may query using `.scope('withPassword')`.
- **API Response Sanitization:** Password hashes must **never** be included in any API response (e.g. `GET /api/auth/me`, `GET /api/auth/users`).
- **Minimum Password Policy (for User Creation):**
  - Minimum length: 8 characters.
  - Username minimum length: 3 characters.

### 2.4. Session & Token Architecture
- **Token Mechanism:** Stateless JSON Web Tokens (JWT) adhering to RFC 7519.
- **Signing Secret:** Signed with HMAC-SHA256 using `process.env.JWT_SECRET`.
  - The server must log a severe startup warning if `JWT_SECRET` is unset or remains the default placeholder (`change_me`).
- **Token Payload:**
  - `id`: Database user ID (integer)
  - `username`: Account username (string)
  - `role`: Assigned user role (string: `analyst`, `supervisor`, `admin`)
- **Lifetime & Expiry:**
  - Token validity is strictly capped at **8 hours** (`expiresIn: '8h'`).
  - No refresh tokens are implemented; once expired, the client application must prompt the user to re-authenticate.
- **Transmission:**
  - Clients must transmit the token in the HTTP `Authorization` request header formatted as:
    `Authorization: Bearer <token>`
- **Verification Middleware (`authenticate`):**
  1. Validates that the header exists and starts with `Bearer `. If missing, returns `401 Unauthorized`.
  2. Verifies token signature and checks expiry using `jwt.verify(token, JWT_SECRET)`.
  3. Re-queries the database (`User.findByPk(decoded.id)`) to ensure the user has not been deleted or deactivated since token issuance.
  4. Attaches a sanitized `req.user = { id, username, role }` to the Express request object.

### 2.5. Logout Behavior
- **Endpoint:** `POST /api/auth/logout`
- **Access Level:** All authenticated roles (`authenticate` required).
- **Mechanism:**
  - Because JWTs are stateless, the server cannot invalidate a token in memory without an external distributed store or blacklist.
  - The server responds with `200 OK` (`{ "message": "Logged out" }`) and immediately writes an audit log (`action: "LOGOUT"`).
  - The React client is strictly responsible for discarding the token from `localStorage` and clearing user session state.
- **Production Recommendation for Rishika Batra:** For high-security environments, evaluate maintaining an in-memory or Redis-backed token revocation list (blocklist) for unexpired tokens after logout.

---

## 3. Role-Based Access Control (RBAC) Requirements

### 3.1. Role Definitions & Responsibilities

| Role | Operational Scope & Purpose |
| :--- | :--- |
| **Analyst** | First-line fraud investigator. Ingests simulated transactions, monitors real-time feeds, views transaction evidence, manually flags high-risk transactions, updates assigned case statuses (`flagged` → `investigating`, `investigating` → `resolved`/`escalated`), and attaches investigation notes and evidence. |
| **Supervisor** | Senior investigator & team manager. Inherits all Analyst operational capabilities, plus: can reassign cases across team members, de-escalate cases (`escalated` → `investigating`), view executive analytics dashboards, inspect the system audit trail, and export CSV/PDF reports. |
| **Admin** | System and security administrator. Exclusively manages user accounts (`POST /api/auth/users`, `GET /api/auth/users`), views audit logs, and inspects analytics reports. **Strict Separation of Duties:** Admins are explicitly blocked from modifying transaction flags, changing case states, or adding case notes to prevent administrative tampering with ongoing investigations. |

---

### 3.2. Role-Permission Matrix

| Operational Action | API Endpoint & HTTP Method | Analyst | Supervisor | Admin | Enforcement Mechanism |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Authenticate / Login** | `POST /api/auth/login` | ✅ | ✅ | ✅ | Public endpoint |
| **Logout** | `POST /api/auth/logout` | ✅ | ✅ | ✅ | `authenticate` |
| **View Current Profile** | `GET /api/auth/me` | ✅ | ✅ | ✅ | `authenticate` |
| **Create User Account** | `POST /api/auth/users` | ❌ | ❌ | ✅ | `authorize('admin')` |
| **List User Accounts** | `GET /api/auth/users` | ❌ | ❌ | ✅ | `authorize('admin')` |
| **Ingest Transactions** | `POST /api/transactions` | ✅ | ✅ | ✅ | `authenticate` (simulates upstream feed) |
| **List Transactions** | `GET /api/transactions` | ✅ | ✅ | ✅ | `authorize('analyst', 'supervisor', 'admin')` |
| **View Transaction Detail** | `GET /api/transactions/:id` | ✅ | ✅ | ✅ | `authorize('analyst', 'supervisor', 'admin')` |
| **Flag Transaction & Create Case** | `PATCH /api/transactions/:id/flag` | ✅ | ✅ | ❌ | `authorize('analyst', 'supervisor')` |
| **List Investigation Cases** | `GET /api/cases` | ✅ | ✅ | ✅ | `authorize('analyst', 'supervisor', 'admin')` |
| **View Case Workspace & Notes** | `GET /api/cases/:id` | ✅ | ✅ | ✅ | `authorize('analyst', 'supervisor', 'admin')` |
| **Advance Case Status** | `PATCH /api/cases/:id/status` | ✅ | ✅ | ❌ | `authorize('analyst', 'supervisor')` + State Machine |
| **De-escalate Case (`escalated` → `investigating`)** | `PATCH /api/cases/:id/status` | ❌ | ✅ | ❌ | `validateTransition` supervisor rule |
| **Add Investigation Note** | `POST /api/cases/:id/notes` | ✅ | ✅ | ❌ | `authorize('analyst', 'supervisor')` |
| **Reassign Case Assignee** | `PATCH /api/cases/:id/assign` | ❌ | ✅ | ❌ | `authorize('supervisor')` |
| **View Analytics & Trends** | `GET /api/reports/*` | ❌ | ✅ | ✅ | `authorize('supervisor', 'admin')` |
| **Export Reports (CSV/PDF)** | `GET /api/reports/export` | ❌ | ✅ | ✅ | `authorize('supervisor', 'admin')` |
| **View Audit Trail** | `GET /api/audit` | ❌ | ✅ | ✅ | `authorize('supervisor', 'admin')` |

*Note: Any access by an unauthorized role must immediately terminate with HTTP `403 Forbidden` (`{ "error": "Forbidden" }`).*

---

## 4. Audit Logging Requirements

### 4.1. Core Architectural Principles
1. **Append-Only Tamper-Resistance:** Audit logs are historical legal evidence. They must be strictly append-only.
   - Sequelize `beforeUpdate` and `beforeDestroy` hooks must throw fatal errors if an ORM mutation is attempted on the `AuditLog` model.
2. **Non-Blocking Resiliency:** Writing an audit entry must **never fail the primary user transaction**.
   - If writing to the SQLite database fails (e.g. disk lock or I/O failure), `auditLogger.logAction` must catch the error, log to `console.error`, and allow the HTTP response to proceed cleanly.
3. **Data Privacy & Secret Sanitization:** Under no circumstances should passwords, password hashes, auth tokens, or sensitive secrets be saved to the audit trail.
   - The logger must automatically sanitize the `details` object by deleting `password`, `password_hash`, and `token` properties before JSON serialization.

---

### 4.2. Standardized Audit Actions Enum (`ACTIONS`)

The following standardized action constants must be used across all server modules:

```javascript
const ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  USER_CREATED: 'USER_CREATED',
  TRANSACTION_INGESTED: 'TRANSACTION_INGESTED',
  TRANSACTION_VIEWED: 'TRANSACTION_VIEWED',
  TRANSACTION_FLAGGED: 'TRANSACTION_FLAGGED',
  CASE_CREATED: 'CASE_CREATED',
  CASE_STATUS_CHANGED: 'CASE_STATUS_CHANGED',
  CASE_NOTE_ADDED: 'CASE_NOTE_ADDED',
  CASE_ASSIGNED: 'CASE_ASSIGNED',
  REPORT_EXPORTED: 'REPORT_EXPORTED'
};
```

---

### 4.3. Audit Event Specifications & Expected Payloads

| Action Name | Triggering Event | Entity Type | Expected Entity ID | Actor ID | Required `details` Payload Fields |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `LOGIN_SUCCESS` | User provides valid credentials | `User` | User ID | User ID | `null` |
| `LOGIN_FAILED` | Invalid credentials supplied | `User` | `null` | `null` | `{"username": "<attempted_username>"}` |
| `LOGOUT` | User logs out | `User` | User ID | User ID | `null` |
| `USER_CREATED` | Admin provisions new account | `User` | Created User ID | Admin User ID | `{"role": "<role>"}` |
| `TRANSACTION_INGESTED` | Ingestion of 1 or more transactions | `Transaction` | Tx ID (or null for batch) | Ingesting User ID | `{"score": <score>}` or `{"ids": [...], "scores": [...]}` |
| `TRANSACTION_VIEWED` | User accesses single transaction detail | `Transaction` | Tx ID | Viewing User ID | `null` |
| `TRANSACTION_FLAGGED` | Transaction flagged suspicious | `Transaction` | Tx ID | Acting User ID | `null` |
| `CASE_CREATED` | Investigation case initiated | `Case` | Case ID | Acting User ID | `null` |
| `CASE_STATUS_CHANGED` | Case transitioned to new state | `Case` | Case ID | Acting User ID | `{"from": "<old_status>", "to": "<new_status>"}` |
| `CASE_NOTE_ADDED` | Investigation note logged | `Case` | Case ID | Author User ID | `{"note_id": <note_id>}` *(Note content omitted to avoid log bloat)* |
| `CASE_ASSIGNED` | Case reassigned by supervisor | `Case` | Case ID | Supervisor User ID | `{"assigned_to": <target_user_id>}` |
| `REPORT_EXPORTED` | User streams CSV or PDF report | `Report` | `null` | Requesting User ID | `{"type": "<cases|fraud_summary>", "format": "<csv|pdf>"}` |

---

### 4.4. Audit Log Querying & Filtering API (`GET /api/audit`)
- **Authorization:** Supervisor and Admin only (`authorize('supervisor', 'admin')`).
- **Query Parameters:**
  - `user_id`: Filter by actor user ID (integer)
  - `action`: Filter by exact action name string
  - `entity_type`: Filter by entity type (`User`, `Transaction`, `Case`, `Report`)
  - `entity_id`: Filter by entity ID (integer)
  - `from`: ISO 8601 UTC start datetime
  - `to`: ISO 8601 UTC end datetime
  - `page`: Integer ≥ 1 (default 1)
  - `limit`: Integer 1 to 100 (default 20)
- **Response Format:**
  ```json
  {
    "data": [
      {
        "id": 42,
        "user_id": 2,
        "action": "CASE_STATUS_CHANGED",
        "entity_type": "Case",
        "entity_id": 14,
        "details": { "from": "flagged", "to": "investigating" },
        "timestamp": "2026-10-10T14:32:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "total_pages": 8
    }
  }
  ```

---

## 5. Security Recommendations for Backend Lead (Rishika Batra)

1. **Brute-Force Rate Limiting:**
   - Currently, `POST /api/auth/login` does not restrict repeated failed attempts.
   - *Recommendation:* Introduce `express-rate-limit` to restrict clients to 5 failed attempts per 15-minute window per IP.
2. **IP & User-Agent Forensics in Audit Log:**
   - Currently, `AuditLog` captures `user_id`, `action`, `entity_type`, `entity_id`, and `details`.
   - *Recommendation:* Consider adding `ip_address VARCHAR(45)` and `user_agent VARCHAR(255)` columns to `audit_logs` schema in v2.0 for enhanced forensic attribution.
3. **Automated Auto-Flagging Integration (TBD-1):**
   - As noted in `scoringConfig.js`, automated case initiation on high-risk ingestion is currently deferred.
   - *Recommendation:* Once threshold is ratified (e.g. `risk_score >= 70`), Rishika Batra can wire `flagTransaction` directly into `ingestTransactions` for transactions meeting the criteria.
