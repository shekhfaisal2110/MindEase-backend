const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const GratitudeEntry = require('../models/GratitudeEntry');

router.use(auth);

// Get all gratitude entries (latest first)
router.get('/', async (req, res) => {
  try {
    const entries = await GratitudeEntry.find({ user: req.user._id }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new gratitude entry
router.post('/', async (req, res) => {
  try {
    const entry = new GratitudeEntry({
      user: req.user._id,
      people: req.body.people,
      things: req.body.things,
      situations: req.body.situations,
      notes: req.body.notes,
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
    await GratitudeEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;