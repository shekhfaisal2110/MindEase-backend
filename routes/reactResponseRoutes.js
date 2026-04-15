const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ReactResponse = require('../models/ReactResponse');

router.use(auth);

// Get all entries for the logged-in user
router.get('/', async (req, res) => {
  try {
    const entries = await ReactResponse.find({ user: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get entries for a specific date range (monthly summary for calendar)
router.get('/month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const entries = await ReactResponse.find({
      user: req.user._id,
      date: { $gte: start, $lte: end }
    });
    // Group by date: count how many reacts vs responses
    const summary = {};
    entries.forEach(entry => {
      const dateStr = entry.date.toISOString().split('T')[0];
      if (!summary[dateStr]) summary[dateStr] = { react: 0, response: 0 };
      summary[dateStr][entry.choice]++;
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new entry
router.post('/', async (req, res) => {
  try {
    const { choice, situation, outcome } = req.body;
    const entry = new ReactResponse({
      user: req.user._id,
      choice,
      situation,
      outcome,
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an entry
router.delete('/:id', async (req, res) => {
  try {
    await ReactResponse.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;