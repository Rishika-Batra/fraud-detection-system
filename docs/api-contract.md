# SentinelGuard API Contract & Integration Specification

**System Lead**: Rishika Nigam (Frontend & Architecture Lead)  
**Backend Owner**: Rishika Batra (Backend & Scoring Engine)  
**QA / Testing Lead**: Rishabh Jain (Test Suite & Integration)

---

## 1. Authentication & Identity (`/api/auth`)

### POST `/api/auth/login`
- **Description**: Authenticate user and issue JWT bearer token.
- **Request Body**:
  ```json
  {
    "username": "analyst",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 1,
      "username": "analyst",
      "role": "analyst"
    }
  }
  ```
- **Error Responses**: `401 Unauthorized` (`Invalid username or password`).

### POST `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{ "message": "Logged out" }`

### GET `/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: User profile object `{ "id": 1, "username": "analyst", "role": "analyst" }`.

---

## 2. Transaction Monitoring (`/api/transactions` — FR-08)

### GET `/api/transactions`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor`, `admin`
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
  - `sort_by`: string (`risk_score`, `amount`, `timestamp`)
  - `order`: `ASC` | `DESC`
  - `risk_level`: `low` | `medium` | `high`
  - `region`: string
  - `transaction_type`: `purchase` | `transfer` | `withdrawal`
  - `is_flagged`: boolean (`true` | `false`)
  - `account_id`: string
- **Response `200 OK`**:
  ```json
  {
    "count": 42,
    "rows": [
      {
        "id": 101,
        "account_id": "ACC-88392",
        "amount": 48500.00,
        "currency": "INR",
        "merchant": "CryptoX Exchange",
        "transaction_type": "transfer",
        "region": "IN-WEST",
        "timestamp": "2026-10-10T14:30:00.000Z",
        "risk_score": 88,
        "risk_level": "high",
        "risk_factors": ["High amount for account profile", "Unusual region location"],
        "is_flagged": true
      }
    ]
  }
  ```

### PATCH `/api/transactions/:id/flag`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor`
- **Response `201 Created`**: Returns newly generated `Case` record `{ "id": 5, "transaction_id": 101, "status": "flagged", ... }`.

### POST `/api/transactions` (Simulated Ingestion)
- **Headers**: `Authorization: Bearer <token>`
- **Response `201 Created`**: Returns saved scored transaction record.

---

## 3. Case Investigation Workspace (`/api/cases` — FR-09)

### GET `/api/cases`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor`, `admin`
- **Query Parameters**: `status`, `risk_level`, `page`, `limit`
- **Response `200 OK`**: `{ "count": 12, "rows": [...] }`

### GET `/api/cases/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor`, `admin`
- **Response `200 OK`**: Case details including nested `transaction`, `assignee`, and `CaseNotes` array.

### PATCH `/api/cases/:id/status`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor` (Admin receives `403 Forbidden`)
- **Request Body**: `{ "status": "investigating" }`
- **State Diagram Constraints**:
  - `flagged` ➔ `investigating`
  - `investigating` ➔ `resolved` | `escalated`
  - `escalated` ➔ `closed` | `investigating` (Re-opening `escalated` ➔ `investigating` requires `supervisor` role)
  - `resolved` ➔ `closed`

### POST `/api/cases/:id/notes`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `analyst`, `supervisor`
- **Request Body**: `{ "note": "Investigation finding text..." }`
- **Response `201 Created`**: CaseNote object.

### PATCH `/api/cases/:id/assign`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `supervisor` only
- **Request Body**: `{ "assigned_to": 2 }`

---

## 4. Analytics & Reporting (`/api/reports` — FR-10)

### GET `/api/reports/summary`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `supervisor`, `admin`

### GET `/api/reports/trends`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `supervisor`, `admin`
- **Query Parameters**: `interval` (`day` | `week`), `from`, `to`

### GET `/api/reports/heatmap`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `supervisor`, `admin`
- **Query Parameters**: `dimension` (`region_by_type` | `hour_by_weekday`)

### GET `/api/reports/export`
- **Headers**: `Authorization: Bearer <token>`
- **Roles Allowed**: `supervisor`, `admin`
- **Query Parameters**: `format` (`csv` | `pdf`), `type` (`cases` | `fraud_summary`), `from`, `to`
- **Response**: Binary file stream (`text/csv` or `application/pdf`).
