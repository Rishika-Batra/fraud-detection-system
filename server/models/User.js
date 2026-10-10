const { DataTypes } = require('sequelize');

// User model: stores system users and their roles
module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    username: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    password_hash: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    role: { 
      type: DataTypes.ENUM('analyst', 'supervisor', 'admin'), 
      allowNull: false 
    },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'users',
    timestamps: false
  });
};
