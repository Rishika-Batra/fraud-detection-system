const { DataTypes, Op } = require('sequelize');

// AuditLog model: tracks all critical user actions and system changes (Tamper-evident trail)
// Why is it append-only? 
// The log must be append-only so that past actions cannot be erased or modified by a compromised account. 
// This guarantees a trustworthy historical record of system events.
// Auditing of case actions will be wired in during the case-management step.
module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true }, // Nullable for failed logins or system actions
    action: { type: DataTypes.STRING, allowNull: false }, // Action taken (e.g., 'update_status', 'login')
    entity_type: { type: DataTypes.STRING, allowNull: false }, // Entity modified (e.g., 'Case', 'User')
    entity_id: { type: DataTypes.INTEGER, allowNull: true }, // ID of the entity modified
    details: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('details');
        try {
          return rawValue ? JSON.parse(rawValue) : null;
        } catch(e) {
          return rawValue; // Fallback to raw string if parsing fails
        }
      }
    },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'audit_logs',
    timestamps: false,
    hooks: {
      // Prevent modifications to maintain an append-only, tamper-evident log
      beforeUpdate: () => {
        throw new Error('AuditLog entries cannot be updated. This is an append-only table.');
      },
      beforeDestroy: () => {
        throw new Error('AuditLog entries cannot be deleted. This is an append-only table.');
      }
    }
  });

  // --- Static helper methods ---

  AuditLog.search = async function(filters) {
    const where = {};

    if (filters.user_id !== undefined) where.user_id = filters.user_id;
    if (filters.action) where.action = filters.action;
    if (filters.entity_type) where.entity_type = filters.entity_type;
    if (filters.entity_id !== undefined) where.entity_id = filters.entity_id;

    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp[Op.gte] = filters.from;
      if (filters.to) where.timestamp[Op.lte] = filters.to;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    return this.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });
  };

  return AuditLog;
};

