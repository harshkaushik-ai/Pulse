const express = require('express');
const router = express.Router();
const { WatchlistItem, Alert } = require('../services/watchListService');

// GET /api/watchlist
router.get('/', async (req, res) => {
  try {
    const items = await WatchlistItem.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/watchlist
router.post('/', async (req, res) => {
  try {
    const { keyword, threshold, color, notes } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword required' });
    const item = await WatchlistItem.create({
      keyword: keyword.toLowerCase().trim(),
      threshold: threshold || 5,
      color: color || '#a78bfa',
      notes,
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:id
router.delete('/:id', async (req, res) => {
  try {
    await WatchlistItem.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/:id
router.put('/:id', async (req, res) => {
  try {
    const item = await WatchlistItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/watchlist/alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      order: [['triggeredAt', 'DESC']],
      limit: 50,
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/alerts/:id/read
router.put('/alerts/:id/read', async (req, res) => {
  try {
    await Alert.update({ isRead: true }, { where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/alerts/read-all
router.put('/alerts/read-all', async (req, res) => {
  try {
    await Alert.update({ isRead: true }, { where: { isRead: false } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;