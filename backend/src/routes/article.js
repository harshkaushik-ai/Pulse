const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const router = express.Router();
const Article = require('../models/Article');
const { cache } = require('../../config/redis');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/articles
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('sentiment').optional().isIn(['positive', 'negative', 'neutral']),
    query('search').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const where = {};

      if (req.query.category) where.category = req.query.category;
      if (req.query.sentiment) where.sentimentLabel = req.query.sentiment;
      if (req.query.search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${req.query.search}%` } },
          { description: { [Op.iLike]: `%${req.query.search}%` } },
        ];
      }

      const { count, rows } = await Article.findAndCountAll({
        where, order: [['publishedAt', 'DESC']], limit, offset,
        attributes: { exclude: ['content', 'urlHash'] },
      });

      res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/articles/stats
router.get('/stats', async (req, res) => {
  const cacheKey = 'articles:stats';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since24h = dayjs().subtract(24, 'hour').toDate();
    const since7d = dayjs().subtract(7, 'day').toDate();

    const [total24h, total7d, sentimentCounts, topSources] = await Promise.all([
      Article.count({ where: { publishedAt: { [Op.gte]: since24h } } }),
      Article.count({ where: { publishedAt: { [Op.gte]: since7d } } }),
      Article.findAll({
        where: { publishedAt: { [Op.gte]: since24h } },
        attributes: ['sentimentLabel', [Article.sequelize.fn('COUNT', Article.sequelize.col('id')), 'count']],
        group: ['sentimentLabel'], raw: true,
      }),
      Article.findAll({
        where: { publishedAt: { [Op.gte]: since24h } },
        attributes: ['source', [Article.sequelize.fn('COUNT', Article.sequelize.col('id')), 'count']],
        group: ['source'],
        order: [[Article.sequelize.literal('count'), 'DESC']],
        limit: 10, raw: true,
      }),
    ]);

    const data = { total24h, total7d, sentimentCounts, topSources };
    await cache.set(cacheKey, data, 120);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/sentiment-timeline
router.get('/sentiment-timeline', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const cacheKey = `articles:sentiment-timeline:${days}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const since = dayjs().subtract(days, 'day').toDate();
    const articles = await Article.findAll({
      where: { publishedAt: { [Op.gte]: since } },
      attributes: ['publishedAt', 'sentimentScore', 'sentimentLabel'],
      order: [['publishedAt', 'ASC']],
    });

    const groupBy = days <= 2 ? 'hour' : 'day';
    const map = {};

    for (const a of articles) {
      const key = groupBy === 'hour'
        ? dayjs(a.publishedAt).format('YYYY-MM-DD HH:00')
        : dayjs(a.publishedAt).format('YYYY-MM-DD');

      if (!map[key]) map[key] = { time: key, scores: [], positive: 0, negative: 0, neutral: 0 };
      map[key].scores.push(a.sentimentScore);
      map[key][a.sentimentLabel]++;
    }

    const data = Object.values(map).map((entry) => ({
      time: entry.time,
      avgSentiment: parseFloat((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length || 0).toFixed(3)),
      count: entry.scores.length,
      positive: entry.positive,
      negative: entry.negative,
      neutral: entry.neutral,
    }));

    await cache.set(cacheKey, data, 300);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles/:id
router.get('/:id', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const article = await Article.findByPk(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;