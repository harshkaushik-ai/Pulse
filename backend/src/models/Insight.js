const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Insight = sequelize.define('Insight', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  topic: { type: DataTypes.STRING, allowNull: false },
  summary: { type: DataTypes.TEXT, allowNull: false },
  prediction: { type: DataTypes.TEXT },
  keyPoints: { type: DataTypes.JSONB, defaultValue: [] },
  relatedArticleIds: { type: DataTypes.JSONB, defaultValue: [] },
  confidenceScore: { type: DataTypes.FLOAT, defaultValue: 0 },
  sentimentTrend: { type: DataTypes.ENUM('improving', 'declining', 'stable', 'volatile'), defaultValue: 'stable' },
  impactLevel: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  generatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'insights',
  indexes: [
    { fields: ['topic'] },
    { fields: ['generatedAt'] },
    { fields: ['impactLevel'] },
  ],
});

module.exports = Insight;