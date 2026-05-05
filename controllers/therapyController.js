// // controllers/therapyController.js
// const TherapyExercise = require('../models/TherapyExercise');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// const ALLOWED_TYPES = ['hotpotato', 'forgiveness', 'selftalk', 'receiving'];

// // Get all exercises with pagination
// exports.getAll = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const [exercises, total] = await Promise.all([
//       TherapyExercise.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('type content count completed date repetitionDates')
//         .lean(),
//       TherapyExercise.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ exercises, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create a new therapy exercise
// exports.create = async (req, res) => {
//   try {
//     const { type, content } = req.body;
//     if (!type || !ALLOWED_TYPES.includes(type)) {
//       return res.status(400).json({ message: 'Valid exercise type required' });
//     }
//     if (!content || content.trim().length === 0) {
//       return res.status(400).json({ message: 'Content required' });
//     }
//     const exercise = new TherapyExercise({
//       user: req.user._id,
//       type,
//       content: content.trim(),
//       date: toDateStr(new Date()), // store as YYYY-MM-DD
//     });
//     await exercise.save();
//     res.status(201).json(exercise);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Increment repetition count for an exercise (atomic, no duplicate day)
// exports.increment = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const todayStr = toDateStr(new Date());

//     // Use $addToSet to avoid duplicate dates, and $inc to increment count
//     const updated = await TherapyExercise.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       {
//         $inc: { count: 1 },
//         $addToSet: { repetitionDates: todayStr }
//       },
//       { new: true, lean: true }
//     );
//     if (!updated) return res.status(404).json({ message: 'Exercise not found' });
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Mark exercise as completed (optional)
// exports.complete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updated = await TherapyExercise.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { $set: { completed: true } },
//       { new: true, lean: true }
//     );
//     if (!updated) return res.status(404).json({ message: 'Exercise not found' });
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete an exercise
// exports.delete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleted = await TherapyExercise.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!deleted) return res.status(404).json({ message: 'Exercise not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get total reps and unique days (stats) – using aggregation
// exports.getStats = async (req, res) => {
//   try {
//     const [totalRepsResult, uniqueDaysResult] = await Promise.all([
//       TherapyExercise.aggregate([
//         { $match: { user: req.user._id } },
//         { $group: { _id: null, total: { $sum: "$count" } } }
//       ]),
//       TherapyExercise.aggregate([
//         { $match: { user: req.user._id } },
//         { $unwind: "$repetitionDates" },
//         { $group: { _id: "$repetitionDates" } },
//         { $count: "unique" }
//       ])
//     ]);
//     const totalReps = totalRepsResult[0]?.total || 0;
//     const uniqueDays = uniqueDaysResult[0]?.unique || 0;
//     res.json({ totalReps, uniqueDays });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get repetition dates for a month (calendar) – aggregation
// exports.getCompletionDates = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     const result = await TherapyExercise.aggregate([
//       { $match: { user: req.user._id } },
//       { $unwind: "$repetitionDates" },
//       { $match: { repetitionDates: { $gte: startStr, $lte: endStr } } },
//       { $group: { _id: "$repetitionDates" } },
//       { $sort: { _id: 1 } }
//     ]);
//     const dates = result.map(d => d._id);
//     res.json(dates);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get exercises created on a specific date
// exports.getByDate = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     const exercises = await TherapyExercise.find({
//       user: req.user._id,
//       date: dateStr
//     }).select('type content count').lean();
//     res.json(exercises);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



// controllers/therapyController.js
const TherapyExercise = require('../models/TherapyExercise');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

const ALLOWED_TYPES = ['hotpotato', 'forgiveness', 'selftalk', 'receiving'];

// Get all exercises with cursor‑based pagination (no skip/limit)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null; // last document _id from previous page
    const query = { user: req.user._id };
    if (cursor) query._id = { $lt: cursor }; // because sorted by date desc, _id desc

    const exercises = await TherapyExercise.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .select('type content count completed date repetitionDates')
      .lean();

    const nextCursor = exercises.length === limit ? exercises[exercises.length - 1]._id : null;
    res.json({ exercises, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new therapy exercise – uses model's static createExercise (but not present; we create manually)
exports.create = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Valid exercise type required' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Content required' });
    }
    const exercise = new TherapyExercise({
      user: req.user._id,
      type,
      content: content.trim(),
      date: toDateStr(new Date()),
    });
    await exercise.save();
    res.status(201).json(exercise.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Increment repetition count for an exercise (atomic, no duplicate day) – uses model static
exports.increment = async (req, res) => {
  try {
    const { id } = req.params;
    const todayStr = toDateStr(new Date());
    const updated = await TherapyExercise.findOneAndUpdate(
      { _id: id, user: req.user._id },
      {
        $inc: { count: 1 },
        $addToSet: { repetitionDates: todayStr }
      },
      { new: true, lean: true, runValidators: false }
    );
    if (!updated) return res.status(404).json({ message: 'Exercise not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark exercise as completed (optional) – atomic
exports.complete = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await TherapyExercise.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { completed: true } },
      { new: true, lean: true, runValidators: false }
    );
    if (!updated) return res.status(404).json({ message: 'Exercise not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete an exercise
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TherapyExercise.findOneAndDelete({ _id: id, user: req.user._id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Exercise not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get total reps and unique days (stats) – optimized aggregation with allowDiskUse:false
exports.getStats = async (req, res) => {
  try {
    const [totalRepsResult, uniqueDaysResult] = await Promise.all([
      TherapyExercise.aggregate([
        { $match: { user: req.user._id } },
        { $group: { _id: null, total: { $sum: "$count" } } }
      ], { allowDiskUse: false }),
      TherapyExercise.aggregate([
        { $match: { user: req.user._id } },
        { $unwind: "$repetitionDates" },
        { $group: { _id: "$repetitionDates" } },
        { $count: "unique" }
      ], { allowDiskUse: false })
    ]);
    const totalReps = totalRepsResult[0]?.total || 0;
    const uniqueDays = uniqueDaysResult[0]?.unique || 0;
    res.json({ totalReps, uniqueDays });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get repetition dates for a month (calendar) – aggregation
exports.getCompletionDates = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthPadded = month.padStart(2, '0');
    const startStr = `${year}-${monthPadded}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${monthPadded}-${endDate.getDate()}`;

    const result = await TherapyExercise.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: "$repetitionDates" },
      { $match: { repetitionDates: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: "$repetitionDates" } },
      { $sort: { _id: 1 } }
    ], { allowDiskUse: false }).exec();
    const dates = result.map(d => d._id);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get exercises created on a specific date – lean, projection
exports.getByDate = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const exercises = await TherapyExercise.find({
      user: req.user._id,
      date: dateStr
    }).select('type content count').lean();
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};