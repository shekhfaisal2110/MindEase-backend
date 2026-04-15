const express = require('express');
const router = express.Router();
const routineController = require('../controllers/routineController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/:date', routineController.getRoutine);
router.put('/:date', routineController.updateRoutine);

module.exports = router;