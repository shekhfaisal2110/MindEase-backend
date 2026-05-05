const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

// Public route for approved testimonials
router.get('/testimonials', feedbackController.getApproved);

// Authenticated routes
router.post('/', auth, feedbackController.submitFeedback);
router.get('/admin/all', auth, feedbackController.getAllForAdmin);
router.put('/admin/approve/:id', auth, feedbackController.approveFeedback);
router.delete('/admin/reject/:id', auth, feedbackController.rejectFeedback);

module.exports = router;