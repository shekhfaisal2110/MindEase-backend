// const WellbeingActivity = require('../models/WellbeingActivity');

// exports.getActivities = async (req, res) => {
//   try {
//     const activities = await WellbeingActivity.find({ user: req.user._id }).sort({ createdAt: -1 });
//     res.json(activities);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addActivity = async (req, res) => {
//   try {
//     const { name, type, stressReductionPercent, notes } = req.body;
//     const activity = new WellbeingActivity({
//       user: req.user._id,
//       name,
//       type,
//       stressReductionPercent: stressReductionPercent || 0,
//       notes,
//     });
//     await activity.save();
//     res.status(201).json(activity);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateActivity = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, type, stressReductionPercent, notes } = req.body;
//     const activity = await WellbeingActivity.findOneAndUpdate(
//       { _id: id, user: req.user._id },
//       { name, type, stressReductionPercent, notes },
//       { new: true }
//     );
//     if (!activity) return res.status(404).json({ message: 'Activity not found' });
//     res.json(activity);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteActivity = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const activity = await WellbeingActivity.findOneAndDelete({ _id: id, user: req.user._id });
//     if (!activity) return res.status(404).json({ message: 'Activity not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





const WellbeingActivity = require('../models/WellbeingActivity');

// Helper: get today's date string (YYYY-MM-DD) for consistent queries
const getTodayStr = () => new Date().toISOString().split('T')[0];
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];

// Get activities with pagination, filtering by date range and type
exports.getActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { type, startDate, endDate } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (type && ['happiness', 'stress_relief'].includes(type)) filter.type = type;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      WellbeingActivity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name type stressReductionPercent notes createdAt')
        .lean(),
      WellbeingActivity.countDocuments(filter)
    ]);

    res.json({
      activities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Add new activity (with validation)
exports.addActivity = async (req, res) => {
  try {
    const { name, type, stressReductionPercent, notes } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    if (!['happiness', 'stress_relief'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type' });
    }
    if (stressReductionPercent !== undefined && (stressReductionPercent < 0 || stressReductionPercent > 100)) {
      return res.status(400).json({ message: 'Stress reduction must be between 0 and 100' });
    }

    const activity = new WellbeingActivity({
      user: req.user._id,
      name: name.trim(),
      type,
      stressReductionPercent: stressReductionPercent || 0,
      notes: notes?.trim() || '',
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Update activity (atomic, user‑owned)
exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, stressReductionPercent, notes } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (type !== undefined) {
      if (!['happiness', 'stress_relief'].includes(type)) {
        return res.status(400).json({ message: 'Invalid type' });
      }
      update.type = type;
    }
    if (stressReductionPercent !== undefined) {
      if (stressReductionPercent < 0 || stressReductionPercent > 100) {
        return res.status(400).json({ message: 'Stress reduction must be between 0 and 100' });
      }
      update.stressReductionPercent = stressReductionPercent;
    }
    if (notes !== undefined) update.notes = notes.trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const activity = await WellbeingActivity.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: update },
      { new: true, lean: true }
    );
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Delete activity
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await WellbeingActivity.findOneAndDelete({ _id: id, user: req.user._id });
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};