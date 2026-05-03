const { createClient } = require('redis');
const logger = require('../src/utils/logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        tls: process.env.REDIS_URL?.startsWith('rediss://') ? true : false,
        rejectUnauthorized: false,
      },
    });

    client.on('error', (err) => logger.error('Redis error:', err));
    client.on('connect', () => logger.info('Redis connected'));
    await client.connect();
    return client;
  } catch (err) {
    logger.warn('Redis unavailable, continuing without cache:', err.message);
    return null;
  }
};

const cache = {
  async get(key) {
    if (!client) return null;
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  async set(key, value, ttl = parseInt(process.env.CACHE_TTL) || 300) {
    if (!client) return;
    try { await client.setEx(key, ttl, JSON.stringify(value)); } catch {}
  },
  async del(key) {
    if (!client) return;
    try { await client.del(key); } catch {}
  },
  async flush() {
    if (!client) return;
    try { await client.flushAll(); } catch {}
  }
};

module.exports = { connectRedis, cache };