const dayjs = require('dayjs');
const { Op } = require('sequelize');
const axios = require('axios');
const Article = require('../models/Article');
const Trend = require('../models/Trend');
const logger = require('../utils/logger');

const predictTrends = async () => {
  try {
    const now = dayjs();
    const since24h = now.subtract(24, 'hour').toDate();
    const since48h = now.subtract(48, 'hour').toDate();
    const since7d = now.subtract(7, 'day').toDate();

    const [recent, older, trends7d] = await Promise.all([
      Trend.findAll({ where: { period: '24h' }, order: [['count', 'DESC']], limit: 20 }),
      Trend.findAll({ where: { period: '7d' }, order: [['count', 'DESC']], limit: 20 }),
      Trend.findAll({ where: { period: '7d', trendVelocity: { [Op.gt]: 0 } }, order: [['trendVelocity', 'DESC']], limit: 10 }),
    ]);

    const recentArticles = await Article.findAll({
      where: { publishedAt: { [Op.gte]: since24h } },
      attributes: ['title', 'source', 'category', 'sentimentScore', 'keywords', 'publishedAt'],
      order: [['publishedAt', 'DESC']],
      limit: 50,
    });

    const prompt = `You are a predictive news analyst with access to real-time data. Based on current trends, predict what will dominate the news in the NEXT 24 HOURS.

CURRENT 24H TRENDS:
${recent.slice(0, 10).map(t => `- "${t.keyword}": ${t.count} mentions, velocity: ${(t.trendVelocity * 100).toFixed(0)}%, sentiment: ${t.avgSentiment?.toFixed(2)}`).join('\n')}

RISING TOPICS (high velocity):
${trends7d.slice(0, 5).map(t => `- "${t.keyword}": +${(t.trendVelocity * 100).toFixed(0)}% velocity`).join('\n')}

RECENT HEADLINES (last 6 hours):
${recentArticles.slice(0, 15).map(a => `- ${a.title}`).join('\n')}

Respond ONLY with valid JSON:
{
  "predictions": [
    {
      "keyword": "predicted topic",
      "confidence": 0.0-1.0,
      "reason": "one sentence explanation",
      "expectedVelocity": "low|medium|high|explosive",
      "sentiment": "positive|negative|neutral",
      "category": "politics|technology|business|science|world"
    }
  ],
  "marketMovers": ["topic that could move markets", "topic 2"],
  "wildcards": ["unexpected topic that might emerge"],
  "summary": "2 sentence overall prediction summary"
}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const text = response.data.choices[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    result.generatedAt = new Date().toISOString();

    logger.info('Trend predictions generated');
    return result;
  } catch (err) {
    logger.error('Prediction error:', err.message);
    return null;
  }
};

module.exports = { predictTrends };