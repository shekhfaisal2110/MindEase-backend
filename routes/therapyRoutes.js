// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const TherapyExercise = require('../models/TherapyExercise');

// router.use(auth);

// // Get all therapy exercises
// router.get('/', async (req, res) => {
//   try {
//     const exercises = await TherapyExercise.find({ user: req.user._id }).sort({ date: -1 });
//     res.json(exercises);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Create a new therapy exercise
// router.post('/', async (req, res) => {
//   try {
//     const exercise = new TherapyExercise({
//       user: req.user._id,
//       type: req.body.type,
//       content: req.body.content,
//     });
//     await exercise.save();
//     res.status(201).json(exercise);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Increment repetition count for an exercise
// router.post('/increment/:id', async (req, res) => {
//   try {
//     const exercise = await TherapyExercise.findOne({ _id: req.params.id, user: req.user._id });
//     if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
//     exercise.count += 1;
//     const today = new Date();
//     today.setHours(0,0,0,0);
//     // Add today's date to repetitionDates (only once per day)
//     const alreadyToday = exercise.repetitionDates.some(d => d.toDateString() === today.toDateString());
//     if (!alreadyToday) {
//       exercise.repetitionDates.push(today);
//     }
//     await exercise.save();
//     res.json(exercise);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Mark exercise as completed (optional – keep for backward compatibility)
// router.put('/complete/:id', async (req, res) => {
//   try {
//     const exercise = await TherapyExercise.findOne({ _id: req.params.id, user: req.user._id });
//     if (!exercise) return res.status(404).json({ message: 'Not found' });
//     exercise.completed = true;
//     await exercise.save();
//     res.json(exercise);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Delete an exercise
// router.delete('/:id', async (req, res) => {
//   try {
//     await TherapyExercise.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get total repetitions (stats)
// router.get('/stats', async (req, res) => {
//   try {
//     const exercises = await TherapyExercise.find({ user: req.user._id }).select('count');
//     const totalReps = exercises.reduce((sum, ex) => sum + ex.count, 0);
//     // Optional: also return unique days count (for calendar)
//     const allRepDates = await TherapyExercise.find({ user: req.user._id }).select('repetitionDates');
//     const uniqueDays = new Set();
//     allRepDates.forEach(ex => {
//       ex.repetitionDates.forEach(date => {
//         uniqueDays.add(date.toISOString().split('T')[0]);
//       });
//     });
//     res.json({ totalReps, uniqueDays: uniqueDays.size });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get repetition dates for calendar
// router.get('/completion-dates/:year/:month', async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const exercises = await TherapyExercise.find({
//       user: req.user._id,
//       repetitionDates: { $gte: start, $lte: end }
//     }).select('repetitionDates');
//     const datesSet = new Set();
//     exercises.forEach(ex => {
//       ex.repetitionDates.forEach(date => {
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

// router.get('/exercises/:date', async (req, res) => {
//   try {
//     const targetDate = new Date(req.params.date);
//     const start = new Date(targetDate);
//     start.setHours(0,0,0,0);
//     const end = new Date(targetDate);
//     end.setHours(23,59,59,999);
//     const exercises = await TherapyExercise.find({
//       user: req.user._id,
//       createdAt: { $gte: start, $lte: end }  // or `date` field
//     }).select('type content count createdAt');
//     res.json(exercises);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });




// routes/therapyRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const therapyController = require('../controllers/therapyController');

router.use(auth);
router.get('/', therapyController.getAll);
router.post('/', therapyController.create);
router.post('/increment/:id', therapyController.increment);
router.put('/complete/:id', therapyController.complete);
router.delete('/:id', therapyController.delete);
router.get('/stats', therapyController.getStats);
router.get('/completion-dates/:year/:month', therapyController.getCompletionDates);
router.get('/exercises/:date', therapyController.getByDate);

module.exports = router;