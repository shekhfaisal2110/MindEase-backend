const User = require('../models/User');

exports.getGratitudeTarget = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('gratitudeChallengeTarget');
    res.json({ target: user.gratitudeChallengeTarget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGratitudeTarget = async (req, res) => {
  try {
    const { target } = req.body;
    if (target < 1 || target > 365) {
      return res.status(400).json({ message: 'Target must be between 1 and 365' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { gratitudeChallengeTarget: target },
      { new: true }
    ).select('gratitudeChallengeTarget');
    res.json({ target: user.gratitudeChallengeTarget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};