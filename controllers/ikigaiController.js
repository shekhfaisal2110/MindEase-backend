// // controllers/ikigaiController.js
// const Ikigai = require('../models/Ikigai');

// // Allowed fields for update (whitelist)
// const ALLOWED_FIELDS = ['love', 'skill', 'worldNeed', 'earn'];

// // Helper to sanitize array (remove duplicates, limit size, trim)
// const sanitizeArray = (arr, maxItems = 50) => {
//   if (!Array.isArray(arr)) return [];
//   return [...new Set(arr)]               // remove duplicates
//     .map(item => item.trim())
//     .filter(item => item.length > 0 && item.length <= 100)
//     .slice(0, maxItems);
// };

// // Get user's Ikigai data (atomic get or create)
// exports.getIkigai = async (req, res) => {
//   try {
//     const ikigai = await Ikigai.findOneAndUpdate(
//       { user: req.user._id },
//       { $setOnInsert: { love: [], skill: [], worldNeed: [], earn: [] } },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(ikigai);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Update Ikigai data (only provided fields)
// exports.updateIkigai = async (req, res) => {
//   try {
//     const updateData = {};
//     for (const field of ALLOWED_FIELDS) {
//       if (req.body[field] !== undefined) {
//         updateData[field] = sanitizeArray(req.body[field]);
//       }
//     }
//     if (Object.keys(updateData).length === 0) {
//       return res.status(400).json({ message: 'No valid fields to update' });
//     }

//     const ikigai = await Ikigai.findOneAndUpdate(
//       { user: req.user._id },
//       { $set: updateData },
//       { new: true, upsert: true, lean: true }
//     );
//     res.json(ikigai);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };





// controllers/ikigaiController.js
const Ikigai = require('../models/Ikigai');

// Allowed fields for update (whitelist)
const ALLOWED_FIELDS = ['love', 'skill', 'worldNeed', 'earn'];

// Helper to sanitize array (remove duplicates, limit size, trim)
const sanitizeArray = (arr, maxItems = 50) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)]               // remove duplicates
    .map(item => item.trim())
    .filter(item => item.length > 0 && item.length <= 100)
    .slice(0, maxItems);
};

// Get user's Ikigai data (atomic get or create)
exports.getIkigai = async (req, res) => {
  try {
    const ikigai = await Ikigai.getOrCreate(req.user._id);
    res.json(ikigai);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Update Ikigai data (only provided fields) – replaces whole categories
exports.updateIkigai = async (req, res) => {
  try {
    const updatePromises = [];
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        const sanitized = sanitizeArray(req.body[field]);
        updatePromises.push(Ikigai.setCategory(req.user._id, field, sanitized));
      }
    }
    if (updatePromises.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    await Promise.all(updatePromises);
    // Fetch the updated document
    const updated = await Ikigai.getByUser(req.user._id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};