// const Message = require('../models/Message');
// const User = require('../models/User');
// const Notification = require('../models/Notification');   // 👈 add this line

// // Cache adminId
// let cachedAdminId = null;
// let adminIdPromise = null;

// const getAdminId = async () => {
//   if (cachedAdminId) return cachedAdminId;
//   if (adminIdPromise) return adminIdPromise;
//   adminIdPromise = User.findOne({ email: process.env.ADMIN_EMAIL }).select('_id').lean()
//     .then(admin => {
//       cachedAdminId = admin?._id;
//       adminIdPromise = null;
//       return cachedAdminId;
//     })
//     .catch(err => { adminIdPromise = null; throw err; });
//   return adminIdPromise;
// };

// const getPopulatedMessage = async (messageId) => {
//   return Message.findById(messageId)
//     .populate('sender', 'username email')
//     .populate('receiver', 'username email')
//     .lean();
// };

// // Send message and create notification
// exports.sendMessage = async (req, res) => {
//   try {
//     const { receiverId, content } = req.body;
//     if (!content?.trim() && !receiverId) {
//       return res.status(400).json({ message: 'Content and receiver required' });
//     }
//     const message = new Message({
//       sender: req.user._id,
//       receiver: receiverId,
//       content: content.trim().slice(0, 2000),
//     });
//     await message.save();

//     // Create notification for receiver
//     const adminId = await getAdminId();
//     let notificationTitle = '';
//     let notificationMessage = '';
//     let notificationType = 'info';

//     // If sender is admin, notify the user
//     if (req.user._id.toString() === adminId?.toString()) {
//       notificationTitle = 'Admin replied to your message';
//       notificationMessage = `Admin: ${content.trim().slice(0, 100)}`;
//       notificationType = 'success';
//     } 
//     // If receiver is admin, notify admin
//     else if (receiverId === adminId?.toString()) {
//       notificationTitle = `New message from ${req.user.username}`;
//       notificationMessage = `${req.user.username}: ${content.trim().slice(0, 100)}`;
//       notificationType = 'info';
//     }

//     if (notificationTitle && notificationMessage) {
//       await Notification.create({
//         user: receiverId,
//         title: notificationTitle,
//         message: notificationMessage,
//         type: notificationType,
//         createdBy: req.user._id,
//       });
//     }

//     const populated = await getPopulatedMessage(message._id);
//     res.status(201).json(populated);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Send image message with notification
// exports.sendImageMessage = async (req, res) => {
//   try {
//     const { receiverId } = req.body;
//     if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
//     const imageUrl = req.file.path;
//     const message = new Message({
//       sender: req.user._id,
//       receiver: receiverId,
//       imageUrl,
//       content: '',
//     });
//     await message.save();

//     const adminId = await getAdminId();
//     let notificationTitle = '';
//     let notificationMessage = '';
//     let notificationType = 'info';

//     if (req.user._id.toString() === adminId?.toString()) {
//       notificationTitle = 'Admin sent an image';
//       notificationMessage = 'Admin shared an image with you.';
//       notificationType = 'success';
//     } else if (receiverId === adminId?.toString()) {
//       notificationTitle = `New image from ${req.user.username}`;
//       notificationMessage = `${req.user.username} sent an image.`;
//       notificationType = 'info';
//     }

//     if (notificationTitle && notificationMessage) {
//       await Notification.create({
//         user: receiverId,
//         title: notificationTitle,
//         message: notificationMessage,
//         type: notificationType,
//         createdBy: req.user._id,
//       });
//     }

//     const populated = await getPopulatedMessage(message._id);
//     res.status(201).json(populated);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get conversation between two users (with pagination)
// exports.getConversation = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 50;
//     const skip = (page - 1) * limit;

//     const messages = await Message.find({
//       $or: [
//         { sender: req.user._id, receiver: userId },
//         { sender: userId, receiver: req.user._id }
//       ]
//     })
//       .sort({ createdAt: -1 }) // newest first, then reverse for display
//       .skip(skip)
//       .limit(limit)
//       .populate('sender', 'username email')
//       .populate('receiver', 'username email')
//       .lean();

//     // Reverse to get chronological order (oldest first for UI)
//     messages.reverse();
//     res.json({ messages, page, limit });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Admin: get all conversations (optimized aggregation)
// exports.getAdminConversations = async (req, res) => {
//   try {
//     const adminId = await getAdminId();
//     if (!adminId || req.user._id.toString() !== adminId.toString()) {
//       return res.status(403).json({ message: 'Admin only' });
//     }

//     // Use aggregation pipeline to get last message per conversation, unread count, and user details
//     const conversations = await Message.aggregate([
//       {
//         $match: {
//           $or: [{ sender: adminId }, { receiver: adminId }]
//         }
//       },
//       {
//         $sort: { createdAt: -1 }
//       },
//       {
//         $group: {
//           _id: {
//             $cond: [
//               { $eq: ["$sender", adminId] },
//               "$receiver",
//               "$sender"
//             ]
//           },
//           lastMessage: { $first: "$content" },
//           lastMessageImage: { $first: "$imageUrl" },
//           lastMessageTime: { $first: "$createdAt" },
//           unreadCount: {
//             $sum: {
//               $cond: [
//                 { $and: [{ $eq: ["$receiver", adminId] }, { $eq: ["$isRead", false] }] },
//                 1,
//                 0
//               ]
//             }
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $project: {
//           user: { _id: 1, username: 1, email: 1 },
//           lastMessage: 1,
//           lastMessageImage: 1,
//           lastMessageTime: 1,
//           unreadCount: 1
//         }
//       },
//       { $sort: { lastMessageTime: -1 } }
//     ]);

//     res.json(conversations);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Mark messages as read (atomic update)
// exports.markAsRead = async (req, res) => {
//   try {
//     const { otherUserId } = req.body;
//     if (!otherUserId) return res.status(400).json({ message: 'otherUserId required' });
//     await Message.updateMany(
//       { sender: otherUserId, receiver: req.user._id, isRead: false },
//       { $set: { isRead: true, readAt: new Date() } }
//     );
//     res.json({ success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Edit a message (only sender, within 10 minutes)
// exports.editMessage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { content } = req.body;
//     if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
//     content = content.trim().slice(0, 2000);

//     const message = await Message.findOne({ _id: id, sender: req.user._id });
//     if (!message) return res.status(404).json({ message: 'Message not found or not yours' });

//     const tenMinutes = 10 * 60 * 1000;
//     if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) {
//       return res.status(403).json({ message: 'Cannot edit messages older than 10 minutes' });
//     }

//     message.content = content;
//     await message.save();
//     const updated = await getPopulatedMessage(message._id);
//     res.json(updated);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Delete a message (only sender)
// exports.deleteMessage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const result = await Message.deleteOne({ _id: id, sender: req.user._id });
//     if (result.deletedCount === 0) {
//       return res.status(404).json({ message: 'Message not found or not yours' });
//     }
//     res.json({ success: true, messageId: id });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };








const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Cache adminId
let cachedAdminId = null;
let adminIdPromise = null;

const getAdminId = async () => {
  if (cachedAdminId) return cachedAdminId;
  if (adminIdPromise) return adminIdPromise;
  adminIdPromise = User.findOne({ email: process.env.ADMIN_EMAIL }).select('_id').lean()
    .then(admin => {
      cachedAdminId = admin?._id;
      adminIdPromise = null;
      return cachedAdminId;
    })
    .catch(err => { adminIdPromise = null; throw err; });
  return adminIdPromise;
};

// Helper: get populated message using aggregation (single pipeline instead of two populate calls)
const getPopulatedMessage = async (messageId) => {
  const result = await Message.aggregate([
    { $match: { _id: messageId } },
    { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'senderInfo' } },
    { $unwind: '$senderInfo' },
    { $lookup: { from: 'users', localField: 'receiver', foreignField: '_id', as: 'receiverInfo' } },
    { $unwind: '$receiverInfo' },
    { $project: {
        content: 1, imageUrl: 1, isRead: 1, readAt: 1, createdAt: 1,
        sender: { _id: '$senderInfo._id', username: '$senderInfo.username', email: '$senderInfo.email' },
        receiver: { _id: '$receiverInfo._id', username: '$receiverInfo.username', email: '$receiverInfo.email' }
      } }
  ]).exec();
  return result[0] || null;
};

// Send message and create notification (using atomic save + lean population)
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!content?.trim() && !receiverId) {
      return res.status(400).json({ message: 'Content and receiver required' });
    }
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content: content.trim().slice(0, 2000),
    });
    await message.save();

    // Create notification for receiver (fire and forget)
    const adminId = await getAdminId();
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'info';

    if (req.user._id.toString() === adminId?.toString()) {
      notificationTitle = 'Admin replied to your message';
      notificationMessage = `Admin: ${content.trim().slice(0, 100)}`;
      notificationType = 'success';
    } else if (receiverId === adminId?.toString()) {
      notificationTitle = `New message from ${req.user.username}`;
      notificationMessage = `${req.user.username}: ${content.trim().slice(0, 100)}`;
      notificationType = 'info';
    }

    if (notificationTitle && notificationMessage) {
      // Do not await, let it run in background
      Notification.create({
        user: receiverId,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        createdBy: req.user._id,
      }).catch(console.error);
    }

    const populated = await getPopulatedMessage(message._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Send image message with notification (similar optimizations)
exports.sendImageMessage = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const imageUrl = req.file.path;
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      imageUrl,
      content: '',
    });
    await message.save();

    const adminId = await getAdminId();
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType = 'info';

    if (req.user._id.toString() === adminId?.toString()) {
      notificationTitle = 'Admin sent an image';
      notificationMessage = 'Admin shared an image with you.';
      notificationType = 'success';
    } else if (receiverId === adminId?.toString()) {
      notificationTitle = `New image from ${req.user.username}`;
      notificationMessage = `${req.user.username} sent an image.`;
      notificationType = 'info';
    }

    if (notificationTitle && notificationMessage) {
      Notification.create({
        user: receiverId,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        createdBy: req.user._id,
      }).catch(console.error);
    }

    const populated = await getPopulatedMessage(message._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get conversation between two users (cursor‑based pagination, no skip/limit)
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const cursor = req.query.cursor || null; // last message _id from previous page
    const { messages, nextCursor, hasMore } = await Message.getConversation(
      req.user._id, userId, limit, cursor
    );
    res.json({ messages, nextCursor, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: get all conversations (optimized aggregation with unread counts)
exports.getAdminConversations = async (req, res) => {
  try {
    const adminId = await getAdminId();
    if (!adminId || req.user._id.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Admin only' });
    }

    // Use aggregation pipeline to get last message per conversation, unread count, and user details
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: adminId }, { receiver: adminId }]
        }
      },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", adminId] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $first: "$content" },
          lastMessageImage: { $first: "$imageUrl" },
          lastMessageTime: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiver", adminId] }, { $eq: ["$isRead", false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          user: { _id: 1, username: 1, email: 1 },
          lastMessage: 1,
          lastMessageImage: 1,
          lastMessageTime: 1,
          unreadCount: 1
        }
      },
      { $sort: { lastMessageTime: -1, _id: -1 } }
    ], { allowDiskUse: false }).exec();

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as read (atomic updateMany)
exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: 'otherUserId required' });
    const result = await Message.updateMany(
      { sender: otherUserId, receiver: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
      { runValidators: false }
    ).lean();
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Edit a message (only sender, within 10 minutes) – atomic update
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    let { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
    content = content.trim().slice(0, 2000);

    // Use findOneAndUpdate with conditional check for edit window
    const message = await Message.findOneAndUpdate(
      {
        _id: id,
        sender: req.user._id,
        createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
      },
      { $set: { content } },
      { new: true, lean: true }
    );
    if (!message) {
      // Check if message exists but older
      const exists = await Message.exists({ _id: id, sender: req.user._id });
      if (exists) return res.status(403).json({ message: 'Cannot edit messages older than 10 minutes' });
      return res.status(404).json({ message: 'Message not found or not yours' });
    }
    // Re‑populate (optional, or return the lean message directly)
    const populated = await getPopulatedMessage(message._id);
    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a message (only sender)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Message.deleteOne({ _id: id, sender: req.user._id }).lean();
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Message not found or not yours' });
    }
    res.json({ success: true, messageId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};