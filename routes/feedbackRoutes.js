const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

// User routes
router.post('/submit', auth, feedbackController.submitFeedback);
router.get('/testimonials', feedbackController.getApproved); // public

// Admin routes (require authentication and admin check in controller)
router.get('/admin/all', auth, feedbackController.getAllForAdmin);
router.put('/admin/approve/:id', auth, feedbackController.approveFeedback);
router.delete('/admin/reject/:id', auth, feedbackController.rejectFeedback);

module.exports = router;