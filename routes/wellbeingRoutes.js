const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const wellbeingController = require('../controllers/wellbeingController');

router.use(auth);

router.get('/', wellbeingController.getActivities);
router.post('/', wellbeingController.addActivity);
router.put('/:id', wellbeingController.updateActivity);
router.delete('/:id', wellbeingController.deleteActivity);

module.exports = router;