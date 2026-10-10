# API Contract

This document serves as the API contract for the frontend developers building the React dashboard against this backend. **Where the code and this description differ, always trust the code.**

## Overview
- **Base URL:** `http://localhost:5001`
  - *(Note: macOS uses port 5000 for AirPlay receiver, which is why the default port is 5001. Check your `server/.env` if you change it.)*
- **Data Format:** JSON for all requests and responses, except for the CSV and PDF export endpoints.
- **CORS:** Enabled for all routes.

## Authentication
Authentication is handled via JWT (JSON Web Tokens).

- **Login:** Send credentials to `POST /api/auth/login`.
- **Token:** The response includes a JWT token. Store this token in your React app (e.g., in Context and/or `localStorage`).
- **Authorization Header:** For all protected routes, send the token in the `Authorization` header:
  `Authorization: Bearer <token>`
- **Lifetime:** Tokens expire in 8 hours. There are no refresh tokens implemented.
- **Payload:** The JWT payload includes `{ id, username, role }`.
- **Status Codes:** 
  - `401 Unauthorized`: Token is missing, expired, or invalid.
  - `403 Forbidden`: Token is valid, but the user's role does not permit access to the requested endpoint.

## Roles and Permissions Matrix
| Endpoint | Analyst | Supervisor | Admin |
| :--- | :---: | :---: | :---: |
| `POST /api/auth/login` | ✅ | ✅ | ✅ |
| `POST /api/auth/logout` | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ |
| `POST /api/auth/users` | ❌ | ❌ | ✅ |
| `GET /api/auth/users` | ❌ | ❌ | ✅ |
| `POST /api/transactions` | ✅ | ✅ | ✅ |
| `GET /api/transactions` | ✅ | ✅ | ✅ |
| `GET /api/transactions/:id` | ✅ | ✅ | ✅ |
| `PATCH /api/transactions/:id/flag` | ✅ | ✅ | ❌ |
| `GET /api/cases` | ✅ | ✅ | ✅ |
| `GET /api/cases/:id` | ✅ | ✅ | ✅ |
| `PATCH /api/cases/:id/status` | ✅ | ✅ | ❌ |
| `POST /api/cases/:id/notes` | ✅ | ✅ | ❌ |
| `PATCH /api/cases/:id/assign` | ❌ | ✅ | ❌ |
| `GET /api/reports/*` | ❌ | ✅ | ✅ |
| `GET /api/audit` | ❌ | ✅ | ✅ |

*Note: Admins cannot change case state or interact with cases directly. Their access is read-only for operational data.*

## Conventions
- **Error Format:** All errors return a standard JSON shape:
  ```json
  {
    "error": "Human readable error message",
    "details": ["Optional array of specific validation errors"]
  }
  ```
- **Pagination Format:** Paginated responses follow this structure:
  ```json
  {
    "data": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
  ```
  - `limit` defaults to 20.
  - Maximum `limit` allowed is 100.
- **Dates:** Always ISO 8601 UTC format (e.g., `2026-10-10T08:47:18.541Z`).
- **Money:** Always returned and expected as Numbers. Currency is `INR`.
- **Risk Factors:** Always returned as an Array of strings, never as a raw JSON string.

## Enums
- **Risk Levels and Score Thresholds:**
  - `low`: Score 0 - 39
  - `medium`: Score 40 - 69
  - `high`: Score 70 - 100
- **Transaction Types:** `purchase`, `transfer`, `withdrawal`, `deposit`
- **Roles:** `admin`, `analyst`, `supervisor`
- **Case Statuses:** `flagged`, `investigating`, `resolved`, `escalated`, `closed`
- **Audit Actions:**
  - `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `USER_CREATED`, `TRANSACTION_INGESTED`, `TRANSACTION_VIEWED`, `TRANSACTION_FLAGGED`, `CASE_CREATED`, `CASE_STATUS_CHANGED`, `CASE_NOTE_ADDED`, `CASE_ASSIGNED`, `REPORT_EXPORTED`

## Case Workflow

```text
[flagged] ---> [investigating] ---> [resolved] ---> [closed]
                      |                   ^
                      v                   |
                 [escalated] -------------+  (Supervisor only can push escalated back to investigating)
                      |
                      +---------------------------> [closed]
```

- **Transitions allowed:**
  - `flagged` → `investigating`
  - `investigating` → `resolved`, `escalated`
  - `resolved` → `closed`
  - `escalated` → `closed`, `investigating` (Supervisors only)
- **Role restrictions:** Admins are explicitly blocked from executing case state transitions.

---

## Endpoints

### 1. Auth

**`POST /api/auth/login`**
- **Auth:** Public
- **Body:** `{ "username": "...", "password": "..." }`
- **Example Response (200):**
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
  ```
- **Errors:** `400` (Missing credentials), `401` (Invalid username or password).

**`POST /api/auth/logout`**
- **Auth:** All authenticated roles
- **Body:** None
- **Note:** Logout is client-side. The server simply writes an audit log. The React client MUST destroy the token.

**`GET /api/auth/me`**
- **Auth:** All authenticated roles
- **Example Response (200):** Returns current user object (same as `user` object in login).

**`POST /api/auth/users`**
- **Auth:** Admin only
- **Body:**
  - `username` (string, min 3 chars, req)
  - `password` (string, min 8 chars, req)
  - `role` (enum: `analyst`, `supervisor`, `admin`, req)
- **Errors:** `400` (Validation), `409` (Username already exists).

**`GET /api/auth/users`**
- **Auth:** Admin only
- **Example Response (200):** Array of user objects (password hashes are strictly excluded).

---

### 2. Transactions

**`POST /api/transactions`**
- **Auth:** All authenticated roles (simulating an upstream system)
- **Body:** Single transaction object or array of transactions (max 500).
- **Errors:** `400` (Validation / Payload too large)

**`GET /api/transactions`**
- **Auth:** All authenticated roles
- **Query Params:**
  - `from`, `to` (ISO dates, opt)
  - `min_amount`, `max_amount` (number, opt)
  - `min_risk`, `max_risk` (number, opt)
  - `risk_level` (enum, opt)
  - `region`, `account_id`, `transaction_type` (string, opt)
  - `is_flagged` (boolean, opt)
  - `sort_by` (`timestamp`, `amount`, `risk_score`, opt)
  - `order` (`asc`, `desc`, opt)
  - `page`, `limit` (number, opt)
- **Example Response (200):**
  ```json
  {
    "data": [
      {
        "id": 272,
        "account_id": "ACC1030",
        "amount": 4200.5,
        "currency": "INR",
        "transaction_type": "purchase",
        "region": "Delhi",
        "risk_score": 75,
        "risk_level": "high",
        "risk_factors": ["Velocity burst detected"],
        "is_flagged": true,
        "timestamp": "2026-10-10T14:30:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
  }
  ```
- **Errors:** `400` (Invalid query params)

**`GET /api/transactions/:id`**
- **Auth:** All authenticated roles
- **Example Response (200):**
  Same as listed transaction, but includes the linked case if it exists.
  ```json
  {
    "id": 272,
    ...
    "case": {
      "id": 14,
      "status": "investigating",
      "assigned_to": 2
    }
  }
  ```
- **Errors:** `404` (Not found)

**`PATCH /api/transactions/:id/flag`**
- **Auth:** Analyst, Supervisor
- **Body:** None
- **Response (201):** Returns the newly created Case object.
- **Errors:** `404` (Not found), `409` (Already flagged / already has case)

---

### 3. Cases

**`GET /api/cases`**
- **Auth:** All authenticated roles
- **Query Params:** `status`, `risk_level`, `assigned_to` (`null` string accepted for unassigned), `from`, `to`, `page`, `limit`
- **Example Response (200):** Returns paginated array of cases, each including a summary of its transaction.

**`GET /api/cases/:id`**
- **Auth:** All authenticated roles
- **Example Response (200):**
  ```json
  {
    "id": 14,
    "transaction_id": 272,
    "status": "investigating",
    "assigned_to": 2,
    "assignee": { "id": 2, "username": "analyst1", "role": "analyst" },
    "transaction": { "amount": 4200.5, "risk_score": 75, ... },
    "notes": [
      {
        "id": 10,
        "note": "Customer contacted.",
        "evidence_reference": "call.mp3",
        "author": { "id": 2, "username": "analyst1" }
      }
    ]
  }
  ```
- **Errors:** `404` (Not found)

**`PATCH /api/cases/:id/status`**
- **Auth:** Analyst, Supervisor
- **Body:**
  - `status` (string enum, req)
  - `note` (string, max 2000 chars, opt)
- **Note:** Moving a case to `investigating` automatically assigns it to the caller if unassigned.
- **Errors:** `400` (Validation), `404` (Not found), `409` (Transition not allowed)

**`POST /api/cases/:id/notes`**
- **Auth:** Analyst, Supervisor
- **Body:**
  - `note` (string, max 2000 chars, req)
  - `evidence_reference` (string, max 500 chars, opt)
- **Errors:** `400` (Validation), `404` (Not found), `409` (Cannot add notes to closed case)

**`PATCH /api/cases/:id/assign`**
- **Auth:** Supervisor only
- **Body:** `{ "assigned_to": 3 }`
- **Errors:** `400` (Assigned user is not analyst/supervisor), `404` (Case/User not found)

---

### 4. Reports (Supervisor/Admin only)
**Shared Query Params:** `from`, `to`, `region`, `transaction_type`, `risk_level`

**`GET /api/reports/summary`**
- **Example Response (200):**
  ```json
  {
    "total_transactions": 301,
    "total_amount": 13122079.4,
    "flagged_transactions": 25,
    "flagged_rate": 0.0831,
    "average_risk_score": 8.46,
    "by_risk_level": { "low": 280, "medium": 18, "high": 3 },
    "cases_by_status": { "flagged": 4, "investigating": 5, "resolved": 5, "escalated": 5, "closed": 6 }
  }
  ```

**`GET /api/reports/trends`**
- **Query Params:** Shared params + `interval` (`day` or `week`)
- **Example Response (200):**
  ```json
  {
    "interval": "day",
    "points": [
      { "period": "2026-10-10", "total": 12, "flagged": 2, "high_risk": 1, "average_risk_score": 14.5 }
    ]
  }
  ```

**`GET /api/reports/heatmap`**
- **Query Params:** Shared params + `dimension` (`region_by_type` or `hour_by_weekday`)
- **Example Response (200):**
  ```json
  {
    "dimension": "region_by_type",
    "cells": [
      { "region": "Delhi", "transaction_type": "purchase", "count": 45, "average_risk_score": 12.3 }
    ]
  }
  ```

**`GET /api/reports/export`**
- **Query Params:** Shared params + `format` (`csv` or `pdf`) + `type` (`cases` or `fraud_summary`)
- **Response:** Returns raw CSV text or a binary PDF stream.

---

### 5. Audit (Supervisor/Admin only)

**`GET /api/audit`**
- **Query Params:** `user_id`, `action`, `entity_type`, `entity_id`, `from`, `to`, `page`, `limit`
- **Example Response (200):** Returns paginated audit log entries. Details are provided as a JSON string.

---

## Frontend Tips
- **Downloading Exports:** To download CSV/PDF in React with auth headers, use `fetch()` to get the raw `Blob`, create an ObjectURL, and trigger a download via an anchor `<a>` tag.
- **Heatmap Rendering:** The heatmap endpoint returns flat cells (e.g., region + type = count). You will need to group these by one dimension for the X-axis and the other for the Y-axis to render a grid.
- **Dashboard Mapping:**
  - `GET /api/transactions`: Transaction table (filters applied).
  - `GET /api/cases`: Case management dashboard.
  - `GET /api/cases/:id`: Detailed investigation view (includes notes).
  - `GET /api/reports/trends`: Line chart of fraud over time.
  - `GET /api/reports/summary`: Top KPI cards (Totals, Flag Rate).

## Demo Accounts
Run `npm run seed -- --yes` in the `server/` directory to generate data. 

- `admin`
- `analyst1`, `analyst2`, `analyst3`
- `supervisor1`, `supervisor2`

*Tip: Set `SEED_PASSWORD=your_password` when seeding to set a known password for all demo accounts.*

## Known Limitations
- **No Refresh Tokens:** Tokens expire strictly after 8 hours. The user must log in again.
- **Client-Side Logout:** The server validates tokens statelessly. The React app must delete the token locally to effectively log the user out.
- **Export Caps:** CSV/PDF case exports are strictly capped at 5000 rows.
- **Evidence Uploads:** The API stores `evidence_reference` strings (metadata). Actual file uploading (e.g. S3 buckets or GridFS) is out of scope for this API version.
