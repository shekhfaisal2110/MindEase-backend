// // controllers/letterController.js
// const LetterToSelf = require('../models/LetterToSelf');

// // Get all letters with pagination
// exports.getAll = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const [letters, total] = await Promise.all([
//       LetterToSelf.find({ user: req.user._id })
//         .sort({ date: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('content isRead date')
//         .lean(),
//       LetterToSelf.countDocuments({ user: req.user._id })
//     ]);

//     res.json({
//       letters,
//       pagination: { page, limit, total, pages: Math.ceil(total / limit) }
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create a new letter
// exports.create = async (req, res) => {
//   try {
//     const { content } = req.body;
//     if (!content || content.trim().length === 0) {
//       return res.status(400).json({ message: 'Content is required' });
//     }
//     const letter = new LetterToSelf({
//       user: req.user._id,
//       content: content.trim(),
//     });
//     await letter.save();
//     res.status(201).json(letter);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Mark letter as read (atomic update)
// exports.markAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const letter = await LetterToSelf.findOneAndUpdate(
//       { _id: id, user: req.user._id, isRead: false },
//       { $set: { isRead: true } },
//       { new: true, lean: true }
//     );
//     if (!letter) return res.status(404).json({ message: 'Letter not found or already read' });
//     res.json(letter);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete letter
// exports.delete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleted = await LetterToSelf.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!deleted) return res.status(404).json({ message: 'Letter not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





// controllers/letterController.js
const LetterToSelf = require('../models/LetterToSelf');

// Get all letters with cursor‑based pagination (no skip/limit)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null; // last document _id from previous page
    const result = await LetterToSelf.getPaginated(req.user._id, limit, cursor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new letter – uses model's static method
exports.create = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const letter = await LetterToSelf.createLetter(req.user._id, content.trim());
    res.status(201).json(letter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark letter as read (atomic update) – uses model's static method
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const letter = await LetterToSelf.markAsRead(id, req.user._id);
    if (!letter) return res.status(404).json({ message: 'Letter not found or already read' });
    res.json(letter);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete letter – uses model's static method
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await LetterToSelf.deleteLetter(id, req.user._id);
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Letter not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};