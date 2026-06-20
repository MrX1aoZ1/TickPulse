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
  console.log('sign-up');

  let connection; // 將連線宣告在外層，確保 catch 區塊也能安全關閉它
  try {
    const { email, password } = req.body;

    console.log(email, password);

    connection = await connectDB();
    const [existingUsers] = await connection.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      await connection.end();
      return sendResponse.error(res, 'Email already exists', 400);
    }

    // const licenseType = licenses[licenseKey] ? licenses[licenseKey].type : 'invalid';
    // console.log(licenseKey, licenseType);
    // if (licenseType === 'invalid') {
    //   await connection.end();
    //   return sendResponse.error(res, 'Invalid license key', 401);
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const provider = 'local';

    // 🌟 將變數宣告在外面，這樣最後的成功回應才拿得到
    let insertedUserId;

    try {
      await connection.beginTransaction();

      const defaultUsername = email.split('@')[0];
      const [user_result] = await connection.query(
        'INSERT INTO Users (email, username) VALUES (?, ?)',
        [email, defaultUsername]
      );
      
      // 🌟 【核心修正】MySQL 的自增 ID 欄位叫做 insertId，不是 id！
      insertedUserId = user_result.insertId; 
      
      const [auth_result] = await connection.query(
        'INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, ?, ?, ?)',
        [insertedUserId, provider, email, hashedPassword]
      );
      await connection.commit();

      /**
        * Initialize system default categories for the user.
        * Note: Deterministic ID - Initialize the system default Inbox for the new user.
        * Using a predictable ID avoids duplicate primary key errors in multi-user environments 
        * and eliminates the need for an extra SELECT query when creating new tasks.
        */
      const defaultInboxId = `inbox_${insertedUserId}`;
      const [category_result] = await connection.query(
        'INSERT INTO Categories (id, user_id, category_name) VALUES (?, ?, ?)',
        [defaultInboxId, insertedUserId, 'Inbox']
      )

    } catch (error) {
      if (connection) await connection.rollback();
      console.error('Sign-up Failure, Rolling back:', error);
      throw error;
    }

    await connection.end();

    sendResponse.success(res, {
      user: { id: insertedUserId, email: email }
    });
  } catch (error) {
    console.error("Sign-Up Error:", error);
    
    // 安全防禦：如果出錯了，但連線還開著，必須關閉它
    if (connection) {
      try { await connection.end(); } catch(e) {}
    }
    
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