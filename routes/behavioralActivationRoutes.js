const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/behavioralActivationController');

// All routes are protected by authentication
router.get('/tasks', auth, controller.getTasks);
router.post('/tasks', auth, controller.createTask);
router.patch('/tasks/:id/complete', auth, controller.completeTask);
router.patch('/tasks/:id/skip', auth, controller.skipTask);
router.get('/insights', auth, controller.getWeeklyInsights);
router.get('/history', auth, controller.getMonthHistory);

module.exports = router;