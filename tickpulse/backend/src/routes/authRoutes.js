const express = require('express');
const router = express.Router();
const { signUp, login, logout, googleLogin, googleCallback, checkAuthStatus } = require('../controllers/authController');
const { checkNotAuthenticated } = require('../middleware/authMiddleware');

// Chek Login Status
router.get('/check', checkAuthStatus);

// Local Auth Routes
router.post('/sign-up', checkNotAuthenticated, signUp);
router.post('/login', checkNotAuthenticated, login);

// Google OAuth Routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// Logout Route
router.post('/logout', logout);

module.exports = router;