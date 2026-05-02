// const UserDailyActivity = require('../models/UserDailyActivity');

// const getTodayRecord = async (userId) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   let record = await UserDailyActivity.findOne({ user: userId, date: today });
//   if (!record) {
//     record = new UserDailyActivity({ user: userId, date: today });
//     await record.save();
//   }
//   return record;
// };

// exports.recordPageView = async (req, res) => {
//   try {
//     const { pageName } = req.body;
//     const record = await getTodayRecord(req.user._id);
//     if (record.pageViews[pageName]) {
//       return res.json({ alreadyRecorded: true });
//     }
//     record.pageViews[pageName] = true;
//     await record.save();
//     res.json({ alreadyRecorded: false });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.recordTaskCompletion = async (req, res) => {
//   try {
//     const { taskId } = req.body;
//     const record = await getTodayRecord(req.user._id);
//     if (record.taskCompletions.includes(taskId)) {
//       return res.json({ alreadyRecorded: true });
//     }
//     record.taskCompletions.push(taskId);
//     await record.save();
//     res.json({ alreadyRecorded: false });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.recordRoutineItem = async (req, res) => {
//   try {
//     const { itemName } = req.body;
//     const record = await getTodayRecord(req.user._id);
//     if (record.routineItems.includes(itemName)) {
//       return res.json({ alreadyRecorded: true });
//     }
//     record.routineItems.push(itemName);
//     await record.save();
//     res.json({ alreadyRecorded: false });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.recordHourlyEmotionBlock = async (req, res) => {
//   try {
//     const { blockLabel } = req.body;
//     const record = await getTodayRecord(req.user._id);
//     if (record.hourlyEmotionBlocks.includes(blockLabel)) {
//       return res.json({ alreadyRecorded: true });
//     }
//     record.hourlyEmotionBlocks.push(blockLabel);
//     await record.save();
//     res.json({ alreadyRecorded: false });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



const UserDailyActivity = require('../models/UserDailyActivity');

// Helper: get today's date string (YYYY-MM-DD)
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Record page view (boolean field - true if visited, no duplicates)
exports.recordPageView = async (req, res) => {
  try {
    const { pageName } = req.body;
    const today = getTodayStr();
    const update = { $set: { [`pageViews.${pageName}`]: true } };
    
    const result = await UserDailyActivity.findOneAndUpdate(
      { user: req.user._id, date: today },
      update,
      { upsert: true, new: true, lean: true }
    );
    
    // Check if it was newly set or already existed
    const wasAlreadySet = result.pageViews[pageName] === true;
    res.json({ alreadyRecorded: wasAlreadySet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record task completion (array, avoid duplicates using $addToSet)
exports.recordTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.body;
    const today = getTodayStr();
    
    const result = await UserDailyActivity.findOneAndUpdate(
      { user: req.user._id, date: today },
      { $addToSet: { taskCompletions: taskId } },
      { upsert: true, new: true, lean: true }
    );
    
    // Check if it was added or already existed
    const wasAlreadyRecorded = result.taskCompletions.includes(taskId);
    res.json({ alreadyRecorded: wasAlreadyRecorded });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record routine item (array, avoid duplicates)
exports.recordRoutineItem = async (req, res) => {
  try {
    const { itemName } = req.body;
    const today = getTodayStr();
    
    const result = await UserDailyActivity.findOneAndUpdate(
      { user: req.user._id, date: today },
      { $addToSet: { routineItems: itemName } },
      { upsert: true, new: true, lean: true }
    );
    
    const wasAlreadyRecorded = result.routineItems.includes(itemName);
    res.json({ alreadyRecorded: wasAlreadyRecorded });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Record hourly emotion block (array, avoid duplicates)
exports.recordHourlyEmotionBlock = async (req, res) => {
  try {
    const { blockLabel } = req.body;
    const today = getTodayStr();
    
    const result = await UserDailyActivity.findOneAndUpdate(
      { user: req.user._id, date: today },
      { $addToSet: { hourlyEmotionBlocks: blockLabel } },
      { upsert: true, new: true, lean: true }
    );
    
    const wasAlreadyRecorded = result.hourlyEmotionBlocks.includes(blockLabel);
    res.json({ alreadyRecorded: wasAlreadyRecorded });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Bonus: Get today's activity summary (without modifying)
exports.getTodayActivity = async (req, res) => {
  try {
    const today = getTodayStr();
    const record = await UserDailyActivity.findOne(
      { user: req.user._id, date: today },
      { pageViews: 1, taskCompletions: 1, routineItems: 1, hourlyEmotionBlocks: 1, _id: 0 }
    ).lean();
    
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