const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Insight = require('../models/Insight');
const Article = require('../models/Article');
const { generateInsight, generateTopInsights } = require('../services/aiService');
const { cache } = require('../../config/redis');

router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const cacheKey = `insights:latest:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const insights = await Insight.findAll({ order: [['generatedAt', 'DESC']], limit });
    await cache.set(cacheKey, insights, 180);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    const since = dayjs().subtract(24, 'hour').toDate();
    const articles = await Article.findAll({
      where: {
        publishedAt: { [Op.gte]: since },
        [Op.or]: [
          { title: { [Op.iLike]: `%${topic}%` } },
          { description: { [Op.iLike]: `%${topic}%` } },
        ],
      },
      order: [['publishedAt', 'DESC']], limit: 20,
    });

    if (articles.length < 2) {
      return res.status(404).json({ error: 'Not enough articles found for this topic', count: articles.length });
    }

    const insight = await generateInsight(topic, articles);
    if (!insight) return res.status(500).json({ error: 'Failed to generate insight' });

    res.json(insight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-top', async (req, res) => {
  try {
    const insights = await generateTopInsights();
    res.json({ generated: insights.length, insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;