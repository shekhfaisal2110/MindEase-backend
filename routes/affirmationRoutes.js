// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const Affirmation = require('../models/Affirmation');

// router.use(auth);

// // Get all affirmations for current month
// router.get('/', async (req, res) => {
//   try {
//     const month = new Date().toISOString().slice(0, 7);
//     const affirmations = await Affirmation.find({ user: req.user._id, month });
//     res.json(affirmations);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Create a new affirmation
// router.post('/', async (req, res) => {
//   try {
//     const month = new Date().toISOString().slice(0, 7);
//     const affirmation = new Affirmation({
//       user: req.user._id,
//       text: req.body.text,
//       category: req.body.category || 'positive',
//       count: 0,
//       targetCount: req.body.targetCount || 33,
//       month,
//     });
//     await affirmation.save();
//     res.status(201).json(affirmation);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Increment count for an affirmation and record the date
// router.put('/increment/:id', async (req, res) => {
//   try {
//     const aff = await Affirmation.findOne({ _id: req.params.id, user: req.user._id });
//     if (!aff) return res.status(404).json({ message: 'Affirmation not found' });
//     aff.count += 1;
//     const today = new Date();
//     today.setHours(0,0,0,0);
//     const alreadyExists = aff.completionDates.some(d => d.toDateString() === today.toDateString());
//     if (!alreadyExists) {
//       aff.completionDates.push(today);
//     }
//     await aff.save();
//     res.json(aff);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Delete an affirmation
// router.delete('/:id', async (req, res) => {
//   try {
//     await Affirmation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get all completion dates for a given year+month
// router.get('/completion-dates/:year/:month', async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const affirmations = await Affirmation.find({
//       user: req.user._id,
//       completionDates: { $gte: start, $lte: end }
//     });
//     const datesSet = new Set();
//     affirmations.forEach(aff => {
//       aff.completionDates.forEach(date => {
//         const d = new Date(date);
//         if (d >= start && d <= end) {
//           datesSet.add(d.toISOString().split('T')[0]);
//         }
//       });
//     });
//     res.json(Array.from(datesSet));
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;







const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Affirmation = require('../models/Affirmation');

router.use(auth);

// Helper: get current year-month string (YYYY-MM)
const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
// Helper: convert date to YYYY-MM-DD (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];
// Helper: get start and end of a given year-month
const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

// Get all affirmations for current month (with pagination)
router.get('/', async (req, res) => {
  try {
    const month = getCurrentMonth();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [affirmations, total] = await Promise.all([
      Affirmation.find({ user: req.user._id, month })
        .skip(skip)
        .limit(limit)
        .select('text category count targetCount completionDates')
        .lean(),
      Affirmation.countDocuments({ user: req.user._id, month })
    ]);

    res.json({
      affirmations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new affirmation
router.post('/', async (req, res) => {
  try {
    const month = getCurrentMonth();
    const affirmation = new Affirmation({
      user: req.user._id,
      text: req.body.text,
      category: req.body.category || 'positive',
      count: 0,
      targetCount: req.body.targetCount || 33,
      month,
    });
    await affirmation.save();
    res.status(201).json(affirmation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment count for an affirmation (atomic, no duplicate date)
router.put('/increment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date();
    const todayStr = toDateStr(today);
    const startOfDay = new Date(todayStr);
    const nextDay = new Date(todayStr);
    nextDay.setDate(nextDay.getDate() + 1);

    // Use atomic update: increment count and add to completionDates only if not already present
    const updated = await Affirmation.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
        completionDates: { $not: { $elemMatch: { $gte: startOfDay, $lt: nextDay } } }
      },
      {
        $inc: { count: 1 },
        $push: { completionDates: today }
      },
      { new: true, lean: true }
    );
    if (!updated) {
      // If already incremented today, just increment count without pushing duplicate
      const justIncremented = await Affirmation.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { $inc: { count: 1 } },
        { new: true, lean: true }
      );
      if (!justIncremented) return res.status(404).json({ message: 'Affirmation not found' });
      return res.json(justIncremented);
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an affirmation
router.delete('/:id', async (req, res) => {
  try {
    const result = await Affirmation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!result) return res.status(404).json({ message: 'Affirmation not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all completion dates for a given year+month (optimized with aggregation)
router.get('/completion-dates/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { start, end } = getMonthRange(parseInt(year), parseInt(month));

    // Use aggregation to extract unique completion dates within the month
    const result = await Affirmation.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: "$completionDates" },
      { $match: { completionDates: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completionDates" } } } },
      { $sort: { _id: 1 } }
    ]);
    const dates = result.map(d => d._id);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 