// middleware/cache.js
const redis = require('redis');

// Create Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Handle Redis connection errors
client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis connected successfully'));

// Connect immediately (async, but don't block server start)
client.connect().catch(console.error);

const cache = (duration) => {
  return async (req, res, next) => {
    // Agar Redis down hai to caching skip karo
    if (!client.isOpen) {
      return next();
    }

    // Cache key banayein — user specific ya public
    const userId = req.user?._id || 'public';
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
      const cachedData = await client.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      // Override res.json safely
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Sirf success response (status 2xx) cache karein
        if (res.statusCode >= 200 && res.statusCode < 300) {
          client.setEx(key, duration, JSON.stringify(data)).catch(console.error);
        }
        return originalJson(data);
      };
      next();
    } catch (err) {
      console.error('Cache error:', err);
      next(); // Cache fail ho to bina cache ke aage badho
    }
  };
};

// Helper function to invalidate cache (user update par call karna)
const invalidateUserCache = async (userId) => {
  if (!client.isOpen) return;
  const pattern = `cache:${userId}:*`;
  const keys = await client.keys(pattern);
  if (keys.length) {
    await client.del(keys);
    console.log(`Cleared ${keys.length} cache keys for user ${userId}`);
  }
};

module.exports = { cache, invalidateUserCache };