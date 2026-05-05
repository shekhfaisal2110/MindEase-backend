const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

router.post('/start', auth, sessionController.startSession);
router.post('/heartbeat', auth, sessionController.heartbeat);
router.post('/end', auth, sessionController.endSession);

module.exports = router;