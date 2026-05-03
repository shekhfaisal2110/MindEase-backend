// routes/insightRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const insightController = require('../controllers/insightController');

router.get('/', auth, insightController.getUserInsights);
router.post('/regenerate', auth, insightController.regenerateInsights);

module.exports = router;