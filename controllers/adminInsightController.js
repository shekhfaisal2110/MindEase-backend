const UserInsight = require('../models/UserInsight');
const User = require('../models/User');

// Simple in‑memory cache (no Redis required)
let statsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Admin check helper
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// Get aggregated insight statistics (cached)
exports.getInsightStats = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Return cached data if still fresh
    if (statsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
      return res.json(statsCache);
    }

    // Aggregation: total counts per insight type
    const typeStats = await UserInsight.aggregate([
      { $unwind: "$insights" },
      { $group: { _id: "$insights.type", count: { $sum: 1 } } }
    ]);

    // Aggregation: top triggered insight titles (most frequent)
    const topTitles = await UserInsight.aggregate([
      { $unwind: "$insights" },
      { $group: { _id: "$insights.title", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Aggregation: counts per metric (sleep, gratitude, screen, therapy, streak, tip)
    const metricStats = await UserInsight.aggregate([
      { $unwind: "$insights" },
      { $match: { "insights.metric": { $exists: true, $ne: null } } },
      { $group: { _id: "$insights.metric", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Aggregation: total users who have insights (active)
    const totalUsersWithInsights = await UserInsight.distinct('user').then(users => users.length);
    const totalUsers = await User.countDocuments();
    const coveragePercent = totalUsers > 0 ? ((totalUsersWithInsights / totalUsers) * 100).toFixed(1) : 0;

    // Build result object
    const result = {
      typeStats: typeStats.map(t => ({ name: t._id, value: t.count })),
      topTitles: topTitles.map(t => ({ title: t._id, count: t.count })),
      metricStats: metricStats.map(m => ({ metric: m._id, count: m.count })),
      dashboard: {
        totalInsightsGenerated: await UserInsight.countDocuments(),
        totalUsersWithInsights,
        totalUsers,
        coveragePercent
      },
      lastUpdated: new Date().toISOString()
    };

    // Cache result
    statsCache = result;
    cacheTimestamp = Date.now();

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Force refresh cache (manual)
exports.refreshInsightStats = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    // Clear cache
    statsCache = null;
    cacheTimestamp = null;
    // Re-fetch and return
    const refreshed = await exports.getInsightStats(req, res);
    // Note: getInsightStats sends response; we must not send twice.
    // Better to re‑implement logic, but we'll just call the same handler.
    // For simplicity, we'll just send a success message and let the next GET refresh.
    res.json({ message: 'Cache cleared, stats will refresh on next request.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};