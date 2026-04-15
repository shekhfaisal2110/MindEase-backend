const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const LetterToSelf = require('../models/LetterToSelf');

router.use(auth);

// Get all letters
router.get('/', async (req, res) => {
  try {
    const letters = await LetterToSelf.find({ user: req.user._id }).sort({ date: -1 });
    res.json(letters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new letter
router.post('/', async (req, res) => {
  try {
    const letter = new LetterToSelf({
      user: req.user._id,
      content: req.body.content,
    });
    await letter.save();
    res.status(201).json(letter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark letter as read
router.put('/read/:id', async (req, res) => {
  try {
    const letter = await LetterToSelf.findOne({ _id: req.params.id, user: req.user._id });
    if (!letter) return res.status(404).json({ message: 'Not found' });
    letter.isRead = true;
    await letter.save();
    res.json(letter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete letter
router.delete('/:id', async (req, res) => {
  try {
    await LetterToSelf.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;