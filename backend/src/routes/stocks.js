const express = require('express');
const router = express.Router();
const { correlateNewsWithStocks, fetchStockData, STOCK_WATCHLIST } = require('../services/stockService');
const { cache } = require('../../config/redis');

// GET /api/stocks/watchlist
// GET /api/stocks/watchlist?sector=Technology
router.get('/watchlist', (req, res) => {
  const { sector } = req.query;
  let list = STOCK_WATCHLIST;
  if (sector) {
    list = STOCK_WATCHLIST.filter(s => s.sector?.toLowerCase() === sector.toLowerCase());
  }
  const sectors = [...new Set(STOCK_WATCHLIST.map(s => s.sector))].sort();
  res.json({ stocks: list, sectors, total: list.length });
});

// GET /api/stocks/:symbol
router.get('/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `stock:${symbol}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);
  } catch {}

  try {
    const stock = STOCK_WATCHLIST.find(s => s.symbol === symbol.toUpperCase());
    const keywords = stock?.keywords || [symbol.toLowerCase()];

    const data = await correlateNewsWithStocks(symbol.toUpperCase(), keywords);
    if (!data) return res.status(500).json({ error: 'Failed to fetch stock data' });

    try { await cache.set(cacheKey, data, 900); } catch {}

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;