// // controllers/dailyEmotionalTrackingController.js
// const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // Helper: allowed fields for update (to prevent mass assignment)
// const ALLOWED_FIELDS = [
//   'silenceCompleted',
//   'affirmationCompleted',
//   'happinessCompleted',
//   'exerciseCompleted',
//   'readingCompleted',
//   'journalingCompleted',
//   'affirmationText',
//   'journalingText',
//   'notes'
// ];

// // Update tracking for any specific date (atomic upsert)
// exports.updateTracking = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     const updateData = {};
//     for (const field of ALLOWED_FIELDS) {
//       if (req.body[field] !== undefined) {
//         updateData[field] = req.body[field];
//       }
//     }
//     if (Object.keys(updateData).length === 0) {
//       return res.status(400).json({ message: 'No valid fields to update' });
//     }

//     const track = await DailyEmotionalTracking.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: updateData },
//       { new: true, upsert: true, lean: true }
//     );
//     res.json(track);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get tracking for a specific date (returns default if not exists)
// exports.getTracking = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     let track = await DailyEmotionalTracking.findOne(
//       { user: req.user._id, date: dateStr },
//       { _id: 1, date: 1, ...ALLOWED_FIELDS.reduce((a, f) => ({ ...a, [f]: 1 }), {}) }
//     ).lean();
//     if (!track) {
//       // Return default empty record
//      track = { date: dateStr, ...Object.fromEntries(ALLOWED_FIELDS.map(f => [f, false])) };
//     }
//     res.json(track);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get today's tracking (uses same update & get logic)
// exports.getTodayTracking = async (req, res) => {
//   const today = toDateStr(new Date());
//   req.params.date = today;
//   return exports.getTracking(req, res);
// };

// exports.updateTodayTracking = async (req, res) => {
//   const today = toDateStr(new Date());
//   req.params.date = today;
//   return exports.updateTracking(req, res);
// };

// // Get all tracks (with pagination)
// exports.getAllTracks = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 30;
//     const skip = (page - 1) * limit;

//     const [tracks, total] = await Promise.all([
//       DailyEmotionalTracking.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('date silenceCompleted happinessCompleted affirmationCompleted exerciseCompleted readingCompleted journalingCompleted')
//         .lean(),
//       DailyEmotionalTracking.countDocuments({ user: req.user._id })
//     ]);

//     res.json({
//       tracks,
//       pagination: { page, limit, total, pages: Math.ceil(total / limit) }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };






// controllers/dailyEmotionalTrackingController.js
const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// Allowed boolean activity names
const ACTIVITY_NAMES = ['silence', 'affirmation', 'happiness', 'exercise', 'reading', 'journaling'];

// Allowed text fields
const TEXT_FIELDS = ['affirmationText', 'journalingText', 'notes'];

// Update tracking for any specific date (atomic, using model static methods)
exports.updateTracking = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const userId = req.user._id;
    const updateData = {};
    for (const field of TEXT_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    // Update text fields if any
    if (Object.keys(updateData).length > 0) {
      await DailyEmotionalTracking.updateTexts(userId, dateStr, updateData);
    }
    // Update each activity boolean individually (atomic toggle/set)
    for (const activity of ACTIVITY_NAMES) {
      const key = `${activity}Completed`;
      if (req.body[key] !== undefined) {
        await DailyEmotionalTracking.setActivity(userId, dateStr, activity, req.body[key]);
      }
    }
    // Return final document (lean)
    const finalDoc = await DailyEmotionalTracking.getByDate(userId, dateStr, false);
    res.json(finalDoc || { date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get tracking for a specific date (lean, with projection)
exports.getTracking = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const track = await DailyEmotionalTracking.getByDate(req.user._id, dateStr, false);
    if (!track) {
      // Return default structure
      const defaultObj = { date: dateStr };
      for (const a of ACTIVITY_NAMES) defaultObj[`${a}Completed`] = false;
      for (const t of TEXT_FIELDS) defaultObj[t] = '';
      return res.json(defaultObj);
    }
    // Convert activities from nested object to flat fields for backward compatibility
    const result = { date: track.date };
    for (const a of ACTIVITY_NAMES) {
      result[`${a}Completed`] = track.activities?.[a] ?? false;
    }
    for (const t of TEXT_FIELDS) {
      result[t] = track[t] || '';
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get today's tracking (alias)
exports.getTodayTracking = async (req, res) => {
  const today = toDateStr(new Date());
  req.params.date = today;
  return exports.getTracking(req, res);
};

// Update today's tracking (alias)
exports.updateTodayTracking = async (req, res) => {
  const today = toDateStr(new Date());
  req.params.date = today;
  return exports.updateTracking(req, res);
};

// Get all tracks with cursor‑based pagination (no skip)
exports.getAllTracks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const cursor = req.query.cursor || null; // last document _id from previous page
    const query = { user: req.user._id };
    if (cursor) query._id = { $lt: cursor }; // because sorted by date desc, _id desc

    const tracks = await DailyEmotionalTracking.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .select('date activities silenceCompleted affirmationCompleted happinessCompleted exerciseCompleted readingCompleted journalingCompleted')
      .lean();

    // Transform activities to flat structure
    const formatted = tracks.map(t => {
      const flat = { date: t.date };
      for (const a of ACTIVITY_NAMES) {
        flat[`${a}Completed`] = t.activities?.[a] ?? false;
      }
      return flat;
    });

    const nextCursor = tracks.length === limit ? tracks[tracks.length - 1]._id : null;
    res.json({ tracks: formatted, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};