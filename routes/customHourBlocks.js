const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CustomHourBlock = require('../models/CustomHourBlock');

router.use(auth);

// Get custom blocks for a specific date
router.get('/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    let record = await CustomHourBlock.findOne({ user: req.user._id, date });
    if (!record) {
      record = { blocks: [] };
    }
    res.json(record.blocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save custom blocks for a date (overwrites existing)
router.post('/:date', async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const { blocks } = req.body;
    const updated = await CustomHourBlock.findOneAndUpdate(
      { user: req.user._id, date },
      { blocks },
      { upsert: true, new: true }
    );
    res.json(updated.blocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;