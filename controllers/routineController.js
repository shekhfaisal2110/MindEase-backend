// const DailyRoutine = require('../models/DailyRoutine');

// const defaultItems = [
//   { name: 'Morning meditation (5-10 min)', completed: false },
//   { name: 'Physical activity (walk/exercise)', completed: false },
//   { name: 'Healthy meal', completed: false },
//   { name: 'Connect with someone', completed: false },
//   { name: 'Journal or reflection', completed: false },
//   { name: 'Practice gratitude', completed: false },
//   { name: 'Take medications (if prescribed)', completed: false },
//   { name: 'Avoid social media overload', completed: false },
// ];

// exports.getRoutine = async (req, res) => {
//   try {
//     const date = new Date(req.params.date);
//     date.setHours(0, 0, 0, 0);
//     let routine = await DailyRoutine.findOne({ user: req.user._id, date });
//     if (!routine) {
//       routine = new DailyRoutine({ user: req.user._id, date, items: defaultItems });
//       await routine.save();
//     }
//     res.json(routine);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.updateRoutine = async (req, res) => {
//   try {
//     const date = new Date(req.params.date);
//     date.setHours(0, 0, 0, 0);
//     const routine = await DailyRoutine.findOneAndUpdate(
//       { user: req.user._id, date },
//       req.body,
//       { new: true, upsert: true }
//     );
//     res.json(routine);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };



const DailyRoutine = require('../models/DailyRoutine');

// Default routine items
const defaultItems = [
  { name: 'Morning meditation (5-10 min)', completed: false },
  { name: 'Physical activity (walk/exercise)', completed: false },
  { name: 'Healthy meal', completed: false },
  { name: 'Connect with someone', completed: false },
  { name: 'Journal or reflection', completed: false },
  { name: 'Practice gratitude', completed: false },
  { name: 'Take medications (if prescribed)', completed: false },
  { name: 'Avoid social media overload', completed: false },
];

// Helper: convert date string to YYYY-MM-DD format (consistent with model if we use string)
// Assuming model uses String date. If model uses Date type, keep as Date but set to UTC midnight.
const getDateStr = (dateParam) => {
  const d = new Date(dateParam);
  return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
};

// Get or create routine for a specific date (atomic upsert)
exports.getRoutine = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const routine = await DailyRoutine.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      {
        $setOnInsert: {
          items: defaultItems,
          mood: null,
          notes: ''
        }
      },
      { upsert: true, new: true, lean: true }
    );
    res.json(routine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update routine - only allowed fields (mood, items, notes)
exports.updateRoutine = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const { mood, items, notes } = req.body;
    
    // Build update object dynamically
    const update = {};
    if (mood !== undefined) update.mood = mood;
    if (notes !== undefined) update.notes = notes;
    if (items && Array.isArray(items)) {
      // Validate items array: each item should have name and completed
      const validItems = items.every(item => item.name && typeof item.completed === 'boolean');
      if (!validItems) {
        return res.status(400).json({ message: 'Invalid items format' });
      }
      update.items = items;
    }

    const routine = await DailyRoutine.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      { $set: update },
      { new: true, upsert: true, lean: true }
    );
    res.json(routine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Optional: Mark an item as completed (more specific endpoint)
exports.toggleItemCompletion = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const { itemIndex } = req.params; // or itemName
    const { completed } = req.body;
    
    const update = {};
    update[`items.${itemIndex}.completed`] = completed;
    
    const routine = await DailyRoutine.findOneAndUpdate(
      { user: req.user._id, date: dateStr },
      { $set: update },
      { new: true, lean: true }
    );
    res.json(routine);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};