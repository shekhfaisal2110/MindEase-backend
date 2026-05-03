// services/insightService.js
const UserActivity = require('../models/UserActivity');
const SleepLog = require('../models/SleepLog');
const EmotionalActivity = require('../models/EmotionalActivity');
const DeviceUsage = require('../models/DeviceUsage');
const GratitudeEntry = require('../models/GratitudeEntry');
const TherapyExercise = require('../models/TherapyExercise');

const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

/**
 * Generate insights for a user based on last 30 days of data.
 * Returns an array of insight objects.
 */
exports.generateInsights = async (userId) => {
  const insights = [];
  const endDate = toDateStr(new Date());
  const startDate = toDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  // 1. Sleep vs Next Day Mood
  const sleepData = await SleepLog.aggregate([
    { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
    { $addFields: { nextDate: { $dateToString: { format: "%Y-%m-%d", date: { $dateAdd: { startDate: { $dateFromString: { dateString: "$date" } }, unit: "day", amount: 1 } } } } } },
    { $lookup: { from: 'emotionalactivities', localField: 'nextDate', foreignField: 'date', as: 'mood' } },
    { $unwind: { path: '$mood', preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, avgMoodWellRested: { $avg: '$mood.intensity' } } }
  ]);
  if (sleepData.length && sleepData[0].avgMoodWellRested) {
    insights.push({
      title: '😴 Sleep & Mood',
      description: `Your mood averages ${sleepData[0].avgMoodWellRested.toFixed(1)}/10 on days after you log sleep. Prioritise rest.`,
      type: 'positive',
      metric: 'sleep'
    });
  }

  // 2. Gratitude Effect on Same‑Day Happiness
  const gratitudeEffect = await EmotionalActivity.aggregate([
    { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
    { $lookup: { from: 'gratitudeentries', localField: 'date', foreignField: 'date', as: 'gratitude' } },
    { $addFields: { hasGratitude: { $gt: [{ $size: '$gratitude' }, 0] } } },
    { $group: { _id: '$hasGratitude', avgIntensity: { $avg: '$intensity' } } }
  ]);
  const withGratitude = gratitudeEffect.find(g => g._id === true)?.avgIntensity || 0;
  const withoutGratitude = gratitudeEffect.find(g => g._id === false)?.avgIntensity || 0;
  if (withGratitude > 0 && withoutGratitude > 0 && withGratitude > withoutGratitude + 0.3) {
    insights.push({
      title: '🙏 Gratitude Effect',
      description: `On days you write gratitude, your emotional intensity is ${(withGratitude - withoutGratitude).toFixed(1)} points higher. Keep it up!`,
      type: 'positive',
      metric: 'gratitude'
    });
  }

  // 3. Screen Time vs Emotional Intensity
  const screenVsMood = await DeviceUsage.aggregate([
    { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
    { $lookup: { from: 'emotionalactivities', localField: 'date', foreignField: 'date', as: 'mood' } },
    { $unwind: { path: '$mood', preserveNullAndEmptyArrays: true } },
    { $bucket: { groupBy: '$totalMinutes', boundaries: [0, 60, 120, 240, 720], default: 'other', output: { avgMood: { $avg: '$mood.intensity' } } } }
  ]);
  const lowScreen = screenVsMood.find(b => b._id === 0)?.avgMood;
  const highScreen = screenVsMood.find(b => b._id === 240)?.avgMood;
  if (lowScreen && highScreen && lowScreen > highScreen + 1) {
    insights.push({
      title: '📱 Digital Balance',
      description: `Your mood is ${(lowScreen - highScreen).toFixed(1)} points higher on days with <2h screen time vs days >4h.`,
      type: 'warning',
      metric: 'screen'
    });
  }

  // 4. Therapy Exercise Consistency
  const therapyCount = await TherapyExercise.countDocuments({ user: userId, date: { $gte: startDate, $lte: endDate } });
  if (therapyCount === 0) {
    insights.push({
      title: '🧘 Try Therapy Exercises',
      description: 'You haven’t done any therapy exercises this month. A few minutes of hot potato or self‑talk can reduce stress.',
      type: 'neutral',
      metric: 'therapy'
    });
  } else if (therapyCount >= 10) {
    insights.push({
      title: '🏆 Therapy Streak',
      description: `You've completed ${therapyCount} therapy exercises this month! That's fantastic for emotional resilience.`,
      type: 'positive',
      metric: 'therapy'
    });
  }

  // 5. Streak Encouragement
  const activeDays = await UserActivity.distinct('date', { user: userId, date: { $gte: startDate, $lte: endDate } });
  if (activeDays.length >= 25) {
    insights.push({
      title: '🔥 Outstanding Consistency',
      description: `You've been active on ${activeDays.length} of the last 30 days! Your dedication is inspiring.`,
      type: 'positive',
      metric: 'streak'
    });
  } else if (activeDays.length < 5) {
    insights.push({
      title: '🌱 Start Small',
      description: 'Even 2 minutes of gratitude or a short walk can make a difference. Try logging one activity today.',
      type: 'neutral',
      metric: 'streak'
    });
  }

  // Ensure we return at least 3 insights (fill with generic if needed)
  if (insights.length < 3) {
    insights.push({
      title: '💡 Daily Tip',
      description: 'Logging your emotions every morning helps you notice patterns and take control of your day.',
      type: 'neutral',
      metric: 'tip'
    });
  }

  return insights.slice(0, 6); // max 6 insights
};