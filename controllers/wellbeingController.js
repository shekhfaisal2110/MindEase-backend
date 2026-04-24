const WellbeingActivity = require('../models/WellbeingActivity');

exports.getActivities = async (req, res) => {
  try {
    const activities = await WellbeingActivity.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addActivity = async (req, res) => {
  try {
    const { name, type, stressReductionPercent, notes } = req.body;
    const activity = new WellbeingActivity({
      user: req.user._id,
      name,
      type,
      stressReductionPercent: stressReductionPercent || 0,
      notes,
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, stressReductionPercent, notes } = req.body;
    const activity = await WellbeingActivity.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { name, type, stressReductionPercent, notes },
      { new: true }
    );
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await WellbeingActivity.findOneAndDelete({ _id: id, user: req.user._id });
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};