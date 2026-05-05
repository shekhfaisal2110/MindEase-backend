// // controllers/reactResponseController.js
// const ReactResponse = require('../models/ReactResponse');

// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // Get all entries with pagination
// exports.getAll = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const [entries, total] = await Promise.all([
//       ReactResponse.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('choice situation outcome date emotion')
//         .lean(),
//       ReactResponse.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Monthly summary – aggregation
// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     const summary = await ReactResponse.aggregate([
//       { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//       { $group: { _id: { date: "$date", choice: "$choice" }, count: { $sum: 1 } } },
//       { $group: {
//           _id: "$_id.date",
//           react: { $sum: { $cond: [{ $eq: ["$_id.choice", "react"] }, "$count", 0] } },
//           response: { $sum: { $cond: [{ $eq: ["$_id.choice", "response"] }, "$count", 0] } }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);
//     const result = {};
//     summary.forEach(s => { result[s._id] = { react: s.react, response: s.response }; });
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create new entry
// exports.create = async (req, res) => {
//   try {
//     const { choice, situation, outcome, emotion } = req.body;
//     if (!choice || !['react', 'response'].includes(choice)) {
//       return res.status(400).json({ message: 'Valid choice (react/response) required' });
//     }
//     const entry = new ReactResponse({
//       user: req.user._id,
//       choice,
//       emotion: emotion || 'angry',
//       situation: situation?.trim() || '',
//       outcome: outcome?.trim() || '',
//       date: toDateStr(new Date()), // store as YYYY-MM-DD
//     });
//     await entry.save();
//     res.status(201).json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete entry
// exports.delete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleted = await ReactResponse.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!deleted) return res.status(404).json({ message: 'Entry not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };







// controllers/reactResponseController.js
const ReactResponse = require('../models/ReactResponse');

const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// Get all entries – cursor‑based pagination (no skip/limit)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const result = await ReactResponse.getRecent(req.user._id, limit, cursor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Monthly summary – aggregation with allowDiskUse: false
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthPadded = month.padStart(2, '0');
    const startStr = `${year}-${monthPadded}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${monthPadded}-${endDate.getDate()}`;

    const summary = await ReactResponse.aggregate([
      { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: { date: "$date", choice: "$choice" }, count: { $sum: 1 } } },
      {
        $group: {
          _id: "$_id.date",
          react: { $sum: { $cond: [{ $eq: ["$_id.choice", "react"] }, "$count", 0] } },
          response: { $sum: { $cond: [{ $eq: ["$_id.choice", "response"] }, "$count", 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ], { allowDiskUse: false }).exec();

    const result = {};
    summary.forEach(s => { result[s._id] = { react: s.react, response: s.response }; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new entry – uses model static method
exports.create = async (req, res) => {
  try {
    const { choice, situation, outcome, emotion } = req.body;
    if (!choice || !['react', 'response'].includes(choice)) {
      return res.status(400).json({ message: 'Valid choice (react/response) required' });
    }
    const entry = await ReactResponse.createEntry({
      user: req.user._id,
      choice,
      emotion: emotion || 'angry',
      situation: (situation || '').trim(),
      outcome: (outcome || '').trim(),
      date: toDateStr(new Date()),
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete entry – direct delete with ownership
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ReactResponse.findOneAndDelete({ _id: id, user: req.user._id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};