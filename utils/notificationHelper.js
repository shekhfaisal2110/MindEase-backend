// utils/notificationHelper.js
const Notification = require('../models/Notification');

/**
 * Create a milestone notification for a user
 * @param {ObjectId} userId
 * @param {string} title
 * @param {string} message
 * @param {object} metadata optional
 */
const createMilestoneNotification = async (userId, title, message, metadata = {}) => {
  const notification = new Notification({
    user: userId,
    title,
    message,
    type: 'milestone',
    metadata
  });
  await notification.save();
  return notification;
};

module.exports = { createMilestoneNotification };