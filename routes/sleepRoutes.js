const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const sleepController = require('../controllers/sleepController');

router.use(auth);

router.get('/', sleepController.getSleepLogs);
router.post('/', sleepController.createSleepLog);
router.get('/trends', sleepController.getSleepTrends);
router.delete('/:id', sleepController.deleteSleepLog);

module.exports = router;