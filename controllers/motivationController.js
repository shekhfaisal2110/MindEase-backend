const MotivationThought = require('../models/MotivationThought');
const User = require('../models/User');

// Simple in‑memory cache for approved thoughts (no Redis)
let approvedCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: isAdmin check
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;


// Default quotes (50) – shown when no approved thoughts exist
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

// Modified getApprovedThoughts – returns default quotes if no approved thoughts
exports.getApprovedThoughts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const total = await MotivationThought.countDocuments({ status: 'approved' });

    // If no approved thoughts, return default quotes with pagination
    if (total === 0) {
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedDefaults = DEFAULT_QUOTES.slice(start, end);
      return res.json({
        thoughts: paginatedDefaults.map(q => ({ thought: q.thought, user: { username: q.username } })),
        pagination: { page, limit, total: DEFAULT_QUOTES.length, pages: Math.ceil(DEFAULT_QUOTES.length / limit) }
      });
    }

    // Cache for first page only (same as before)
    const cacheKey = `${page}-${limit}`;
    if (page === 1 && approvedCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL) {
      return res.json(approvedCache);
    }

    const thoughts = await MotivationThought.find({ status: 'approved' })
      .populate('user', 'username')
      .sort({ approvedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const result = { thoughts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    if (page === 1 && limit === 12) {
      approvedCache = result;
      cacheTimestamp = Date.now();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Submit a new thought (user)
exports.submitThought = async (req, res) => {
  try {
    const { thought } = req.body;
    if (!thought || thought.trim().length < 5) {
      return res.status(400).json({ message: 'Thought must be at least 5 characters' });
    }
    const newThought = new MotivationThought({
      user: req.user._id,
      thought: thought.trim(),
      status: 'pending'
    });
    await newThought.save();
    res.status(201).json({ message: 'Thought submitted for review. Thank you!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Admin only ----------
// Get pending thoughts (paginated)
exports.getPendingThoughts = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [thoughts, total] = await Promise.all([
      MotivationThought.find({ status: 'pending' })
        .populate('user', 'username email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MotivationThought.countDocuments({ status: 'pending' })
    ]);
    res.json({ thoughts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve a thought
exports.approveThought = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { id } = req.params;
    const thought = await MotivationThought.findByIdAndUpdate(
      id,
      { status: 'approved', approvedAt: new Date() },
      { new: true, lean: true }
    );
    if (!thought) return res.status(404).json({ message: 'Thought not found' });
    // Clear cache
    approvedCache = null;
    cacheTimestamp = null;
    res.json({ message: 'Thought approved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject / delete a thought
exports.rejectThought = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin access required' });
  try {
    const { id } = req.params;
    const thought = await MotivationThought.findByIdAndDelete(id);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });
    // Clear cache
    approvedCache = null;
    cacheTimestamp = null;
    res.json({ message: 'Thought rejected and removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};