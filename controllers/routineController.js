const DailyRoutine = require('../models/DailyRoutine');

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

exports.getRoutine = async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    let routine = await DailyRoutine.findOne({ user: req.user._id, date });
    if (!routine) {
      routine = new DailyRoutine({ user: req.user._id, date, items: defaultItems });
      await routine.save();
    }
    res.json(routine);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateRoutine = async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const routine = await DailyRoutine.findOneAndUpdate(
      { user: req.user._id, date },
      req.body,
      { new: true, upsert: true }
    );
    res.json(routine);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};