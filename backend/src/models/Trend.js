const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Trend = sequelize.define('Trend', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  keyword: { type: DataTypes.STRING, allowNull: false },
  period: { type: DataTypes.ENUM('1h', '6h', '24h', '7d', '30d'), allowNull: false },
  count: { type: DataTypes.INTEGER, defaultValue: 0 },
  avgSentiment: { type: DataTypes.FLOAT, defaultValue: 0 },
  trendVelocity: { type: DataTypes.FLOAT, defaultValue: 0 },
  isBreaking: { type: DataTypes.BOOLEAN, defaultValue: false },
  relatedKeywords: { type: DataTypes.JSONB, defaultValue: [] },
  computedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'trends',
  indexes: [
    { fields: ['keyword'] },
    { fields: ['period'] },
    { fields: ['computedAt'] },
    { fields: ['trendVelocity'] },
  ],
});

module.exports = Trend;