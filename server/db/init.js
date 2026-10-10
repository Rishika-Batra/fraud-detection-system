require('dotenv').config();
const { sequelize } = require('../models');

async function initDB() {
  try {
    // Authenticate the connection
    await sequelize.authenticate();
    console.log('Connection to SQLite has been established successfully.');
    
    // Sync models (creates tables based on models if they don't exist, updates schema if needed)
    await sequelize.sync({ alter: true }); 
    console.log('Database ready');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    // Close the connection once done
    await sequelize.close();
  }
}

// Run the initialization
initDB();
