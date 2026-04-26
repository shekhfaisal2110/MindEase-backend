const Feedback = require('../models/Feedback');

// User submits feedback (saved as pending)
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }
    const feedback = new Feedback({
      user: req.user._id,
      username: req.user.username,
      rating,
      comment,
      isApproved: false,
    });
    await feedback.save();
    res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get approved testimonials (public)
exports.getApproved = async (req, res) => {
  try {
    const testimonials = await Feedback.find({ isApproved: true }).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all feedback (pending & approved)
exports.getAllForAdmin = async (req, res) => {
  try {
    // Check admin email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: approve feedback
exports.approveFeedback = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    res.json({ message: 'Feedback approved', feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: reject/delete feedback
exports.rejectFeedback = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    await Feedback.findByIdAndDelete(id);
    res.json({ message: 'Feedback removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};