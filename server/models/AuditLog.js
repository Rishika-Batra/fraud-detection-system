const { DataTypes } = require('sequelize');

// AuditLog model: tracks all critical user actions and system changes (Tamper-evident trail)
module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true }, // Nullable for failed logins or system actions
    action: { type: DataTypes.STRING, allowNull: false }, // Action taken (e.g., 'update_status', 'login')
    entity_type: { type: DataTypes.STRING, allowNull: false }, // Entity modified (e.g., 'Case', 'User')
    entity_id: { type: DataTypes.INTEGER, allowNull: true }, // ID of the entity modified
    details: { type: DataTypes.TEXT, allowNull: true }, // Additional context/changes
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

  return AuditLog;
};
