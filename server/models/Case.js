const { DataTypes, Op } = require('sequelize');

// Case model: tracks the investigation of a flagged transaction
module.exports = (sequelize) => {
  const Case = sequelize.define('Case', {
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

  // --- Static query helpers ---

  Case.search = async function(filters) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.assigned_to !== undefined) where.assigned_to = filters.assigned_to;
    
    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) where.created_at[Op.gte] = filters.from;
      if (filters.to) where.created_at[Op.lte] = filters.to;
    }

    const include = [{
      model: sequelize.models.Transaction,
      as: 'transaction',
      attributes: ['id', 'amount', 'risk_score', 'risk_level', 'region'],
      where: filters.risk_level ? { risk_level: filters.risk_level } : undefined
    }];

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return this.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
  };

  Case.findByIdWithDetails = async function(id) {
    const Transaction = sequelize.models.Transaction;
    const User = sequelize.models.User;
    const CaseNote = sequelize.models.CaseNote;

    return this.findByPk(id, {
      include: [
        { model: Transaction, as: 'transaction' },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'role'] }, // this fetches the assigned_to user
        { 
          model: CaseNote,
          include: [{ model: User, as: 'author', attributes: ['id', 'username'] }] // fetches note author
        }
      ],
      // Order case notes oldest first
      order: [[CaseNote, 'created_at', 'ASC']]
    });
  };

  return Case;
};

