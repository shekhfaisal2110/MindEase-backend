const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dailyActivityController = require('../controllers/dailyActivityController');

router.use(auth);

router.post('/page-view', dailyActivityController.recordPageView);
router.post('/task-completion', dailyActivityController.recordTaskCompletion);
router.post('/routine-item', dailyActivityController.recordRoutineItem);
router.post('/hourly-emotion-block', dailyActivityController.recordHourlyEmotionBlock);

module.exports = router;