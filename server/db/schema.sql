-- SQLite Database Schema Reference
-- This file serves as documentation for the database structure managed by Sequelize.

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('analyst', 'supervisor', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL,
    merchant VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL,
    region VARCHAR(100),
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_factors TEXT,
    is_flagged BOOLEAN DEFAULT 0
);

-- Indexes for efficient querying on transactions
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_risk_score ON transactions(risk_score);
CREATE INDEX idx_transactions_region ON transactions(region);

CREATE TABLE cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL UNIQUE,
    assigned_to INTEGER,
    status VARCHAR(50) DEFAULT 'flagged' CHECK (status IN ('flagged', 'investigating', 'resolved', 'escalated', 'closed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Index for efficient querying on case status
CREATE INDEX idx_cases_status ON cases(status);

CREATE TABLE case_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    evidence_reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
