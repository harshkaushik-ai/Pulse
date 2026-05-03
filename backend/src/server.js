require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('../config/database');
const { connectRedis } = require('../config/redis');
const { initScheduler } = require('./tasks/scheduler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// WebSocket setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Make io available globally
app.set('io', io);

const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Routes
app.use('/api/articles', require('./routes/article'));
app.use('/api/trends', require('./routes/trend'));
app.use('/api/insights', require('./routes/insight'));
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/briefing', require('./routes/briefing'));
app.use('/api/watchlist', require('./routes/watchlist'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/social', require('./routes/social'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// WebSocket events
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:watchlist', () => {
    socket.join('watchlist');
    logger.info(`${socket.id} subscribed to watchlist`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Broadcast live stats every 30 seconds
setInterval(async () => {
  try {
    const Article = require('./models/Article');
    const { Op } = require('sequelize');
    const dayjs = require('dayjs');
    const count = await Article.count({
      where: { publishedAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() } },
    });
    io.emit('stats:update', { articleCount24h: count, timestamp: new Date() });
  } catch {}
}, 30000);

const start = async () => {
  await connectDB();

  // Sync new models
  const { WatchlistItem, Alert } = require('./services/watchListService');
  await WatchlistItem.sync({ alter: true });
  await Alert.sync({ alter: true });

  await connectRedis();
  initScheduler(io);

  server.listen(PORT, () => {
    logger.info(`🚀 Server + WebSocket running on http://localhost:${PORT}`);
    logger.info(`📰 Scraper active — every 15 minutes`);
    logger.info(`🤖 AI briefings powered by Groq`);
    logger.info(`📡 Real-time updates via WebSocket`);
  });

  setTimeout(async () => {
    try {
      const { runScraper } = require('./services/scraperService');
      const { computeAllTrends } = require('./services/trendService');
      await runScraper();
      await computeAllTrends();
    } catch (err) {
      logger.error('Initial scrape failed:', err.message);
    }
  }, 3000);
};

start().catch((err) => { logger.error('Startup failed:', err); process.exit(1); });




// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const compression = require('compression');
// const rateLimit = require('express-rate-limit');

// const { connectDB } = require('../config/database');
// const { connectRedis } = require('../config/redis');
// const { initScheduler } = require('./tasks/scheduler');
// const logger = require('./utils/logger');

// const app = express();
// const server = http.createServer(app);

// // WebSocket setup
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
//     methods: ['GET', 'POST'],
//   },
// });

// // Make io available globally
// app.set('io', io);

// const PORT = process.env.PORT || 5000;

// app.use(helmet({ crossOriginResourcePolicy: false }));
// app.use(compression());
// app.use(cors({
//   origin: [
//     process.env.CORS_ORIGIN || 'http://localhost:5173',
//     'http://127.0.0.1:3000',
//   ],
//   credentials: true,
// }));
// app.use(express.json({ limit: '1mb' }));
// app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// app.use('/api/', rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 200,
//   standardHeaders: true,
//   legacyHeaders: false,
// }));

// // Health
// app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// // Routes
// app.use('/api/articles', require('./routes/article'));
// app.use('/api/trends', require('./routes/trend'));
// app.use('/api/insights', require('./routes/insight'));
// app.use('/api/scraper', require('./routes/scraper'));
// app.use('/api/briefing', require('./routes/briefing'));
// app.use('/api/watchlist', require('./routes/watchlist'));
// app.use('/api/stocks', require('./routes/stocks'));

// app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
// app.use((err, req, res, next) => {
//   logger.error('Unhandled error:', err);
//   res.status(500).json({ error: 'Internal server error' });
// });

// // WebSocket events
// io.on('connection', (socket) => {
//   logger.info(`Client connected: ${socket.id}`);

//   socket.on('subscribe:watchlist', () => {
//     socket.join('watchlist');
//     logger.info(`${socket.id} subscribed to watchlist`);
//   });

//   socket.on('disconnect', () => {
//     logger.info(`Client disconnected: ${socket.id}`);
//   });
// });

// // Broadcast live stats every 30 seconds
// setInterval(async () => {
//   try {
//     const Article = require('./models/Article');
//     const { Op } = require('sequelize');
//     const dayjs = require('dayjs');
//     const count = await Article.count({
//       where: { publishedAt: { [Op.gte]: dayjs().subtract(24, 'hour').toDate() } },
//     });
//     io.emit('stats:update', { articleCount24h: count, timestamp: new Date() });
//   } catch {}
// }, 30000);

// const start = async () => {
//   await connectDB();

//   // Sync new models
//   const { WatchlistItem, Alert } = require('./services/watchListService');
//   await WatchlistItem.sync({ alter: true });
//   await Alert.sync({ alter: true });

//   await connectRedis();
//   initScheduler(io);

//   server.listen(PORT, () => {
//     logger.info(`🚀 Server + WebSocket running on http://localhost:${PORT}`);
//     logger.info(`📰 Scraper active — every 15 minutes`);
//     logger.info(`🤖 AI briefings powered by Groq`);
//     logger.info(`📡 Real-time updates via WebSocket`);
//   });

//   setTimeout(async () => {
//     try {
//       const { runScraper } = require('./services/scraperService');
//       const { computeAllTrends } = require('./services/trendService');
//       await runScraper();
//       await computeAllTrends();
//     } catch (err) {
//       logger.error('Initial scrape failed:', err.message);
//     }
//   }, 3000);
// };

// start().catch((err) => { logger.error('Startup failed:', err); process.exit(1); });