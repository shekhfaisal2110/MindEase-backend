// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const auth = require('../middleware/auth');

// router.post('/register', authController.register);
// router.post('/verify-otp', authController.verifyOTP);
// router.post('/resend-otp', authController.resendOTP);
// router.post('/login', authController.login);
// router.post('/refresh-token', authController.refreshToken);
// router.get('/login-history', auth, authController.getLoginHistory);
// router.post('/forgot-password', authController.forgotPassword);
// router.post('/reset-password', authController.resetPassword);
// router.get('/check-email/:email', authController.checkEmail);
// router.get('/admin', auth, authController.getAdmin);

// module.exports = router;


const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Safety: ensure all required controller methods exist
const requiredMethods = [
  'register', 'verifyOTP', 'resendOTP', 'login', 'refreshToken',
  'getLoginHistory', 'forgotPassword', 'resetPassword', 'checkEmail', 'getAdmin'
];

requiredMethods.forEach(method => {
  if (typeof authController[method] !== 'function') {
    console.error(`❌ Missing controller method: authController.${method}`);
    process.exit(1);
  }
});

// Routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/login-history', auth, authController.getLoginHistory);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/check-email/:email', authController.checkEmail);
router.get('/admin', auth, authController.getAdmin);

module.exports = router;