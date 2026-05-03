const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Article = require('../models/Article');
const Trend = require('../models/Trend');
const { computeKeywordTrends } = require('./keywordService');
const logger = require('../utils/logger');

const PERIOD_HOURS = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

const computeTrendsForPeriod = async (period = '24h') => {
  const hours = PERIOD_HOURS[period] || 24;
  const since = dayjs().subtract(hours, 'hour').toDate();
  const prevSince = dayjs().subtract(hours * 2, 'hour').toDate();

  const [currentArticles, prevArticles] = await Promise.all([
    Article.findAll({ where: { publishedAt: { [Op.gte]: since } } }),
    Article.findAll({ where: { publishedAt: { [Op.between]: [prevSince, since] } } }),
  ]);

  const currentTrends = computeKeywordTrends(currentArticles);
  const prevTrends = computeKeywordTrends(prevArticles);
  const prevMap = Object.fromEntries(prevTrends.map((t) => [t.keyword, t.count]));

  await Trend.destroy({ where: { period } });

  const created = [];
  for (const t of currentTrends.slice(0, 30)) {
    const prevCount = prevMap[t.keyword] || 0;
    const velocity = prevCount > 0 ? (t.count - prevCount) / prevCount : t.count > 3 ? 1 : 0;

    const trend = await Trend.create({
      keyword: t.keyword,
      period,
      count: t.count,
      avgSentiment: t.avgSentiment,
      trendVelocity: parseFloat(velocity.toFixed(3)),
      isBreaking: velocity > 1.5 && t.count >= 3,
      relatedKeywords: currentTrends.filter((k) => k.keyword !== t.keyword).slice(0, 5).map((k) => k.keyword),
    });
    created.push(trend);
  }

  logger.info(`Saved ${created.length} trends for period ${period}`);
  return created;
};

const computeAllTrends = async () => {
  const periods = ['1h', '6h', '24h', '7d'];
  const results = {};
  for (const period of periods) {
    results[period] = await computeTrendsForPeriod(period);
  }
  return results;
};

const getKeywordTimeSeries = async (keyword, days = 7) => {
  const since = dayjs().subtract(days, 'day').toDate();
  const articles = await Article.findAll({
    where: {
      publishedAt: { [Op.gte]: since },
      keywords: { [Op.contains]: [keyword.toLowerCase()] },
    },
    attributes: ['publishedAt', 'sentimentScore', 'keywords'],
  });

  const dailyMap = {};
  for (const article of articles) {
    const day = dayjs(article.publishedAt).format('YYYY-MM-DD');
    if (!dailyMap[day]) dailyMap[day] = { date: day, count: 0, sentimentSum: 0 };
    dailyMap[day].count++;
    dailyMap[day].sentimentSum += article.sentimentScore || 0;
  }

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const entry = dailyMap[day];
    result.push({
      date: day,
      count: entry ? entry.count : 0,
      avgSentiment: entry
        ? parseFloat((entry.sentimentSum / entry.count).toFixed(3))
        : 0,
    });
  }
  return result;
};

module.exports = { computeTrendsForPeriod, computeAllTrends, getKeywordTimeSeries };    