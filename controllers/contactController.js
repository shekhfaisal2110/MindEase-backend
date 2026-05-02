// const ContactMessage = require('../models/ContactMessage');
// const nodemailer = require('nodemailer');

// // User sends a message
// exports.sendMessage = async (req, res) => {
//   try {
//     const { subject, message } = req.body;
//     if (!subject || !message) {
//       return res.status(400).json({ message: 'Subject and message are required' });
//     }
//     const contact = new ContactMessage({
//       user: req.user._id,
//       username: req.user.username,
//       email: req.user.email,
//       subject,
//       message,
//       status: 'pending',
//     });
//     await contact.save();

//     // Optional: send email notification to admin
//     // You can implement nodemailer here if desired

//     res.status(201).json({ message: 'Message sent successfully', contact });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get all messages for the logged-in user
// exports.getMyMessages = async (req, res) => {
//   try {
//     const messages = await ContactMessage.find({ user: req.user._id }).sort({ createdAt: -1 });
//     res.json(messages);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: get all messages
// exports.getAllMessages = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const messages = await ContactMessage.find().sort({ createdAt: -1 });
//     res.json(messages);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Admin: reply to a message
// exports.replyToMessage = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const { id } = req.params;
//     const { reply } = req.body;
//     if (!reply) return res.status(400).json({ message: 'Reply is required' });

//     const message = await ContactMessage.findById(id);
//     if (!message) return res.status(404).json({ message: 'Message not found' });

//     message.adminReply = reply;
//     message.status = 'replied';
//     message.repliedAt = new Date();
//     await message.save();

//     // Optional: send email notification to user
//     // You can implement nodemailer to notify user of reply

//     res.json({ message: 'Reply sent', contact: message });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };




const ContactMessage = require('../models/ContactMessage');
const nodemailer = require('nodemailer');

// Optional: configure email transporter (if you want to send email notifications)
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

// Helper to send email notification
const sendEmailNotification = async (to, subject, html) => {
  if (!transporter || process.env.NODE_ENV !== 'production') return;
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
  } catch (err) { console.error('Email send failed:', err); }
};

// User sends a message (with rate limiting handled in route)
exports.sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    // Trim and limit length
    const trimmedSubject = subject.trim().slice(0, 200);
    const trimmedMessage = message.trim().slice(0, 2000);

    const contact = new ContactMessage({
      user: req.user._id,
      username: req.user.username,
      email: req.user.email,
      subject: trimmedSubject,
      message: trimmedMessage,
      status: 'pending',
    });
    await contact.save();

    // Optional: notify admin via email (async, don't await to avoid blocking)
    sendEmailNotification(
      process.env.ADMIN_EMAIL,
      `New Contact Message from ${req.user.username}`,
      `<p><strong>Subject:</strong> ${trimmedSubject}</p><p><strong>Message:</strong> ${trimmedMessage}</p>`
    );

    res.status(201).json({ message: 'Message sent successfully', contactId: contact._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's messages with pagination
exports.getMyMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      ContactMessage.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('subject message status adminReply createdAt repliedAt') // projection
        .lean(),
      ContactMessage.countDocuments({ user: req.user._id })
    ]);

    res.json({
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all messages (with pagination & filtering)
exports.getAllMessages = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status; // optional: 'pending' or 'replied'

    const filter = {};
    if (statusFilter && ['pending', 'replied'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email') // populate user details
        .lean(),
      ContactMessage.countDocuments(filter)
    ]);

    res.json({
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: reply to a message (atomic update)
exports.replyToMessage = async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (req.user.email !== adminEmail) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;
    let { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply is required' });

    reply = reply.trim().slice(0, 2000); // limit length

    const updatedMessage = await ContactMessage.findOneAndUpdate(
      { _id: id, status: 'pending' }, // only pending messages can be replied
      {
        $set: {
          adminReply: reply,
          status: 'replied',
          repliedAt: new Date()
        }
      },
      { new: true, lean: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found or already replied' });
    }

    // Send email notification to user (optional)
    sendEmailNotification(
      updatedMessage.email,
      `Reply to your message: ${updatedMessage.subject}`,
      `<p><strong>Admin reply:</strong> ${reply}</p><p>You can view it in your dashboard.</p>`
    );

    res.json({ message: 'Reply sent', contact: updatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};