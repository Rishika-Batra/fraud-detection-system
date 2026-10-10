/**
 * caseWorkflow.js
 * Pure functions governing case state transitions without DB access.
 * This makes the core business rules easily unit-testable.
 *
 * State diagram:
 * [flagged] ---> [investigating] ---> [resolved] ---> [closed]
 *                       |                   ^
 *                       v                   |
 *                  [escalated] -------------+ (only supervisor can push escalated back to investigating)
 *                       |
 *                       +---------------------------> [closed]
 */

const TRANSITIONS = {
  flagged: ['investigating'],
  investigating: ['resolved', 'escalated'],
  resolved: ['closed'],
  escalated: ['closed', 'investigating'], // investigating allowed for supervisors only
  closed: []
};

/**
 * Validates whether a transition from one status to another is permitted,
 * throwing specific HTTP errors if blocked.
 * 
 * @param {string} from - Current status
 * @param {string} to - Desired status
 * @param {string} role - The role of the acting user
 * @throws {Object} { status: number, message: string }
 */
function validateTransition(from, to, role) {
  if (from === to) return; // No-op transition is safely ignored
  
  const allowed = TRANSITIONS[from] || [];
  
  if (!allowed.includes(to)) {
    let roleAllowed = [...allowed];
    if (from === 'escalated' && role !== 'supervisor') {
      roleAllowed = roleAllowed.filter(s => s !== 'investigating');
    }
    if (role === 'admin') roleAllowed = [];
    
    throw { status: 409, message: `Transition from ${from} to ${to} is not allowed. Allowed states: ${roleAllowed.join(', ')}` };
  }

  // Business rule: Only a supervisor can send an escalated case back to investigating
  if (from === 'escalated' && to === 'investigating' && role !== 'supervisor') {
    throw { status: 403, message: 'Only a supervisor can move an escalated case back to investigating' };
  }

  // Business rule: Admin cannot change case state.
  if (role === 'admin') {
    throw { status: 403, message: 'Admin cannot change case state' };
  }
}

module.exports = { TRANSITIONS, validateTransition };

