// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const HourlyEmotion = require('../models/HourlyEmotion');

// router.use(auth);

// router.get('/', async (req, res) => {
//   try {
//     const emotions = await HourlyEmotion.find({ user: req.user._id });
//     res.json(emotions);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get all emotions for a specific date (YYYY-MM-DD)
// router.get('/date/:date', async (req, res) => {
//   try {
//     const date = new Date(req.params.date);
//     date.setHours(0, 0, 0, 0);
//     const emotions = await HourlyEmotion.find({ user: req.user._id, date });
//     res.json(emotions);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Save or update emotion for a specific hourBlock on a date
// router.post('/', async (req, res) => {
//   try {
//     const { date, hourBlock, emotion } = req.body;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const updated = await HourlyEmotion.findOneAndUpdate(
//       { user: req.user._id, date: targetDate, hourBlock },
//       { emotion },
//       { upsert: true, new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get monthly summary for calendar (all dates with emotions)
// router.get('/month/:year/:month', async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const emotions = await HourlyEmotion.find({
//       user: req.user._id,
//       date: { $gte: start, $lte: end }
//     });
//     // Group by date
//     const summary = {};
//     emotions.forEach(e => {
//       const dateStr = e.date.toISOString().split('T')[0];
//       if (!summary[dateStr]) summary[dateStr] = { positive: 0, negative: 0, neutral: 0 };
//       summary[dateStr][e.emotion]++;
//     });
//     // Compute overall sentiment per day
//     const result = {};
//     for (const [date, counts] of Object.entries(summary)) {
//       if (counts.positive > counts.negative) result[date] = 'positive';
//       else if (counts.negative > counts.positive) result[date] = 'negative';
//       else result[date] = 'neutral';
//     }
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;





// routes/hourlyEmotionRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const hourlyEmotionController = require('../controllers/hourlyEmotionController');

router.use(auth);
router.get('/', hourlyEmotionController.getAll);
router.get('/date/:date', hourlyEmotionController.getByDate);
router.get('/month/:year/:month', hourlyEmotionController.getMonthlySummary);
router.post('/', hourlyEmotionController.saveEmotion);

module.exports = router;