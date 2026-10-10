const { DataTypes, Op } = require('sequelize');

// Transaction model: stores ingested transaction data to be evaluated
module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    account_id: { type: DataTypes.STRING, allowNull: false },
    amount: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      validate: { min: 0.01 }, // Amount must be greater than 0
      // SQLite stores DECIMAL as text; this getter ensures it always comes back as a number
      get() {
        const raw = this.getDataValue('amount');
        return raw !== null && raw !== undefined ? parseFloat(raw) : null;
      }
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

  // --- Static helper methods ---

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

  /**
   * Transaction.search(filters)
   * Builds a dynamic Sequelize query from validated filter parameters.
   * Called by transactionService.listTransactions(); the route never builds queries itself.
   *
   * @param {Object} filters - Pre-validated filter/sort/pagination values
   * @returns {{ rows: Transaction[], count: number }} - Paginated results and total count
   */
  Transaction.search = async function(filters) {
    const where = {};

    // --- Date range filters (timestamp) ---
    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) where.timestamp[Op.gte] = filters.from;
      if (filters.to)   where.timestamp[Op.lte] = filters.to;
    }

    // --- Amount range filters ---
    if (filters.min_amount !== undefined || filters.max_amount !== undefined) {
      where.amount = {};
      if (filters.min_amount !== undefined) where.amount[Op.gte] = filters.min_amount;
      if (filters.max_amount !== undefined) where.amount[Op.lte] = filters.max_amount;
    }

    // --- Risk score range filters ---
    if (filters.min_risk !== undefined || filters.max_risk !== undefined) {
      where.risk_score = {};
      if (filters.min_risk !== undefined) where.risk_score[Op.gte] = filters.min_risk;
      if (filters.max_risk !== undefined) where.risk_score[Op.lte] = filters.max_risk;
    }

    // --- Exact-match filters ---
    if (filters.risk_level)       where.risk_level = filters.risk_level;
    if (filters.region)           where.region = filters.region;
    if (filters.account_id)       where.account_id = filters.account_id;
    if (filters.transaction_type) where.transaction_type = filters.transaction_type;
    if (filters.is_flagged !== undefined) where.is_flagged = filters.is_flagged;

    // --- Sorting ---
    const sortBy = filters.sort_by || 'risk_score';
    const order  = filters.order   || 'DESC';

    // --- Pagination ---
    const page  = filters.page  || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // findAndCountAll returns { rows, count } which is exactly what we need for pagination
    return this.findAndCountAll({
      where,
      order: [[sortBy, order]],
      limit,
      offset
    });
  };

  /**
   * Transaction.findByIdWithCase(id)
   * Fetches a single transaction by primary key together with its linked Case (if any).
   * The Case association (hasOne) is defined in models/index.js.
   *
   * @param {number} id - Transaction primary key
   * @returns {Transaction|null}
   */
  Transaction.findByIdWithCase = async function(id) {
    // Lazy-require Case to avoid circular dependency at module-load time.
    // At runtime the association is already registered on the Transaction model,
    // so we can reference it by its model name string.
    const CaseModel = sequelize.models.Case;

    return this.findByPk(id, {
      include: [{
        model: CaseModel,
        required: false // LEFT JOIN — returns the transaction even if no case exists
      }]
    });
  };

  return Transaction;
};

