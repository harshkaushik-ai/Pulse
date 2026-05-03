const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Trend = require('../models/Trend');
const logger = require('../utils/logger');

// Watchlist model
const WatchlistItem = sequelize.define('WatchlistItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  keyword: { type: DataTypes.STRING, allowNull: false },
  threshold: { type: DataTypes.INTEGER, defaultValue: 5 },
  alertOnSpike: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastAlertAt: { type: DataTypes.DATE },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  color: { type: DataTypes.STRING, defaultValue: '#a78bfa' },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'watchlist_items' });

const Alert = sequelize.define('Alert', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  keyword: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('spike', 'breaking', 'sentiment_shift', 'new_trend'), defaultValue: 'spike' },
  message: { type: DataTypes.TEXT },
  count: { type: DataTypes.INTEGER },
  velocity: { type: DataTypes.FLOAT },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  triggeredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'alerts' });

const checkWatchlistAlerts = async (io) => {
  try {
    const watchlist = await WatchlistItem.findAll({ where: { isActive: true } });
    if (!watchlist.length) return;

    const alerts = [];

    for (const item of watchlist) {
      const trend = await Trend.findOne({
        where: { keyword: item.keyword, period: '1h' },
        order: [['computedAt', 'DESC']],
      });

      if (!trend) continue;

      // Spike alert
      if (item.alertOnSpike && trend.count >= item.threshold) {
        const recentAlert = item.lastAlertAt &&
          dayjs().diff(dayjs(item.lastAlertAt), 'minute') < 30;

        if (!recentAlert) {
          const alert = await Alert.create({
            keyword: item.keyword,
            type: trend.isBreaking ? 'breaking' : 'spike',
            message: `"${item.keyword}" spiked to ${trend.count} mentions in the last hour`,
            count: trend.count,
            velocity: trend.trendVelocity,
          });

          await item.update({ lastAlertAt: new Date() });
          alerts.push(alert);

          // Push real-time alert via WebSocket
          if (io) {
            io.emit('alert', {
              id: alert.id,
              keyword: item.keyword,
              type: alert.type,
              message: alert.message,
              count: trend.count,
              velocity: trend.trendVelocity,
              triggeredAt: alert.triggeredAt,
            });
          }

          logger.info(`Alert triggered: ${item.keyword} — ${trend.count} mentions`);
        }
      }
    }

    return alerts;
  } catch (err) {
    logger.error('Watchlist check error:', err.message);
    return [];
  }
};

module.exports = { WatchlistItem, Alert, checkWatchlistAlerts };