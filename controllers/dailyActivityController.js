// const UserDailyActivity = require('../models/UserDailyActivity');

// // Helper: get today's date string (YYYY-MM-DD)
// const getTodayStr = () => new Date().toISOString().split('T')[0];

// // Record page view (boolean field - true if visited, no duplicates)
// exports.recordPageView = async (req, res) => {
//   try {
//     const { pageName } = req.body;
//     const today = getTodayStr();
//     const update = { $set: { [`pageViews.${pageName}`]: true } };
    
//     const result = await UserDailyActivity.findOneAndUpdate(
//       { user: req.user._id, date: today },
//       update,
//       { upsert: true, new: true, lean: true }
//     );
    
//     // Check if it was newly set or already existed
//     const wasAlreadySet = result.pageViews[pageName] === true;
//     res.json({ alreadyRecorded: wasAlreadySet });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Record task completion (array, avoid duplicates using $addToSet)
// exports.recordTaskCompletion = async (req, res) => {
//   try {
//     const { taskId } = req.body;
//     const today = getTodayStr();
    
//     const result = await UserDailyActivity.findOneAndUpdate(
//       { user: req.user._id, date: today },
//       { $addToSet: { taskCompletions: taskId } },
//       { upsert: true, new: true, lean: true }
//     );
    
//     // Check if it was added or already existed
//     const wasAlreadyRecorded = result.taskCompletions.includes(taskId);
//     res.json({ alreadyRecorded: wasAlreadyRecorded });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Record routine item (array, avoid duplicates)
// exports.recordRoutineItem = async (req, res) => {
//   try {
//     const { itemName } = req.body;
//     const today = getTodayStr();
    
//     const result = await UserDailyActivity.findOneAndUpdate(
//       { user: req.user._id, date: today },
//       { $addToSet: { routineItems: itemName } },
//       { upsert: true, new: true, lean: true }
//     );
    
//     const wasAlreadyRecorded = result.routineItems.includes(itemName);
//     res.json({ alreadyRecorded: wasAlreadyRecorded });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Record hourly emotion block (array, avoid duplicates)
// exports.recordHourlyEmotionBlock = async (req, res) => {
//   try {
//     const { blockLabel } = req.body;
//     const today = getTodayStr();
    
//     const result = await UserDailyActivity.findOneAndUpdate(
//       { user: req.user._id, date: today },
//       { $addToSet: { hourlyEmotionBlocks: blockLabel } },
//       { upsert: true, new: true, lean: true }
//     );
    
//     const wasAlreadyRecorded = result.hourlyEmotionBlocks.includes(blockLabel);
//     res.json({ alreadyRecorded: wasAlreadyRecorded });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Bonus: Get today's activity summary (without modifying)
// exports.getTodayActivity = async (req, res) => {
//   try {
//     const today = getTodayStr();
//     const record = await UserDailyActivity.findOne(
//       { user: req.user._id, date: today },
//       { pageViews: 1, taskCompletions: 1, routineItems: 1, hourlyEmotionBlocks: 1, _id: 0 }
//     ).lean();
    
//     if (!record) {
//       return res.json({
//         pageViews: {},
//         taskCompletions: [],
//         routineItems: [],
//         hourlyEmotionBlocks: []
//       });
//     }
//     res.json(record);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };



const UserDailyActivity = require('../models/UserDailyActivity');

// Helper: get today's date string (YYYY-MM-DD)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Record page view (increment counter)
exports.recordPageView = async (req, res) => {
  try {
    const { pageName } = req.body;
    if (!pageName) return res.status(400).json({ message: 'pageName required' });
    const result = await UserDailyActivity.incrementPageView(req.user._id, pageName);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record task completion (adds to capped array, keeps last 100)
exports.recordTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ message: 'taskId required' });
    await UserDailyActivity.addTaskCompletion(req.user._id, taskId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record routine item (avoid duplicates)
exports.recordRoutineItem = async (req, res) => {
  try {
    const { itemName } = req.body;
    if (!itemName) return res.status(400).json({ message: 'itemName required' });
    await UserDailyActivity.addRoutineItem(req.user._id, itemName);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record hourly emotion block (avoid duplicates)
exports.recordHourlyEmotionBlock = async (req, res) => {
  try {
    const { blockLabel } = req.body;
    if (!blockLabel) return res.status(400).json({ message: 'blockLabel required' });
    await UserDailyActivity.addHourlyEmotionBlock(req.user._id, blockLabel);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get today's activity summary (lean, using static method)
exports.getTodayActivity = async (req, res) => {
  try {
    const record = await UserDailyActivity.getToday(req.user._id);
    if (!record) {
      return res.json({
        pageViews: {},
        taskCompletions: [],
        routineItems: [],
        hourlyEmotionBlocks: []
      });
    }
    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};