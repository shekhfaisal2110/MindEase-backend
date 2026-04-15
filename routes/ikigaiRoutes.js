const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Ikigai = require('../models/Ikigai');

router.use(auth);

// Get user's Ikigai data
router.get('/', async (req, res) => {
  try {
    let ikigai = await Ikigai.findOne({ user: req.user._id });
    if (!ikigai) {
      ikigai = new Ikigai({ user: req.user._id });
      await ikigai.save();
    }
    res.json(ikigai);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Ikigai data
router.put('/', async (req, res) => {
  try {
    const { love, skill, worldNeed, earn } = req.body;
    const ikigai = await Ikigai.findOneAndUpdate(
      { user: req.user._id },
      { love, skill, worldNeed, earn, updatedAt: Date.now() },
      { new: true, upsert: true }
    );
    res.json(ikigai);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;