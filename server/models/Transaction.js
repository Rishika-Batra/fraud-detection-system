const { DataTypes, Op } = require('sequelize');

// Transaction model: stores ingested transaction data to be evaluated
module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
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
    risk_factors: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      // Automatically parse JSON when retrieving from DB
      get() {
        const rawValue = this.getDataValue('risk_factors');
        try {
          return rawValue ? JSON.parse(rawValue) : [];
        } catch(e) {
          return [];
        }
      },
      // Automatically stringify JSON when saving to DB if passed as array
      set(val) {
        this.setDataValue('risk_factors', typeof val === 'string' ? val : JSON.stringify(val || []));
      }
    },
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

  // Helper method to find recent transactions for a specific account (Context for scoring)
  Transaction.findRecentByAccount = async function(accountId, sinceDate) {
    return this.findAll({
      where: { 
        account_id: accountId, 
        timestamp: { [Op.gte]: sinceDate } 
      },
      order: [['timestamp', 'DESC']] // Most recent first
    });
  };

  return Transaction;
};
