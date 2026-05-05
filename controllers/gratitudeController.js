// const GratitudeEntry = require('../models/GratitudeEntry');

// // Helper: get today's date as YYYY-MM-DD (UTC)
// const getTodayStr = () => new Date().toISOString().split('T')[0];

// // Get all entries with pagination
// exports.getAll = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const [entries, total] = await Promise.all([
//       GratitudeEntry.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('people things situations notes date')
//         .lean(),
//       GratitudeEntry.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create new entry – with strong input validation
// exports.create = async (req, res) => {
//   try {
//     // Ensure req.body contains strings, not functions or objects
//     let { people, things, situations, notes } = req.body;

//     // Guard against non‑string or accidentally passed function code
//     if (typeof people !== 'string') people = '';
//     if (typeof things !== 'string') things = '';
//     if (typeof situations !== 'string') situations = '';
//     if (typeof notes !== 'string') notes = '';

//     // Trim and limit length
//     people = people.trim().slice(0, 500);
//     things = things.trim().slice(0, 500);
//     situations = situations.trim().slice(0, 500);
//     notes = notes.trim().slice(0, 1000);

//     if (!people && !things && !situations && !notes) {
//       return res.status(400).json({ message: 'At least one field is required' });
//     }

//     const entry = new GratitudeEntry({
//       user: req.user._id,
//       people,
//       things,
//       situations,
//       notes,
//       // date is automatically set by model default
//     });
//     await entry.save();
//     res.status(201).json(entry);
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ message: 'You already have a gratitude entry for today.' });
//     }
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete entry
// exports.delete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleted = await GratitudeEntry.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!deleted) return res.status(404).json({ message: 'Entry not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get unique completion dates for a given month
// exports.getCompletionDates = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     const result = await GratitudeEntry.aggregate([
//       { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//       { $group: { _id: "$date" } },
//       { $sort: { _id: 1 } }
//     ]);
//     const dates = result.map(d => d._id);
//     res.json(dates);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get total unique days with entries
// exports.getStats = async (req, res) => {
//   try {
//     const result = await GratitudeEntry.aggregate([
//       { $match: { user: req.user._id } },
//       { $group: { _id: "$date" } },
//       { $count: "totalUniqueDays" }
//     ]);
//     const totalUniqueDays = result.length ? result[0].totalUniqueDays : 0;
//     res.json({ totalUniqueDays });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





const GratitudeEntry = require('../models/GratitudeEntry');

// Helper: get today's date as YYYY-MM-DD (UTC)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Get all entries with cursor‑based pagination (no skip/limit)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const result = await GratitudeEntry.getPaginatedEntries(req.user._id, limit, cursor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get today's entry (if exists)
exports.getToday = async (req, res) => {
  try {
    const entry = await GratitudeEntry.getToday(req.user._id);
    res.json(entry || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new entry for today – only one per day (unique index)
// Returns error if entry already exists for today.
exports.create = async (req, res) => {
  try {
    const { people, things, situations, notes } = req.body;
    // Input sanitisation
    const sanitise = (val) => (typeof val === 'string' ? val.trim().slice(0, 500) : '');
    const peopleClean = sanitise(people);
    const thingsClean = sanitise(things);
    const situationsClean = sanitise(situations);
    const notesClean = (typeof notes === 'string' ? notes.trim().slice(0, 1000) : '');

    if (!peopleClean && !thingsClean && !situationsClean && !notesClean) {
      return res.status(400).json({ message: 'At least one field is required' });
    }

    // Use static method to create (atomic, lean)
    const entry = await GratitudeEntry.create({
      user: req.user._id,
      people: peopleClean,
      things: thingsClean,
      situations: situationsClean,
      notes: notesClean,
    });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already have a gratitude entry for today.' });
    }
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Update today's entry (atomic upsert) – replaces existing or creates new
exports.updateToday = async (req, res) => {
  try {
    const { people, things, situations, notes } = req.body;
    const data = {};
    if (people !== undefined) data.people = typeof people === 'string' ? people.trim().slice(0, 500) : '';
    if (things !== undefined) data.things = typeof things === 'string' ? things.trim().slice(0, 500) : '';
    if (situations !== undefined) data.situations = typeof situations === 'string' ? situations.trim().slice(0, 500) : '';
    if (notes !== undefined) data.notes = typeof notes === 'string' ? notes.trim().slice(0, 1000) : '';

    const updated = await GratitudeEntry.upsertToday(req.user._id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Delete entry by ID
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    // Using model's static deleteByDate is not suitable; we need deleteById with user check.
    const deleted = await GratitudeEntry.findOneAndDelete({ _id: id, user: req.user._id }).lean();
    if (!deleted) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get unique completion dates for a given month (YYYY, MM) – aggregation on date string
exports.getCompletionDates = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthPadded = month.padStart(2, '0');
    const startStr = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${monthPadded}-${lastDay}`;

    const dates = await GratitudeEntry.aggregate([
      { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
      { $group: { _id: "$date" } },
      { $sort: { _id: 1 } }
    ], { allowDiskUse: false }).exec();
    res.json(dates.map(d => d._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get total unique days with entries (all‑time count)
exports.getStats = async (req, res) => {
  try {
    const result = await GratitudeEntry.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$date" } },
      { $count: "totalUniqueDays" }
    ], { allowDiskUse: false }).exec();
    const totalUniqueDays = result[0]?.totalUniqueDays || 0;
    res.json({ totalUniqueDays });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};