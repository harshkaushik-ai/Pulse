const axios = require('axios');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Article = require('../models/Article');
const Insight = require('../models/Insight');
const Trend = require('../models/Trend');
const { aggregateSentiment } = require('./sentimentService');
const logger = require('../utils/logger');

const callGroq = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    logger.warn('GROQ_API_KEY not set');
    return null;
  }

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0]?.message?.content || null;
};

const generateInsight = async (topic, relatedArticles) => {
  const sentiment = aggregateSentiment(relatedArticles);

  const articleSummaries = relatedArticles.slice(0, 15).map((a) => ({
    title: a.title,
    source: a.source,
    sentiment: a.sentimentLabel,
    published: dayjs(a.publishedAt).format('MMM D HH:mm'),
    description: a.description?.slice(0, 200),
  }));

  const prompt = `You are a world-class news analyst. Analyze these articles about "${topic}" and provide structured intelligence.

ARTICLES (${relatedArticles.length} total):
${JSON.stringify(articleSummaries, null, 2)}

SENTIMENT: avg=${sentiment.avg}, trend=${sentiment.trend}, distribution=${JSON.stringify(sentiment.distribution)}

Respond ONLY with a valid JSON object, no markdown, no explanation, no extra text:
{
  "summary": "2-3 sentence objective summary",
  "prediction": "2-3 sentence prediction for next 24-72 hours",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
  "confidenceScore": 0.7,
  "impactLevel": "medium",
  "sentimentTrend": "stable"
}`;

  try {
    const text = await callGroq(prompt);
    if (!text) return null;

    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const insight = await Insight.create({
      topic,
      summary: parsed.summary,
      prediction: parsed.prediction,
      keyPoints: parsed.keyPoints || [],
      relatedArticleIds: relatedArticles.map((a) => a.id),
      confidenceScore: parsed.confidenceScore || 0.5,
      sentimentTrend: parsed.sentimentTrend || 'stable',
      impactLevel: parsed.impactLevel || 'medium',
    });

    logger.info(`Generated insight for topic: ${topic}`);
    return { ...insight.toJSON(), ...parsed };
  } catch (err) {
    logger.error(`AI insight error for "${topic}":`, err.message);
    return null;
  }
};

const generateTopInsights = async () => {
  const since = dayjs().subtract(24, 'hour').toDate();
  const trends = await Trend.findAll({
    where: { period: '24h' },
    order: [['count', 'DESC']],
    limit: 5,
  });

  if (!trends.length) return [];

  const insights = [];
  for (const trend of trends) {
    const articles = await Article.findAll({
      where: {
        publishedAt: { [Op.gte]: since },
        keywords: { [Op.contains]: [{ word: trend.keyword }] },
      },
      limit: 20,
      order: [['publishedAt', 'DESC']],
    });

    if (articles.length < 2) continue;
    const insight = await generateInsight(trend.keyword, articles);
    if (insight) insights.push(insight);

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  logger.info(`Generated ${insights.length} AI insights`);
  return insights;
};

module.exports = { generateInsight, generateTopInsights };