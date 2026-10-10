/**
 * caseService.js
 * Business logic for case management.
 * Validates transitions and wraps multi-step writes in a Sequelize transaction.
 */

const { Case, CaseNote, User, sequelize } = require('../models');
const { validateTransition, TRANSITIONS } = require('./caseWorkflow');
const { logAction, ACTIONS } = require('./auditLogger');

function parseFilters(query) {
  const filters = {};
  const errors = [];

  if (query.status) {
    const valid = ['flagged', 'investigating', 'resolved', 'escalated', 'closed'];
    if (!valid.includes(query.status)) errors.push("status is invalid");
    else filters.status = query.status;
  }
  
  if (query.risk_level) {
    const valid = ['low', 'medium', 'high'];
    if (!valid.includes(query.risk_level)) errors.push("risk_level is invalid");
    else filters.risk_level = query.risk_level;
  }

  if (query.assigned_to !== undefined) {
    const val = query.assigned_to === 'null' ? null : Number(query.assigned_to);
    if (val !== null && isNaN(val)) errors.push("assigned_to must be a number or 'null'");
    else filters.assigned_to = val;
  }

  if (query.from) {
    const d = new Date(query.from);
    if (isNaN(d.getTime())) errors.push("from must be a valid ISO date");
    else filters.from = d;
  }
  
  if (query.to) {
    const d = new Date(query.to);
    if (isNaN(d.getTime())) errors.push("to must be a valid ISO date");
    else filters.to = d;
  }

  const page = query.page !== undefined ? Number(query.page) : 1;
  const limit = query.limit !== undefined ? Number(query.limit) : 20;

  if (!Number.isInteger(page) || page < 1) errors.push("page must be a positive integer");
  else filters.page = page;

  if (!Number.isInteger(limit) || limit < 1) errors.push("limit must be a positive integer");
  else if (limit > 100) errors.push("limit cannot exceed 100");
  else filters.limit = limit;

  if (errors.length > 0) throw { status: 400, message: "Invalid query parameters", details: errors };
  
  return filters;
}

async function listCases(query) {
  const filters = parseFilters(query);
  const { rows, count } = await Case.search(filters);
  return {
    data: rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: count,
      total_pages: Math.ceil(count / filters.limit)
    }
  };
}

async function getCaseById(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) throw { status: 400, message: "Case id must be a numeric integer" };

  const caseObj = await Case.findByIdWithDetails(id);
  if (!caseObj) throw { status: 404, message: "Case not found" };

  return caseObj;
}

async function updateStatus(rawId, payload, actor) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) throw { status: 400, message: "Case id must be a numeric integer" };

  const { status, note } = payload;
  if (!status) throw { status: 400, message: "status is required" };
  
  if (note && note.length > 2000) {
    throw { status: 400, message: "note must not exceed 2000 characters" };
  }

  const caseObj = await Case.findByPk(id);
  if (!caseObj) throw { status: 404, message: "Case not found" };

  // Validate state machine rules purely
  validateTransition(caseObj.status, status, actor.role);

  const oldStatus = caseObj.status;

  // No-op protection
  if (oldStatus === status) {
    return caseObj;
  }

  // Wrap in a transaction to ensure case updates and optional note creation succeed or fail together.
  await sequelize.transaction(async (t) => {
    caseObj.status = status;
    caseObj.updated_at = new Date();

    if (status === 'investigating' && !caseObj.assigned_to) {
      caseObj.assigned_to = actor.id;
    }
    
    if (status === 'closed') {
      caseObj.closed_at = new Date();
    } else {
      caseObj.closed_at = null; // Re-opened (e.g. escalated -> investigating)
    }

    await caseObj.save({ transaction: t });

    if (note) {
      await CaseNote.create({
        case_id: caseObj.id,
        user_id: actor.id,
        note
      }, { transaction: t });
    }
  });

  await logAction({
    userId: actor.id,
    action: ACTIONS.CASE_STATUS_CHANGED,
    entityType: 'Case',
    entityId: caseObj.id,
    details: { from: oldStatus, to: status }
  });

  return getCaseById(id);
}

async function addNote(rawId, payload, actorId) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) throw { status: 400, message: "Case id must be a numeric integer" };

  const { note, evidence_reference } = payload;
  if (!note || note.trim().length === 0) throw { status: 400, message: "note is required" };
  if (note.length > 2000) throw { status: 400, message: "note must not exceed 2000 characters" };
  if (evidence_reference && evidence_reference.length > 500) throw { status: 400, message: "evidence_reference must not exceed 500 characters" };

  const caseObj = await Case.findByPk(id);
  if (!caseObj) throw { status: 404, message: "Case not found" };

  if (caseObj.status === 'closed') {
    throw { status: 409, message: "Cannot add notes to a closed case" };
  }

  const newNote = await CaseNote.create({
    case_id: caseObj.id,
    user_id: actorId,
    note,
    evidence_reference
  });

  // Note text itself is omitted from audit log to avoid bloating the log
  await logAction({
    userId: actorId,
    action: ACTIONS.CASE_NOTE_ADDED,
    entityType: 'Case',
    entityId: caseObj.id,
    details: { note_id: newNote.id }
  });

  return newNote;
}

async function assignCase(rawId, payload, actorId) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) throw { status: 400, message: "Case id must be a numeric integer" };

  const { assigned_to } = payload;
  if (!assigned_to) throw { status: 400, message: "assigned_to is required" };

  const caseObj = await Case.findByPk(id);
  if (!caseObj) throw { status: 404, message: "Case not found" };

  const targetUser = await User.findByPk(assigned_to);
  if (!targetUser) throw { status: 404, message: "User not found" };

  if (!['analyst', 'supervisor'].includes(targetUser.role)) {
    throw { status: 400, message: "Only analysts and supervisors can be assigned cases" };
  }

  caseObj.assigned_to = targetUser.id;
  caseObj.updated_at = new Date();
  await caseObj.save();

  await logAction({
    userId: actorId,
    action: ACTIONS.CASE_ASSIGNED,
    entityType: 'Case',
    entityId: caseObj.id,
    details: { assigned_to: targetUser.id }
  });

  return caseObj;
}

module.exports = { listCases, getCaseById, updateStatus, addNote, assignCase };
