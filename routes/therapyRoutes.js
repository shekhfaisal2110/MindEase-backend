const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TherapyExercise = require('../models/TherapyExercise');

router.use(auth);

// Get all therapy exercises
router.get('/', async (req, res) => {
  try {
    const exercises = await TherapyExercise.find({ user: req.user._id }).sort({ date: -1 });
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new therapy exercise (hot potato, forgiveness, self‑talk, receiving)
router.post('/', async (req, res) => {
  try {
    const exercise = new TherapyExercise({
      user: req.user._id,
      type: req.body.type,
      content: req.body.content,
      completed: req.body.completed || false,
    });
    await exercise.save();
    res.status(201).json(exercise);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark exercise as completed
router.put('/complete/:id', async (req, res) => {
  try {
    const exercise = await TherapyExercise.findOne({ _id: req.params.id, user: req.user._id });
    if (!exercise) return res.status(404).json({ message: 'Not found' });
    exercise.completed = true;
    await exercise.save();
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;