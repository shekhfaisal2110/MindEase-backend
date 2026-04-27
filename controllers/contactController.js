const ContactMessage = require('../models/ContactMessage');
const nodemailer = require('nodemailer');

// User sends a message
exports.sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    const contact = new ContactMessage({
      user: req.user._id,
      username: req.user.username,
      email: req.user.email,
      subject,
      message,
      status: 'pending',
    });
    await contact.save();

    // Optional: send email notification to admin
    // You can implement nodemailer here if desired

    res.status(201).json({ message: 'Message sent successfully', contact });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all messages for the logged-in user
exports.getMyMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: reply to a message
exports.replyToMessage = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply is required' });

    const message = await ContactMessage.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.adminReply = reply;
    message.status = 'replied';
    message.repliedAt = new Date();
    await message.save();

    // Optional: send email notification to user
    // You can implement nodemailer to notify user of reply

    res.json({ message: 'Reply sent', contact: message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};