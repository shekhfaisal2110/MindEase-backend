const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EmotionalActivity = require('../models/EmotionalActivity');

router.use(auth);

// Get all emotional check‑ins
router.get('/', async (req, res) => {
  try {
    const activities = await EmotionalActivity.find({ user: req.user._id }).sort({ date: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new emotional check‑in
router.post('/', async (req, res) => {
  try {
    const activity = new EmotionalActivity({
      user: req.user._id,
      emotion: req.body.emotion,
      intensity: req.body.intensity,
      note: req.body.note,
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NEW: Get statistics (last 30 days and all-time)
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // All-time data
    const allActivities = await EmotionalActivity.find({ user: userId }).select('emotion intensity date');
    // Last 30 days data
    const recentActivities = await EmotionalActivity.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).select('emotion intensity date');

    // Helper function to compute stats
    const computeStats = (activities) => {
      if (activities.length === 0) return { total: 0, avgIntensity: 0, emotionCounts: {}, mostFrequent: null };
      const emotionCounts = {};
      let totalIntensity = 0;
      activities.forEach(a => {
        emotionCounts[a.emotion] = (emotionCounts[a.emotion] || 0) + 1;
        totalIntensity += a.intensity;
      });
      const mostFrequent = Object.entries(emotionCounts).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0])[0];
      return {
        total: activities.length,
        avgIntensity: (totalIntensity / activities.length).toFixed(1),
        emotionCounts,
        mostFrequent
      };
    };

    const recentStats = computeStats(recentActivities);
    const allTimeStats = computeStats(allActivities);

    // Daily trend for last 30 days (group by date)
    const dailyTrend = {};
    recentActivities.forEach(act => {
      const dateStr = act.date.toISOString().split('T')[0];
      if (!dailyTrend[dateStr]) dailyTrend[dateStr] = { count: 0, avgIntensity: 0, totalIntensity: 0 };
      dailyTrend[dateStr].count++;
      dailyTrend[dateStr].totalIntensity += act.intensity;
    });
    for (let date in dailyTrend) {
      dailyTrend[date].avgIntensity = (dailyTrend[date].totalIntensity / dailyTrend[date].count).toFixed(1);
    }

    res.json({
      recent: recentStats,
      allTime: allTimeStats,
      dailyTrend
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get daily average intensity for a specific emotion (last 30 days)
router.get('/emotion-trend/:emotion', async (req, res) => {
  try {
    const { emotion } = req.params;
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activities = await EmotionalActivity.find({
      user: userId,
      emotion: emotion,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });
    
    const dailyMap = {};
    activities.forEach(act => {
      const dateStr = act.date.toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { totalIntensity: 0, count: 0 };
      }
      dailyMap[dateStr].totalIntensity += act.intensity;
      dailyMap[dateStr].count++;
    });
    
    const trendData = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      avgIntensity: data.totalIntensity / data.count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(trendData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get intensity trend for a specific emotion over last 30 days
router.get('/intensity-trend/:emotion', async (req, res) => {
  try {
    const userId = req.user._id;
    const emotion = decodeURIComponent(req.params.emotion);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activities = await EmotionalActivity.find({
      user: userId,
      emotion: emotion,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });
    // Group by date
    const trend = {};
    activities.forEach(act => {
      const dateStr = act.date.toISOString().split('T')[0];
      if (!trend[dateStr]) trend[dateStr] = { total: 0, count: 0 };
      trend[dateStr].total += act.intensity;
      trend[dateStr].count++;
    });
    const result = Object.entries(trend).map(([date, data]) => ({
      date,
      avgIntensity: parseFloat((data.total / data.count).toFixed(1))
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;