const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.get('/progress', auth, exportController.exportProgressPDF);

module.exports = router;