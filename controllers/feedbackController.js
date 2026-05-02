// const Feedback = require('../models/Feedback');

// // User submits feedback (saved as pending)
// exports.submitFeedback = async (req, res) => {
//   try {
//     const { rating, comment } = req.body;
//     if (!rating || !comment) {
//       return res.status(400).json({ message: 'Rating and comment are required' });
//     }
//     const feedback = new Feedback({
//       user: req.user._id,
//       username: req.user.username,
//       rating,
//       comment,
//       isApproved: false,
//     });
//     await feedback.save();
//     res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get approved testimonials (public)
// exports.getApproved = async (req, res) => {
//   try {
//     const testimonials = await Feedback.find({ isApproved: true }).sort({ createdAt: -1 });
//     res.json(testimonials);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: get all feedback (pending & approved)
// exports.getAllForAdmin = async (req, res) => {
//   try {
//     // Check admin email
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const feedbacks = await Feedback.find().sort({ createdAt: -1 });
//     res.json(feedbacks);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: approve feedback
// exports.approveFeedback = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const { id } = req.params;
//     const feedback = await Feedback.findByIdAndUpdate(id, { isApproved: true }, { new: true });
//     if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
//     res.json({ message: 'Feedback approved', feedback });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: reject/delete feedback
// exports.rejectFeedback = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const { id } = req.params;
//     await Feedback.findByIdAndDelete(id);
//     res.json({ message: 'Feedback removed' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



const Feedback = require('../models/Feedback');

// Optional: Redis cache (if available)
let redisClient = null;
try {
  const redis = require('redis');
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(() => { redisClient = null; });
} catch(e) { /* Redis not configured */ }

// Helper to clear cache when new feedback approved or added
const clearTestimonialsCache = async () => {
  if (redisClient) {
    await redisClient.del('feedback:approved');
  }
};

// User submits feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) return res.status(400).json({ message: 'Rating and comment are required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
    if (comment.length > 2000) return res.status(400).json({ message: 'Comment too long (max 2000)' });

    const feedback = new Feedback({
      user: req.user._id,
      username: req.user.username,
      rating: parseInt(rating),
      comment: comment.trim(),
      isApproved: false,
    });
    await feedback.save();

    // Optional: clear cache for approved testimonies? Not needed since new feedback is not approved.
    res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get approved testimonials (public) with caching + pagination
exports.getApproved = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Generate cache key
    const cacheKey = `feedback:approved:${page}:${limit}`;

    // Try cache first
    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const [testimonials, total] = await Promise.all([
      Feedback.find({ isApproved: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('username rating comment createdAt')
        .lean(),
      Feedback.countDocuments({ isApproved: true })
    ]);

    const result = { testimonials, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };

    if (redisClient) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(result)); // 5 min TTL
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all feedback (with pagination, filtering)
exports.getAllForAdmin = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status; // 'approved', 'pending'

    const filter = {};
    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email')
        .lean(),
      Feedback.countDocuments(filter)
    ]);

    res.json({
      feedbacks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Admin: approve feedback (atomic, only if pending)
exports.approveFeedback = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    const feedback = await Feedback.findOneAndUpdate(
      { _id: id, isApproved: false },
      { $set: { isApproved: true } },
      { new: true, lean: true }
    );
    if (!feedback) return res.status(404).json({ message: 'Feedback not found or already approved' });
    
    // Clear cache for public testimonials
    await clearTestimonialsCache();
    res.json({ message: 'Feedback approved', feedback });
  } catch (err) {
    console.error(err);
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
    const deleted = await Feedback.findOneAndDelete({ _id: id });
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    
    await clearTestimonialsCache();
    res.json({ message: 'Feedback removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};