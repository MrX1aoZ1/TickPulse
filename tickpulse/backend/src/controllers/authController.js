const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const licenses = require('../licenseKey');
const { handleLogout } = require('../utils/authUtils');
const { sendResponse } = require('../utils/response');
const { getUserByEmail, getUserById, getUserByProvider, createUserAccount } = require('../services/userServices');

const connectDB = require('../config/db');

// Passport Initialization
const initializePassport = require('../passport-config');
initializePassport(passport);

/**
 * @desc    Check Current Auth Status
 * @route   GET /auth/check
 */
const checkAuthStatus = (req, res) => {
    if (req.isAuthenticated() && req.user) {
        return res.status(200).json({
            authenticated: true,
            user: { id: req.user.id, email: req.user.email, user: req.user.username }
        });
    }
    return res.status(401).json({ authenticated: false, message: 'Not authenticated' });
};

/**
 * @desc    User Sign-Up
 * @route   POST /auth/sign-up
 */
const signUp = async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return sendResponse.error(res, 'Email already exists', 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const provider = 'local';
        const defaultUsername = email.split('@')[0];

        const newUser = await createUserAccount(
            email,
            defaultUsername,
            provider,
            email,
            hashedPassword
        );

        return sendResponse.success(res, {
            user: { id: newUser.id, email: newUser.email }
        });
    } catch (error) {
        console.error('Sign-up error:', error);
        return sendResponse.error(res, 'Server error during sign-up', 500);
    }
};

/**
 * @desc    User Login (純 Session Cookie 版本)
 * @route   POST /auth/login
 */
const login = async (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Login Error:', err);
            return sendResponse.error(res, 'Server Error', 500);
        }
        if (!user) {
            // 對齊你原有的狀態碼邏輯
            const statusCode = info.message === 'Email not registered' ? 401 : 402;
            return sendResponse.error(res, info.message, statusCode);
        }

        // 🎯 核心：建立 Passport + Express 的正式 Session
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('Session Error:', loginErr);
                return sendResponse.error(res, 'Session initialization failed', 500);
            }

            // 🎉 成功！Express 會自動在 Response Header 附上 Set-Cookie: connect.sid=...
            return sendResponse.success(res, {
                message: "Login successful",
                user: { id: user.id, email: user.email }
            });
        });
    })(req, res, next);
};

/**
 * @desc    Google Login
 * @route   GET /auth/google
 * @access  Private
 */
const googleLogin = (req, res, next) => {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};


/**
 * @desc    Handle Google OAuth callback after user verification
 * @route   GET /auth/google/callback
 * @access  Private
 */
const googleCallback = (req, res, next) => {
    passport.authenticate('google', {
        failureRedirect: 'http://localhost:3001/login' // Redirect to frontend login on failure
    }, (err, user, info) => {
        if (err) {
            console.error('Google Callback Error:', err);
            return res.redirect('http://localhost:3001/login?error=server_error');
        }
        if (!user) {
            // Handles flash messages or custom linking error messages
            const msg = info?.message ? encodeURIComponent(info.message) : 'auth_failed';
            return res.redirect(`http://localhost:3001/login?error=${msg}`);
        }

        // Establish passport session
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error('Google Session Error:', loginErr);
                return res.redirect('http://localhost:3001/login?error=session_error');
            }
            // Successful authentication, redirect to frontend homepage/dashboard
            //return res.redirect('http://localhost:3001/');

            // For testing without Frontend only
            return res.status(200).json({
                message: "Google Auth Pipeline Success! (Backend Only Test)",
                note: "Cookie (connect.sid) has been automatically saved by your browser.",
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username
                }
            });
        });
    })(req, res, next);
};

/** 
 * @desc    User Logout
 * @route   POST /auth/logout
 * @access  Private
 */
const logout = handleLogout;

module.exports = {
    checkAuthStatus,
    signUp,
    login,
    googleLogin,
    googleCallback,
    logout,
};