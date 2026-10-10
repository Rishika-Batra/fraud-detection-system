/**
 * auditLogger.js
 * Centralized service for writing audit trail records.
 * 
 * An audit trail provides a tamper-evident historical record of system events. 
 * This allows administrators to see exactly who did what and when, which is critical
 * for tracking down fraudulent internal activity or system misuse.
 * 
 * Note on failures: Writing an audit log should never crash the main user request.
 * If the database fails to write the log, we console.error it but do not throw,
 * ensuring the core system remains functional.
 */

const { AuditLog } = require('../models');

// Constant object for action names to prevent typos and standardize the audit trail
const ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  USER_CREATED: 'USER_CREATED',
  TRANSACTION_INGESTED: 'TRANSACTION_INGESTED',
  TRANSACTION_VIEWED: 'TRANSACTION_VIEWED',
  // Placeholders for later steps (case-management step)
  TRANSACTION_FLAGGED: 'TRANSACTION_FLAGGED',
  CASE_CREATED: 'CASE_CREATED',
  CASE_STATUS_CHANGED: 'CASE_STATUS_CHANGED',
  CASE_NOTE_ADDED: 'CASE_NOTE_ADDED',
  REPORT_EXPORTED: 'REPORT_EXPORTED'
};

/**
 * Logs an action to the audit trail. 
 * Wraps DB logic in a try/catch so failures don't crash the main request.
 */
async function logAction({ userId, action, entityType, entityId, details }) {
  try {
    let safeDetails = null;
    
    if (details) {
      // Shallow copy to prevent mutating the caller's object
      const sanitized = { ...details };
      // Strip sensitive fields
      delete sanitized.password;
      delete sanitized.password_hash;
      delete sanitized.token;
      
      safeDetails = JSON.stringify(sanitized);
    }

    await AuditLog.create({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: safeDetails
    });
  } catch (error) {
    // Console error only. Never throw! An audit failure must not break the user's action.
    console.error('AuditLog Error: Failed to write audit record', error);
  }
}

module.exports = { logAction, ACTIONS };
