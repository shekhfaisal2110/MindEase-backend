// controllers/insightController.js
const UserInsight = require('../models/UserInsight');
const insightService = require('../services/insightService');

// Get cached insights (generated today) or generate new ones
exports.getUserInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    let userInsight = await UserInsight.findOne({ user: userId, date: today }).lean();
    if (!userInsight) {
      // Generate and store
      const insights = await insightService.generateInsights(userId);
      userInsight = await UserInsight.create({ user: userId, date: today, insights });
    }
    res.json({ insights: userInsight.insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Force regenerate insights (e.g., after user requests refresh)
exports.regenerateInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];
    const insights = await insightService.generateInsights(userId);
    await UserInsight.findOneAndUpdate(
      { user: userId, date: today },
      { insights },
      { upsert: true, new: true }
    );
    res.json({ insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};