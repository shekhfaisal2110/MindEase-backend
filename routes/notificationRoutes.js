// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const notificationController = require('../controllers/notificationController');

// // User routes
// router.get('/', auth, notificationController.getUserNotifications);
// router.get('/unread-count', auth, notificationController.getUnreadCount);
// router.put('/:id/read', auth, notificationController.markAsRead);
// router.delete('/:id', auth, notificationController.deleteNotification);

// // Admin routes (all use same auth + admin check inside controller)
// router.get('/admin/all', auth, notificationController.adminGetAllNotifications);
// router.post('/admin/send', auth, notificationController.adminSendNotification);
// router.delete('/admin/:id', auth, notificationController.adminDeleteNotification);
// router.get('/admin/contact-stats', auth, notificationController.adminGetContactStats);
// router.get('/admin/grouped', auth, notificationController.adminGetGroupedNotifications);
// router.delete('/admin/broadcast', auth, notificationController.adminDeleteBroadcast);

// module.exports = router;



const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// User routes
router.get('/', auth, notificationController.getUserNotifications);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.put('/:id/read', auth, notificationController.markAsRead);
router.delete('/:id', auth, notificationController.deleteUserNotification);

// Admin routes
router.get('/admin/grouped', auth, notificationController.adminGetGroupedNotifications);
router.post('/admin/send', auth, notificationController.adminSendNotification);
router.delete('/admin/broadcast', auth, notificationController.adminDeleteBroadcast);
router.get('/admin/contact-stats', auth, notificationController.adminGetContactStats);

module.exports = router;