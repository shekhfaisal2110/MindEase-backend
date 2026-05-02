// const Person = require('../models/Person');
// const TimeEntry = require('../models/TimeEntry');

// // ---------- Person CRUD ----------
// exports.getPeople = async (req, res) => {
//   try {
//     const people = await Person.find({ user: req.user._id }).sort({ type: 1, name: 1 });
//     res.json(people);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addPerson = async (req, res) => {
//   try {
//     const { name, type } = req.body;
//     const person = new Person({ user: req.user._id, name, type });
//     await person.save();
//     res.status(201).json(person);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.editPerson = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, type } = req.body;
//     const person = await Person.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { name, type },
//       { new: true }
//     );
//     if (!person) return res.status(404).json({ message: 'Person not found' });
//     res.json(person);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deletePerson = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const person = await Person.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!person) return res.status(404).json({ message: 'Person not found' });
//     // Also delete all time entries for this person
//     await TimeEntry.deleteMany({ person: id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Time Entry CRUD ----------
// exports.getEntriesForDate = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const entries = await TimeEntry.find({ user: req.user._id, date: targetDate })
//       .populate('person', 'name type');
//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addTimeEntry = async (req, res) => {
//   try {
//     const { personId, date, duration, notes } = req.body;
//     const targetDate = new Date(date);
//     targetDate.setHours(0, 0, 0, 0);
//     const entry = await TimeEntry.findOneAndUpdate(
//       { user: req.user._id, person: personId, date: targetDate },
//       { duration, notes },
//       { upsert: true, new: true }
//     ).populate('person', 'name type');
//     res.status(201).json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     const entries = await TimeEntry.find({
//       user: req.user._id,
//       date: { $gte: start, $lte: end }
//     }).populate('person', 'name type');
    
//     // Group by person
//     const summary = {};
//     entries.forEach(entry => {
//       const personName = entry.person.name;
//       if (!summary[personName]) summary[personName] = 0;
//       summary[personName] += entry.duration;
//     });
//     res.json(summary);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getAllEntries = async (req, res) => {
//   try {
//     const entries = await TimeEntry.find({ user: req.user._id })
//       .populate('person', 'name type')
//       .sort({ date: -1 });
//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
// // Update a time entry
// exports.updateTimeEntry = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { duration, notes } = req.body;
//     const entry = await TimeEntry.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { duration, notes },
//       { new: true }
//     ).populate('person', 'name type');
//     if (!entry) return res.status(404).json({ message: 'Entry not found' });
//     res.json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete a time entry
// exports.deleteTimeEntry = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const entry = await TimeEntry.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!entry) return res.status(404).json({ message: 'Entry not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



const Person = require('../models/Person');
const TimeEntry = require('../models/TimeEntry');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// ---------- Person CRUD (no major changes, but add validation) ----------
exports.getPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id })
      .sort({ type: 1, name: 1 })
      .select('name type')
      .lean();
    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPerson = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type required' });
    const person = new Person({ user: req.user._id, name: name.trim(), type });
    await person.save();
    res.status(201).json(person);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Person already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.editPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const person = await Person.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { name: name?.trim(), type } },
      { new: true, lean: true }
    );
    if (!person) return res.status(404).json({ message: 'Person not found' });
    res.json(person);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePerson = async (req, res) => {
  try {
    const { id } = req.params;
    const person = await Person.findOneAndDelete({ _id: id, user: req.user._id });
    if (!person) return res.status(404).json({ message: 'Person not found' });
    // Delete all time entries for this person
    await TimeEntry.deleteMany({ person: id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Time Entry CRUD with pagination & aggregation ----------
exports.getEntriesForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    const entries = await TimeEntry.find({ user: req.user._id, date: dateStr })
      .populate('person', 'name type')
      .lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addTimeEntry = async (req, res) => {
  try {
    const { personId, date, duration, notes } = req.body;
    const dateStr = toDateStr(date);
    const entry = await TimeEntry.findOneAndUpdate(
      { user: req.user._id, person: personId, date: dateStr },
      { $set: { duration, notes: notes || '' } },
      { upsert: true, new: true, lean: true }
    ).populate('person', 'name type');
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    // Create date range strings
    const startStr = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

    const summary = await TimeEntry.aggregate([
      { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
      { $lookup: { from: 'people', localField: 'person', foreignField: '_id', as: 'personInfo' } },
      { $unwind: '$personInfo' },
      { $group: { _id: '$personInfo.name', totalMinutes: { $sum: '$duration' } } },
      { $sort: { totalMinutes: -1 } }
    ]);
    // Transform to object { personName: totalMinutes }
    const result = {};
    summary.forEach(s => { result[s._id] = s.totalMinutes; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      TimeEntry.find({ user: req.user._id })
        .populate('person', 'name type')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TimeEntry.countDocuments({ user: req.user._id })
    ]);
    res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, notes } = req.body;
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { duration, notes: notes || '' } },
      { new: true, lean: true }
    ).populate('person', 'name type');
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TimeEntry.findOneAndDelete({ _id: id, user: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};