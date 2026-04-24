const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const usageController = require('../controllers/usageController');

router.use(auth);

// Device usage
router.get('/device/:date', usageController.getDeviceUsage);
router.post('/device', usageController.updateDeviceUsage);

// App usage
router.get('/app/:date', usageController.getAppUsagesForDate);
router.post('/app', usageController.updateAppUsage);
router.delete('/app/:id', usageController.deleteAppUsage);

// Analytics
router.get('/monthly/:year/:month', usageController.getMonthlySummary);

module.exports = router;