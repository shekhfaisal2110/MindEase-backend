const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const activityController = require('../controllers/activityController');

router.use(auth);

router.post('/add', activityController.addPoints);
router.get('/history', activityController.getActivityHistory);
router.get('/all-time-total', activityController.getAllTimeTotal);

module.exports = router;