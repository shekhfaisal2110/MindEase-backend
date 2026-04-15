const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EmotionalActivity = require('../models/EmotionalActivity');

router.use(auth);

// Get all emotional check‑ins
router.get('/', async (req, res) => {
  try {
    const activities = await EmotionalActivity.find({ user: req.user._id }).sort({ date: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new emotional check‑in
router.post('/', async (req, res) => {
  try {
    const activity = new EmotionalActivity({
      user: req.user._id,
      emotion: req.body.emotion,
      intensity: req.body.intensity,
      note: req.body.note,
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;