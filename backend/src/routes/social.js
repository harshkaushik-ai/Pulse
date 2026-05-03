const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const axios = require('axios');
const Article = require('../models/Article');
const Trend = require('../models/Trend');
const logger = require('../utils/logger');

const callGroq = async (prompt, maxTokens = 1200, temperature = 0.75) => {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: maxTokens,
        temperature,
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
    return res.data.choices[0]?.message?.content || null;
  } catch (err) {
    logger.error('Groq error:', err.message);
    return null;
  }
};

// Platform configs
const PLATFORM_CONFIG = {
  twitter: {
    name: 'Twitter / X',
    maxChars: 280,
    style: 'punchy, short, witty, uses 2-3 hashtags, optionally one emoji per sentence, thread-friendly',
    format: 'Single tweet under 280 chars OR a numbered thread (1/3, 2/3, 3/3)',
  },
  linkedin: {
    name: 'LinkedIn',
    maxChars: 3000,
    style: 'professional, insightful, thought-leadership tone, storytelling hook, ends with a question to drive comments',
    format: '3-5 short paragraphs, line breaks between each, 3-5 relevant hashtags at end',
  },
  instagram: {
    name: 'Instagram',
    maxChars: 2200,
    style: 'visual storytelling, emotional, lifestyle-oriented, heavy emojis, calls to action like "Save this post" or "Tag someone"',
    format: 'Hook line → story/body → call to action → 15-20 hashtags in first comment section',
  },
  facebook: {
    name: 'Facebook',
    maxChars: 500,
    style: 'conversational, community-oriented, asks questions to boost engagement, warm and relatable tone',
    format: '2-3 short paragraphs, one question at end, 2-3 hashtags max',
  },
  threads: {
    name: 'Threads',
    maxChars: 500,
    style: 'casual, opinionated, conversational, like thinking out loud, minimal hashtags',
    format: 'Short punchy post, can be a question or bold statement, very casual tone',
  },
  reddit: {
    name: 'Reddit',
    maxChars: 40000,
    style: 'detailed, analytical, community-specific, no corporate speak, cite sources, add personal analysis',
    format: 'Title + Body. Title: catchy Reddit-style. Body: paragraphs with TL;DR at bottom',
  },
};

const TONE_PROMPTS = {
  professional: 'Write in a professional, authoritative, expert tone.',
  casual: 'Write in a casual, friendly, conversational tone.',
  humorous: 'Write in a witty, humorous, lighthearted tone with clever wordplay.',
  urgent: 'Write in an urgent, breaking-news style — this JUST happened, act now.',
  educational: 'Write in an educational, informative tone — teach the reader something.',
  controversial: 'Write in a bold, slightly controversial opinion-piece style that sparks debate.',
  inspirational: 'Write in an uplifting, motivational, inspirational tone.',
};

// POST /api/social/generate
// Body: { topic?, articleIds?, platform, tone, count, customContext? }
router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
      articleIds,
      platform = 'twitter',
      tone = 'professional',
      count = 3,
      customContext = '',
      includeHashtags = true,
      includeEmojis = true,
    } = req.body;

    if (!platform || !PLATFORM_CONFIG[platform]) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const platformCfg = PLATFORM_CONFIG[platform];
    const toneCfg = TONE_PROMPTS[tone] || TONE_PROMPTS.professional;

    // Fetch source articles
    let articles = [];
    if (articleIds?.length) {
      articles = await Article.findAll({ where: { id: { [Op.in]: articleIds } } });
    } else if (topic) {
      articles = await Article.findAll({
        where: {
          publishedAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() },
          [Op.or]: [
            { title: { [Op.iLike]: `%${topic}%` } },
            { description: { [Op.iLike]: `%${topic}%` } },
          ],
        },
        order: [['publishedAt', 'DESC']],
        limit: 10,
      });
    } else {
      // Use top trending articles
      const trends = await Trend.findAll({
        where: { period: '24h' },
        order: [['count', 'DESC']],
        limit: 3,
      });
      if (trends.length) {
        articles = await Article.findAll({
          where: {
            publishedAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() },
            keywords: { [Op.contains]: [trends[0].keyword] },
          },
          order: [['publishedAt', 'DESC']],
          limit: 10,
        });
      }
    }

    if (!articles.length) {
      return res.status(404).json({ error: 'No articles found for this topic. Try scraping first.' });
    }

    const articleContext = articles.slice(0, 8).map((a) =>
      `- [${a.source}] ${a.title}${a.description ? ': ' + a.description.slice(0, 150) : ''}`
    ).join('\n');

    const topicLabel = topic || articles[0]?.title?.split(' ').slice(0, 4).join(' ') || 'Current News';

    const prompt = `You are a viral social media content creator specializing in news-based content.

TASK: Generate ${count} different social media posts for ${platformCfg.name} about the following news topic.

NEWS TOPIC: "${topicLabel}"

SOURCE ARTICLES:
${articleContext}

${customContext ? `ADDITIONAL CONTEXT FROM USER: ${customContext}` : ''}

PLATFORM: ${platformCfg.name}
- Character limit: ${platformCfg.maxChars}
- Style: ${platformCfg.style}
- Format: ${platformCfg.format}
- Tone instruction: ${toneCfg}
- Include hashtags: ${includeHashtags ? 'YES' : 'NO'}
- Include emojis: ${includeEmojis ? 'YES' : 'NO'}

RULES:
1. Each post must be UNIQUE — different angle, hook, or format
2. Stay factually accurate to the source articles
3. Never fabricate quotes or statistics not in the source material
4. Each post should feel native to ${platformCfg.name}
5. Make each one genuinely engaging — not generic

Respond ONLY with valid JSON, no markdown:
{
  "posts": [
    {
      "content": "the full post text",
      "hook": "one-line description of the angle/hook used",
      "estimatedEngagement": "low|medium|high|viral",
      "bestPostTime": "morning|afternoon|evening|night",
      "charCount": 0
    }
  ],
  "topic": "${topicLabel}",
  "platform": "${platformCfg.name}",
  "sourceCount": ${articles.length}
}`;

    const raw = await callGroq(prompt, 2000, 0.8);
    if (!raw) return res.status(503).json({ error: 'AI service unavailable. Check GROQ_API_KEY.' });

    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Add char counts
    result.posts = result.posts.map((p) => ({
      ...p,
      charCount: p.content.length,
      withinLimit: p.content.length <= platformCfg.maxChars,
    }));

    result.articles = articles.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      url: a.url,
      sentimentLabel: a.sentimentLabel,
    }));

    logger.info(`Generated ${result.posts.length} social posts for ${platform} — topic: ${topicLabel}`);
    res.json(result);
  } catch (err) {
    logger.error('Social generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/social/rewrite
// Rewrite an existing post in a different tone/platform
router.post('/rewrite', async (req, res) => {
  try {
    const { content, fromPlatform, toPlatform, tone = 'professional' } = req.body;
    if (!content || !toPlatform) return res.status(400).json({ error: 'content and toPlatform required' });

    const platformCfg = PLATFORM_CONFIG[toPlatform];
    const toneCfg = TONE_PROMPTS[tone] || TONE_PROMPTS.professional;

    const prompt = `Rewrite the following social media post for ${platformCfg.name}.

ORIGINAL POST (${fromPlatform || 'unknown platform'}):
${content}

TARGET PLATFORM: ${platformCfg.name}
- Character limit: ${platformCfg.maxChars}
- Style: ${platformCfg.style}
- Format: ${platformCfg.format}
- Tone: ${toneCfg}

Keep the same core information but adapt the format, length, hashtags, and tone completely for ${platformCfg.name}.

Respond ONLY with valid JSON:
{
  "content": "rewritten post text",
  "charCount": 0,
  "withinLimit": true
}`;

    const raw = await callGroq(prompt, 800, 0.7);
    if (!raw) return res.status(503).json({ error: 'AI unavailable' });

    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    result.charCount = result.content.length;
    result.withinLimit = result.content.length <= platformCfg.maxChars;

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/social/trending-topics
// Get top topics suitable for social posts right now
router.get('/trending-topics', async (req, res) => {
  try {
    const trends = await Trend.findAll({
      where: { period: '24h', count: { [Op.gte]: 3 } },
      order: [['count', 'DESC']],
      limit: 10,
    });

    const topics = await Promise.all(
      trends.slice(0, 8).map(async (t) => {
        const articleCount = await Article.count({
          where: {
            publishedAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() },
            keywords: { [Op.contains]: [t.keyword] },
          },
        });
        return {
          keyword: t.keyword,
          count: t.count,
          velocity: t.trendVelocity,
          isBreaking: t.isBreaking,
          avgSentiment: t.avgSentiment,
          articleCount,
          postability: articleCount >= 5 ? 'high' : articleCount >= 2 ? 'medium' : 'low',
        };
      })
    );

    res.json(topics.filter((t) => t.articleCount >= 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
