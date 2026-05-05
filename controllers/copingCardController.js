// const CopingCard = require('../models/CopingCard');
// const UserBookmark = require('../models/UserBookmark');
// const Notification = require('../models/Notification');
// const User = require('../models/User'); // needed to get admin ID

// // ---------- Public ----------
// exports.getCards = async (req, res) => {
//   try {
//     const { category, search, page = 1, limit = 100 } = req.query;
//     const filter = { isPublic: true };
//     if (category) filter.category = category;
//     if (search) filter.$text = { $search: search };
//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const [cards, total] = await Promise.all([
//       CopingCard.find(filter)
//         .select('title category whenToUse steps whyItHelps emergencyNote sharedByUsername')
//         .skip(skip)
//         .limit(parseInt(limit))
//         .lean(),
//       CopingCard.countDocuments(filter)
//     ]);
//     res.json({ cards, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- User's own cards ----------
// exports.getMyCards = async (req, res) => {
//   try {
//     const cards = await CopingCard.find({ createdBy: req.user._id, isCustom: true })
//       .select('title category whenToUse steps whyItHelps emergencyNote sharePublic isPublic')
//       .lean();
//     res.json(cards);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Create card and notify admin
// exports.createCard = async (req, res) => {
//   try {
//     const { title, category, whenToUse, steps, whyItHelps, emergencyNote, sharePublic } = req.body;
//     if (!title || !category || !whenToUse || !steps || steps.length === 0) {
//       return res.status(400).json({ message: 'Missing required fields' });
//     }
//     const card = new CopingCard({
//       title, category, whenToUse, steps, whyItHelps, emergencyNote,
//       isPublic: false,
//       isCustom: true,
//       sharePublic: sharePublic || false,
//       createdBy: req.user._id
//     });
//     await card.save();

//     // Send notification to admin
//     const adminEmail = process.env.ADMIN_EMAIL;
//     const adminUser = await User.findOne({ email: adminEmail }).select('_id');
//     if (adminUser) {
//       let notificationTitle, notificationMessage, notificationType;
//       if (sharePublic) {
//         notificationTitle = `New coping card submitted for review by ${req.user.username}`;
//         notificationMessage = `${req.user.username} submitted a new coping card titled "${title}". Please review it in the admin panel.`;
//         notificationType = 'info';
//       } else {
//         notificationTitle = `New private coping card created by ${req.user.username}`;
//         notificationMessage = `${req.user.username} created a private coping card titled "${title}". (Not submitted for public sharing)`;
//         notificationType = 'system';
//       }
//       await Notification.create({
//         user: adminUser._id,
//         title: notificationTitle,
//         message: notificationMessage,
//         type: notificationType,
//         createdBy: req.user._id,
//       });
//     }

//     res.status(201).json(card);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.updateCard = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;
//     const card = await CopingCard.findOneAndUpdate(
//       { _id: id, createdBy: req.user._id, isCustom: true },
//       { $set: updates },
//       { new: true, runValidators: true }
//     );
//     if (!card) return res.status(404).json({ message: 'Card not found' });
//     res.json(card);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteCard = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await CopingCard.deleteOne({ _id: id, createdBy: req.user._id, isCustom: true });
//     if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
//     await UserBookmark.deleteMany({ card: id });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Bookmarks ----------
// exports.getUserBookmarks = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 12;
//     const skip = (page - 1) * limit;
//     const bookmarks = await UserBookmark.find({ user: req.user._id })
//       .populate('card')
//       .sort({ savedAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();
//     const total = await UserBookmark.countDocuments({ user: req.user._id });
//     res.json({ bookmarks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.addBookmark = async (req, res) => {
//   try {
//     const { cardId } = req.params;
//     const card = await CopingCard.findById(cardId).select('_id');
//     if (!card) return res.status(404).json({ message: 'Card not found' });
//     const existing = await UserBookmark.findOne({ user: req.user._id, card: cardId });
//     if (existing) return res.status(400).json({ message: 'Already bookmarked' });
//     await UserBookmark.create({ user: req.user._id, card: cardId });
//     res.status(201).json({ message: 'Bookmarked' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.removeBookmark = async (req, res) => {
//   try {
//     const { cardId } = req.params;
//     const result = await UserBookmark.deleteOne({ user: req.user._id, card: cardId });
//     if (result.deletedCount === 0) return res.status(404).json({ message: 'Bookmark not found' });
//     res.json({ message: 'Removed' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ---------- Admin ----------
// exports.getPendingCards = async (req, res) => {
//   if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const cards = await CopingCard.find({ isCustom: true, sharePublic: true, isPublic: false })
//       .populate('createdBy', 'username')
//       .lean();
//     res.json(cards);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.approveCard = async (req, res) => {
//   if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const { id } = req.params;
//     const card = await CopingCard.findById(id).populate('createdBy', '_id username');
//     if (!card) return res.status(404).json({ message: 'Card not found' });
    
//     card.isPublic = true;
//     card.sharedByUsername = card.createdBy.username;
//     card.approvedAt = new Date();
//     await card.save();
    
//     await Notification.create({
//       user: card.createdBy._id,
//       title: 'Your coping card was approved! 🎉',
//       message: `Your card "${card.title}" has been approved and is now visible to all users. Thank you for contributing!`,
//       type: 'success',
//       createdBy: req.user._id
//     });
    
//     res.json({ message: 'Card approved and notification sent' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.rejectCard = async (req, res) => {
//   if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const { id } = req.params;
//     const card = await CopingCard.findById(id).populate('createdBy', '_id username');
//     if (!card) return res.status(404).json({ message: 'Card not found' });
    
//     await Notification.create({
//       user: card.createdBy._id,
//       title: 'Your coping card submission was not approved',
//       message: `We appreciate your submission "${card.title}". After review, it wasn't approved for public sharing. You can still keep it as a private card.`,
//       type: 'neutral',
//       createdBy: req.user._id
//     });
    
//     await CopingCard.findByIdAndDelete(id);
//     await UserBookmark.deleteMany({ card: id });
    
//     res.json({ message: 'Rejected, removed, and notification sent' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin delete any card (including public ones) with notification to creator
// exports.adminDeleteCard = async (req, res) => {
//   if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const { id } = req.params;
//     const card = await CopingCard.findById(id);
//     if (!card) return res.status(404).json({ message: 'Card not found' });
    
//     if (card.createdBy) {
//       await Notification.create({
//         user: card.createdBy,
//         title: 'A coping card you contributed has been removed',
//         message: `The card "${card.title}" has been removed from the library by an admin. If you have questions, contact support.`,
//         type: 'warning',
//         createdBy: req.user._id
//       });
//     }
    
//     await CopingCard.findByIdAndDelete(id);
//     await UserBookmark.deleteMany({ card: id });
//     res.json({ message: 'Card deleted and notification sent (if applicable)' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.adminDeleteAnyCard = exports.adminDeleteCard;



const CopingCard = require('../models/CopingCard');
const UserBookmark = require('../models/UserBookmark');
const Notification = require('../models/Notification');
const User = require('../models/User');

// ---------- Helper: fire‑and‑forget notifications ----------
const notifyUser = async (userId, title, message, type, createdBy) => {
  try {
    await Notification.create({ user: userId, title, message, type, createdBy });
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// ---------- Public cards (cursor pagination, search) ----------
exports.getCards = async (req, res) => {
  try {
    const { category, search, limit = 20, cursor } = req.query;
    let result;
    if (search) {
      // Text search – use model method
      result = await CopingCard.searchPublicCards(search, parseInt(limit));
      return res.json({ cards: result, nextCursor: null, hasMore: false });
    } else {
      result = await CopingCard.getPublicCards(category || null, parseInt(limit), cursor || null);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- User's own custom cards (cursor pagination) ----------
exports.getMyCards = async (req, res) => {
  try {
    const { limit = 20, cursor } = req.query;
    const result = await CopingCard.getUserCustomCards(req.user._id, parseInt(limit), cursor || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Create card (atomic, background admin notification) ----------
exports.createCard = async (req, res) => {
  try {
    const { title, category, whenToUse, steps, whyItHelps, emergencyNote, sharePublic } = req.body;
    if (!title || !category || !whenToUse || !steps || steps.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const card = await CopingCard.createCustomCard({
      title, category, whenToUse, steps, whyItHelps, emergencyNote,
      sharePublic: sharePublic || false,
      createdBy: req.user._id
    });

    // Notify admin in background
    (async () => {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminUser = await User.findOne({ email: adminEmail }).select('_id').lean();
      if (adminUser) {
        const titleNote = sharePublic ? 'New card submitted for review' : 'New private card created';
        const message = `${req.user.username} ${sharePublic ? 'submitted' : 'created'} "${card.title}".`;
        await notifyUser(adminUser._id, titleNote, message, sharePublic ? 'info' : 'system', req.user._id);
      }
    })();

    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Update custom card (atomic) ----------
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // Only allowed fields can be updated (we restrict manually)
    const allowed = ['title', 'category', 'whenToUse', 'steps', 'whyItHelps', 'emergencyNote', 'sharePublic'];
    const $set = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) $set[key] = updateData[key];
    }
    if (Object.keys($set).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const card = await CopingCard.findOneAndUpdate(
      { _id: id, createdBy: req.user._id, isCustom: true },
      { $set },
      { new: true, lean: true, runValidators: false }
    );
    if (!card) return res.status(404).json({ message: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Delete custom card (atomic, remove bookmarks) ----------
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await CopingCard.deleteOne({ _id: id, createdBy: req.user._id, isCustom: true });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
    // Delete bookmarks in background (no need to wait)
    UserBookmark.deleteMany({ card: id }).catch(err => console.error('Delete bookmarks failed:', err));
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Bookmarks (using optimized UserBookmark methods) ----------
exports.getUserBookmarks = async (req, res) => {
  try {
    const { limit = 12, cursor } = req.query;
    const result = await UserBookmark.getUserBookmarks(req.user._id, parseInt(limit), cursor || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await CopingCard.findById(cardId, { _id: 1 }).lean();
    if (!card) return res.status(404).json({ message: 'Card not found' });
    const bookmark = await UserBookmark.addBookmark(req.user._id, cardId);
    res.status(201).json({ message: 'Bookmarked', bookmark });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Already bookmarked' });
    res.status(500).json({ message: err.message });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await UserBookmark.removeBookmark(req.user._id, cardId);
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Bookmark not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Admin: get pending cards (cards shared for review, not yet public) ----------
exports.getPendingCards = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
  try {
    const cards = await CopingCard.find({ isCustom: true, sharePublic: true, isPublic: false })
      .select('title category whenToUse steps whyItHelps emergencyNote createdBy')
      .populate('createdBy', 'username')
      .lean();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Admin: approve a shared card (atomic) ----------
exports.approveCard = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
  try {
    const { id } = req.params;
    const card = await CopingCard.findById(id).populate('createdBy', '_id username').lean();
    if (!card) return res.status(404).json({ message: 'Card not found' });
    if (!card.sharePublic) return res.status(400).json({ message: 'Card not submitted for sharing' });

    const approved = await CopingCard.approveCard(id);
    if (!approved) return res.status(500).json({ message: 'Approval failed' });

    // Notify user in background
    (async () => {
      await notifyUser(
        card.createdBy._id,
        'Your coping card was approved! 🎉',
        `Your card "${card.title}" is now public. Thank you for contributing!`,
        'success',
        req.user._id
      );
    })();

    res.json({ message: 'Card approved and notification sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Admin: reject and delete a shared card ----------
exports.rejectCard = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
  try {
    const { id } = req.params;
    const card = await CopingCard.findById(id).populate('createdBy', '_id username').lean();
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // Delete the card
    await CopingCard.findByIdAndDelete(id);
    await UserBookmark.deleteMany({ card: id }).catch(() => {});

    // Notify user in background
    (async () => {
      await notifyUser(
        card.createdBy._id,
        'Your coping card submission was not approved',
        `We appreciate "${card.title}". After review, it wasn't approved. You can still keep it as a private card.`,
        'neutral',
        req.user._id
      );
    })();

    res.json({ message: 'Rejected, card removed, and notification sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Admin: delete any card (public or custom) ----------
exports.adminDeleteCard = async (req, res) => {
  if (req.user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ message: 'Admin only' });
  try {
    const { id } = req.params;
    const card = await CopingCard.findById(id).select('title createdBy').lean();
    if (!card) return res.status(404).json({ message: 'Card not found' });

    await CopingCard.findByIdAndDelete(id);
    await UserBookmark.deleteMany({ card: id }).catch(() => {});

    if (card.createdBy) {
      (async () => {
        await notifyUser(
          card.createdBy,
          'A coping card you contributed has been removed',
          `The card "${card.title}" has been removed by an admin. Contact support if you have questions.`,
          'warning',
          req.user._id
        );
      })();
    }

    res.json({ message: 'Card deleted and notification sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Alias for backwards compatibility
exports.adminDeleteAnyCard = exports.adminDeleteCard;