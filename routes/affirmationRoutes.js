const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Affirmation = require('../models/Affirmation');

router.use(auth);

// Get all affirmations for current month
router.get('/', async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const affirmations = await Affirmation.find({ user: req.user._id, month });
    res.json(affirmations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new affirmation
router.post('/', async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const affirmation = new Affirmation({
      user: req.user._id,
      text: req.body.text,
      category: req.body.category || 'positive',
      count: 0,
      targetCount: req.body.targetCount || 33,
      month,
    });
    await affirmation.save();
    res.status(201).json(affirmation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Increment count for an affirmation and record the date
router.put('/increment/:id', async (req, res) => {
  try {
    const aff = await Affirmation.findOne({ _id: req.params.id, user: req.user._id });
    if (!aff) return res.status(404).json({ message: 'Affirmation not found' });
    aff.count += 1;
    const today = new Date();
    today.setHours(0,0,0,0);
    const alreadyExists = aff.completionDates.some(d => d.toDateString() === today.toDateString());
    if (!alreadyExists) {
      aff.completionDates.push(today);
    }
    await aff.save();
    res.json(aff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an affirmation
router.delete('/:id', async (req, res) => {
  try {
    await Affirmation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all completion dates for a given year+month
router.get('/completion-dates/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const affirmations = await Affirmation.find({
      user: req.user._id,
      completionDates: { $gte: start, $lte: end }
    });
    const datesSet = new Set();
    affirmations.forEach(aff => {
      aff.completionDates.forEach(date => {
        const d = new Date(date);
        if (d >= start && d <= end) {
          datesSet.add(d.toISOString().split('T')[0]);
        }
      });
    });
    res.json(Array.from(datesSet));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;