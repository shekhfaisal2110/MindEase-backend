// const Feedback = require('../models/Feedback');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// let redisClient = null;
// try {
//   const redis = require('redis');
//   redisClient = redis.createClient({ url: process.env.REDIS_URL });
//   redisClient.connect().catch(() => { redisClient = null; });
// } catch(e) { /* Redis not configured */ }

// const clearTestimonialsCache = async () => {
//   if (redisClient) {
//     const keys = await redisClient.keys('feedback:approved:*');
//     if (keys.length) await redisClient.del(keys);
//   }
// };

// // User submits feedback – sends notification to admin
// exports.submitFeedback = async (req, res) => {
//   try {
//     const { rating, comment } = req.body;
//     if (!rating || !comment) return res.status(400).json({ message: 'Rating and comment are required' });
//     if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
//     if (comment.length > 2000) return res.status(400).json({ message: 'Comment too long (max 2000)' });

//     const feedback = new Feedback({
//       user: req.user._id,
//       username: req.user.username,
//       rating: parseInt(rating),
//       comment: comment.trim(),
//       isApproved: false,
//     });
//     await feedback.save();

//     // Notify admin
//     const adminEmail = process.env.ADMIN_EMAIL;
//     const admin = await User.findOne({ email: adminEmail });
//     if (admin) {
//       await Notification.create({
//         user: admin._id,
//         title: 'New Feedback Received',
//         message: `${req.user.username} submitted new feedback: "${comment.slice(0, 100)}${comment.length > 100 ? '...' : ''}"`,
//         type: 'info',
//         createdBy: req.user._id,
//       });
//     }

//     res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get approved testimonials (public) – with pagination & caching
// exports.getApproved = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const cacheKey = `feedback:approved:${page}:${limit}`;

//     if (redisClient) {
//       const cached = await redisClient.get(cacheKey);
//       if (cached) return res.json(JSON.parse(cached));
//     }

//     const [testimonials, total] = await Promise.all([
//       Feedback.find({ isApproved: true })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('username rating comment createdAt')
//         .lean(),
//       Feedback.countDocuments({ isApproved: true })
//     ]);

//     const result = { testimonials, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
//     if (redisClient) await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
//     res.json(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: get all feedback (paginated, filterable)
// exports.getAllForAdmin = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin access required' });
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const status = req.query.status;
//     const filter = {};
//     if (status === 'approved') filter.isApproved = true;
//     if (status === 'pending') filter.isApproved = false;
//     const [feedbacks, total] = await Promise.all([
//       Feedback.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate('user', 'username email')
//         .lean(),
//       Feedback.countDocuments(filter)
//     ]);
//     res.json({ feedbacks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin approve feedback – sends notification to user
// exports.approveFeedback = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin access required' });
//     const { id } = req.params;
//     const feedback = await Feedback.findOneAndUpdate(
//       { _id: id, isApproved: false },
//       { $set: { isApproved: true } },
//       { new: true, lean: true }
//     );
//     if (!feedback) return res.status(404).json({ message: 'Feedback not found or already approved' });

//     await Notification.create({
//       user: feedback.user,
//       title: 'Your feedback has been approved!',
//       message: `Thank you! Your testimonial is now visible on the testimonials page.`,
//       type: 'success',
//       createdBy: req.user._id,
//     });

//     await clearTestimonialsCache();
//     res.json({ message: 'Feedback approved', feedback });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin reject (delete) feedback – sends notification to user
// exports.rejectFeedback = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) return res.status(403).json({ message: 'Admin access required' });
//     const { id } = req.params;
//     const deleted = await Feedback.findOneAndDelete({ _id: id });
//     if (!deleted) return res.status(404).json({ message: 'Feedback not found' });

//     await Notification.create({
//       user: deleted.user,
//       title: 'Your feedback was not approved',
//       message: `We appreciate your feedback, but it didn't meet our guidelines for public display. You can still submit another one.`,
//       type: 'neutral',
//       createdBy: req.user._id,
//     });

//     await clearTestimonialsCache();
//     res.json({ message: 'Feedback removed' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };






const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper: fire‑and‑forget notification (does not block response)
const notifyUser = async (userId, title, message, type, createdBy) => {
  try {
    await Notification.create({ user: userId, title, message, type, createdBy });
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// User submits feedback – sends notification to admin (background)
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) return res.status(400).json({ message: 'Rating and comment are required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
    if (comment.length > 2000) return res.status(400).json({ message: 'Comment too long (max 2000)' });

    const feedback = await Feedback.createFeedback({
      user: req.user._id,
      username: req.user.username,
      rating: parseInt(rating),
      comment: comment.trim(),
    });

    // Notify admin in background
    (async () => {
      const adminEmail = process.env.ADMIN_EMAIL;
      const admin = await User.findOne({ email: adminEmail }, { _id: 1 }).lean();
      if (admin) {
        await notifyUser(
          admin._id,
          'New Feedback Received',
          `${req.user.username} submitted: "${comment.slice(0, 100)}${comment.length > 100 ? '...' : ''}"`,
          'info',
          req.user._id
        );
      }
    })();

    res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get approved testimonials (public) – cursor‑based pagination (no skip/limit, no Redis)
exports.getApproved = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;
    const result = await Feedback.getApprovedFeedbacks(limit, cursor);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all feedback (paginated, filterable) – cursor‑based for each filter
exports.getAllForAdmin = async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const status = req.query.status;

    if (status === 'pending') {
      const result = await Feedback.getPendingFeedbacks(limit, cursor);
      return res.json(result);
    } else if (status === 'approved') {
      // For approved, we reuse getApprovedFeedbacks (same as public but with admin view – we can just call it)
      const result = await Feedback.getApprovedFeedbacks(limit, cursor);
      return res.json(result);
    } else {
      // No filter – all feedback (including both approved and pending)
      const query = {};
      if (cursor) query._id = { $lt: cursor };
      const feedbacks = await Feedback.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .select('username email rating comment isApproved createdAt')
        .populate('user', 'username email')
        .lean();
      const nextCursor = feedbacks.length === limit ? feedbacks[feedbacks.length - 1]._id : null;
      return res.json({ feedbacks, nextCursor, hasMore: !!nextCursor });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Admin approve feedback – atomic, clears cache (no Redis, but we keep model method)
exports.approveFeedback = async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    const feedback = await Feedback.approveFeedback(id);
    if (!feedback) return res.status(404).json({ message: 'Feedback not found or already approved' });

    // Notify user in background
    (async () => {
      await notifyUser(
        feedback.user,
        'Your feedback has been approved!',
        'Thank you! Your testimonial is now visible on the testimonials page.',
        'success',
        req.user._id
      );
    })();

    res.json({ message: 'Feedback approved', feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Admin reject (delete) feedback – atomic, sends notification
exports.rejectFeedback = async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    const deleted = await Feedback.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });

    // Notify user in background
    (async () => {
      await notifyUser(
        deleted.user,
        'Your feedback was not approved',
        'We appreciate your feedback, but it didn’t meet our guidelines for public display. You can submit another one.',
        'neutral',
        req.user._id
      );
    })();

    res.json({ message: 'Feedback removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};