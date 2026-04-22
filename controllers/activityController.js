const UserActivity = require('../models/UserActivity');

// Helper to get or create today's activity record
const getTodayActivity = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let activity = await UserActivity.findOne({ user: userId, date: today });
  if (!activity) {
    activity = new UserActivity({ user: userId, date: today });
    await activity.save();
  }
  return activity;
};

// Add points for an action
exports.addPoints = async (req, res) => {
  try {
    const { actionType, points, meta } = req.body;
    const userId = req.user._id;
    const activity = await getTodayActivity(userId);

    // Update breakdown and total
    let pointsToAdd = points;
    if (actionType === 'affirmation') {
      pointsToAdd = Math.floor((meta?.totalAffirmations || 0) / 2);
    }

    if (actionType === 'pageView') activity.breakdown.pageView += pointsToAdd || 1;
    else if (actionType === 'hourlyEmotion') activity.breakdown.hourlyEmotion += pointsToAdd || 5;
    else if (actionType === 'emotionalCheckIn') activity.breakdown.emotionalCheckIn += pointsToAdd || 1;
    else if (actionType === 'gratitude') activity.breakdown.gratitude += pointsToAdd || 2;
    else if (actionType === 'affirmation') activity.breakdown.affirmation += pointsToAdd;
    else if (actionType === 'growthHealing') activity.breakdown.growthHealing += pointsToAdd || 1;
    else if (actionType === 'letterToSelf') activity.breakdown.letterToSelf += pointsToAdd || 20;
    else if (actionType === 'dailyTask') activity.breakdown.dailyTask += pointsToAdd || 3;
    else if (actionType === 'reactResponse') activity.breakdown.reactResponse += pointsToAdd || 5;
    else if (actionType === 'ikigaiItem') activity.breakdown.ikigaiItem += pointsToAdd || 10;

    activity.totalPoints += pointsToAdd;
    await activity.save();

    res.json({ success: true, totalPoints: activity.totalPoints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get activity history for the last N days (default 30)
exports.getActivityHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const activities = await UserActivity.find({
      user: userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all-time total points for the user
exports.getAllTimeTotal = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await UserActivity.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$totalPoints" } } }
    ]);
    const allTimeTotal = result.length > 0 ? result[0].total : 0;
    res.json({ allTimeTotal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};