require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// Connect to SQLite database
// Determine the DB path, default to ./db/fraud.db relative to the server folder
const dbPath = process.env.DB_PATH || './db/fraud.db';
const absoluteDbPath = path.resolve(__dirname, '..', dbPath);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: absoluteDbPath,
  logging: false // Disable logging SQL to console for cleaner output
});

// Load Models
const User = require('./User')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const Case = require('./Case')(sequelize);
const CaseNote = require('./CaseNote')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// --- Define Associations ---

// Transaction & Case: A Transaction may generate zero or one Case. A Case belongs to one Transaction.
Transaction.hasOne(Case, { foreignKey: 'transaction_id', as: 'case' });
Case.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

// User & Case: A User (assigned_to) owns many Cases. A Case belongs to one User.
User.hasMany(Case, { foreignKey: 'assigned_to' });
Case.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Case & CaseNote: A Case has many CaseNotes. A CaseNote belongs to a Case.
Case.hasMany(CaseNote, { foreignKey: 'case_id' });
CaseNote.belongsTo(Case, { foreignKey: 'case_id', as: 'case' });

// User & CaseNote: A User can write many CaseNotes. A CaseNote is authored by one User.
User.hasMany(CaseNote, { foreignKey: 'user_id' });
CaseNote.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// User & AuditLog: A User performs many actions (AuditLogs). An AuditLog is linked to a User.
User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Transaction,
  Case,
  CaseNote,
  AuditLog
};
