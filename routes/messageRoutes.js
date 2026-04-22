const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const { upload } = require('../utils/cloudinary');

router.use(auth);

router.post('/', messageController.sendMessage);
router.post('/image', upload.single('image'), messageController.sendImageMessage);
router.get('/conversation/:userId', messageController.getConversation);
router.get('/admin/conversations', messageController.getAdminConversations);
router.post('/mark-read', messageController.markAsRead);
router.put('/:id', messageController.editMessage);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;