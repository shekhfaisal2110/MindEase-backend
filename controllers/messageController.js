// const Message = require('../models/Message');
// const User = require('../models/User');

// const getAdminId = async () => {
//   const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
//   return admin?._id;
// };

// exports.sendMessage = async (req, res) => {
//   try {
//     const { receiverId, content } = req.body;
//     const message = new Message({
//       sender: req.user._id,
//       receiver: receiverId,
//       content: content || '',
//     });
//     await message.save();
//     const populated = await Message.findById(message._id).populate('sender receiver', 'username email');
//     res.status(201).json(populated);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Upload image and send as message
// exports.sendImageMessage = async (req, res) => {
//   try {
//     const { receiverId } = req.body;
//     if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
//     const imageUrl = req.file.path; // Cloudinary URL
//     const message = new Message({
//       sender: req.user._id,
//       receiver: receiverId,
//       imageUrl,
//       content: '',
//     });
//     await message.save();
//     const populated = await Message.findById(message._id).populate('sender receiver', 'username email');
//     res.status(201).json(populated);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getConversation = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const messages = await Message.find({
//       $or: [
//         { sender: req.user._id, receiver: userId },
//         { sender: userId, receiver: req.user._id }
//       ]
//     }).populate('sender receiver', 'username email').sort({ createdAt: 1 });
//     res.json(messages);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getAdminConversations = async (req, res) => {
//   try {
//     const adminId = await getAdminId();
//     if (!adminId || req.user._id.toString() !== adminId.toString()) {
//       return res.status(403).json({ message: 'Admin only' });
//     }
//     const messages = await Message.find({
//       $or: [{ sender: adminId }, { receiver: adminId }]
//     }).sort({ createdAt: -1 });
    
//     const conversations = {};
//     for (const msg of messages) {
//       const otherId = msg.sender.toString() === adminId.toString() ? msg.receiver.toString() : msg.sender.toString();
//       if (!conversations[otherId]) {
//         const user = await User.findById(otherId).select('username email');
//         conversations[otherId] = {
//           user,
//           lastMessage: msg.content,
//           lastMessageTime: msg.createdAt,
//           unreadCount: msg.receiver.toString() === adminId.toString() && !msg.isRead ? 1 : 0
//         };
//       } else if (msg.receiver.toString() === adminId.toString() && !msg.isRead) {
//         conversations[otherId].unreadCount++;
//       }
//     }
//     res.json(Object.values(conversations));
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.markAsRead = async (req, res) => {
//   try {
//     const { otherUserId } = req.body;
//     await Message.updateMany(
//       { sender: otherUserId, receiver: req.user._id, isRead: false },
//       { isRead: true, readAt: new Date() }
//     );
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Edit a message (only sender, within 10 minutes)
// exports.editMessage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { content } = req.body;
//     const message = await Message.findById(id);
//     if (!message) return res.status(404).json({ message: 'Message not found' });
//     if (message.sender.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'You can only edit your own messages' });
//     }
//     // Optional: restrict edits to within 10 minutes of creation
//     const tenMinutes = 10 * 60 * 1000;
//     if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) {
//       return res.status(403).json({ message: 'Cannot edit messages older than 10 minutes' });
//     }
//     message.content = content;
//     await message.save();
//     // Return updated message with populated sender/receiver
//     const updated = await Message.findById(id).populate('sender receiver', 'username email');
//     res.json(updated);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // Delete a message (only sender)
// exports.deleteMessage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const message = await Message.findById(id);
//     if (!message) return res.status(404).json({ message: 'Message not found' });
//     if (message.sender.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'You can only delete your own messages' });
//     }
//     await message.deleteOne();
//     res.json({ success: true, messageId: id });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };









const Message = require('../models/Message');
const User = require('../models/User');

// Cache adminId in memory (reset on server restart, ok)
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

// Helper to get populated message with limited fields
const getPopulatedMessage = async (messageId) => {
  return Message.findById(messageId)
    .populate('sender', 'username email')
    .populate('receiver', 'username email')
    .lean();
};

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
    const populated = await getPopulatedMessage(message._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Upload image and send as message
exports.sendImageMessage = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
    const imageUrl = req.file.path; // Cloudinary URL
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      imageUrl,
      content: '',
    });
    await message.save();
    const populated = await getPopulatedMessage(message._id);
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get conversation between two users (with pagination)
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .sort({ createdAt: -1 }) // newest first, then reverse for display
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username email')
      .populate('receiver', 'username email')
      .lean();

    // Reverse to get chronological order (oldest first for UI)
    messages.reverse();
    res.json({ messages, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: get all conversations (optimized aggregation)
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
      {
        $sort: { createdAt: -1 }
      },
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
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
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
      { $sort: { lastMessageTime: -1 } }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as read (atomic update)
exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: 'otherUserId required' });
    await Message.updateMany(
      { sender: otherUserId, receiver: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Edit a message (only sender, within 10 minutes)
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    let { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content required' });
    content = content.trim().slice(0, 2000);

    const message = await Message.findOne({ _id: id, sender: req.user._id });
    if (!message) return res.status(404).json({ message: 'Message not found or not yours' });

    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) {
      return res.status(403).json({ message: 'Cannot edit messages older than 10 minutes' });
    }

    message.content = content;
    await message.save();
    const updated = await getPopulatedMessage(message._id);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a message (only sender)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Message.deleteOne({ _id: id, sender: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Message not found or not yours' });
    }
    res.json({ success: true, messageId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};