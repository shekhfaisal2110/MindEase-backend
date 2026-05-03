const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const thoughtRecordController = require('../controllers/thoughtRecordController');

router.use(auth);
router.get('/', thoughtRecordController.getThoughtRecords);
router.post('/', thoughtRecordController.createThoughtRecord);
router.get('/stats', thoughtRecordController.getStats);
router.delete('/:id', thoughtRecordController.deleteThoughtRecord);

module.exports = router;