const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const motivationController = require('../controllers/motivationController');

// Public (no auth) – get approved thoughts
router.get('/thoughts', motivationController.getApprovedThoughts);

// Authenticated – submit a thought
router.post('/thoughts', auth, motivationController.submitThought);

// Admin routes
router.get('/admin/pending', auth, motivationController.getPendingThoughts);
router.put('/admin/approve/:id', auth, motivationController.approveThought);
router.delete('/admin/reject/:id', auth, motivationController.rejectThought);

module.exports = router;