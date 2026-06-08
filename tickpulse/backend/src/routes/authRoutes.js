const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const licenses = require('../licenseKey');
const { generateAccessToken, generateRefreshToken, handleLogout } = require('../utils/authUtils');
const { sendResponse } = require('../utils/response');
const { checkNotAuthenticated } = require('../middleware/authMiddleware');
const connectDB = require('../config/db');

// Passport Initialization
const initializePassport = require('../passport-config');
initializePassport(passport);

// @desc    User Sign-Up
// @route   POST /auth/sign-up
// @access  Private
router.post('/sign-up', checkNotAuthenticated, async (req, res) => {
  try {
    const { email, password, licenseKey } = req.body;

    console.log(email, password, licenseKey);

    const connection = await connectDB();
    const [existingUsers] = await connection.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      await connection.end();
      return sendResponse.error(res, 'Email already exists', 400);
    }

    const licenseType = licenses[licenseKey] ? licenses[licenseKey].type : 'invalid';
    console.log(licenseKey, licenseType);
    if (licenseType === 'invalid') {
      await connection.end();
      return sendResponse.error(res, 'Invalid license key', 401);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      'INSERT INTO Users (email, password, license_key) VALUES (?, ?, ?)',
      [email, hashedPassword, licenseKey]
    );
    await connection.end();

    sendResponse.success(res, { 
      user: { id: result.insertId, email: email }
    });
  } catch (error) {
    console.error("Sign-Up Error:", error);
    sendResponse.error(res, 'Server Error, Please Try Again Later', 500);
  }
});

// @desc    User Login
// @route   POST /auth/login 
// @access  Private
router.post('/login', checkNotAuthenticated, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login Error:', err);
      return sendResponse.error(res, 'Server Error', 500);
    }
    if (!user) {
      const statusCode = info.message === 'Email not registered' ? 401 : 402;
      return sendResponse.error(res, info.message, statusCode);
    }

    req.login(user, async (err) => {
      if (err) {
        console.error('Session Error:', err);
        return sendResponse.error(res, 'Session initialization failed', 500);
      }

      try {
        // Generate Token
        const accessToken = generateAccessToken(user).token;
        const refreshToken = generateRefreshToken(user.id);

        // Return response
        sendResponse.success(res, {
          user: { id: user.id, email: user.email },
          accessToken,
          refreshToken
        });
      } catch (error) {
        console.error('Error in generating token:', error);
        sendResponse.error(res, 'Login Failed', 500);
      }
    });
  })(req, res, next);
});

// @desc    User Logout
// @route   POST /auth/logout
// @access  Private
router.post('/logout', handleLogout);

module.exports = router;