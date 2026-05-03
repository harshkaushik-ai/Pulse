require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../src/utils/logger');

const isCloud = process.env.DB_HOST && !process.env.DB_HOST.includes('localhost');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'news_trends',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: isCloud
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');
  } catch (err) {
    logger.error('Database connection failed:', err);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };