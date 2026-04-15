const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Affirmation = require('../models/Affirmation');

router.use(auth);

// Get all affirmations for current month
router.get('/', async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
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

// Increment count for an affirmation
router.put('/increment/:id', async (req, res) => {
  try {
    const aff = await Affirmation.findOne({ _id: req.params.id, user: req.user._id });
    if (!aff) return res.status(404).json({ message: 'Affirmation not found' });
    aff.count += 1;
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

module.exports = router;