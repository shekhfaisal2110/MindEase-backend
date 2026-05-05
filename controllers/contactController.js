// const ContactMessage = require('../models/ContactMessage');
// const Notification = require('../models/Notification');
// const User = require('../models/User');
// const axios = require('axios');

// // Brevo API configuration
// const BREVO_API_KEY = process.env.BREVO_API_KEY;
// const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

// // Helper to send email via Brevo (Sendinblue)
// const sendBrevoEmail = async (to, subject, htmlContent) => {
//   if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) return;
//   try {
//     await axios.post('https://api.brevo.com/v3/smtp/email', {
//       sender: { email: BREVO_SENDER_EMAIL },
//       to: [{ email: to }],
//       subject,
//       htmlContent
//     }, {
//       headers: {
//         'api-key': BREVO_API_KEY,
//         'Content-Type': 'application/json'
//       }
//     });
//   } catch (err) {
//     console.error('Brevo email send failed:', err.response?.data || err.message);
//   }
// };

// // Helper to create in-app notification
// const createNotification = async (userId, title, message, type, createdBy) => {
//   await Notification.create({ user: userId, title, message, type, createdBy });
// };

// // User sends a message
// exports.sendMessage = async (req, res) => {
//   try {
//     const { subject, message } = req.body;
//     if (!subject || !message) {
//       return res.status(400).json({ message: 'Subject and message are required' });
//     }
//     const trimmedSubject = subject.trim().slice(0, 200);
//     const trimmedMessage = message.trim().slice(0, 2000);

//     const contact = new ContactMessage({
//       user: req.user._id,
//       username: req.user.username,
//       email: req.user.email,
//       subject: trimmedSubject,
//       message: trimmedMessage,
//       status: 'pending',
//     });
//     await contact.save();

//     // Notify admin via in-app notification
//     const admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
//     if (admin) {
//       await createNotification(
//         admin._id,
//         'New Contact Message',
//         `${req.user.username} sent a message: "${trimmedSubject}"`,
//         'info',
//         req.user._id
//       );
//     }

//     // Send email to admin via Brevo
//     await sendBrevoEmail(
//       process.env.ADMIN_EMAIL,
//       `New Contact Message from ${req.user.username}`,
//       `<h3>New Message from ${req.user.username} (${req.user.email})</h3>
//        <p><strong>Subject:</strong> ${trimmedSubject}</p>
//        <p><strong>Message:</strong> ${trimmedMessage}</p>`
//     );

//     res.status(201).json({ message: 'Message sent successfully', contactId: contact._id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Get user's messages with pagination
// exports.getMyMessages = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const [messages, total] = await Promise.all([
//       ContactMessage.find({ user: req.user._id })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .select('subject message status adminReply createdAt repliedAt')
//         .lean(),
//       ContactMessage.countDocuments({ user: req.user._id })
//     ]);
//     res.json({ messages, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Admin: get all messages (with pagination & filtering)
// exports.getAllMessages = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;
//     const statusFilter = req.query.status;
//     const filter = {};
//     if (statusFilter && ['pending', 'replied'].includes(statusFilter)) {
//       filter.status = statusFilter;
//     }
//     const [messages, total] = await Promise.all([
//       ContactMessage.find(filter)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate('user', 'username email')
//         .lean(),
//       ContactMessage.countDocuments(filter)
//     ]);
//     res.json({ messages, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // Admin: reply to a message (atomic update) – sends in-app notification to user
// exports.replyToMessage = async (req, res) => {
//   try {
//     const adminEmail = process.env.ADMIN_EMAIL;
//     if (req.user.email !== adminEmail) {
//       return res.status(403).json({ message: 'Admin access required' });
//     }
//     const { id } = req.params;
//     let { reply } = req.body;
//     if (!reply) return res.status(400).json({ message: 'Reply is required' });
//     reply = reply.trim().slice(0, 2000);

//     const updatedMessage = await ContactMessage.findOneAndUpdate(
//       { _id: id, status: 'pending' },
//       { $set: { adminReply: reply, status: 'replied', repliedAt: new Date() } },
//       { new: true, lean: true }
//     );
//     if (!updatedMessage) {
//       return res.status(404).json({ message: 'Message not found or already replied' });
//     }

//     // Send in-app notification to user
//     await createNotification(
//       updatedMessage.user,
//       'Admin replied to your message',
//       `Regarding "${updatedMessage.subject}": ${reply.slice(0, 100)}${reply.length > 100 ? '...' : ''}`,
//       'success',
//       req.user._id
//     );

//     // Send email to user via Brevo
//     await sendBrevoEmail(
//       updatedMessage.email,
//       `Reply to your message: ${updatedMessage.subject}`,
//       `<h3>You have a reply from MindEase support</h3>
//        <p><strong>Subject:</strong> ${updatedMessage.subject}</p>
//        <p><strong>Your message:</strong> ${updatedMessage.message}</p>
//        <p><strong>Admin reply:</strong> ${reply}</p>
//        <p>You can view this conversation in your dashboard.</p>`
//     );

//     res.json({ message: 'Reply sent', contact: updatedMessage });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };







const ContactMessage = require('../models/ContactMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');
const axios = require('axios');

// Brevo API configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

// Fire‑and‑forget helpers (do not block responses)
const sendBrevoEmail = async (to, subject, htmlContent) => {
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) return;
  try {
    await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent
    }, {
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Brevo email send failed:', err.response?.data || err.message);
  }
};

const createNotification = async (userId, title, message, type, createdBy) => {
  try {
    await Notification.create({ user: userId, title, message, type, createdBy });
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

// User sends a message
exports.sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    
    const contact = await ContactMessage.createMessage({
      user: req.user._id,
      username: req.user.username,
      email: req.user.email,
      subject: subject.trim().slice(0, 200),
      message: message.trim().slice(0, 2000),
    });

    // Fire async notifications – do not await
    (async () => {
      const admin = await User.findOne({ email: process.env.ADMIN_EMAIL }, { _id: 1 }).lean();
      if (admin) {
        await createNotification(
          admin._id,
          'New Contact Message',
          `${req.user.username} sent: "${contact.subject}"`,
          'info',
          req.user._id
        );
      }
      await sendBrevoEmail(
        process.env.ADMIN_EMAIL,
        `New Contact Message from ${req.user.username}`,
        `<h3>New Message from ${req.user.username} (${req.user.email})</h3>
         <p><strong>Subject:</strong> ${contact.subject}</p>
         <p><strong>Message:</strong> ${contact.message}</p>`
      );
    })();

    res.status(201).json({ message: 'Message sent successfully', contactId: contact._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's messages – cursor pagination (no skip)
exports.getMyMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;
    const result = await ContactMessage.getUserMessages(req.user._id, limit, cursor);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all messages (with status filter, cursor pagination)
exports.getAllMessages = async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const status = req.query.status === 'pending' ? 'pending' : null;
    
    let messages, nextCursor, hasMore;
    if (status === 'pending') {
      const result = await ContactMessage.getPendingMessages(limit, cursor);
      messages = result.messages;
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
    } else {
      // No status filter (all) – use a simple cursor on createdAt
      const query = {};
      if (cursor) query._id = { $lt: cursor };
      messages = await ContactMessage.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .select('user username email subject message status adminReply createdAt repliedAt')
        .lean();
      nextCursor = messages.length === limit ? messages[messages.length - 1]._id : null;
      hasMore = !!nextCursor;
    }
    res.json({ messages, nextCursor, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: reply to a message (atomic update) – background notifications
exports.replyToMessage = async (req, res) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { id } = req.params;
    let { reply } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply is required' });
    reply = reply.trim().slice(0, 2000);

    const updatedMessage = await ContactMessage.replyToMessage(id, reply);
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found or already replied' });
    }

    // Fire async notifications
    (async () => {
      await createNotification(
        updatedMessage.user,
        'Admin replied to your message',
        `Regarding "${updatedMessage.subject}": ${reply.slice(0, 100)}${reply.length > 100 ? '...' : ''}`,
        'success',
        req.user._id
      );
      await sendBrevoEmail(
        updatedMessage.email,
        `Reply to your message: ${updatedMessage.subject}`,
        `<h3>You have a reply from MindEase support</h3>
         <p><strong>Subject:</strong> ${updatedMessage.subject}</p>
         <p><strong>Your message:</strong> ${updatedMessage.message}</p>
         <p><strong>Admin reply:</strong> ${reply}</p>
         <p>You can view this conversation in your dashboard.</p>`
      );
    })();

    res.json({ message: 'Reply sent', contact: updatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};