const { DataTypes } = require('sequelize');

// Transaction model: stores ingested transaction data to be evaluated
module.exports = (sequelize) => {
  return sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    account_id: { type: DataTypes.STRING, allowNull: false },
    amount: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: { min: 0.01 } // Amount must be greater than 0
    },
    currency: { type: DataTypes.STRING, allowNull: false },
    merchant: { type: DataTypes.STRING, allowNull: true },
    transaction_type: { type: DataTypes.STRING, allowNull: false }, // e.g. purchase, transfer, withdrawal
    region: { type: DataTypes.STRING, allowNull: true },
    timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    risk_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    risk_level: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'low' },
    risk_factors: { type: DataTypes.TEXT, allowNull: true }, // JSON stored as text
    is_flagged: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'transactions',
    timestamps: false,
    indexes: [
      { fields: ['timestamp'] },
      { fields: ['risk_score'] },
      { fields: ['region'] }
    ]
  });
};
