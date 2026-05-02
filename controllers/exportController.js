const PDFDocument = require('pdfkit');
const pdfGenerator = require('../utils/pdfGenerator');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const GratitudeEntry = require('../models/GratitudeEntry');
const Affirmation = require('../models/Affirmation');
const EmotionalActivity = require('../models/EmotionalActivity');
const TherapyExercise = require('../models/TherapyExercise');
const LetterToSelf = require('../models/LetterToSelf');
const Task = require('../models/Task');
const SleepLog = require('../models/SleepLog');
const DeviceUsage = require('../models/DeviceUsage');
const AppUsage = require('../models/AppUsage');
const HourlyEmotion = require('../models/HourlyEmotion');
const ReactResponse = require('../models/ReactResponse');

// Helper: get start and end dates as YYYY-MM-DD strings for the requested period
const getDateRange = (period, year, month) => {
  let start, end;
  if (period === 'monthly' && year && month) {
    start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  } else if (period === 'yearly' && year) {
    start = `${year}-01-01`;
    end = `${year}-12-31`;
  } else {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  }
  return { start, end };
};

exports.exportProgressPDF = async (req, res) => {
  try {
    const { period = 'monthly', year, month } = req.query;
    const userId = req.user._id;
    const { start, end } = getDateRange(period, parseInt(year), parseInt(month));

    // 1. User info
    const user = await User.findById(userId).select('username email createdAt').lean();
    user.createdAt = user.createdAt.toISOString().split('T')[0];

    // 2. Points & breakdown (date strings work directly)
    const pointsAgg = await UserActivity.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: {
          _id: null,
          totalPoints: { $sum: "$totalPoints" },
          pageView: { $sum: "$breakdown.pageView" },
          hourlyEmotion: { $sum: "$breakdown.hourlyEmotion" },
          emotionalCheckIn: { $sum: "$breakdown.emotionalCheckIn" },
          gratitude: { $sum: "$breakdown.gratitude" },
          affirmation: { $sum: "$breakdown.affirmation" },
          growthHealing: { $sum: "$breakdown.growthHealing" },
          letterToSelf: { $sum: "$breakdown.letterToSelf" },
          dailyTask: { $sum: "$breakdown.dailyTask" },
          reactResponse: { $sum: "$breakdown.reactResponse" },
          ikigaiItem: { $sum: "$breakdown.ikigaiItem" }
        }
      }
    ]);
    const agg = pointsAgg[0] || {};
    const breakdown = {
      affirmation: agg.affirmation || 0,
      gratitude: agg.gratitude || 0,
      emotionalCheckIn: agg.emotionalCheckIn || 0,
      therapy: 0, // therapy points not stored yet
      lettersToSelf: agg.letterToSelf || 0,
      hourlyEmotion: agg.hourlyEmotion || 0,
      reactResponse: agg.reactResponse || 0,
      dailyTask: agg.dailyTask || 0,
      ikigaiItem: agg.ikigaiItem || 0
    };
    const totalPoints = agg.totalPoints || 0;

    // 3. Activity counts (unique entries)
    const [affirmationCount, gratitudeCount, emotionalCount, therapyCount,
           lettersCount, hourlyCount, reactCount, taskCount, activeDays] = await Promise.all([
      Affirmation.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      GratitudeEntry.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      EmotionalActivity.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      TherapyExercise.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      LetterToSelf.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      HourlyEmotion.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      ReactResponse.countDocuments({ user: userId, date: { $gte: start, $lte: end } }),
      Task.countDocuments({ user: userId, completed: true, updatedAt: { $gte: new Date(start), $lte: new Date(end + 'T23:59:59') } }),
      UserActivity.distinct('date', { user: userId, date: { $gte: start, $lte: end } }).then(d => d.length)
    ]);

    const counts = {
      activeDays,
      totalActivities: affirmationCount + gratitudeCount + emotionalCount + therapyCount + lettersCount + hourlyCount + reactCount + taskCount,
      affirmation: affirmationCount,
      gratitude: gratitudeCount,
      emotionalCheckIn: emotionalCount,
      therapy: therapyCount,
      lettersToSelf: lettersCount,
      hourlyEmotion: hourlyCount,
      reactResponse: reactCount,
      dailyTask: taskCount,
      ikigaiItem: breakdown.ikigaiItem
    };

    // 4. Emotional stats
    const emotionalAgg = await EmotionalActivity.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, avgIntensity: { $avg: "$intensity" }, emotions: { $push: "$emotion" } } }
    ]);
    let emotional = { intensity: 0, topEmotion: 'N/A' };
    if (emotionalAgg.length && emotionalAgg[0].emotions.length) {
      const counts = {};
      emotionalAgg[0].emotions.forEach(e => counts[e] = (counts[e] || 0) + 1);
      const top = Object.entries(counts).sort((a,b) => b[1] - a[1])[0];
      emotional = {
        intensity: emotionalAgg[0].avgIntensity.toFixed(1),
        topEmotion: top ? top[0] : 'N/A'
      };
    }

    // 5. Sleep stats
    const sleepAgg = await SleepLog.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, avgDuration: { $avg: "$duration" }, avgQuality: { $avg: "$quality" } } }
    ]);
    const sleep = sleepAgg[0] ? {
      duration: sleepAgg[0].avgDuration.toFixed(1),
      quality: sleepAgg[0].avgQuality.toFixed(1)
    } : { duration: 0, quality: 0 };

    // 6. Device total minutes
    const deviceAgg = await DeviceUsage.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalMinutes: { $sum: "$totalMinutes" } } }
    ]);
    const device = { totalMinutes: deviceAgg[0]?.totalMinutes || 0 };

    // 7. Top 5 apps
    const apps = await AppUsage.aggregate([
      { $match: { user: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: "$appName", totalMinutes: { $sum: "$minutes" } } },
      { $sort: { totalMinutes: -1 } },
      { $limit: 5 }
    ]);

    // 8. Weekly points for chart (last 7 days)
const weeklyPoints = await UserActivity.aggregate([
  { $match: { user: userId, date: { $gte: start, $lte: end } } },
  { $group: { _id: "$date", points: { $sum: "$totalPoints" } } },
  { $sort: { _id: 1 } },
  { $limit: 30 }
]);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=MindEase_${period}_${year}${month ? `_${month}` : ''}.pdf`);
    doc.pipe(res);

    pdfGenerator.generateReport(doc, {
      user,
      totalPoints,
      breakdown,
      counts,
      emotional,
      sleep,
      device,
      apps,
      start,
      end,
      weeklyPoints
    });
    doc.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
};