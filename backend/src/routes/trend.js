const express = require('express');
const router = express.Router();
const Trend = require('../models/Trend');
const { computeAllTrends, getKeywordTimeSeries } = require('../services/trendService');
const { cache } = require('../../config/redis');

router.get('/', async (req, res) => {
  const period = req.query.period || '24h';
  const limit = parseInt(req.query.limit) || 20;
  const cacheKey = `trends:${period}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const trends = await Trend.findAll({ where: { period }, order: [['count', 'DESC']], limit });
    const data = { period, trends, generatedAt: new Date() };
    await cache.set(cacheKey, data, 120);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/breaking', async (req, res) => {
  const cacheKey = 'trends:breaking';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const trends = await Trend.findAll({
      where: { period: '6h', isBreaking: true },
      order: [['trendVelocity', 'DESC']], limit: 10,
    });
    await cache.set(cacheKey, trends, 60);
    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/keyword/:keyword/timeseries', async (req, res) => {
  const { keyword } = req.params;
  const days = parseInt(req.query.days) || 7;
  const cacheKey = `trends:timeseries:${keyword}:${days}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const data = await getKeywordTimeSeries(keyword, days);
    await cache.set(cacheKey, data, 300);
    res.json({ keyword, days, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recompute', async (req, res) => {
  try {
    await computeAllTrends();
    await cache.flush();
    res.json({ message: 'Trends recomputed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;