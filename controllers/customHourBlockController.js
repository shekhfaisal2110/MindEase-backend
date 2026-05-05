// // controllers/customHourBlockController.js
// const CustomHourBlock = require('../models/CustomHourBlock');

// // Helper: convert any date to YYYY-MM-DD string (UTC)
// const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// // Get custom blocks for a specific date
// exports.getBlocks = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     const record = await CustomHourBlock.findOne(
//       { user: req.user._id, date: dateStr },
//       { blocks: 1, _id: 0 }
//     ).lean();
//     res.json(record?.blocks || []);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Save custom blocks for a date (atomic upsert with validation)
// exports.saveBlocks = async (req, res) => {
//   try {
//     const dateStr = toDateStr(req.params.date);
//     let { blocks } = req.body;
//     if (!Array.isArray(blocks)) {
//       return res.status(400).json({ message: 'Blocks must be an array' });
//     }
//     // Validate each block format (HH:MM - HH:MM)
//     const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9] - ([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
//     for (const block of blocks) {
//       if (typeof block !== 'string' || !timeRegex.test(block)) {
//         return res.status(400).json({ message: `Invalid block format: ${block}` });
//       }
//     }
//     // Limit number of blocks (e.g., 12 max)
//     if (blocks.length > 12) blocks = blocks.slice(0, 12);

//     const updated = await CustomHourBlock.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: { blocks } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(updated.blocks);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };




// controllers/customHourBlockController.js
const CustomHourBlock = require('../models/CustomHourBlock');

// Helper: convert any date to YYYY-MM-DD string (UTC)
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// Get custom blocks for a specific date – uses model's static method (lean, projected)
exports.getBlocks = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    const record = await CustomHourBlock.getBlocksForDate(req.user._id, dateStr);
    res.json(record?.blocks || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Save custom blocks for a date – atomic upsert using model's static method
exports.saveBlocks = async (req, res) => {
  try {
    const dateStr = toDateStr(req.params.date);
    let { blocks } = req.body;
    if (!Array.isArray(blocks)) {
      return res.status(400).json({ message: 'Blocks must be an array' });
    }
    // Model will validate format and length; we can still trim
    blocks = blocks.slice(0, 12); // optional client‑side cap
    const updated = await CustomHourBlock.updateBlocksForDate(req.user._id, dateStr, blocks);
    if (!updated) {
      // If no update (e.g., no document and upsert fails? but should create)
      // Fallback: create manually via getOrCreate
      const record = await CustomHourBlock.getOrCreate(req.user._id, dateStr, blocks);
      return res.json(record.blocks);
    }
    res.json(updated.blocks);
  } catch (err) {
    console.error(err);
    // Handle validation errors from model (e.g., invalid block format)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};