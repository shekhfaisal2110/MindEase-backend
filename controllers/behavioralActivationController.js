// const BehavioralTask = require('../models/BehavioralTask');

// // Helper: get current date string YYYY-MM-DD
// const getTodayStr = () => new Date().toISOString().split('T')[0];

// // GET tasks for a specific date (default today) – paginated
// exports.getTasks = async (req, res) => {
//   try {
//     const { date = getTodayStr(), page = 1, limit = 20 } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const filter = { user: req.user._id, scheduledFor: date };
//     const [tasks, total] = await Promise.all([
//       BehavioralTask.find(filter)
//         .select('title category estimatedMinutes difficulty status moodBefore moodAfter note')
//         .sort({ createdAt: 1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean(),
//       BehavioralTask.countDocuments(filter)
//     ]);
//     res.json({ tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // POST – create a new task
// exports.createTask = async (req, res) => {
//   try {
//     const { title, category, estimatedMinutes, difficulty, scheduledFor } = req.body;
//     if (!title || !category || !scheduledFor) {
//       return res.status(400).json({ message: 'Title, category, and scheduled date required' });
//     }
//     const task = new BehavioralTask({
//       user: req.user._id,
//       title: title.trim(),
//       category,
//       estimatedMinutes: estimatedMinutes || 15,
//       difficulty: difficulty || 'easy',
//       scheduledFor,
//       status: 'planned'
//     });
//     await task.save();
//     res.status(201).json(task);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // PATCH – complete a task (with moodBefore, moodAfter, note)
// exports.completeTask = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { moodBefore, moodAfter, note } = req.body;
//     const update = { status: 'completed' };
//     if (moodBefore !== undefined) update.moodBefore = moodBefore;
//     if (moodAfter !== undefined) update.moodAfter = moodAfter;
//     if (note) update.note = note.trim();
//     const task = await BehavioralTask.findOneAndUpdate(
//       { _id: id, user: req.user._id, status: 'planned' },
//       { $set: update },
//       { new: true, lean: true }
//     );
//     if (!task) return res.status(404).json({ message: 'Task not found or already completed/skipped' });
//     res.json(task);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // PATCH – skip a task
// exports.skipTask = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const task = await BehavioralTask.findOneAndUpdate(
//       { _id: id, user: req.user._id, status: 'planned' },
//       { $set: { status: 'skipped' } },
//       { new: true, lean: true }
//     );
//     if (!task) return res.status(404).json({ message: 'Task not found or already completed/skipped' });
//     res.json(task);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET weekly insights (mock – could be replaced with real aggregation)
// exports.getWeeklyInsights = async (req, res) => {
//   try {
//     // For demo, return static insights; in production, aggregate from last 7 days
//     const userId = req.user._id;
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - 6);
//     const startStr = startDate.toISOString().split('T')[0];
//     const tasks = await BehavioralTask.find({
//       user: userId,
//       scheduledFor: { $gte: startStr },
//       status: 'completed'
//     }).select('category moodAfter').lean();
    
//     // Simple mock insights if no data
//     const insights = [
//       { text: "On days you completed movement tasks, your mood was often better.", type: "movement" },
//       { text: "Social tasks improved your mood the most this week.", type: "social" },
//       { text: "You completed more tasks in the evening – that's a great pattern.", type: "timing" }
//     ];
//     res.json(insights);
//   } catch (err) {
//     // fallback to static insights
//     res.json([
//       { text: "Showing up matters, even when it's hard.", type: "general" },
//       { text: "Small progress is still progress.", type: "general" },
//       { text: "Consistency beats intensity. Keep going.", type: "general" }
//     ]);
//   }
// };

// // GET tasks for a specific month (YYYY-MM)
// exports.getMonthHistory = async (req, res) => {
//   try {
//     const { month } = req.query; // format: YYYY-MM
//     if (!month) return res.status(400).json({ message: 'Month required (YYYY-MM)' });
//     const [year, monthNum] = month.split('-');
//     const startDate = `${year}-${monthNum}-01`;
//     const lastDay = new Date(year, monthNum, 0).getDate();
//     const endDate = `${year}-${monthNum}-${lastDay}`;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const filter = { user: req.user._id, scheduledFor: { $gte: startDate, $lte: endDate } };
//     const [tasks, total] = await Promise.all([
//       BehavioralTask.find(filter)
//         .select('title category status estimatedMinutes difficulty moodBefore moodAfter note scheduledFor')
//         .sort({ scheduledFor: -1, createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       BehavioralTask.countDocuments(filter)
//     ]);
//     res.json({ tasks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





const BehavioralTask = require('../models/BehavioralTask');

// Helper: get today's date string (YYYY-MM-DD)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// GET tasks for a specific date – cursor‑based pagination (no skip)
exports.getTasks = async (req, res) => {
  try {
    const { date = getTodayStr(), limit = 20, cursor } = req.query;
    const userId = req.user._id;
    const result = await BehavioralTask.getTasksForDate(userId, date, null, parseInt(limit), cursor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST – create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, category, estimatedMinutes, difficulty, scheduledFor } = req.body;
    if (!title || !category || !scheduledFor) {
      return res.status(400).json({ message: 'Title, category, and scheduled date required' });
    }
    const task = await BehavioralTask.createTask({
      user: req.user._id,
      title: title.trim(),
      category,
      estimatedMinutes: estimatedMinutes || 15,
      difficulty: difficulty || 'easy',
      scheduledFor,
      status: 'planned'
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH – complete a task (atomic update)
exports.completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { moodBefore, moodAfter, note } = req.body;
    const additionalData = {};
    if (moodBefore !== undefined) additionalData.moodBefore = moodBefore;
    if (moodAfter !== undefined) additionalData.moodAfter = moodAfter;
    if (note) additionalData.note = note.trim();
    const task = await BehavioralTask.updateStatus(id, req.user._id, 'completed', additionalData);
    if (!task) return res.status(404).json({ message: 'Task not found or already completed/skipped' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH – skip a task (atomic)
exports.skipTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await BehavioralTask.updateStatus(id, req.user._id, 'skipped');
    if (!task) return res.status(404).json({ message: 'Task not found or already completed/skipped' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET weekly insights – aggregation‑based, realistic
exports.getWeeklyInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = getTodayStr();

    const summary = await BehavioralTask.getCompletionSummary(userId, startStr, endStr);
    // Build insights based on actual data
    const insights = [];
    if (summary && summary.length > 0) {
      // Count completions per category – simplified example
      const completions = await BehavioralTask.aggregate([
        { $match: { user: userId, scheduledFor: { $gte: startStr, $lte: endStr }, status: 'completed' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]).exec();
      if (completions.length > 0 && completions[0].count > 0) {
        insights.push({ text: `Your most completed category this week was ${completions[0]._id} (${completions[0].count} times).`, type: completions[0]._id });
      } else {
        insights.push({ text: "You haven't completed any tasks this week – start small today!", type: "general" });
      }
    } else {
      insights.push({ text: "You haven't completed any tasks this week – start small today!", type: "general" });
    }
    // Additional static insight for motivation
    insights.push({ text: "Consistency beats intensity. Keep going!", type: "general" });
    res.json(insights);
  } catch (err) {
    // fallback to static insights
    res.json([
      { text: "Showing up matters, even when it's hard.", type: "general" },
      { text: "Small progress is still progress.", type: "general" },
      { text: "Consistency beats intensity. Keep going!", type: "general" }
    ]);
  }
};

// GET tasks for a specific month (YYYY-MM) – cursor pagination on date
exports.getMonthHistory = async (req, res) => {
  try {
    const { month, limit = 20, cursor } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ message: 'Month required (YYYY-MM)' });
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${monthNum}-${lastDay}`;
    const userId = req.user._id;
    const query = {
      user: userId,
      scheduledFor: { $gte: startDate, $lte: endDate }
    };
    if (cursor) {
      // cursor is the last `_id` from previous page (because sorted by scheduledFor descending, _id descending)
      query._id = { $lt: cursor };
    }
    const tasks = await BehavioralTask.find(query)
      .sort({ scheduledFor: -1, _id: -1 })
      .limit(parseInt(limit))
      .select('title category status estimatedMinutes difficulty moodBefore moodAfter note scheduledFor')
      .lean();
    const nextCursor = tasks.length === parseInt(limit) ? tasks[tasks.length - 1]._id : null;
    // Optionally, we could return total count but it's not needed for infinite scroll.
    // For completeness, we can include a total only if really needed – but it would require a separate count.
    // We'll omit total for speed; frontend can rely on hasMore.
    res.json({ tasks, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};