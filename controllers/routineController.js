// const DailyRoutine = require('../models/DailyRoutine');

// // Default routine items
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

// // Helper: convert date string to YYYY-MM-DD format (consistent with model if we use string)
// // Assuming model uses String date. If model uses Date type, keep as Date but set to UTC midnight.
// const getDateStr = (dateParam) => {
//   const d = new Date(dateParam);
//   return d.toISOString().split('T')[0]; // 'YYYY-MM-DD'
// };

// // Get or create routine for a specific date (atomic upsert)
// exports.getRoutine = async (req, res) => {
//   try {
//     const dateStr = getDateStr(req.params.date);
//     const routine = await DailyRoutine.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       {
//         $setOnInsert: {
//           items: defaultItems,
//           mood: null,
//           notes: ''
//         }
//       },
//       { upsert: true, new: true, lean: true }
//     );
//     res.json(routine);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Update routine - only allowed fields (mood, items, notes)
// exports.updateRoutine = async (req, res) => {
//   try {
//     const dateStr = getDateStr(req.params.date);
//     const { mood, items, notes } = req.body;
    
//     // Build update object dynamically
//     const update = {};
//     if (mood !== undefined) update.mood = mood;
//     if (notes !== undefined) update.notes = notes;
//     if (items && Array.isArray(items)) {
//       // Validate items array: each item should have name and completed
//       const validItems = items.every(item => item.name && typeof item.completed === 'boolean');
//       if (!validItems) {
//         return res.status(400).json({ message: 'Invalid items format' });
//       }
//       update.items = items;
//     }

//     const routine = await DailyRoutine.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: update },
//       { new: true, upsert: true, lean: true }
//     );
//     res.json(routine);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Optional: Mark an item as completed (more specific endpoint)
// exports.toggleItemCompletion = async (req, res) => {
//   try {
//     const dateStr = getDateStr(req.params.date);
//     const { itemIndex } = req.params; // or itemName
//     const { completed } = req.body;
    
//     const update = {};
//     update[`items.${itemIndex}.completed`] = completed;
    
//     const routine = await DailyRoutine.findOneAndUpdate(
//       { user: req.user._id, date: dateStr },
//       { $set: update },
//       { new: true, lean: true }
//     );
//     res.json(routine);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };





// controllers/dailyRoutineController.js
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

// Helper: convert date to YYYY-MM-DD (matches model's date field)
const getDateStr = (dateParam) => {
  const d = dateParam ? new Date(dateParam) : new Date();
  return d.toISOString().split('T')[0];
};

// Get or create routine for a specific date (atomic upsert using model's static method)
exports.getRoutine = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    let routine = await DailyRoutine.getByDate(req.user._id, dateStr);
    if (!routine) {
      // Create new routine with default items
      const updateData = { items: defaultItems, mood: null, notes: '' };
      routine = await DailyRoutine.updateNotes(req.user._id, dateStr, updateData.notes);
      if (!routine) {
        // Fallback: manually create with default items
        const newRoutine = new DailyRoutine({
          user: req.user._id,
          date: dateStr,
          items: defaultItems,
          mood: null,
          notes: ''
        });
        await newRoutine.save();
        routine = newRoutine.toJSON();
      }
    }
    // Ensure `completionPercentage` virtual appears (it's added in model)
    res.json(routine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update routine (mood, items, notes) – atomic updates using static methods
exports.updateRoutine = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const { mood, items, notes } = req.body;
    let updatedRoutine = null;

    // Update mood
    if (mood !== undefined) {
      await DailyRoutine.setMood(req.user._id, dateStr, mood);
    }

    // Update notes
    if (notes !== undefined) {
      await DailyRoutine.updateNotes(req.user._id, dateStr, notes);
    }

    // Replace entire items array (if provided)
    if (items && Array.isArray(items)) {
      const validItems = items.every(item => item.name && typeof item.completed === 'boolean');
      if (!validItems) {
        return res.status(400).json({ message: 'Invalid items format' });
      }
      // Use atomic $set on items
      await DailyRoutine.findOneAndUpdate(
        { user: req.user._id, date: dateStr },
        { $set: { items } },
        { upsert: true, runValidators: false }
      ).lean();
    }

    // Fetch final updated document
    updatedRoutine = await DailyRoutine.getByDate(req.user._id, dateStr);
    res.json(updatedRoutine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle completion of a specific routine item (by item name) – atomic, no index needed
exports.toggleItemCompletion = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const { itemName } = req.params; // Use name instead of index
    const { completed } = req.body;  // desired state (true/false)
    if (completed === undefined) {
      return res.status(400).json({ message: 'completed (true/false) is required' });
    }
    await DailyRoutine.toggleItem(req.user._id, dateStr, itemName, completed);
    const updatedRoutine = await DailyRoutine.getByDate(req.user._id, dateStr);
    res.json(updatedRoutine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a new custom item to the routine (if not already existing)
exports.addCustomItem = async (req, res) => {
  try {
    const dateStr = getDateStr(req.params.date);
    const { itemName } = req.body;
    if (!itemName) return res.status(400).json({ message: 'itemName required' });
    await DailyRoutine.addItem(req.user._id, dateStr, itemName);
    const routine = await DailyRoutine.getByDate(req.user._id, dateStr);
    res.json(routine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};