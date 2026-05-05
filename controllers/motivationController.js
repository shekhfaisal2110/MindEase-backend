// const MotivationThought = require('../models/MotivationThought');
// const User = require('../models/User');
// const Notification = require('../models/Notification');

// let approvedCache = null;
// let cacheTimestamp = null;
// const CACHE_TTL = 5 * 60 * 1000;

// const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// // Default quotes (50)
// const DEFAULT_QUOTES = [
//   { thought: "You are stronger than you think.", username: "MindEase" },
//   { thought: "Every day may not be good, but there's something good in every day.", username: "MindEase" },
//   { thought: "Believe you can and you're halfway there.", username: "MindEase" },
//   { thought: "The only way to do great work is to love what you do.", username: "MindEase" },
//   { thought: "You are enough just as you are.", username: "MindEase" },
//   { thought: "Keep going. Everything you need will come to you at the perfect time.", username: "MindEase" },
//   { thought: "Happiness is not by chance, but by choice.", username: "MindEase" },
//   { thought: "Do what you can, with what you have, where you are.", username: "MindEase" },
//   { thought: "Small steps every day lead to big results.", username: "MindEase" },
//   { thought: "Your only limit is your mind.", username: "MindEase" },
//   { thought: "You've survived 100% of your bad days. Keep going.", username: "MindEase" },
//   { thought: "Let your smile change the world, but don't let the world change your smile.", username: "MindEase" },
//   { thought: "It does not matter how slowly you go as long as you do not stop.", username: "MindEase" },
//   { thought: "You are braver than you believe, stronger than you seem, and smarter than you think.", username: "MindEase" },
//   { thought: "Fall seven times, stand up eight.", username: "MindEase" },
//   { thought: "The secret of getting ahead is getting started.", username: "MindEase" },
//   { thought: "Don't watch the clock; do what it does. Keep going.", username: "MindEase" },
//   { thought: "You define your own life. Don't let other people write your script.", username: "MindEase" },
//   { thought: "Start where you are. Use what you have. Do what you can.", username: "MindEase" },
//   { thought: "Today is the tomorrow you worried about yesterday.", username: "MindEase" },
//   { thought: "Make each day your masterpiece.", username: "MindEase" },
//   { thought: "The only person you are destined to become is the person you decide to be.", username: "MindEase" },
//   { thought: "You have power over your mind – not outside events. Realise this, and you will find strength.", username: "MindEase" },
//   { thought: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", username: "MindEase" },
//   { thought: "Success is not final, failure is not fatal: it is the courage to continue that counts.", username: "MindEase" },
//   { thought: "Our greatest glory is not in never falling, but in rising every time we fall.", username: "MindEase" },
//   { thought: "Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying 'I will try again tomorrow.'", username: "MindEase" },
//   { thought: "You don't have to see the whole staircase, just take the first step.", username: "MindEase" },
//   { thought: "It's not whether you get knocked down, it's whether you get up.", username: "MindEase" },
//   { thought: "The future depends on what you do today.", username: "MindEase" },
//   { thought: "You are never too old to set another goal or to dream a new dream.", username: "MindEase" },
//   { thought: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", username: "MindEase" },
//   { thought: "Act as if what you do makes a difference. It does.", username: "MindEase" },
//   { thought: "Keep your face always toward the sunshine – and shadows will fall behind you.", username: "MindEase" },
//   { thought: "When everything feels like an uphill struggle, think of the view from the top.", username: "MindEase" },
//   { thought: "You can't go back and change the beginning, but you can start where you are and change the ending.", username: "MindEase" },
//   { thought: "Difficult roads often lead to beautiful destinations.", username: "MindEase" },
//   { thought: "You are allowed to be both a masterpiece and a work in progress simultaneously.", username: "MindEase" },
//   { thought: "Healing is not linear, but every step forward is progress.", username: "MindEase" },
//   { thought: "Don't be afraid to start over. It's a chance to build something better this time.", username: "MindEase" },
//   { thought: "Your current situation is not your final destination.", username: "MindEase" },
//   { thought: "You didn't come this far to only come this far.", username: "MindEase" },
//   { thought: "Take a deep breath. It's just a bad day, not a bad life.", username: "MindEase" },
//   { thought: "You've already survived 100% of your worst days. You're a survivor.", username: "MindEase" },
//   { thought: "Let your faith be bigger than your fear.", username: "MindEase" },
//   { thought: "The comeback is always stronger than the setback.", username: "MindEase" },
//   { thought: "You deserve to be happy. You deserve peace.", username: "MindEase" },
//   { thought: "Storm is passing over… And the sun will rise again.", username: "MindEase" },
//   { thought: "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity.", username: "MindEase" },
//   { thought: "One small positive thought in the morning can change your whole day.", username: "MindEase" }
// ];

// // Get approved thoughts (public)
// exports.getApprovedThoughts = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 12;
//     const skip = (page - 1) * limit;

//     const total = await MotivationThought.countDocuments({ status: 'approved' });

//     if (total === 0) {
//       const start = (page - 1) * limit;
//       const end = start + limit;
//       const paginatedDefaults = DEFAULT_QUOTES.slice(start, end);
//       return res.json({
//         thoughts: paginatedDefaults.map(q => ({ thought: q.thought, user: { username: q.username } })),
//         pagination: { page, limit, total: DEFAULT_QUOTES.length, pages: Math.ceil(DEFAULT_QUOTES.length / limit) }
//       });
//     }

//     if (page === 1 && approvedCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL) {
//       return res.json(approvedCache);
//     }

//     const thoughts = await MotivationThought.find({ status: 'approved' })
//       .populate('user', 'username')
//       .sort({ approvedAt: -1, createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const result = { thoughts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
//     if (page === 1 && limit === 12) {
//       approvedCache = result;
//       cacheTimestamp = Date.now();
//     }
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Submit a new thought – sends notification to admin
// exports.submitThought = async (req, res) => {
//   try {
//     const { thought } = req.body;
//     if (!thought || thought.trim().length < 5) {
//       return res.status(400).json({ message: 'Thought must be at least 5 characters' });
//     }
//     const newThought = new MotivationThought({
//       user: req.user._id,
//       thought: thought.trim(),
//       status: 'pending'
//     });
//     await newThought.save();

//     const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL }).select('_id');
//     if (adminUser) {
//       await Notification.create({
//         user: adminUser._id,
//         title: 'New motivational thought submitted',
//         message: `${req.user.username} has submitted a new thought for review.`,
//         type: 'info',
//         createdBy: req.user._id,
//       });
//     }

//     res.status(201).json({ message: 'Thought submitted for review. Thank you!' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: get pending thoughts
// exports.getPendingThoughts = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const [thoughts, total] = await Promise.all([
//       MotivationThought.find({ status: 'pending' })
//         .populate('user', 'username email')
//         .sort({ createdAt: 1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       MotivationThought.countDocuments({ status: 'pending' })
//     ]);
//     res.json({ thoughts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: approve thought – sends notification to user
// exports.approveThought = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const { id } = req.params;
//     const thought = await MotivationThought.findByIdAndUpdate(
//       id,
//       { status: 'approved', approvedAt: new Date() },
//       { new: true, lean: true }
//     );
//     if (!thought) return res.status(404).json({ message: 'Thought not found' });

//     if (thought.user) {
//       await Notification.create({
//         user: thought.user,
//         title: 'Your motivational thought was approved! 🎉',
//         message: `"${thought.thought}" is now visible to everyone. Thank you for sharing!`,
//         type: 'success',
//         createdBy: req.user._id,
//       });
//     }

//     approvedCache = null;
//     cacheTimestamp = null;
//     res.json({ message: 'Thought approved' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.rejectThought = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
//   try {
//     const { id } = req.params;
//     const thought = await MotivationThought.findById(id);
//     if (!thought) return res.status(404).json({ message: 'Thought not found' });

//     // Notify the user if the thought has a user reference
//     if (thought.user) {
//       try {
//         await Notification.create({
//           user: thought.user,
//           title: 'Your motivational thought was not approved',
//           message: `"${thought.thought}" was not approved for public display. You can keep it private or submit another one.`,
//           type: 'neutral',
//           createdBy: req.user._id,
//         });
//       } catch (notifErr) {
//         console.error('Failed to send rejection notification:', notifErr);
//         // Continue with deletion even if notification fails
//       }
//     }

//     await MotivationThought.findByIdAndDelete(id);
    
//     // Clear cache
//     approvedCache = null;
//     cacheTimestamp = null;
    
//     res.json({ message: 'Thought rejected and removed' });
//   } catch (err) {
//     console.error('Error in rejectThought:', err);
//     res.status(500).json({ message: err.message });
//   }
// };






const MotivationThought = require('../models/MotivationThought');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper: check admin
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// Default quotes (50) – unchanged
const DEFAULT_QUOTES = [
  { thought: "You are stronger than you think.", username: "MindEase" },
  { thought: "Every day may not be good, but there's something good in every day.", username: "MindEase" },
  { thought: "Believe you can and you're halfway there.", username: "MindEase" },
  { thought: "The only way to do great work is to love what you do.", username: "MindEase" },
  { thought: "You are enough just as you are.", username: "MindEase" },
  { thought: "Keep going. Everything you need will come to you at the perfect time.", username: "MindEase" },
  { thought: "Happiness is not by chance, but by choice.", username: "MindEase" },
  { thought: "Do what you can, with what you have, where you are.", username: "MindEase" },
  { thought: "Small steps every day lead to big results.", username: "MindEase" },
  { thought: "Your only limit is your mind.", username: "MindEase" },
  { thought: "You've survived 100% of your bad days. Keep going.", username: "MindEase" },
  { thought: "Let your smile change the world, but don't let the world change your smile.", username: "MindEase" },
  { thought: "It does not matter how slowly you go as long as you do not stop.", username: "MindEase" },
  { thought: "You are braver than you believe, stronger than you seem, and smarter than you think.", username: "MindEase" },
  { thought: "Fall seven times, stand up eight.", username: "MindEase" },
  { thought: "The secret of getting ahead is getting started.", username: "MindEase" },
  { thought: "Don't watch the clock; do what it does. Keep going.", username: "MindEase" },
  { thought: "You define your own life. Don't let other people write your script.", username: "MindEase" },
  { thought: "Start where you are. Use what you have. Do what you can.", username: "MindEase" },
  { thought: "Today is the tomorrow you worried about yesterday.", username: "MindEase" },
  { thought: "Make each day your masterpiece.", username: "MindEase" },
  { thought: "The only person you are destined to become is the person you decide to be.", username: "MindEase" },
  { thought: "You have power over your mind – not outside events. Realise this, and you will find strength.", username: "MindEase" },
  { thought: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", username: "MindEase" },
  { thought: "Success is not final, failure is not fatal: it is the courage to continue that counts.", username: "MindEase" },
  { thought: "Our greatest glory is not in never falling, but in rising every time we fall.", username: "MindEase" },
  { thought: "Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying 'I will try again tomorrow.'", username: "MindEase" },
  { thought: "You don't have to see the whole staircase, just take the first step.", username: "MindEase" },
  { thought: "It's not whether you get knocked down, it's whether you get up.", username: "MindEase" },
  { thought: "The future depends on what you do today.", username: "MindEase" },
  { thought: "You are never too old to set another goal or to dream a new dream.", username: "MindEase" },
  { thought: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", username: "MindEase" },
  { thought: "Act as if what you do makes a difference. It does.", username: "MindEase" },
  { thought: "Keep your face always toward the sunshine – and shadows will fall behind you.", username: "MindEase" },
  { thought: "When everything feels like an uphill struggle, think of the view from the top.", username: "MindEase" },
  { thought: "You can't go back and change the beginning, but you can start where you are and change the ending.", username: "MindEase" },
  { thought: "Difficult roads often lead to beautiful destinations.", username: "MindEase" },
  { thought: "You are allowed to be both a masterpiece and a work in progress simultaneously.", username: "MindEase" },
  { thought: "Healing is not linear, but every step forward is progress.", username: "MindEase" },
  { thought: "Don't be afraid to start over. It's a chance to build something better this time.", username: "MindEase" },
  { thought: "Your current situation is not your final destination.", username: "MindEase" },
  { thought: "You didn't come this far to only come this far.", username: "MindEase" },
  { thought: "Take a deep breath. It's just a bad day, not a bad life.", username: "MindEase" },
  { thought: "You've already survived 100% of your worst days. You're a survivor.", username: "MindEase" },
  { thought: "Let your faith be bigger than your fear.", username: "MindEase" },
  { thought: "The comeback is always stronger than the setback.", username: "MindEase" },
  { thought: "You deserve to be happy. You deserve peace.", username: "MindEase" },
  { thought: "Storm is passing over… And the sun will rise again.", username: "MindEase" },
  { thought: "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity.", username: "MindEase" },
  { thought: "One small positive thought in the morning can change your whole day.", username: "MindEase" }
];

// Get approved thoughts (public) – cursor-based pagination, no cache
exports.getApprovedThoughts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const cursor = req.query.cursor || null;

    // Check if there are any approved thoughts in DB
    const totalApproved = await MotivationThought.countDocuments({ status: 'approved' }).lean();

    if (totalApproved === 0) {
      // Fallback to default quotes with simple array pagination
      const start = cursor ? parseInt(cursor) : 0;
      const paginatedDefaults = DEFAULT_QUOTES.slice(start, start + limit);
      const nextCursor = start + limit < DEFAULT_QUOTES.length ? start + limit : null;
      return res.json({
        thoughts: paginatedDefaults.map(q => ({ thought: q.thought, user: { username: q.username } })),
        nextCursor,
        hasMore: !!nextCursor
      });
    }

    // Use model's static method – returns { thoughts, nextCursor, hasMore }
    const result = await MotivationThought.getPendingThoughts(limit, cursor);
    // Note: getPendingThoughts is for pending, but we need approved.
    // We'll create a similar method for approved in the model. For now, implement directly:
    const query = { status: 'approved' };
    if (cursor) query._id = { $gt: cursor };
    const thoughts = await MotivationThought.find(query)
      .sort({ approvedAt: -1, createdAt: -1, _id: 1 })
      .limit(limit)
      .populate('user', 'username')
      .lean();
    const nextCursor = thoughts.length === limit ? thoughts[thoughts.length - 1]._id : null;
    res.json({ thoughts, nextCursor, hasMore: !!nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Submit a new thought – atomic, background admin notification
exports.submitThought = async (req, res) => {
  try {
    const { thought } = req.body;
    if (!thought || thought.trim().length < 5) {
      return res.status(400).json({ message: 'Thought must be at least 5 characters' });
    }
    const newThought = await MotivationThought.createThought(req.user._id, thought.trim());

    // Notify admin in background
    (async () => {
      const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL }).select('_id').lean();
      if (adminUser) {
        await Notification.create({
          user: adminUser._id,
          title: 'New motivational thought submitted',
          message: `${req.user.username} has submitted a new thought for review.`,
          type: 'info',
          createdBy: req.user._id,
        });
      }
    })();

    res.status(201).json({ message: 'Thought submitted for review. Thank you!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get pending thoughts – cursor based (no skip/limit)
exports.getPendingThoughts = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const result = await MotivationThought.getPendingThoughts(limit, cursor);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: approve thought – atomic, sends notification, clears cache (no Redis needed)
exports.approveThought = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { id } = req.params;
    const thought = await MotivationThought.approve(id);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });

    if (thought.user) {
      // Fire‑and‑forget notification
      Notification.create({
        user: thought.user,
        title: 'Your motivational thought was approved! 🎉',
        message: `"${thought.thought}" is now visible to everyone. Thank you for sharing!`,
        type: 'success',
        createdBy: req.user._id,
      }).catch(console.error);
    }
    res.json({ message: 'Thought approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: reject thought – atomic, sends notification
exports.rejectThought = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { id } = req.params;
    const thought = await MotivationThought.reject(id);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });

    if (thought.user) {
      Notification.create({
        user: thought.user,
        title: 'Your motivational thought was not approved',
        message: `"${thought.thought}" was not approved for public display. You can keep it private or submit another one.`,
        type: 'neutral',
        createdBy: req.user._id,
      }).catch(console.error);
    }
    res.json({ message: 'Thought rejected and removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};