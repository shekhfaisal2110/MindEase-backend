// const Person = require('../models/Person');
// const TimeEntry = require('../models/TimeEntry');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // ---------- Person CRUD (no major changes, but add validation) ----------
// exports.getPeople = async (req, res) => {
//   try {
//     const people = await Person.find({ user: req.user._id })
//       .sort({ type: 1, name: 1 })
//       .select('name type')
//       .lean();
//     res.json(people);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addPerson = async (req, res) => {
//   try {
//     const { name, type } = req.body;
//     if (!name || !type) return res.status(400).json({ message: 'Name and type required' });
//     const person = new Person({ user: req.user._id, name: name.trim(), type });
//     await person.save();
//     res.status(201).json(person);
//   } catch (err) {
//     if (err.code === 11000) return res.status(400).json({ message: 'Person already exists' });
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.editPerson = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, type } = req.body;
//     const person = await Person.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { $set: { name: name?.trim(), type } },
//       { new: true, lean: true }
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
//     // Delete all time entries for this person
//     await TimeEntry.deleteMany({ person: id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Time Entry CRUD with pagination & aggregation ----------
// exports.getEntriesForDate = async (req, res) => {
//   try {
//     const { date } = req.params;
//     const dateStr = toDateStr(date);
//     const entries = await TimeEntry.find({ user: req.user._id, date: dateStr })
//       .populate('person', 'name type')
//       .lean();
//     res.json(entries);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addTimeEntry = async (req, res) => {
//   try {
//     const { personId, date, duration, notes } = req.body;
//     const dateStr = toDateStr(date);
//     const entry = await TimeEntry.findOneAndUpdate(
//       { user: req.user._id, person: personId, date: dateStr },
//       { $set: { duration, notes: notes || '' } },
//       { upsert: true, new: true, lean: true }
//     ).populate('person', 'name type');
//     res.status(201).json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getMonthlySummary = async (req, res) => {
//   try {
//     const { year, month } = req.params;
//     // Create date range strings
//     const startStr = `${year}-${month.padStart(2, '0')}-01`;
//     const endDate = new Date(year, month, 0);
//     const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;

//     const summary = await TimeEntry.aggregate([
//       { $match: { user: req.user._id, date: { $gte: startStr, $lte: endStr } } },
//       { $lookup: { from: 'people', localField: 'person', foreignField: '_id', as: 'personInfo' } },
//       { $unwind: '$personInfo' },
//       { $group: { _id: '$personInfo.name', totalMinutes: { $sum: '$duration' } } },
//       { $sort: { totalMinutes: -1 } }
//     ]);
//     // Transform to object { personName: totalMinutes }
//     const result = {};
//     summary.forEach(s => { result[s._id] = s.totalMinutes; });
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getAllEntries = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 30;
//     const skip = (page - 1) * limit;

//     const [entries, total] = await Promise.all([
//       TimeEntry.find({ user: req.user._id })
//         .populate('person', 'name type')
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       TimeEntry.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateTimeEntry = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { duration, notes } = req.body;
//     const entry = await TimeEntry.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { $set: { duration, notes: notes || '' } },
//       { new: true, lean: true }
//     ).populate('person', 'name type');
//     if (!entry) return res.status(404).json({ message: 'Entry not found' });
//     res.json(entry);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

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

const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// ---------- Person CRUD ----------
exports.getPeople = async (req, res) => {
  try {
    const people = await Person.getPersons(req.user._id);
    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPerson = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type required' });
    const person = await Person.addPerson(req.user._id, name, type);
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
      { new: true, lean: true, runValidators: false }
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
    const person = await Person.findOneAndDelete({ _id: id, user: req.user._id }).lean();
    if (!person) return res.status(404).json({ message: 'Person not found' });
    await TimeEntry.deleteMany({ person: id, user: req.user._id }).lean();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Time Entry CRUD ----------
exports.getEntriesForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const dateStr = toDateStr(date);
    const { entries, totalMinutes } = await TimeEntry.getDailyTotal(req.user._id, dateStr);
    res.json({ entries, totalMinutes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addTimeEntry = async (req, res) => {
  try {
    const { personId, date, duration, notes } = req.body;
    const dateStr = toDateStr(date);
    const entry = await TimeEntry.upsertEntry(req.user._id, personId, dateStr, duration, notes || '');
    // Optionally populate person details
    const populated = await TimeEntry.findById(entry._id).populate('person', 'name type').lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const startStr = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${month.padStart(2, '0')}-${endDate.getDate()}`;
    const summary = await TimeEntry.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startStr, $lte: endStr }
        }
      },
      {
        $group: {
          _id: "$person",
          totalMinutes: { $sum: "$duration" }
        }
      }
    ]);
    const personIds = summary.map(s => s._id);
    const persons = await Person.find({ _id: { $in: personIds }, user: req.user._id })
      .select('_id name')
      .lean();
    const personMap = new Map(persons.map(p => [p._id.toString(), p.name]));
    const result = {};
    summary.forEach(s => { result[personMap.get(s._id.toString()) || s._id] = s.totalMinutes; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const cursor = req.query.cursor || null;
    const { entries, nextCursor, hasMore } = await TimeEntry.getPaginatedEntries(req.user._id, limit, cursor);
    res.json({ entries, nextCursor, hasMore });
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
      { new: true, lean: true, runValidators: false }
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
    const result = await TimeEntry.deleteEntry(id, req.user._id);
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};