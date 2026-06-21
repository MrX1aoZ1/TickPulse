const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { tokenStore, generateAccessToken, generateRefreshToken } = require('../utils/authUtils');
const { verifyToken } = require('../utils/authUtils');
const { checkAuthenticated } = require('../middleware/authMiddleware.js');
const { sendResponse } = require('../utils/response');

// @desc    Access protected data i.e. for testing in backend only
// @route   POST /api/protected-data
// @access  Private
router.get('/protected-data', verifyToken, (req, res) => {
	res.json({ secret: 'Protected data' });
});

// @desc    Access home data i.e. for testing in backend only
// @route   POST /api/home-data
// @access  Private
router.get('/home-data', verifyToken, (req, res) => {
	res.json({
		protectedData: 'Protected data for authenticated users',
		user: req.user
	});
});

// @desc    Update refresh token and access token using refresh token
// @route   POST /api/refresh-token
// @access  Private
router.post('/refresh-token', (req, res) => {
	const oldRefreshToken = req.body.refreshToken;
  
	// 1. Validate the validity of Refresh Token 
	const meta = tokenStore.refreshTokens.get(oldRefreshToken);
	if (!meta || !meta.valid) {
	  return sendResponse.error(res, 'Invalid Refresh Token', 403);
	}

	// 2. Generate new Tokens
	const newAccessToken = generateAccessToken({ id: meta.userId }).token;
	const newRefreshToken = generateRefreshToken(meta.userId);

	// 3. Invalidate old Token and store new Token
	tokenStore.invalidateRefreshToken(oldRefreshToken);

	// 4. Return standardized response
	sendResponse.success(res, {
	  accessToken: newAccessToken,
	  refreshToken: newRefreshToken
	});
  });

// @desc    Verify whether the access token is valid i.e. for testing in backend only
// @route   POST /api/verify-token
// @access  Private
router.get('/verify-token', verifyToken, (req, res) => {
	res.json({
		valid: true,
		user: req.user
	});
});

module.exports = router