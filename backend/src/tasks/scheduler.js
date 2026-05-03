const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { runScraper } = require('../services/scraperService');
const { computeAllTrends } = require('../services/trendService');
const { generateTopInsights } = require('../services/aiService');
const { generateDailyBriefing } = require('../services/briefingService');
const { predictTrends } = require('../services/predictionService');
const { checkWatchlistAlerts } = require('../services/watchListService');
const { cache } = require('../../config/redis');

let jobs = [];

const initScheduler = (io) => {
  // Scrape every 15 minutes
  const scrapeJob = schedule.scheduleJob('*/15 * * * *', async () => {
    try {
      const result = await runScraper();
      if (result.totalSaved > 0) {
        await computeAllTrends();
        await cache.flush().catch(() => {});
        // Notify connected clients
        if (io) io.emit('scrape:complete', { totalSaved: result.totalSaved, timestamp: new Date() });
      }
    } catch (err) {
      logger.error('[Scheduler] Scrape error:', err.message);
    }
  });

  // Check watchlist alerts every 5 minutes
  const watchlistJob = schedule.scheduleJob('*/5 * * * *', async () => {
    try {
      await checkWatchlistAlerts(io);
    } catch (err) {
      logger.error('[Scheduler] Watchlist error:', err.message);
    }
  });

  // AI insights every hour
  const insightJob = schedule.scheduleJob('0 * * * *', async () => {
    try {
      await generateTopInsights();
      await cache.flush().catch(() => {});
    } catch (err) {
      logger.error('[Scheduler] Insight error:', err.message);
    }
  });

  // Daily briefing at 7 AM
  const briefingJob = schedule.scheduleJob('0 7 * * *', async () => {
    try {
      const briefing = await generateDailyBriefing();
      if (briefing && io) io.emit('briefing:ready', briefing);
      logger.info('Daily briefing generated');
    } catch (err) {
      logger.error('[Scheduler] Briefing error:', err.message);
    }
  });

  // Trend predictions every 6 hours
  const predictionJob = schedule.scheduleJob('0 */6 * * *', async () => {
    try {
      const prediction = await predictTrends();
      if (prediction && io) io.emit('predictions:updated', prediction);
      logger.info('Trend predictions updated');
    } catch (err) {
      logger.error('[Scheduler] Prediction error:', err.message);
    }
  });

  jobs = [scrapeJob, watchlistJob, insightJob, briefingJob, predictionJob];
  logger.info('[Scheduler] All 5 jobs initialized');
};

const stopScheduler = () => {
  jobs.forEach(job => job?.cancel());
  jobs = [];
};

module.exports = { initScheduler, stopScheduler };