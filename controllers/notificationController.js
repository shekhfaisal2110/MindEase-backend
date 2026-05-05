// // const Notification = require('../models/Notification');
// // const User = require('../models/User');

// // // ─────────────────────────────────────────────────────────────────
// // // USER NOTIFICATIONS
// // // ─────────────────────────────────────────────────────────────────

// // // Get user's notifications (paginated, latest first)
// // exports.getUserNotifications = async (req, res) => {
// //   try {
// //     const page = parseInt(req.query.page) || 1;
// //     const limit = parseInt(req.query.limit) || 20;
// //     const skip = (page - 1) * limit;

// //     const [notifications, total] = await Promise.all([
// //       Notification.find({ user: req.user._id })
// //         .sort({ createdAt: -1 })
// //         .skip(skip)
// //         .limit(limit)
// //         .select('title message type isRead createdAt')
// //         .lean(),
// //       Notification.countDocuments({ user: req.user._id })
// //     ]);

// //     res.json({
// //       notifications,
// //       pagination: { page, limit, total, pages: Math.ceil(total / limit) }
// //     });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Mark a notification as read
// // exports.markAsRead = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const notification = await Notification.findOneAndUpdate(
// //       { _id: id, user: req.user._id, isRead: false },
// //       { $set: { isRead: true } },
// //       { new: true, lean: true }
// //     );
// //     if (!notification) return res.status(404).json({ message: 'Notification not found' });
// //     res.json(notification);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Delete a notification (user can only delete own)
// // exports.deleteNotification = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const result = await Notification.deleteOne({ _id: id, user: req.user._id });
// //     if (result.deletedCount === 0) return res.status(404).json({ message: 'Notification not found' });
// //     res.json({ message: 'Deleted' });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Get unread count (for badge)
// // exports.getUnreadCount = async (req, res) => {
// //   try {
// //     const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
// //     res.json({ count });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // ─────────────────────────────────────────────────────────────────
// // // ADMIN NOTIFICATIONS (requires admin email check)
// // // ─────────────────────────────────────────────────────────────────

// // // Helper: check if user is admin
// // const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// // // Admin: get all notifications (paginated, with user populated)
// // exports.adminGetAllNotifications = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const page = parseInt(req.query.page) || 1;
// //     const limit = parseInt(req.query.limit) || 50;
// //     const skip = (page - 1) * limit;
// //     const [notifications, total] = await Promise.all([
// //       Notification.find()
// //         .sort({ createdAt: -1 })
// //         .skip(skip)
// //         .limit(limit)
// //         .populate('user', 'username email')
// //         .populate('createdBy', 'username email')
// //         .lean(),
// //       Notification.countDocuments()
// //     ]);
// //     res.json({ notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Admin: send notification to a specific user or all users
// // exports.adminSendNotification = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const { userId, title, message, type = 'info' } = req.body;
// //     if (!title || !message) return res.status(400).json({ message: 'Title and message required' });
// //     let targetUsers = [];
// //     if (userId === 'all') {
// //       targetUsers = await User.find().select('_id').lean();
// //       targetUsers = targetUsers.map(u => u._id);
// //     } else if (userId) {
// //       targetUsers = [userId];
// //     } else {
// //       return res.status(400).json({ message: 'userId required or "all"' });
// //     }
// //     const notifications = targetUsers.map(uid => ({
// //       user: uid,
// //       title,
// //       message,
// //       type,
// //       createdBy: req.user._id,
// //     }));
// //     await Notification.insertMany(notifications);
// //     res.status(201).json({ message: `Notification sent to ${notifications.length} user(s)` });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Admin: delete any notification
// // exports.adminDeleteNotification = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const { id } = req.params;
// //     const result = await Notification.deleteOne({ _id: id });
// //     if (result.deletedCount === 0) return res.status(404).json({ message: 'Notification not found' });
// //     res.json({ message: 'Deleted' });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Admin: get contact messages stats (users who sent messages)
// // exports.adminGetContactStats = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const ContactMessage = require('../models/ContactMessage');
// //     const stats = await ContactMessage.aggregate([
// //       { $group: { _id: '$user', count: { $sum: 1 }, lastMessage: { $max: '$createdAt' } } },
// //       { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
// //       { $unwind: '$userInfo' },
// //       { $project: { userId: '$_id', username: '$userInfo.username', email: '$userInfo.email', messageCount: '$count', lastMessage: 1 } },
// //       { $sort: { lastMessage: -1 } }
// //     ]);
// //     res.json(stats);
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };

// // // Admin: get grouped notifications (aggregate by title/message/type/createdBy)
// // exports.adminGetGroupedNotifications = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const page = parseInt(req.query.page) || 1;
// //     const limit = parseInt(req.query.limit) || 20;
// //     const skip = (page - 1) * limit;

// //     const pipeline = [
// //       {
// //         $group: {
// //           _id: {
// //             title: "$title",
// //             message: "$message",
// //             type: "$type",
// //             createdBy: "$createdBy",
// //             createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } }
// //           },
// //           recipients: { $addToSet: "$user" },
// //           recipientCount: { $sum: 1 }
// //         }
// //       },
// //       { $sort: { "_id.createdAt": -1 } },
// //       { $skip: skip },
// //       { $limit: limit }
// //     ];

// //     const countPipeline = [
// //       {
// //         $group: {
// //           _id: {
// //             title: "$title",
// //             message: "$message",
// //             type: "$type",
// //             createdBy: "$createdBy"
// //           }
// //         }
// //       },
// //       { $count: "total" }
// //     ];

// //     const [grouped, totalResult] = await Promise.all([
// //       Notification.aggregate(pipeline),
// //       Notification.aggregate(countPipeline)
// //     ]);

// //     const total = totalResult[0]?.total || 0;

// //     // Fetch user details for recipient IDs
// //     const allUserIds = grouped.flatMap(g => g.recipients);
// //     const users = await User.find({ _id: { $in: allUserIds } }).select('username email').lean();
// //     const userMap = {};
// //     users.forEach(u => userMap[u._id] = u);

// //     const result = grouped.map(group => ({
// //       id: group._id.title + group._id.message + group._id.type, // pseudo id for key
// //       title: group._id.title,
// //       message: group._id.message,
// //       type: group._id.type,
// //       createdAt: group._id.createdAt,
// //       createdBy: group._id.createdBy,
// //       recipientCount: group.recipientCount,
// //       recipients: group.recipients.map(uid => userMap[uid]).filter(u => u)
// //     }));

// //     res.json({
// //       notifications: result,
// //       pagination: { page, limit, total, pages: Math.ceil(total / limit) }
// //     });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ message: err.message });
// //   }
// // };


// // // Admin: delete all notifications with same title/message/type (broadcast)
// // exports.adminDeleteBroadcast = async (req, res) => {
// //   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
// //   try {
// //     const { title, message, type } = req.body;
// //     if (!title || !message || !type) {
// //       return res.status(400).json({ message: 'Title, message, and type required' });
// //     }
// //     const result = await Notification.deleteMany({ title, message, type });
// //     res.json({ deletedCount: result.deletedCount, message: 'Broadcast deleted' });
// //   } catch (err) {
// //     res.status(500).json({ message: err.message });
// //   }
// // };









// const Notification = require('../models/Notification');
// const User = require('../models/User');

// // Helper: check admin
// const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// // ─────────────────────────────────────────────────────────────
// // USER ENDPOINTS
// // ─────────────────────────────────────────────────────────────
// exports.getUserNotifications = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const [notifications, total] = await Promise.all([
//       Notification.find({ user: req.user._id })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('title message type isRead createdAt')
//         .lean(),
//       Notification.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.getUnreadCount = async (req, res) => {
//   try {
//     const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
//     res.json({ count });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.markAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const note = await Notification.findOneAndUpdate(
//       { _id: id, user: req.user._id, isRead: false },
//       { $set: { isRead: true } },
//       { new: true, lean: true }
//     );
//     if (!note) return res.status(404).json({ message: 'Notification not found' });
//     res.json(note);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.deleteUserNotification = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await Notification.deleteOne({ _id: id, user: req.user._id });
//     if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
//     res.json({ message: 'Deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // ADMIN ENDPOINTS
// // ─────────────────────────────────────────────────────────────
// exports.adminGetGroupedNotifications = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const pipeline = [
//       {
//         $group: {
//           _id: {
//             title: "$title",
//             message: "$message",
//             type: "$type",
//             createdBy: "$createdBy",
//             createdAt: { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$createdAt" } }
//           },
//           recipients: { $addToSet: "$user" },
//           recipientCount: { $sum: 1 }
//         }
//       },
//       { $sort: { "_id.createdAt": -1 } },
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     const countPipeline = [
//       { $group: { _id: { title: "$title", message: "$message", type: "$type", createdBy: "$createdBy" } } },
//       { $count: "total" }
//     ];

//     const [grouped, totalResult] = await Promise.all([
//       Notification.aggregate(pipeline),
//       Notification.aggregate(countPipeline)
//     ]);

//     const total = totalResult[0]?.total || 0;

//     // fetch user details
//     const allUserIds = grouped.flatMap(g => g.recipients);
//     const users = await User.find({ _id: { $in: allUserIds } }).select('username email').lean();
//     const userMap = {};
//     users.forEach(u => userMap[u._id] = u);

//     const result = grouped.map(group => ({
//       title: group._id.title,
//       message: group._id.message,
//       type: group._id.type,
//       createdAt: group._id.createdAt,
//       createdBy: group._id.createdBy,
//       recipientCount: group.recipientCount,
//       recipients: group.recipients.map(uid => userMap[uid]).filter(u => u)
//     }));

//     res.json({ notifications: result, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.adminSendNotification = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const { userId, title, message, type = 'info' } = req.body;
//     if (!title || !message) return res.status(400).json({ message: 'Title and message required' });
//     let targetUsers = [];
//     if (userId === 'all') {
//       targetUsers = await User.find().select('_id').lean();
//       targetUsers = targetUsers.map(u => u._id);
//     } else if (userId) {
//       targetUsers = [userId];
//     } else {
//       return res.status(400).json({ message: 'userId required or "all"' });
//     }
//     const notifications = targetUsers.map(uid => ({
//       user: uid,
//       title,
//       message,
//       type,
//       createdBy: req.user._id,
//     }));
//     await Notification.insertMany(notifications);
//     res.status(201).json({ message: `Notification sent to ${notifications.length} user(s)` });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.adminDeleteBroadcast = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const { title, message, type } = req.body;
//     if (!title || !message || !type) return res.status(400).json({ message: 'Missing fields' });
//     const result = await Notification.deleteMany({ title, message, type });
//     res.json({ deletedCount: result.deletedCount, message: 'Broadcast deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// exports.adminGetContactStats = async (req, res) => {
//   if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
//   try {
//     const ContactMessage = require('../models/ContactMessage');
//     const stats = await ContactMessage.aggregate([
//       { $group: { _id: '$user', count: { $sum: 1 }, lastMessage: { $max: '$createdAt' } } },
//       { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
//       { $unwind: '$userInfo' },
//       { $project: { userId: '$_id', username: '$userInfo.username', email: '$userInfo.email', messageCount: '$count', lastMessage: 1 } },
//       { $sort: { lastMessage: -1 } }
//     ]);
//     res.json(stats);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };





const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper: check admin
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL;

// ─────────────────────────────────────────────────────────────
// USER ENDPOINTS (cursor‑based pagination, no skip/limit)
// ─────────────────────────────────────────────────────────────
exports.getUserNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const result = await Notification.getUserNotifications(
      req.user._id,
      limit,
      cursor
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Notification.markAsRead(id, req.user._id);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUserNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Notification.deleteOne({ _id: id, user: req.user._id }).lean();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (optimised aggregation)
// ─────────────────────────────────────────────────────────────
exports.adminGetGroupedNotifications = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Use aggregation with allowDiskUse: false for speed
    const pipeline = [
      {
        $group: {
          _id: {
            title: '$title',
            message: '$message',
            type: '$type',
            createdBy: '$createdBy',
            // keep full ISO string for sorting
            createdAt: { $dateToString: { format: '%Y-%m-%d %H:%M:%S', date: '$createdAt' } }
          },
          recipients: { $addToSet: '$user' },
          recipientCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.createdAt': -1, '_id.title': 1 } },
      { $skip: skip },
      { $limit: limit }
    ];
    const countPipeline = [
      {
        $group: {
          _id: { title: '$title', message: '$message', type: '$type', createdBy: '$createdBy' }
        }
      },
      { $count: 'total' }
    ];

    const [grouped, totalResult] = await Promise.all([
      Notification.aggregate(pipeline, { allowDiskUse: false }),
      Notification.aggregate(countPipeline, { allowDiskUse: false })
    ]);

    const total = totalResult[0]?.total || 0;

    // Collect all user IDs from recipients to fetch names
    const allUserIds = [...new Set(grouped.flatMap(g => g.recipients))];
    const users = await User.find({ _id: { $in: allUserIds } })
      .select('username email')
      .lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const result = grouped.map(group => ({
      title: group._id.title,
      message: group._id.message,
      type: group._id.type,
      createdAt: group._id.createdAt,
      createdBy: group._id.createdBy,
      recipientCount: group.recipientCount,
      recipients: group.recipients.map(uid => userMap.get(uid.toString())).filter(u => u)
    }));

    res.json({
      notifications: result,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.adminSendNotification = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
  try {
    const { userId, title, message, type = 'info' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message required' });
    }
    let targetUsers = [];
    if (userId === 'all') {
      // Use lean and projection for speed
      targetUsers = await User.find().select('_id').lean().then(users => users.map(u => u._id));
    } else if (userId) {
      targetUsers = [userId];
    } else {
      return res.status(400).json({ message: 'userId required or "all"' });
    }
    const notifications = targetUsers.map(uid => ({
      user: uid,
      title,
      message,
      type,
      createdBy: req.user._id
    }));
    await Notification.insertMany(notifications, { ordered: false });
    res.status(201).json({ message: `Notification sent to ${notifications.length} user(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminDeleteBroadcast = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
  try {
    const { title, message, type } = req.body;
    if (!title || !message || !type) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const result = await Notification.deleteMany({ title, message, type }).lean();
    res.json({ deletedCount: result.deletedCount, message: 'Broadcast deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminGetContactStats = async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ message: 'Admin only' });
  try {
    const ContactMessage = require('../models/ContactMessage');
    const stats = await ContactMessage.aggregate([
      { $group: { _id: '$user', count: { $sum: 1 }, lastMessage: { $max: '$createdAt' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: false } },
      { $project: { userId: '$_id', username: '$userInfo.username', email: '$userInfo.email', messageCount: '$count', lastMessage: 1 } },
      { $sort: { lastMessage: -1 } }
    ], { allowDiskUse: false }).exec();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};