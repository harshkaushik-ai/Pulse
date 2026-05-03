const Parser = require('rss-parser');
const axios = require('axios');
const crypto = require('crypto');
const dayjs = require('dayjs');
const logger = require('../utils/logger');
const Article = require('../models/Article');
const { analyzeSentiment } = require('./sentimentService');
const { extractKeywords } = require('./keywordService');

const parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'NewsTrendBot/1.0' } });

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News', category: 'general' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NY Times', category: 'general' },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian', category: 'world' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', category: 'technology' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'Ars Technica', category: 'technology' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', category: 'technology' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', category: 'business' },
  { url: 'https://www.sciencedaily.com/rss/all.xml', source: 'Science Daily', category: 'science' },
  { url: 'https://feeds.skynews.com/feeds/rss/home.xml', source: 'Sky News', category: 'general' },
  { url: 'https://rss.dw.com/rss/en-all', source: 'DW News', category: 'world' },
];

const hashUrl = (url) => crypto.createHash('sha256').update(url).digest('hex');

// Convert keywords array to plain strings for safe DB storage
const safeKeywords = (keywords) => {
  if (!Array.isArray(keywords)) return [];
  return keywords.map(k => typeof k === 'string' ? k : k.word).filter(Boolean);
};

const scrapeRSS = async () => {
  let totalSaved = 0;

  for (const feed of RSS_FEEDS) {
    try {
      logger.info(`Scraping RSS: ${feed.source}`);
      const parsed = await parser.parseURL(feed.url);

      for (const item of parsed.items.slice(0, 20)) {
        try {
          const url = item.link || item.guid;
          if (!url) continue;

          const urlHash = hashUrl(url);
          const exists = await Article.findOne({ where: { urlHash } });
          if (exists) continue;

          const title = (item.title || '').trim();
          const description = item.contentSnippet || item.summary || '';

          if (!title) continue;

          const sentiment = analyzeSentiment(title + ' ' + description);
          const rawKeywords = extractKeywords(title + ' ' + description);
          const keywords = safeKeywords(rawKeywords);

          const publishedAt = item.pubDate
            ? new Date(item.pubDate)
            : new Date();

          // Make sure date is valid
          const validDate = isNaN(publishedAt.getTime()) ? new Date() : publishedAt;

          await Article.create({
            title,
            description: description.slice(0, 500),
            content: (item.content || description).slice(0, 2000),
            url,
            urlHash,
            source: feed.source,
            sourceUrl: parsed.link || feed.url,
            category: feed.category,
            author: item.creator || item.author || null,
            imageUrl: item.enclosure?.url || null,
            publishedAt: validDate,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            sentimentMagnitude: sentiment.magnitude,
            keywords,
          });

          totalSaved++;
        } catch (err) {
          if (err.name !== 'SequelizeUniqueConstraintError') {
            logger.debug(`RSS item error [${feed.source}]: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Feed error [${feed.source}]: ${err.message}`);
    }
  }

  logger.info(`RSS scrape complete: ${totalSaved} saved`);
  return { totalSaved };
};

const scrapeNewsAPI = async () => {
  if (!process.env.NEWS_API_KEY) {
    logger.warn('NEWS_API_KEY not set, skipping NewsAPI');
    return { totalSaved: 0 };
  }

  const categories = ['general', 'business', 'technology', 'science', 'health'];
  let totalSaved = 0;

  for (const category of categories) {
    try {
      const res = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          category,
          language: 'en',
          pageSize: 20,
          apiKey: process.env.NEWS_API_KEY,
        },
        timeout: 10000,
      });

      for (const article of res.data.articles || []) {
        try {
          const url = article.url;
          if (!url || url === 'https://removed.com') continue;

          const title = (article.title || '').trim();
          if (!title || title === '[Removed]') continue;

          const urlHash = hashUrl(url);
          const exists = await Article.findOne({ where: { urlHash } });
          if (exists) continue;

          const description = article.description || '';
          const sentiment = analyzeSentiment(title + ' ' + description);
          const rawKeywords = extractKeywords(title + ' ' + description);
          const keywords = safeKeywords(rawKeywords);

          await Article.create({
            title,
            description: description.slice(0, 500),
            content: (article.content || description).slice(0, 2000),
            url,
            urlHash,
            source: article.source?.name || 'NewsAPI',
            category,
            author: article.author || null,
            imageUrl: article.urlToImage || null,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            sentimentMagnitude: sentiment.magnitude,
            keywords,
          });

          totalSaved++;
        } catch (err) {
          if (err.name !== 'SequelizeUniqueConstraintError') {
            logger.debug(`NewsAPI item error: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`NewsAPI [${category}] error: ${err.message}`);
    }
  }

  logger.info(`NewsAPI scrape complete: ${totalSaved} saved`);
  return { totalSaved };
};

const runScraper = async () => {
  logger.info('=== Starting scrape cycle ===');
  const start = Date.now();

  const [rssResult, apiResult] = await Promise.allSettled([
    scrapeRSS(),
    scrapeNewsAPI(),
  ]);

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const totalSaved =
    (rssResult.value?.totalSaved || 0) +
    (apiResult.value?.totalSaved || 0);

  logger.info(`=== Scrape done in ${duration}s — ${totalSaved} new articles ===`);
  return { totalSaved, duration };
};

module.exports = { runScraper };