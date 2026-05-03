const dayjs = require('dayjs');
const { Op } = require('sequelize');
const axios = require('axios');
const Article = require('../models/Article');
const Insight = require('../models/Insight');
const Trend = require('../models/Trend');
const { aggregateSentiment } = require('./sentimentService');
const logger = require('../utils/logger');

const generateDailyBriefing = async () => {
  try {
    const since = dayjs().subtract(24, 'hour').toDate();

    const [articles, trends] = await Promise.all([
      Article.findAll({
        where: { publishedAt: { [Op.gte]: since } },
        order: [['publishedAt', 'DESC']],
      }),
      Trend.findAll({
        where: { period: '24h' },
        order: [['count', 'DESC']],
        limit: 10,
      }),
    ]);

    if (articles.length === 0) return null;

    const sentiment = aggregateSentiment(articles);
    const topSources = [...new Set(articles.map(a => a.source))].slice(0, 5);
    const topKeywords = trends.slice(0, 8).map(t => t.keyword);

    const byCategory = articles.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});

    const prompt = `You are a world-class news editor writing the morning briefing for ${dayjs().format('MMMM D, YYYY')}.

DATA:
- Total articles analyzed: ${articles.length}
- Top trending keywords: ${topKeywords.join(', ')}
- Overall sentiment: ${sentiment.avg > 0.05 ? 'POSITIVE' : sentiment.avg < -0.05 ? 'NEGATIVE' : 'NEUTRAL'} (score: ${sentiment.avg})
- Sentiment trend: ${sentiment.trend}
- Top sources: ${topSources.join(', ')}
- Categories: ${Object.entries(byCategory).map(([k,v]) => `${k}(${v})`).join(', ')}

Sample headlines:
${articles.slice(0, 20).map(a => `- [${a.source}] ${a.title}`).join('\n')}

Write a structured daily briefing. Respond ONLY with valid JSON:
{
  "headline": "One punchy headline summarizing the day",
  "date": "${dayjs().format('MMMM D, YYYY')}",
  "openingParagraph": "2-3 sentence engaging overview of the day in news",
  "topStories": [
    { "topic": "topic name", "summary": "2 sentence summary", "sentiment": "positive|negative|neutral" },
    { "topic": "topic name", "summary": "2 sentence summary", "sentiment": "positive|negative|neutral" },
    { "topic": "topic name", "summary": "2 sentence summary", "sentiment": "positive|negative|neutral" }
  ],
  "sentimentOverview": "2 sentence analysis of today's overall news tone",
  "watchlist": ["keyword to watch 1", "keyword to watch 2", "keyword to watch 3"],
  "closingNote": "One sentence forward-looking closing"
}`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: 1500,
        temperature: 0.4,
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
    const briefing = JSON.parse(clean);

    briefing.articleCount = articles.length;
    briefing.sentimentScore = sentiment.avg;
    briefing.generatedAt = new Date().toISOString();

    logger.info('Daily briefing generated successfully');
    return briefing;
  } catch (err) {
    logger.error('Briefing generation error:', err.message);
    return null;
  }
};

module.exports = { generateDailyBriefing };