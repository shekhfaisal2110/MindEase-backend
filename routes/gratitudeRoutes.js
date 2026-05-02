// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const GratitudeEntry = require('../models/GratitudeEntry');

// router.use(auth);

// // Get all gratitude entries (latest first)
// router.get('/', async (req, res) => {
//   try {
//     const entries = await GratitudeEntry.find({ user: req.user._id }).sort({ date: -1 });
//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Create new gratitude entry
// router.post('/', async (req, res) => {
//   try {
//     const entry = new GratitudeEntry({
//       user: req.user._id,
//       people: req.body.people,
//       things: req.body.things,
//       situations: req.body.situations,
//       notes: req.body.notes,
//     });
//     await entry.save();
//     res.status(201).json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Delete an entry
// router.delete('/:id', async (req, res) => {
//   try {
//     await GratitudeEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // NEW: Get completion dates for a given year+month (unique days with entries)
// router.get('/completion-dates/:year/:month', async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const entries = await GratitudeEntry.find({
//       user: req.user._id,
//       date: { $gte: start, $lte: end }
//     }).select('date');
//     const uniqueDates = new Set();
//     entries.forEach(entry => {
//       const dateStr = entry.date.toISOString().split('T')[0];
//       uniqueDates.add(dateStr);
//     });
//     res.json(Array.from(uniqueDates));
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // NEW: Get total unique days with entries (for progress bar)
// router.get('/stats', async (req, res) => {
//   try {
//     const entries = await GratitudeEntry.find({ user: req.user._id }).select('date');
//     const uniqueDays = new Set();
//     entries.forEach(entry => {
//       const dateStr = entry.date.toISOString().split('T')[0];
//       uniqueDays.add(dateStr);
//     });
//     res.json({ totalUniqueDays: uniqueDays.size });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;



// routes/gratitudeRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gratitudeController = require('../controllers/gratitudeController');

router.use(auth);
router.get('/', gratitudeController.getAll);
router.post('/', gratitudeController.create);
router.delete('/:id', gratitudeController.delete);
router.get('/completion-dates/:year/:month', gratitudeController.getCompletionDates);
router.get('/stats', gratitudeController.getStats);

module.exports = router;