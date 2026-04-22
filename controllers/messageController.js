const Message = require('../models/Message');
const User = require('../models/User');

const getAdminId = async () => {
  const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  return admin?._id;
};

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content: content || '',
    });
    await message.save();
    const populated = await Message.findById(message._id).populate('sender receiver', 'username email');
    res.status(201).json(populated);
  } catch (error) {
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
    const populated = await Message.findById(message._id).populate('sender receiver', 'username email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    }).populate('sender receiver', 'username email').sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminConversations = async (req, res) => {
  try {
    const adminId = await getAdminId();
    if (!adminId || req.user._id.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Admin only' });
    }
    const messages = await Message.find({
      $or: [{ sender: adminId }, { receiver: adminId }]
    }).sort({ createdAt: -1 });
    
    const conversations = {};
    for (const msg of messages) {
      const otherId = msg.sender.toString() === adminId.toString() ? msg.receiver.toString() : msg.sender.toString();
      if (!conversations[otherId]) {
        const user = await User.findById(otherId).select('username email');
        conversations[otherId] = {
          user,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: msg.receiver.toString() === adminId.toString() && !msg.isRead ? 1 : 0
        };
      } else if (msg.receiver.toString() === adminId.toString() && !msg.isRead) {
        conversations[otherId].unreadCount++;
      }
    }
    res.json(Object.values(conversations));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    await Message.updateMany(
      { sender: otherUserId, receiver: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit a message (only sender, within 10 minutes)
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }
    // Optional: restrict edits to within 10 minutes of creation
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) {
      return res.status(403).json({ message: 'Cannot edit messages older than 10 minutes' });
    }
    message.content = content;
    await message.save();
    // Return updated message with populated sender/receiver
    const updated = await Message.findById(id).populate('sender receiver', 'username email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a message (only sender)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    await message.deleteOne();
    res.json({ success: true, messageId: id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};