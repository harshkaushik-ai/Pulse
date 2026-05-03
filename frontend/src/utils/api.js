import axios from 'axios';

const api = axios.create({
  baseURL:import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

export const getArticles = (params) => api.get('/articles', { params });
export const getArticleStats = () => api.get('/articles/stats');
export const getSentimentTimeline = (days) => api.get('/articles/sentiment-timeline', { params: { days } });
export const getTrends = (period = '24h', limit = 20) => api.get('/trends', { params: { period, limit } });
export const getBreakingTrends = () => api.get('/trends/breaking');
export const getKeywordTimeSeries = (keyword, days = 7) => api.get(`/trends/keyword/${keyword}/timeseries`, { params: { days } });
export const recomputeTrends = () => api.post('/trends/recompute');
export const getInsights = (limit = 10) => api.get('/insights', { params: { limit } });
export const generateInsight = (topic) => api.post('/insights/generate', { topic });
export const generateTopInsights = () => api.post('/insights/generate-top');
export const getScraperStatus = () => api.get('/scraper/status');
export const runScraper = () => api.post('/scraper/run');
// Add these to your existing api.js

// Briefing
export const getDailyBriefing = () => api.get('/briefing/today');
export const generateBriefing = () => api.post('/briefing/generate');
export const getPredictions = () => api.get('/briefing/predictions');
export const generatePredictions = () => api.post('/briefing/predictions/generate');

// Watchlist
export const getWatchlist = () => api.get('/watchlist');
export const addToWatchlist = (data) => api.post('/watchlist', data);
export const removeFromWatchlist = (id) => api.delete(`/watchlist/${id}`);
export const updateWatchlistItem = (id, data) => api.put(`/watchlist/${id}`, data);
export const getAlerts = () => api.get('/watchlist/alerts');
export const markAlertRead = (id) => api.put(`/watchlist/alerts/${id}/read`);
export const markAllAlertsRead = () => api.put('/watchlist/alerts/read-all');

// Stocks
export const getStockWatchlist = () => api.get('/stocks/watchlist');
export const getStockCorrelation = (symbol) => api.get(`/stocks/${symbol}`);
export default api;