// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');

// router.use(auth);

// // PUT /date/:date - Update tracking for any specific date
// router.put('/date/:date', async (req, res) => {
//   try {
//     const date = new Date(req.params.date);
//     date.setHours(0, 0, 0, 0);
//     const track = await DailyEmotionalTracking.findOneAndUpdate(
//       { user: req.user._id, date },
//       {
//         silenceCompleted: req.body.silenceCompleted,
//         affirmationCompleted: req.body.affirmationCompleted,
//         happinessCompleted: req.body.happinessCompleted,
//         exerciseCompleted: req.body.exerciseCompleted,
//         readingCompleted: req.body.readingCompleted,
//         journalingCompleted: req.body.journalingCompleted,
//         affirmationText: req.body.affirmationText,
//         journalingText: req.body.journalingText,
//         notes: req.body.notes,
//       },
//       { new: true, upsert: true }
//     );
//     res.json(track);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get today's tracking
// router.get('/today', async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     let track = await DailyEmotionalTracking.findOne({ user: req.user._id, date: today });
//     if (!track) {
//       track = new DailyEmotionalTracking({ user: req.user._id, date: today });
//       await track.save();
//     }
//     res.json(track);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Update today's tracking
// router.put('/today', async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const track = await DailyEmotionalTracking.findOneAndUpdate(
//       { user: req.user._id, date: today },
//       {
//         silenceCompleted: req.body.silenceCompleted,
//         affirmationCompleted: req.body.affirmationCompleted,
//         happinessCompleted: req.body.happinessCompleted,
//         exerciseCompleted: req.body.exerciseCompleted,
//         readingCompleted: req.body.readingCompleted,
//         journalingCompleted: req.body.journalingCompleted,
//         affirmationText: req.body.affirmationText,
//         journalingText: req.body.journalingText,
//         notes: req.body.notes,
//       },
//       { new: true, upsert: true }
//     );
//     res.json(track);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get history for calendar (all tracks for user)
// router.get('/all', async (req, res) => {
//   try {
//     const tracks = await DailyEmotionalTracking.find({ user: req.user._id }).sort({ date: -1 });
//     res.json(tracks);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Get specific date track
// router.get('/date/:date', async (req, res) => {
//   try {
//     const date = new Date(req.params.date);
//     date.setHours(0, 0, 0, 0);
//     const track = await DailyEmotionalTracking.findOne({ user: req.user._id, date });
//     res.json(track);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;



// routes/dailyEmotionalTrackingRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const trackingController = require('../controllers/dailyEmotionalTrackingController');

router.use(auth);

router.get('/all', trackingController.getAllTracks);
router.get('/today', trackingController.getTodayTracking);
router.put('/today', trackingController.updateTodayTracking);
router.get('/date/:date', trackingController.getTracking);
router.put('/date/:date', trackingController.updateTracking);

module.exports = router;