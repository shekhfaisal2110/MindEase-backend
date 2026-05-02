// controllers/dailyEmotionalTrackingController.js
const DailyEmotionalTracking = require('../models/DailyEmotionalTracking');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// Helper: allowed fields for update (to prevent mass assignment)
const ALLOWED_FIELDS = [
  'silenceCompleted',
  'affirmationCompleted',
  'happinessCompleted',
  'exerciseCompleted',
  'readingCompleted',
  'journalingCompleted',
  'affirmationText',
  'journalingText',
  'notes'
];

// Update tracking for any specific date (atomic upsert)
exports.updateTracking = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const track = await DailyEmotionalTracking.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      { $set: updateData },
      { new: true, upsert: true, lean: true }
    );
    res.json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get tracking for a specific date (returns default if not exists)
exports.getTracking = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    let track = await DailyEmotionalTracking.findOne(
      { user: req.user._id, date: dateStr },
      { _id: 1, date: 1, ...ALLOWED_FIELDS.reduce((a, f) => ({ ...a, [f]: 1 }), {}) }
    ).lean();
    if (!track) {
      // Return default empty record
     track = { date: dateStr, ...Object.fromEntries(ALLOWED_FIELDS.map(f => [f, false])) };
    }
    res.json(track);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get today's tracking (uses same update & get logic)
exports.getTodayTracking = async (req, res) => {
  const today = toDateStr(new Date());
  req.params.date = today;
  return exports.getTracking(req, res);
};

exports.updateTodayTracking = async (req, res) => {
  const today = toDateStr(new Date());
  req.params.date = today;
  return exports.updateTracking(req, res);
};

// Get all tracks (with pagination)
exports.getAllTracks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [tracks, total] = await Promise.all([
      DailyEmotionalTracking.find({ user: req.user._id })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .select('date silenceCompleted happinessCompleted affirmationCompleted exerciseCompleted readingCompleted journalingCompleted')
        .lean(),
      DailyEmotionalTracking.countDocuments({ user: req.user._id })
    ]);

    res.json({
      tracks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};