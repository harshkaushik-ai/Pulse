const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const dayjs = require('dayjs');
const axios = require('axios');
const Article = require('../models/Article');
const logger = require('../utils/logger');

// ── Groq helper ──
const callGroq = async (prompt, maxTokens = 500) => {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      }
    );
    return res.data.choices[0]?.message?.content || null;
  } catch (err) {
    logger.error('Groq error:', err.message);
    return null;
  }
};

// ────────────────────────────────────────────
// POST /api/analytics/summarize
// Body: { articleId } OR { title, description, content }
// Returns: { bullets, tldr, readTime }
// ────────────────────────────────────────────
router.post('/summarize', async (req, res) => {
  try {
    const { articleId, title, description, content } = req.body;

    let articleText = '';
    let articleTitle = title || '';

    if (articleId) {
      const article = await Article.findByPk(articleId);
      if (!article) return res.status(404).json({ error: 'Article not found' });
      articleTitle = article.title;
      articleText = [article.title, article.description, article.content].filter(Boolean).join('\n');
    } else {
      articleText = [title, description, content].filter(Boolean).join('\n');
    }

    if (!articleText.trim()) return res.status(400).json({ error: 'No content to summarize' });

    const wordCount = articleText.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const prompt = `Summarize this news article in exactly 3 bullet points and one TL;DR sentence.

ARTICLE:
${articleText.slice(0, 2000)}

Respond ONLY with valid JSON, no markdown:
{
  "bullets": ["key point 1", "key point 2", "key point 3"],
  "tldr": "One sentence summary under 25 words",
  "sentiment": "positive|negative|neutral",
  "importance": "low|medium|high|critical"
}`;

    const raw = await callGroq(prompt, 400);
    if (!raw) return res.status(503).json({ error: 'AI unavailable' });

    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    result.readTime = readTime;
    result.title = articleTitle;

    res.json(result);
  } catch (err) {
    logger.error('Summarize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// GET /api/analytics/sources
// Returns: source reliability & bias scores
// ────────────────────────────────────────────
router.get('/sources', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = dayjs().subtract(days, 'day').toDate();

    const sources = await Article.findAll({
      where: { publishedAt: { [Op.gte]: since } },
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalArticles'],
        [sequelize.fn('AVG', sequelize.col('sentimentScore')), 'avgSentiment'],
        [sequelize.fn('AVG', sequelize.col('sentimentMagnitude')), 'avgMagnitude'],
        [
          sequelize.literal(`COUNT(CASE WHEN "sentimentLabel" = 'positive' THEN 1 END)`),
          'positiveCount',
        ],
        [
          sequelize.literal(`COUNT(CASE WHEN "sentimentLabel" = 'negative' THEN 1 END)`),
          'negativeCount',
        ],
        [
          sequelize.literal(`COUNT(CASE WHEN "sentimentLabel" = 'neutral' THEN 1 END)`),
          'neutralCount',
        ],
      ],
      group: ['source'],
      order: [[sequelize.literal('"totalArticles"'), 'DESC']],
      raw: true,
    });

    const enriched = sources.map((s) => {
      const total = parseInt(s.totalArticles) || 1;
      const pos = parseInt(s.positiveCount) || 0;
      const neg = parseInt(s.negativeCount) || 0;
      const neu = parseInt(s.neutralCount) || 0;
      const avg = parseFloat(s.avgSentiment) || 0;

      // Bias score: -1 = very negative biased, +1 = very positive biased
      const biasScore = parseFloat(((pos - neg) / total).toFixed(3));

      // Reliability: sources with balanced coverage score higher
      const balance = 1 - Math.abs(biasScore);
      const reliabilityScore = parseFloat((balance * 0.7 + Math.min(total / 100, 1) * 0.3).toFixed(3));

      // Determine bias label
      let biasLabel = 'Balanced';
      if (biasScore > 0.3) biasLabel = 'Positive Leaning';
      else if (biasScore > 0.15) biasLabel = 'Slightly Positive';
      else if (biasScore < -0.3) biasLabel = 'Negative Leaning';
      else if (biasScore < -0.15) biasLabel = 'Slightly Negative';

      return {
        source: s.source,
        totalArticles: total,
        avgSentiment: parseFloat(avg.toFixed(3)),
        avgMagnitude: parseFloat(parseFloat(s.avgMagnitude || 0).toFixed(3)),
        positiveCount: pos,
        negativeCount: neg,
        neutralCount: neu,
        positivePct: parseFloat(((pos / total) * 100).toFixed(1)),
        negativePct: parseFloat(((neg / total) * 100).toFixed(1)),
        neutralPct: parseFloat(((neu / total) * 100).toFixed(1)),
        biasScore,
        biasLabel,
        reliabilityScore,
      };
    });

    res.json({ sources: enriched, days, total: enriched.length });
  } catch (err) {
    logger.error('Sources analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// GET /api/analytics/heatmap
// Returns: daily sentiment data for calendar heatmap
// ────────────────────────────────────────────
router.get('/heatmap', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const since = dayjs().subtract(days, 'day').toDate();

    const daily = await Article.findAll({
      where: { publishedAt: { [Op.gte]: since } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('publishedAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('sentimentScore')), 'avgSentiment'],
        [
          sequelize.literal(`COUNT(CASE WHEN "sentimentLabel" = 'positive' THEN 1 END)`),
          'positiveCount',
        ],
        [
          sequelize.literal(`COUNT(CASE WHEN "sentimentLabel" = 'negative' THEN 1 END)`),
          'negativeCount',
        ],
      ],
      group: [sequelize.fn('DATE', sequelize.col('publishedAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('publishedAt')), 'ASC']],
      raw: true,
    });

    // Fill in missing days with zeros
    const map = {};
    daily.forEach((d) => { map[d.date] = d; });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const d = map[date];
      result.push({
        date,
        count: d ? parseInt(d.count) : 0,
        avgSentiment: d ? parseFloat(parseFloat(d.avgSentiment || 0).toFixed(3)) : 0,
        positiveCount: d ? parseInt(d.positiveCount) : 0,
        negativeCount: d ? parseInt(d.negativeCount) : 0,
      });
    }

    res.json(result);
  } catch (err) {
    logger.error('Heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// POST /api/analytics/smart-search
// Body: { query } — natural language search
// Returns: { articles, interpretation }
// ────────────────────────────────────────────
router.post('/smart-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Ask AI to convert natural language to structured filters
    const prompt = `Convert this news search query into structured filters for a news database.

USER QUERY: "${query}"

Available filters:
- sentiment: "positive" | "negative" | "neutral" | null
- category: "technology" | "business" | "science" | "health" | "politics" | "world" | "general" | null  
- keywords: array of keywords to search in title/description (max 5)
- days: how many days back to look (default 7, max 30)
- sources: specific news source names if mentioned, else null

Respond ONLY with valid JSON:
{
  "sentiment": null,
  "category": null,
  "keywords": ["keyword1"],
  "days": 7,
  "sources": null,
  "interpretation": "Plain English explanation of what you're searching for"
}`;

    const raw = await callGroq(prompt, 300);
    let filters = { keywords: [query], days: 7, sentiment: null, category: null };
    let interpretation = `Searching for: "${query}"`;

    if (raw) {
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        filters = parsed;
        interpretation = parsed.interpretation || interpretation;
        delete filters.interpretation;
      } catch {}
    }

    // Build WHERE clause
    const since = dayjs().subtract(filters.days || 7, 'day').toDate();
    const where = { publishedAt: { [Op.gte]: since } };

    if (filters.sentiment) where.sentimentLabel = filters.sentiment;
    if (filters.category) where.category = filters.category;
    if (filters.sources?.length) where.source = { [Op.in]: filters.sources };

    // Keyword search across title + description
    let articles = [];
    if (filters.keywords?.length) {
      const keywordConditions = filters.keywords.map((kw) => ({
        [Op.or]: [
          { title: { [Op.iLike]: `%${kw}%` } },
          { description: { [Op.iLike]: `%${kw}%` } },
        ],
      }));
      where[Op.and] = keywordConditions;
    }

    articles = await Article.findAll({
      where,
      order: [['publishedAt', 'DESC']],
      limit: 30,
      attributes: ['id', 'title', 'description', 'source', 'category', 'sentimentLabel', 'sentimentScore', 'publishedAt', 'url', 'imageUrl'],
    });

    res.json({
      articles,
      interpretation,
      filters,
      total: articles.length,
    });
  } catch (err) {
    logger.error('Smart search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// GET /api/analytics/geo
// Returns: country/region mention counts
// ────────────────────────────────────────────
router.get('/geo', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = dayjs().subtract(days, 'day').toDate();

    // Country keywords to scan for in article titles/descriptions
    const GEO_MAP = [
      { country: 'United States', code: 'US', keywords: ['united states', 'america', 'washington', 'white house', 'congress', 'pentagon', 'silicon valley', 'new york', 'california', 'trump', 'biden', 'harris'] },
      { country: 'China', code: 'CN', keywords: ['china', 'beijing', 'chinese', 'xi jinping', 'shanghai', 'hong kong', 'taiwan'] },
      { country: 'Russia', code: 'RU', keywords: ['russia', 'moscow', 'putin', 'kremlin', 'ukraine war', 'russian'] },
      { country: 'United Kingdom', code: 'GB', keywords: ['uk', 'britain', 'london', 'england', 'parliament', 'downing street', 'british'] },
      { country: 'India', code: 'IN', keywords: ['india', 'delhi', 'mumbai', 'modi', 'indian', 'bangalore', 'pakistan'] },
      { country: 'Germany', code: 'DE', keywords: ['germany', 'berlin', 'german', 'bundesbank', 'merkel', 'scholz'] },
      { country: 'France', code: 'FR', keywords: ['france', 'paris', 'french', 'macron', 'élysée'] },
      { country: 'Japan', code: 'JP', keywords: ['japan', 'tokyo', 'japanese', 'yen', 'nikkei', 'kishida'] },
      { country: 'Israel', code: 'IL', keywords: ['israel', 'tel aviv', 'israeli', 'gaza', 'netanyahu', 'idf'] },
      { country: 'Ukraine', code: 'UA', keywords: ['ukraine', 'kyiv', 'zelensky', 'ukrainian', 'mariupol'] },
      { country: 'Iran', code: 'IR', keywords: ['iran', 'tehran', 'iranian', 'khamenei', 'irgc'] },
      { country: 'Saudi Arabia', code: 'SA', keywords: ['saudi arabia', 'riyadh', 'saudi', 'mbs', 'opec', 'aramco'] },
      { country: 'Brazil', code: 'BR', keywords: ['brazil', 'brasilia', 'lula', 'brazilian', 'amazon'] },
      { country: 'Canada', code: 'CA', keywords: ['canada', 'ottawa', 'trudeau', 'toronto', 'canadian'] },
      { country: 'Australia', code: 'AU', keywords: ['australia', 'sydney', 'canberra', 'albanese', 'australian'] },
      { country: 'South Korea', code: 'KR', keywords: ['south korea', 'seoul', 'korean', 'samsung', 'hyundai'] },
      { country: 'Turkey', code: 'TR', keywords: ['turkey', 'ankara', 'erdogan', 'turkish', 'istanbul'] },
      { country: 'Mexico', code: 'MX', keywords: ['mexico', 'mexico city', 'mexican', 'sheinbaum'] },
      { country: 'Pakistan', code: 'PK', keywords: ['pakistan', 'islamabad', 'imran khan', 'pakistani'] },
      { country: 'North Korea', code: 'KP', keywords: ['north korea', 'pyongyang', 'kim jong un', 'dprk'] },
    ];

    // Fetch recent articles
    const articles = await Article.findAll({
      where: { publishedAt: { [Op.gte]: since } },
      attributes: ['title', 'description', 'sentimentScore', 'sentimentLabel'],
      raw: true,
    });

    // Count mentions per country
    const counts = GEO_MAP.map(({ country, code, keywords }) => {
      let count = 0;
      let sentimentSum = 0;
      let positive = 0, negative = 0;

      articles.forEach((a) => {
        const text = `${a.title || ''} ${a.description || ''}`.toLowerCase();
        const mentioned = keywords.some((kw) => text.includes(kw));
        if (mentioned) {
          count++;
          sentimentSum += a.sentimentScore || 0;
          if (a.sentimentLabel === 'positive') positive++;
          else if (a.sentimentLabel === 'negative') negative++;
        }
      });

      return {
        country,
        code,
        count,
        avgSentiment: count > 0 ? parseFloat((sentimentSum / count).toFixed(3)) : 0,
        positiveCount: positive,
        negativeCount: negative,
      };
    });

    const sorted = counts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);

    res.json({ data: sorted, days, totalArticles: articles.length });
  } catch (err) {
    logger.error('Geo analytics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
