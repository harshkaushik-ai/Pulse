const axios = require('axios');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const Article = require('../models/Article');
const logger = require('../utils/logger');

// Free stock data from Yahoo Finance (no key needed)
const fetchStockData = async (symbol) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=5d`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    const chart = res.data.chart.result[0];
    const timestamps = chart.timestamp;
    const closes = chart.indicators.quote[0].close;

    return timestamps.map((ts, i) => ({
      time: dayjs.unix(ts).format('YYYY-MM-DD HH:mm'),
      price: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
    })).filter(d => d.price !== null);
  } catch (err) {
    logger.error(`Stock fetch error [${symbol}]:`, err.message);
    return [];
  }
};

const correlateNewsWithStocks = async (symbol, companyKeywords) => {
  try {
    const since5d = dayjs().subtract(5, 'day').toDate();

    const [stockData, articles] = await Promise.all([
      fetchStockData(symbol),
      Article.findAll({
        where: {
          publishedAt: { [Op.gte]: since5d },
          [Op.or]: companyKeywords.map(kw => ({
            title: { [Op.iLike]: `%${kw}%` },
          })),
        },
        attributes: ['title', 'publishedAt', 'sentimentScore', 'source'],
        order: [['publishedAt', 'DESC']],
        limit: 100,
      }),
    ]);

    // Group articles by hour
    const articlesByHour = {};
    for (const article of articles) {
      const hour = dayjs(article.publishedAt).format('YYYY-MM-DD HH:00');
      if (!articlesByHour[hour]) articlesByHour[hour] = { count: 0, sentimentSum: 0, titles: [] };
      articlesByHour[hour].count++;
      articlesByHour[hour].sentimentSum += article.sentimentScore || 0;
      articlesByHour[hour].titles.push(article.title);
    }

    // Merge stock + news data
    const correlated = stockData.map(point => {
      const hour = dayjs(point.time).format('YYYY-MM-DD HH:00');
      const news = articlesByHour[hour];
      return {
        time: point.time,
        price: point.price,
        newsCount: news ? news.count : 0,
        avgSentiment: news ? parseFloat((news.sentimentSum / news.count).toFixed(3)) : 0,
        headlines: news ? news.titles.slice(0, 3) : [],
      };
    });

    return {
      symbol,
      keywords: companyKeywords,
      data: correlated,
      articleCount: articles.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Correlation error:', err.message);
    return null;
  }
};

// Preset company watchlist
const STOCK_WATCHLIST = [

  // ── BIG TECH ──
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', keywords: ['apple', 'iphone', 'tim cook', 'ios', 'macbook', 'app store', 'vision pro'] },
  { symbol: 'GOOGL', name: 'Google', sector: 'Technology', keywords: ['google', 'alphabet', 'gemini', 'android', 'youtube', 'waymo', 'sundar pichai'] },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', keywords: ['microsoft', 'azure', 'openai', 'copilot', 'windows', 'satya nadella', 'github'] },
  { symbol: 'META', name: 'Meta', sector: 'Technology', keywords: ['meta', 'facebook', 'instagram', 'zuckerberg', 'whatsapp', 'threads', 'llama'] },
  { symbol: 'AMZN', name: 'Amazon', sector: 'Technology', keywords: ['amazon', 'aws', 'bezos', 'prime', 'alexa', 'andy jassy', 'whole foods'] },
  { symbol: 'NVDA', name: 'Nvidia', sector: 'Technology', keywords: ['nvidia', 'gpu', 'jensen huang', 'ai chips', 'cuda', 'blackwell', 'h100'] },
  { symbol: 'TSLA', name: 'Tesla', sector: 'EV', keywords: ['tesla', 'elon musk', 'electric vehicle', 'ev', 'cybertruck', 'supercharger', 'gigafactory'] },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology', keywords: ['amd', 'ryzen', 'radeon', 'lisa su', 'epyc', 'semiconductor'] },
  { symbol: 'INTC', name: 'Intel', sector: 'Technology', keywords: ['intel', 'processor', 'chip', 'semiconductor', 'foundry', 'pat gelsinger'] },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology', keywords: ['oracle', 'larry ellison', 'cloud database', 'java', 'erp'] },
  { symbol: 'CRM', name: 'Salesforce', sector: 'Technology', keywords: ['salesforce', 'marc benioff', 'crm software', 'slack', 'tableau'] },
  { symbol: 'ADBE', name: 'Adobe', sector: 'Technology', keywords: ['adobe', 'photoshop', 'creative cloud', 'pdf', 'figma', 'generative ai'] },
  { symbol: 'NFLX', name: 'Netflix', sector: 'Media', keywords: ['netflix', 'streaming', 'reed hastings', 'content', 'subscriber', 'password sharing'] },
  { symbol: 'SPOT', name: 'Spotify', sector: 'Media', keywords: ['spotify', 'music streaming', 'podcast', 'daniel ek', 'premium'] },
  { symbol: 'SNAP', name: 'Snap', sector: 'Social Media', keywords: ['snapchat', 'snap', 'evan spiegel', 'stories', 'spectacles'] },
  { symbol: 'UBER', name: 'Uber', sector: 'Transport', keywords: ['uber', 'rideshare', 'uber eats', 'dara khosrowshahi', 'autonomous driving'] },
  { symbol: 'LYFT', name: 'Lyft', sector: 'Transport', keywords: ['lyft', 'rideshare', 'ride hailing', 'david risher'] },
  { symbol: 'ABNB', name: 'Airbnb', sector: 'Travel', keywords: ['airbnb', 'brian chesky', 'short term rental', 'vacation rental', 'host'] },

  // ── FINANCE & CRYPTO ──
  { symbol: 'JPM', name: 'JPMorgan', sector: 'Finance', keywords: ['jpmorgan', 'jamie dimon', 'chase bank', 'investment bank', 'wall street'] },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance', keywords: ['goldman sachs', 'david solomon', 'investment bank', 'wall street', 'hedge fund'] },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance', keywords: ['bank of america', 'bofa', 'brian moynihan', 'retail banking'] },
  { symbol: 'V', name: 'Visa', sector: 'Finance', keywords: ['visa', 'payment', 'credit card', 'contactless', 'fintech'] },
  { symbol: 'MA', name: 'Mastercard', sector: 'Finance', keywords: ['mastercard', 'payment network', 'credit card', 'debit card'] },
  { symbol: 'PYPL', name: 'PayPal', sector: 'Fintech', keywords: ['paypal', 'venmo', 'alex chriss', 'digital payment', 'buy now pay later'] },
  { symbol: 'SQ', name: 'Block', sector: 'Fintech', keywords: ['block', 'square', 'jack dorsey', 'cash app', 'bitcoin', 'crypto payment'] },
  { symbol: 'COIN', name: 'Coinbase', sector: 'Crypto', keywords: ['coinbase', 'cryptocurrency', 'bitcoin exchange', 'brian armstrong', 'crypto regulation'] },

  // ── ELECTRIC VEHICLES & ENERGY ──
  { symbol: 'RIVN', name: 'Rivian', sector: 'EV', keywords: ['rivian', 'electric truck', 'amazon delivery van', 'r1t', 'r1s'] },
  { symbol: 'LCID', name: 'Lucid Motors', sector: 'EV', keywords: ['lucid motors', 'lucid air', 'electric sedan', 'peter rawlinson'] },
  { symbol: 'NIO', name: 'NIO', sector: 'EV', keywords: ['nio', 'chinese electric vehicle', 'battery swap', 'william li'] },
  { symbol: 'XPEV', name: 'XPeng', sector: 'EV', keywords: ['xpeng', 'chinese ev', 'smart car', 'autonomous driving china'] },
  { symbol: 'F', name: 'Ford', sector: 'Auto', keywords: ['ford', 'mustang', 'f-150', 'lightning', 'jim farley', 'ford pro'] },
  { symbol: 'GM', name: 'General Motors', sector: 'Auto', keywords: ['general motors', 'gm', 'mary barra', 'chevrolet', 'cadillac', 'cruise'] },
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Energy', keywords: ['nextera', 'solar energy', 'wind energy', 'renewable', 'florida power'] },
  { symbol: 'ENPH', name: 'Enphase', sector: 'Energy', keywords: ['enphase', 'solar microinverter', 'home energy', 'solar panel'] },
  { symbol: 'XOM', name: 'ExxonMobil', sector: 'Oil & Gas', keywords: ['exxon', 'exxonmobil', 'oil price', 'crude oil', 'refinery', 'darren woods'] },
  { symbol: 'CVX', name: 'Chevron', sector: 'Oil & Gas', keywords: ['chevron', 'oil gas', 'mike wirth', 'lng', 'natural gas'] },

  // ── HEALTHCARE & PHARMA ──
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', keywords: ['johnson johnson', 'jnj', 'pharmaceutical', 'medical device', 'vaccine'] },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Pharma', keywords: ['pfizer', 'vaccine', 'covid drug', 'albert bourla', 'oncology', 'paxlovid'] },
  { symbol: 'MRNA', name: 'Moderna', sector: 'Pharma', keywords: ['moderna', 'mrna vaccine', 'covid', 'stephane bancel', 'rna therapy'] },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'Pharma', keywords: ['abbvie', 'humira', 'skyrizi', 'immunology', 'richard gonzalez'] },
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Pharma', keywords: ['eli lilly', 'ozempic', 'mounjaro', 'weight loss drug', 'diabetes', 'tirzepatide'] },
  { symbol: 'NVO', name: 'Novo Nordisk', sector: 'Pharma', keywords: ['novo nordisk', 'ozempic', 'wegovy', 'semaglutide', 'obesity drug', 'glp-1'] },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', keywords: ['unitedhealth', 'health insurance', 'optum', 'andrew witty', 'medicare'] },

  // ── CONSUMER & RETAIL ──
  { symbol: 'WMT', name: 'Walmart', sector: 'Retail', keywords: ['walmart', 'doug mcmillon', 'retail', 'grocery', 'supercenter', 'sam club'] },
  { symbol: 'TGT', name: 'Target', sector: 'Retail', keywords: ['target', 'brian cornell', 'retail store', 'bullseye', 'redcard'] },
  { symbol: 'COST', name: 'Costco', sector: 'Retail', keywords: ['costco', 'warehouse', 'membership', 'bulk retail', 'kirkland'] },
  { symbol: 'MCD', name: "McDonald's", sector: 'Food', keywords: ['mcdonalds', 'fast food', 'burger', 'chris kempczinski', 'golden arches'] },
  { symbol: 'SBUX', name: 'Starbucks', sector: 'Food', keywords: ['starbucks', 'coffee', 'laxman narasimhan', 'frappuccino', 'brian niccol'] },
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer', keywords: ['nike', 'just do it', 'sneaker', 'john donahoe', 'jordan', 'air max'] },
  { symbol: 'LULU', name: 'Lululemon', sector: 'Consumer', keywords: ['lululemon', 'athleisure', 'yoga pants', 'calvin mcdonald', 'activewear'] },

  // ── AI & CLOUD ──
  { symbol: 'PLTR', name: 'Palantir', sector: 'AI', keywords: ['palantir', 'alex karp', 'government ai', 'data analytics', 'gotham', 'aip'] },
  { symbol: 'AI', name: 'C3.ai', sector: 'AI', keywords: ['c3.ai', 'enterprise ai', 'tom siebel', 'ai software', 'machine learning'] },
  { symbol: 'PATH', name: 'UiPath', sector: 'AI', keywords: ['uipath', 'robotic process automation', 'rpa', 'daniel dines', 'automation'] },
  { symbol: 'SNOW', name: 'Snowflake', sector: 'Cloud', keywords: ['snowflake', 'data cloud', 'sridhar ramaswamy', 'data warehouse', 'sql'] },
  { symbol: 'DDOG', name: 'Datadog', sector: 'Cloud', keywords: ['datadog', 'observability', 'cloud monitoring', 'olivier pomel', 'devops'] },
  { symbol: 'NET', name: 'Cloudflare', sector: 'Cloud', keywords: ['cloudflare', 'matthew prince', 'cdn', 'ddos protection', 'zero trust', 'workers ai'] },

  // ── SPACE & DEFENSE ──
  { symbol: 'LMT', name: 'Lockheed Martin', sector: 'Defense', keywords: ['lockheed martin', 'f-35', 'missile', 'defense contract', 'jim taiclet'] },
  { symbol: 'BA', name: 'Boeing', sector: 'Aerospace', keywords: ['boeing', 'airplane', '737 max', 'dave calhoun', 'starliner', 'nasa'] },
  { symbol: 'RTX', name: 'Raytheon', sector: 'Defense', keywords: ['raytheon', 'missile system', 'defense', 'gregory hayes', 'patriot missile'] },
  { symbol: 'RKLB', name: 'Rocket Lab', sector: 'Space', keywords: ['rocket lab', 'peter beck', 'electron rocket', 'neutron', 'small satellite'] },
  { symbol: 'SPCE', name: 'Virgin Galactic', sector: 'Space', keywords: ['virgin galactic', 'space tourism', 'richard branson', 'delta class'] },

  // ── CRYPTO ADJACENT ──
  { symbol: 'MSTR', name: 'MicroStrategy', sector: 'Crypto', keywords: ['microstrategy', 'michael saylor', 'bitcoin treasury', 'btc purchase'] },
  { symbol: 'HOOD', name: 'Robinhood', sector: 'Fintech', keywords: ['robinhood', 'vlad tenev', 'commission free trading', 'meme stock', 'crypto trading'] },
];

module.exports = { correlateNewsWithStocks, fetchStockData, STOCK_WATCHLIST };  