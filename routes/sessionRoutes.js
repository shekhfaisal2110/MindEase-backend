const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

// All session endpoints require authentication (user or admin? sessions are for users)
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.userType !== 'user') {
    return res.status(403).json({ message: 'Only users can track sessions' });
  }
  next();
});

router.post('/start', sessionController.startSession);
router.post('/heartbeat', sessionController.heartbeat);
router.post('/end', sessionController.endSession);

module.exports = router;