// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.use(auth);
router.get('/gratitude-target', userController.getGratitudeTarget);
router.put('/gratitude-target', userController.updateGratitudeTarget);

module.exports = router;