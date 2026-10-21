import json
import csv
import os
from datetime import datetime, timezone, timedelta

base_dir = r"c:\Users\Rolex\OneDrive\Desktop\PROJECT\fraud-detection-system\docs\demo-data"
os.makedirs(base_dir, exist_ok=True)

# 1. USERS
# Fictional users, secure fictional bcrypt hash for demo pass "Sentinel@Demo2026"
# bcrypt hash for demo: $2a$10$w9J6w3Bsv5xR4bQe5yR6.u8lG2FmI6s4nZ3o1v0pA7kL8j9h2i3j4
DUMMY_BCRYPT = "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5Kj1HkJ8q4hC3s.h7K4A1.3lM5hOq"

users = [
    {"id": 1, "username": "admin_rohit", "password_hash": DUMMY_BCRYPT, "role": "admin", "created_at": "2026-09-01T08:00:00.000Z"},
    {"id": 2, "username": "analyst_priya", "password_hash": DUMMY_BCRYPT, "role": "analyst", "created_at": "2026-09-01T08:15:00.000Z"},
    {"id": 3, "username": "analyst_arjun", "password_hash": DUMMY_BCRYPT, "role": "analyst", "created_at": "2026-09-01T08:30:00.000Z"},
    {"id": 4, "username": "analyst_kavita", "password_hash": DUMMY_BCRYPT, "role": "analyst", "created_at": "2026-09-01T08:45:00.000Z"},
    {"id": 5, "username": "supervisor_vikram", "password_hash": DUMMY_BCRYPT, "role": "supervisor", "created_at": "2026-09-01T09:00:00.000Z"},
    {"id": 6, "username": "supervisor_neha", "password_hash": DUMMY_BCRYPT, "role": "supervisor", "created_at": "2026-09-01T09:15:00.000Z"}
]

# 2. TRANSACTIONS
# 40 realistic transactions across 8 Indian regions and 4 types
# Range of risk scores, normal (score 0-35), medium (40-65), high (70-95)
# Flagged = True for high risk and specific medium risk cases
transactions = [
    # Normal retail purchases
    {"id": 1001, "account_id": "ACC1011", "amount": 1450.00, "currency": "INR", "merchant": "Swiggy", "transaction_type": "purchase", "region": "Bengaluru", "timestamp": "2026-10-01T12:14:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1002, "account_id": "ACC1012", "amount": 3200.50, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-01T13:45:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1003, "account_id": "ACC1013", "amount": 18500.00, "currency": "INR", "merchant": "Croma Electronics", "transaction_type": "purchase", "region": "Mumbai", "timestamp": "2026-10-01T16:20:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1004, "account_id": "ACC1014", "amount": 75000.00, "currency": "INR", "merchant": "Salary Credit", "transaction_type": "deposit", "region": "Pune", "timestamp": "2026-10-02T09:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1005, "account_id": "ACC1015", "amount": 5000.00, "currency": "INR", "merchant": "ATM HDFC", "transaction_type": "withdrawal", "region": "Chennai", "timestamp": "2026-10-02T11:30:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1006, "account_id": "ACC1016", "amount": 2400.00, "currency": "INR", "merchant": "BigBasket", "transaction_type": "purchase", "region": "Hyderabad", "timestamp": "2026-10-02T14:10:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1007, "account_id": "ACC1017", "amount": 15000.00, "currency": "INR", "merchant": "UPI Transfer", "transaction_type": "transfer", "region": "Kolkata", "timestamp": "2026-10-02T17:45:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1008, "account_id": "ACC1018", "amount": 890.00, "currency": "INR", "merchant": "Uber India", "transaction_type": "purchase", "region": "Ahmedabad", "timestamp": "2026-10-02T19:20:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1009, "account_id": "ACC1019", "amount": 10000.00, "currency": "INR", "merchant": "Flipkart", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-03T10:15:00.000Z", "risk_score": 10, "risk_level": "low", "risk_factors": json.dumps(["Amount is a round multiple of 10,000"]), "is_flagged": 0},
    {"id": 1010, "account_id": "ACC1020", "amount": 62000.00, "currency": "INR", "merchant": "DMart Retail", "transaction_type": "purchase", "region": "Mumbai", "timestamp": "2026-10-03T11:00:00.000Z", "risk_score": 20, "risk_level": "low", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)"]), "is_flagged": 0},

    # Odd hours transactions
    {"id": 1011, "account_id": "ACC1021", "amount": 12500.00, "currency": "INR", "merchant": "CryptoExchange", "transaction_type": "transfer", "region": "Delhi", "timestamp": "2026-10-03T02:30:00.000Z", "risk_score": 15, "risk_level": "low", "risk_factors": json.dumps(["Transaction occurred during odd hours (1-5 UTC)"]), "is_flagged": 0},
    {"id": 1012, "account_id": "ACC1022", "amount": 20000.00, "currency": "INR", "merchant": "ATM ICICI", "transaction_type": "withdrawal", "region": "Bengaluru", "timestamp": "2026-10-03T03:15:00.000Z", "risk_score": 25, "risk_level": "low", "risk_factors": json.dumps(["Amount is a round multiple of 10,000", "Transaction occurred during odd hours (1-5 UTC)"]), "is_flagged": 0},

    # Medium risk transactions
    {"id": 1013, "account_id": "ACC1023", "amount": 55000.00, "currency": "INR", "merchant": "Wire Transfer", "transaction_type": "transfer", "region": "Mumbai", "timestamp": "2026-10-04T02:45:00.000Z", "risk_score": 50, "risk_level": "medium", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Transaction occurred during odd hours (1-5 UTC)", "Large transfer at or above high threshold"]), "is_flagged": 1},
    {"id": 1014, "account_id": "ACC1024", "amount": 70000.00, "currency": "INR", "merchant": "ATM SBI", "transaction_type": "withdrawal", "region": "Delhi", "timestamp": "2026-10-04T04:10:00.000Z", "risk_score": 60, "risk_level": "medium", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Amount is a round multiple of 10,000", "Transaction occurred during odd hours (1-5 UTC)", "Large withdrawal at or above high threshold"]), "is_flagged": 1},
    {"id": 1015, "account_id": "ACC1025", "amount": 250000.00, "currency": "INR", "merchant": "NEFT Transfer", "transaction_type": "transfer", "region": "Pune", "timestamp": "2026-10-04T14:30:00.000Z", "risk_score": 60, "risk_level": "medium", "risk_factors": json.dumps(["Amount exceeds very high threshold (200000)", "Amount is a round multiple of 10,000", "Large transfer at or above high threshold"]), "is_flagged": 1},
    {"id": 1016, "account_id": "ACC1026", "amount": 3500.00, "currency": "INR", "merchant": "Myntra", "transaction_type": "purchase", "region": "Chennai", "timestamp": "2026-10-04T16:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1017, "account_id": "ACC1027", "amount": 8400.00, "currency": "INR", "merchant": "Swiggy", "transaction_type": "purchase", "region": "Hyderabad", "timestamp": "2026-10-04T18:30:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},

    # Suspicious Pattern: Velocity burst (Account ACC1028: 6 rapid transactions within 5 minutes)
    {"id": 1018, "account_id": "ACC1028", "amount": 4200.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1019, "account_id": "ACC1028", "amount": 4500.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:01:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1020, "account_id": "ACC1028", "amount": 4800.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:01:45.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1021, "account_id": "ACC1028", "amount": 4900.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:02:30.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1022, "account_id": "ACC1028", "amount": 5000.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:03:15.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1023, "account_id": "ACC1028", "amount": 5100.00, "currency": "INR", "merchant": "Amazon India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-05T10:04:00.000Z", "risk_score": 75, "risk_level": "high", "risk_factors": json.dumps(["High velocity: 5 transactions within 10 minutes", "Velocity burst detected"]), "is_flagged": 1},

    # Suspicious Pattern: Rapid Geographic Hop (Account ACC1029: Mumbai to Kolkata in 15 mins)
    {"id": 1024, "account_id": "ACC1029", "amount": 8500.00, "currency": "INR", "merchant": "ATM Axis", "transaction_type": "withdrawal", "region": "Mumbai", "timestamp": "2026-10-05T14:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1025, "account_id": "ACC1029", "amount": 92000.00, "currency": "INR", "merchant": "Croma Electronics", "transaction_type": "purchase", "region": "Kolkata", "timestamp": "2026-10-05T14:15:00.000Z", "risk_score": 80, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Region changed from Mumbai to Kolkata within 60 minutes"]), "is_flagged": 1},

    # Suspicious Pattern: High Amount Odd Hours Transfer
    {"id": 1026, "account_id": "ACC1030", "amount": 300000.00, "currency": "INR", "merchant": "CryptoExchange", "transaction_type": "transfer", "region": "Bengaluru", "timestamp": "2026-10-06T03:10:00.000Z", "risk_score": 85, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds very high threshold (200000)", "Amount is a round multiple of 10,000", "Transaction occurred during odd hours (1-5 UTC)", "Large transfer at or above high threshold"]), "is_flagged": 1},

    # Additional standard normal and medium transactions
    {"id": 1027, "account_id": "ACC1031", "amount": 650.00, "currency": "INR", "merchant": "Swiggy", "transaction_type": "purchase", "region": "Ahmedabad", "timestamp": "2026-10-06T12:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1028, "account_id": "ACC1032", "amount": 42000.00, "currency": "INR", "merchant": "Salary Credit", "transaction_type": "deposit", "region": "Chennai", "timestamp": "2026-10-06T13:30:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1029, "account_id": "ACC1033", "amount": 12000.00, "currency": "INR", "merchant": "ATM PNB", "transaction_type": "withdrawal", "region": "Delhi", "timestamp": "2026-10-06T15:20:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1030, "account_id": "ACC1034", "amount": 220000.00, "currency": "INR", "merchant": "Wire Transfer", "transaction_type": "transfer", "region": "Hyderabad", "timestamp": "2026-10-07T09:40:00.000Z", "risk_score": 60, "risk_level": "medium", "risk_factors": json.dumps(["Amount exceeds very high threshold (200000)", "Amount is a round multiple of 10,000", "Large transfer at or above high threshold"]), "is_flagged": 1},

    # Another High Risk Case: Rapid Region Hop + High Amount Transfer
    {"id": 1031, "account_id": "ACC1035", "amount": 3500.00, "currency": "INR", "merchant": "Uber India", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-07T11:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1032, "account_id": "ACC1035", "amount": 210000.00, "currency": "INR", "merchant": "CryptoExchange", "transaction_type": "transfer", "region": "Pune", "timestamp": "2026-10-07T11:25:00.000Z", "risk_score": 90, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds very high threshold (200000)", "Region changed from Delhi to Pune within 60 minutes", "Amount is a round multiple of 10,000", "Large transfer at or above high threshold"]), "is_flagged": 1},

    # More cases to support all 5 statuses
    {"id": 1033, "account_id": "ACC1036", "amount": 82000.00, "currency": "INR", "merchant": "ATM SBI", "transaction_type": "withdrawal", "region": "Mumbai", "timestamp": "2026-10-07T15:10:00.000Z", "risk_score": 50, "risk_level": "medium", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Large withdrawal at or above high threshold"]), "is_flagged": 1},
    {"id": 1034, "account_id": "ACC1037", "amount": 95000.00, "currency": "INR", "merchant": "UPI Transfer", "transaction_type": "transfer", "region": "Kolkata", "timestamp": "2026-10-08T02:15:00.000Z", "risk_score": 70, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Transaction occurred during odd hours (1-5 UTC)", "Large transfer at or above high threshold"]), "is_flagged": 1},
    {"id": 1035, "account_id": "ACC1038", "amount": 180000.00, "currency": "INR", "merchant": "NEFT Transfer", "transaction_type": "transfer", "region": "Chennai", "timestamp": "2026-10-08T03:40:00.000Z", "risk_score": 85, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Amount is a round multiple of 10,000", "Transaction occurred during odd hours (1-5 UTC)", "Large transfer at or above high threshold"]), "is_flagged": 1},
    {"id": 1036, "account_id": "ACC1039", "amount": 400000.00, "currency": "INR", "merchant": "Wire Transfer", "transaction_type": "transfer", "region": "Bengaluru", "timestamp": "2026-10-08T18:00:00.000Z", "risk_score": 75, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds very high threshold (200000)", "Amount is a round multiple of 10,000", "Large transfer at or above high threshold"]), "is_flagged": 1},
    {"id": 1037, "account_id": "ACC1040", "amount": 150000.00, "currency": "INR", "merchant": "ATM HDFC", "transaction_type": "withdrawal", "region": "Delhi", "timestamp": "2026-10-09T01:30:00.000Z", "risk_score": 75, "risk_level": "high", "risk_factors": json.dumps(["Amount exceeds high threshold (50000)", "Amount is a round multiple of 10,000", "Transaction occurred during odd hours (1-5 UTC)", "Large withdrawal at or above high threshold"]), "is_flagged": 1},
    {"id": 1038, "account_id": "ACC1011", "amount": 4200.00, "currency": "INR", "merchant": "Flipkart", "transaction_type": "purchase", "region": "Bengaluru", "timestamp": "2026-10-09T14:15:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1039, "account_id": "ACC1012", "amount": 1100.00, "currency": "INR", "merchant": "Swiggy", "transaction_type": "purchase", "region": "Delhi", "timestamp": "2026-10-09T19:40:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0},
    {"id": 1040, "account_id": "ACC1013", "amount": 15000.00, "currency": "INR", "merchant": "Salary Credit", "transaction_type": "deposit", "region": "Mumbai", "timestamp": "2026-10-10T10:00:00.000Z", "risk_score": 0, "risk_level": "low", "risk_factors": json.dumps([]), "is_flagged": 0}
]

# 3. CASES
# 12 cases corresponding to flagged transactions: 1013, 1014, 1015, 1023, 1025, 1026, 1030, 1032, 1033, 1034, 1035, 1036
# Distribution of statuses:
# 2 flagged, 3 investigating, 3 escalated, 2 resolved, 2 closed
cases = [
    # Flagged (initial state, unassigned)
    {"id": 1, "transaction_id": 1013, "assigned_to": None, "status": "flagged", "created_at": "2026-10-04T03:00:00.000Z", "updated_at": "2026-10-04T03:00:00.000Z", "closed_at": None},
    {"id": 2, "transaction_id": 1014, "assigned_to": None, "status": "flagged", "created_at": "2026-10-04T04:20:00.000Z", "updated_at": "2026-10-04T04:20:00.000Z", "closed_at": None},

    # Investigating (assigned to analyst)
    {"id": 3, "transaction_id": 1015, "assigned_to": 2, "status": "investigating", "created_at": "2026-10-04T14:40:00.000Z", "updated_at": "2026-10-04T15:10:00.000Z", "closed_at": None},
    {"id": 4, "transaction_id": 1023, "assigned_to": 3, "status": "investigating", "created_at": "2026-10-05T10:10:00.000Z", "updated_at": "2026-10-05T10:30:00.000Z", "closed_at": None},
    {"id": 5, "transaction_id": 1025, "assigned_to": 4, "status": "investigating", "created_at": "2026-10-05T14:20:00.000Z", "updated_at": "2026-10-05T14:50:00.000Z", "closed_at": None},

    # Escalated (assigned to analyst or supervisor)
    {"id": 6, "transaction_id": 1026, "assigned_to": 5, "status": "escalated", "created_at": "2026-10-06T03:20:00.000Z", "updated_at": "2026-10-06T06:00:00.000Z", "closed_at": None},
    {"id": 7, "transaction_id": 1030, "assigned_to": 6, "status": "escalated", "created_at": "2026-10-07T10:00:00.000Z", "updated_at": "2026-10-07T11:45:00.000Z", "closed_at": None},
    {"id": 8, "transaction_id": 1032, "assigned_to": 5, "status": "escalated", "created_at": "2026-10-07T11:35:00.000Z", "updated_at": "2026-10-07T13:00:00.000Z", "closed_at": None},

    # Resolved (legitimate confirmed or false positive resolved)
    {"id": 9, "transaction_id": 1033, "assigned_to": 2, "status": "resolved", "created_at": "2026-10-07T15:20:00.000Z", "updated_at": "2026-10-08T09:30:00.000Z", "closed_at": None},
    {"id": 10, "transaction_id": 1034, "assigned_to": 3, "status": "resolved", "created_at": "2026-10-08T02:30:00.000Z", "updated_at": "2026-10-08T11:00:00.000Z", "closed_at": None},

    # Closed (final state, closed_at populated)
    {"id": 11, "transaction_id": 1035, "assigned_to": 5, "status": "closed", "created_at": "2026-10-08T03:50:00.000Z", "updated_at": "2026-10-09T16:00:00.000Z", "closed_at": "2026-10-09T16:00:00.000Z"},
    {"id": 12, "transaction_id": 1036, "assigned_to": 6, "status": "closed", "created_at": "2026-10-08T18:15:00.000Z", "updated_at": "2026-10-10T10:00:00.000Z", "closed_at": "2026-10-10T10:00:00.000Z"}
]

# 4. CASE NOTES
case_notes = [
    {"id": 1, "case_id": 3, "user_id": 2, "note": "Contacted cardholder to verify transfer of INR 250,000. Customer stated they initiated this for property purchase.", "evidence_reference": "call-recording-ACC1025.mp3", "created_at": "2026-10-04T15:15:00.000Z"},
    {"id": 2, "case_id": 4, "user_id": 3, "note": "High velocity pattern detected: 6 transactions within 4 minutes. Initiated temporary card lock.", "evidence_reference": "velocity-burst-log.pdf", "created_at": "2026-10-05T10:35:00.000Z"},
    {"id": 3, "case_id": 4, "user_id": 3, "note": "Customer contacted support hotline stating phone was stolen. Confirmed unauthorized activity.", "evidence_reference": "support-ticket-8821.pdf", "created_at": "2026-10-05T11:20:00.000Z"},
    {"id": 4, "case_id": 5, "user_id": 4, "note": "Impossible travel time detected: Mumbai at 14:00 to Kolkata at 14:15. Contacting issuing bank.", "evidence_reference": "geo-ip-trace-ACC1029.png", "created_at": "2026-10-05T14:55:00.000Z"},
    {"id": 5, "case_id": 6, "user_id": 2, "note": "Large round-number crypto transfer at 03:10 AM UTC. Customer account shows no prior crypto history.", "evidence_reference": "account-history-ACC1030.pdf", "created_at": "2026-10-06T04:00:00.000Z"},
    {"id": 6, "case_id": 6, "user_id": 5, "note": "Escalating case to Financial Intelligence Unit due to AML threshold breach.", "evidence_reference": "fiu-referral-memo.pdf", "created_at": "2026-10-06T06:00:00.000Z"},
    {"id": 7, "case_id": 7, "user_id": 3, "note": "Account ACC1034 transferred INR 220,000 via Wire. IP address originates from high-risk hosting subnet.", "evidence_reference": "ip-intel-subnet.txt", "created_at": "2026-10-07T10:45:00.000Z"},
    {"id": 8, "case_id": 7, "user_id": 6, "note": "Escalated for senior fraud manager review and account debit freeze.", "evidence_reference": "freeze-order-991.pdf", "created_at": "2026-10-07T11:45:00.000Z"},
    {"id": 9, "case_id": 8, "user_id": 4, "note": "Delhi to Pune physical transaction anomaly. INR 210,000 crypto purchase.", "evidence_reference": "merchant-query-crypto.pdf", "created_at": "2026-10-07T12:30:00.000Z"},
    {"id": 10, "case_id": 8, "user_id": 5, "note": "Supervisor escalation approved. Transaction reported to National Cyber Crime Portal.", "evidence_reference": "portal-ref-NCCP2026.pdf", "created_at": "2026-10-07T13:00:00.000Z"},
    {"id": 11, "case_id": 9, "user_id": 2, "note": "High ATM withdrawal INR 82,000 verified against branch CCTV. Cardholder confirmed identity.", "evidence_reference": "cctv-still-atm-mumbai.jpg", "created_at": "2026-10-08T08:30:00.000Z"},
    {"id": 12, "case_id": 9, "user_id": 2, "note": "Resolution: Legitimate withdrawal by account holder. False positive flag marked resolved.", "evidence_reference": None, "created_at": "2026-10-08T09:30:00.000Z"},
    {"id": 13, "case_id": 10, "user_id": 3, "note": "Night transfer INR 95,000 verified via 2FA token authentication log. Legitimate transaction.", "evidence_reference": "2fa-auth-audit.log", "created_at": "2026-10-08T11:00:00.000Z"},
    {"id": 14, "case_id": 11, "user_id": 5, "note": "Chargeback completed. Funds recovered and account restored. Case marked closed.", "evidence_reference": "chargeback-settlement.pdf", "created_at": "2026-10-09T16:00:00.000Z"},
    {"id": 15, "case_id": 12, "user_id": 4, "note": "Wire transfer confirmed fraudulent. Police FIR filed reference #FIR-4491-BLR.", "evidence_reference": "police-fir-copy.pdf", "created_at": "2026-10-09T14:30:00.000Z"},
    {"id": 16, "case_id": 12, "user_id": 6, "note": "Final supervisory sign-off. Fraud loss booked to insurance reserves. Case closed.", "evidence_reference": "insurance-claim-settled.pdf", "created_at": "2026-10-10T10:00:00.000Z"}
]

# 5. AUDIT LOGS
# Realistic audit logs covering ACTIONS enum
audit_logs = [
    {"id": 1, "user_id": 1, "action": "LOGIN_SUCCESS", "entity_type": "User", "entity_id": 1, "details": None, "timestamp": "2026-10-01T08:30:00.000Z"},
    {"id": 2, "user_id": None, "action": "LOGIN_FAILED", "entity_type": "User", "entity_id": None, "details": json.dumps({"username": "intruder_bot"}), "timestamp": "2026-10-01T08:45:00.000Z"},
    {"id": 3, "user_id": 1, "action": "USER_CREATED", "entity_type": "User", "entity_id": 2, "details": json.dumps({"role": "analyst"}), "timestamp": "2026-10-01T08:50:00.000Z"},
    {"id": 4, "user_id": 2, "action": "LOGIN_SUCCESS", "entity_type": "User", "entity_id": 2, "details": None, "timestamp": "2026-10-01T09:00:00.000Z"},
    {"id": 5, "user_id": 2, "action": "TRANSACTION_INGESTED", "entity_type": "Transaction", "entity_id": 1001, "details": json.dumps({"score": 0}), "timestamp": "2026-10-01T12:14:01.000Z"},
    {"id": 6, "user_id": 2, "action": "TRANSACTION_VIEWED", "entity_type": "Transaction", "entity_id": 1001, "details": None, "timestamp": "2026-10-01T12:20:00.000Z"},
    {"id": 7, "user_id": 2, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1013, "details": None, "timestamp": "2026-10-04T03:00:00.000Z"},
    {"id": 8, "user_id": 2, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 1, "details": None, "timestamp": "2026-10-04T03:00:00.000Z"},
    {"id": 9, "user_id": 3, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1014, "details": None, "timestamp": "2026-10-04T04:20:00.000Z"},
    {"id": 10, "user_id": 3, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 2, "details": None, "timestamp": "2026-10-04T04:20:00.000Z"},
    {"id": 11, "user_id": 2, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1015, "details": None, "timestamp": "2026-10-04T14:40:00.000Z"},
    {"id": 12, "user_id": 2, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 3, "details": None, "timestamp": "2026-10-04T14:40:00.000Z"},
    {"id": 13, "user_id": 2, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 3, "details": json.dumps({"from": "flagged", "to": "investigating"}), "timestamp": "2026-10-04T15:10:00.000Z"},
    {"id": 14, "user_id": 2, "action": "CASE_NOTE_ADDED", "entity_type": "Case", "entity_id": 3, "details": json.dumps({"note_id": 1}), "timestamp": "2026-10-04T15:15:00.000Z"},
    {"id": 15, "user_id": 3, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1023, "details": None, "timestamp": "2026-10-05T10:10:00.000Z"},
    {"id": 16, "user_id": 3, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 4, "details": None, "timestamp": "2026-10-05T10:10:00.000Z"},
    {"id": 17, "user_id": 3, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 4, "details": json.dumps({"from": "flagged", "to": "investigating"}), "timestamp": "2026-10-05T10:30:00.000Z"},
    {"id": 18, "user_id": 3, "action": "CASE_NOTE_ADDED", "entity_type": "Case", "entity_id": 4, "details": json.dumps({"note_id": 2}), "timestamp": "2026-10-05T10:35:00.000Z"},
    {"id": 19, "user_id": 4, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1025, "details": None, "timestamp": "2026-10-05T14:20:00.000Z"},
    {"id": 20, "user_id": 4, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 5, "details": None, "timestamp": "2026-10-05T14:20:00.000Z"},
    {"id": 21, "user_id": 2, "action": "TRANSACTION_FLAGGED", "entity_type": "Transaction", "entity_id": 1026, "details": None, "timestamp": "2026-10-06T03:20:00.000Z"},
    {"id": 22, "user_id": 2, "action": "CASE_CREATED", "entity_type": "Case", "entity_id": 6, "details": None, "timestamp": "2026-10-06T03:20:00.000Z"},
    {"id": 23, "user_id": 5, "action": "CASE_ASSIGNED", "entity_type": "Case", "entity_id": 6, "details": json.dumps({"assigned_to": 5}), "timestamp": "2026-10-06T05:30:00.000Z"},
    {"id": 24, "user_id": 5, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 6, "details": json.dumps({"from": "investigating", "to": "escalated"}), "timestamp": "2026-10-06T06:00:00.000Z"},
    {"id": 25, "user_id": 2, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 9, "details": json.dumps({"from": "investigating", "to": "resolved"}), "timestamp": "2026-10-08T09:30:00.000Z"},
    {"id": 26, "user_id": 5, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 11, "details": json.dumps({"from": "escalated", "to": "closed"}), "timestamp": "2026-10-09T16:00:00.000Z"},
    {"id": 27, "user_id": 6, "action": "CASE_STATUS_CHANGED", "entity_type": "Case", "entity_id": 12, "details": json.dumps({"from": "escalated", "to": "closed"}), "timestamp": "2026-10-10T10:00:00.000Z"},
    {"id": 28, "user_id": 5, "action": "REPORT_EXPORTED", "entity_type": "Report", "entity_id": None, "details": json.dumps({"type": "cases", "format": "csv"}), "timestamp": "2026-10-10T11:00:00.000Z"},
    {"id": 29, "user_id": 6, "action": "REPORT_EXPORTED", "entity_type": "Report", "entity_id": None, "details": json.dumps({"type": "fraud_summary", "format": "pdf"}), "timestamp": "2026-10-10T11:30:00.000Z"},
    {"id": 30, "user_id": 2, "action": "LOGOUT", "entity_type": "User", "entity_id": 2, "details": None, "timestamp": "2026-10-10T12:00:00.000Z"}
]

# Write JSON and CSV files
datasets = [
    ("users", users),
    ("transactions", transactions),
    ("cases", cases),
    ("case-notes", case_notes),
    ("audit-logs", audit_logs)
]

for name, data in datasets:
    json_path = os.path.join(base_dir, f"{name}.json")
    csv_path = os.path.join(base_dir, f"{name}.csv")

    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(data, jf, indent=2)

    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        if data:
            writer = csv.DictWriter(cf, fieldnames=data[0].keys())
            writer.writeheader()
            for row in data:
                # For CSV, write None as empty string
                csv_row = {k: ("" if v is None else v) for k, v in row.items()}
                writer.writerow(csv_row)

print("Demo data successfully generated in JSON and CSV formats!")
