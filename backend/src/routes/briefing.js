const express = require('express');
const router = express.Router();
const { generateDailyBriefing } = require('../services/briefingService');
const { predictTrends } = require('../services/predictionService');
const { cache } = require('../../config/redis');

let cachedBriefing = null;
let cachedPrediction = null;

// GET /api/briefing/today
router.get('/today', async (req, res) => {
  try {
    const cacheKey = `briefing:${new Date().toDateString()}`;
    const cached = await cache.get(cacheKey).catch(() => null);
    if (cached) return res.json(cached);
    if (cachedBriefing) return res.json(cachedBriefing);

    const briefing = await generateDailyBriefing();
    if (!briefing) return res.status(404).json({ error: 'Could not generate briefing' });

    cachedBriefing = briefing;
    await cache.set(cacheKey, briefing, 3600).catch(() => {});
    res.json(briefing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/briefing/generate
router.post('/generate', async (req, res) => {
  try {
    const briefing = await generateDailyBriefing();
    if (!briefing) return res.status(500).json({ error: 'Generation failed' });
    cachedBriefing = briefing;
    res.json(briefing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/briefing/predictions
router.get('/predictions', async (req, res) => {
  try {
    const cacheKey = `predictions:${new Date().getHours()}`;
    const cached = await cache.get(cacheKey).catch(() => null);
    if (cached) return res.json(cached);
    if (cachedPrediction) return res.json(cachedPrediction);

    const prediction = await predictTrends();
    if (!prediction) return res.status(404).json({ error: 'Could not generate predictions' });

    cachedPrediction = prediction;
    await cache.set(cacheKey, prediction, 3600).catch(() => {});
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/briefing/predictions/generate
router.post('/predictions/generate', async (req, res) => {
  try {
    const prediction = await predictTrends();
    if (!prediction) return res.status(500).json({ error: 'Generation failed' });
    cachedPrediction = prediction;
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;