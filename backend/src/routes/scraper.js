const express = require('express');
const router = express.Router();
const { runScraper } = require('../services/scraperService');
const { computeAllTrends } = require('../services/trendService');
const { cache } = require('../../config/redis');
const Article = require('../models/Article');

router.post('/run', async (req, res) => {
  try {
    const result = await runScraper();
    await computeAllTrends();
    await cache.flush();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  const count = await Article.count();
  const latest = await Article.findOne({ order: [['scrapedAt', 'DESC']] });
  res.json({ totalArticles: count, lastScrapedAt: latest?.scrapedAt || null, status: 'running' });
});

module.exports = router;