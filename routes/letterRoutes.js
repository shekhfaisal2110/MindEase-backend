// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const LetterToSelf = require('../models/LetterToSelf');

// router.use(auth);

// // Get all letters
// router.get('/', async (req, res) => {
//   try {
//     const letters = await LetterToSelf.find({ user: req.user._id }).sort({ date: -1 });
//     res.json(letters);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Create a new letter
// router.post('/', async (req, res) => {
//   try {
//     const letter = new LetterToSelf({
//       user: req.user._id,
//       content: req.body.content,
//     });
//     await letter.save();
//     res.status(201).json(letter);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Mark letter as read
// router.put('/read/:id', async (req, res) => {
//   try {
//     const letter = await LetterToSelf.findOne({ _id: req.params.id, user: req.user._id });
//     if (!letter) return res.status(404).json({ message: 'Not found' });
//     letter.isRead = true;
//     await letter.save();
//     res.json(letter);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // Delete letter
// router.delete('/:id', async (req, res) => {
//   try {
//     await LetterToSelf.findOneAndDelete({ _id: req.params.id, user: req.user._id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// module.exports = router;



// routes/letterRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const letterController = require('../controllers/letterController');
const LetterToSelf = require('../models/LetterToSelf');

router.use(auth);
router.get('/', letterController.getAll);
router.post('/', letterController.create);
router.put('/read/:id', letterController.markAsRead);
router.delete('/:id', letterController.delete);

// In routes/letterRoutes.js
router.get('/completion-dates/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month); // 1-12
    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${lastDay}`;
    
    const letters = await LetterToSelf.find({
      user: req.user._id,
      date: { $gte: startDateStr, $lte: endDateStr }
    }).select('date').lean();
    
    // Extract unique dates (the date field is already YYYY-MM-DD string)
    const uniqueDates = [...new Set(letters.map(l => l.date))];
    res.json(uniqueDates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;