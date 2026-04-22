const UserDailyActivity = require('../models/UserDailyActivity');

const getTodayRecord = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let record = await UserDailyActivity.findOne({ user: userId, date: today });
  if (!record) {
    record = new UserDailyActivity({ user: userId, date: today });
    await record.save();
  }
  return record;
};

exports.recordPageView = async (req, res) => {
  try {
    const { pageName } = req.body;
    const record = await getTodayRecord(req.user._id);
    if (record.pageViews[pageName]) {
      return res.json({ alreadyRecorded: true });
    }
    record.pageViews[pageName] = true;
    await record.save();
    res.json({ alreadyRecorded: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.recordTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.body;
    const record = await getTodayRecord(req.user._id);
    if (record.taskCompletions.includes(taskId)) {
      return res.json({ alreadyRecorded: true });
    }
    record.taskCompletions.push(taskId);
    await record.save();
    res.json({ alreadyRecorded: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.recordRoutineItem = async (req, res) => {
  try {
    const { itemName } = req.body;
    const record = await getTodayRecord(req.user._id);
    if (record.routineItems.includes(itemName)) {
      return res.json({ alreadyRecorded: true });
    }
    record.routineItems.push(itemName);
    await record.save();
    res.json({ alreadyRecorded: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.recordHourlyEmotionBlock = async (req, res) => {
  try {
    const { blockLabel } = req.body;
    const record = await getTodayRecord(req.user._id);
    if (record.hourlyEmotionBlocks.includes(blockLabel)) {
      return res.json({ alreadyRecorded: true });
    }
    record.hourlyEmotionBlocks.push(blockLabel);
    await record.save();
    res.json({ alreadyRecorded: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};