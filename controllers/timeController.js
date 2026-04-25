const Person = require('../models/Person');
const TimeEntry = require('../models/TimeEntry');

// ---------- Person CRUD ----------
exports.getPeople = async (req, res) => {
  try {
    const people = await Person.find({ user: req.user._id }).sort({ type: 1, name: 1 });
    res.json(people);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addPerson = async (req, res) => {
  try {
    const { name, type } = req.body;
    const person = new Person({ user: req.user._id, name, type });
    await person.save();
    res.status(201).json(person);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.editPerson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const person = await Person.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { name, type },
      { new: true }
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
    // Also delete all time entries for this person
    await TimeEntry.deleteMany({ person: id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Time Entry CRUD ----------
exports.getEntriesForDate = async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const entries = await TimeEntry.find({ user: req.user._id, date: targetDate })
      .populate('person', 'name type');
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addTimeEntry = async (req, res) => {
  try {
    const { personId, date, duration, notes } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const entry = await TimeEntry.findOneAndUpdate(
      { user: req.user._id, person: personId, date: targetDate },
      { duration, notes },
      { upsert: true, new: true }
    ).populate('person', 'name type');
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const entries = await TimeEntry.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    }).populate('person', 'name type');
    
    // Group by person
    const summary = {};
    entries.forEach(entry => {
      const personName = entry.person.name;
      if (!summary[personName]) summary[personName] = 0;
      summary[personName] += entry.duration;
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const entries = await TimeEntry.find({ user: req.user._id })
      .populate('person', 'name type')
      .sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Update a time entry
exports.updateTimeEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, notes } = req.body;
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { duration, notes },
      { new: true }
    ).populate('person', 'name type');
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a time entry
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