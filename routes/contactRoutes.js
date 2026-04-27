const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const contactController = require('../controllers/contactController');

router.use(auth);

router.post('/send', contactController.sendMessage);
router.get('/my-messages', contactController.getMyMessages);
router.get('/admin/all', contactController.getAllMessages);
router.put('/admin/reply/:id', contactController.replyToMessage);

module.exports = router;