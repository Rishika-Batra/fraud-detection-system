const { DataTypes } = require('sequelize');

// Case model: tracks the investigation of a flagged transaction
module.exports = (sequelize) => {
  return sequelize.define('Case', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transaction_id: { type: DataTypes.INTEGER, allowNull: false, unique: true }, // One case per transaction
    assigned_to: { type: DataTypes.INTEGER, allowNull: true }, // FK to User
    status: { 
      type: DataTypes.ENUM('flagged', 'investigating', 'resolved', 'escalated', 'closed'), 
      defaultValue: 'flagged' 
    },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    closed_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'cases',
    timestamps: false,
    indexes: [
      { fields: ['status'] }
    ]
  });
};
