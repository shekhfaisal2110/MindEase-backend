const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const activityController = require('../controllers/activityController');

// All routes require authentication
router.use(auth);

// Add points for an action (atomic upsert)
router.post('/add', activityController.addPoints);

// Get activity history (cursor‑based pagination already implemented in controller)
router.get('/history', activityController.getActivityHistory);

// Get all‑time total points (optimised aggregation)
router.get('/all-time-total', activityController.getAllTimeTotal);

module.exports = router;