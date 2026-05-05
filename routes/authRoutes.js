const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Authentication routes – all controller methods already optimised
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
router.post('/request-password-change-otp', auth, authController.requestPasswordChangeOTP);
router.post('/verify-password-change-otp', auth, authController.verifyPasswordChangeOTP);
router.post('/change-password-with-otp', auth, authController.changePasswordWithOTP);

module.exports = router;
