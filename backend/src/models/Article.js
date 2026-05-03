const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Article = sequelize.define('Article', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.TEXT, allowNull: false },
  description: { type: DataTypes.TEXT },
  content: { type: DataTypes.TEXT },
  url: { type: DataTypes.TEXT, allowNull: false, unique: true },
  urlHash: { type: DataTypes.STRING(64), unique: true },
  source: { type: DataTypes.STRING, allowNull: false },
  sourceUrl: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING, defaultValue: 'general' },
  author: { type: DataTypes.STRING },
  imageUrl: { type: DataTypes.TEXT },
  publishedAt: { type: DataTypes.DATE, allowNull: false },
  scrapedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  sentimentScore: { type: DataTypes.FLOAT, defaultValue: 0 },
  sentimentLabel: {
    type: DataTypes.ENUM('positive', 'negative', 'neutral'),
    defaultValue: 'neutral',
  },
  sentimentMagnitude: { type: DataTypes.FLOAT, defaultValue: 0 },
 keywords: {
  type: DataTypes.ARRAY(DataTypes.TEXT),
  defaultValue: [],
},
  trendScore: { type: DataTypes.FLOAT, defaultValue: 0 },
}, {
  tableName: 'articles',
  indexes: [
    { fields: ['publishedAt'] },
    { fields: ['category'] },
    { fields: ['source'] },
    { fields: ['sentimentLabel'] },
    { fields: ['urlHash'] },
  ],
});

module.exports = Article;