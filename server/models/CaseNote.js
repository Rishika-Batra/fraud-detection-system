const { DataTypes } = require('sequelize');

// CaseNote model: stores notes and evidence linked to a Case by a User
module.exports = (sequelize) => {
  return sequelize.define('CaseNote', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    case_id: { type: DataTypes.INTEGER, allowNull: false }, // FK to Case
    user_id: { type: DataTypes.INTEGER, allowNull: false }, // FK to User
    note: { type: DataTypes.TEXT, allowNull: false },
    evidence_reference: { type: DataTypes.TEXT, allowNull: true }, // Reference for a file name or link
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'case_notes',
    timestamps: false
  });
};
