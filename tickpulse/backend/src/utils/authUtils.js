const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendResponse } = require('./response');
connectDB = require('../config/db');

// Centralized tokenStore
const tokenStore = {
  accessTokens: new Map(),
  refreshTokens: new Map(),

  addAccessToken(jti, expires) {
    this.accessTokens.set(jti, { valid: true, expires });
  },

  invalidateAccessToken(jti) {
    this.accessTokens.delete(jti);
  },

  addRefreshToken(token, userId, expires) {
    this.refreshTokens.set(token, { userId, valid: true, expires });
  },

  invalidateRefreshToken(token) {
    this.refreshTokens.delete(token);
  },

  cleanupExpired() {
    const now = Date.now();
    // Delete expired accessToken
    this.accessTokens.forEach((value, key) => {
      if (value.expires < now) this.accessTokens.delete(key);
    });
    // Delete expired refresjToken
    this.refreshTokens.forEach((value, key) => {
      if (value.expires < now) this.refreshTokens.delete(key);
    });
  }
};

// Delete expired token
// setInterval(() => tokenStore.cleanupExpired(), 60 * 1000);

function generateAccessToken(user) {
  const jti = uuidv4();
  const token = jwt.sign(
    { userId: user.id, email: user.email, jti },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  tokenStore.addAccessToken(jti, Date.now() + 15 * 60 * 1000);
  return { token, jti };
}

function generateRefreshToken(userId) {
	const refreshToken = uuidv4(); // Generate UUIDv4 only
	const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // Expires in 7 days
	tokenStore.addRefreshToken(refreshToken, userId, expires);
	return refreshToken;	
  }

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return sendResponse.error(res, 'No Token Provided', 401);

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const meta = tokenStore.accessTokens.get(decoded.jti);

    if (!meta || !meta.valid || meta.expires < Date.now()) {
      return sendResponse.error(res, 'Invalid Token', 403);
    }

    req.user = decoded;
    next();
  } catch (err) {
    sendResponse.error(res, 'Token Authentication Fail', 403);
  }
}

function handleLogout(req, res) {
  try {
    // 1. 嘗試清理老舊的 accessToken (若有帶的話)
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      if (decoded?.jti) tokenStore.invalidateAccessToken(decoded.jti);
    }
  
    // 🎯 修正：移除強行的 !req.body 400 阻斷檢查。改成「有 refreshToken 才去清理」
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      tokenStore.invalidateRefreshToken(refreshToken);
    }
  
    // 🎯 2. 核心：不論前面是 JWT 還是 Cookie，最終都要徹底清理 Session 與 Cookie
    if (typeof req.logout === 'function') {
      req.logout(() => {
        proceedToDestroySession(req, res);
      });
    } else {
      proceedToDestroySession(req, res);
    }

  } catch (e) {
    console.error('Logout Error:', e);
    sendResponse.error(res, 'Logout Failed', 500);
  }
}

// 輔助函式：確保徹底銷毀與清除 Cookie
function proceedToDestroySession(req, res) {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      // 這裡對齊你原有的 sendResponse 工具
      sendResponse.success(res, { success: true });
    });
  } else {
    res.clearCookie('connect.sid', { path: '/' });
    sendResponse.success(res, { success: true });
  }
}

async function verifyAndAttachUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return sendResponse.error(res, 'No Token Provided', 401);

  try {
    // Check whether the token is valid
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const meta = tokenStore.accessTokens.get(decoded.jti);
    if (!meta || !meta.valid || meta.expires < Date.now()) {
      return sendResponse.error(res, 'Invalid Token', 403);
    }

    // Obtain user data from the database
    const connection = await connectDB();
    const [users] = await connection.query('SELECT * FROM Users WHERE id = ?', [decoded.userId]);
    await connection.end();

    if (users.length === 0) {
      return sendResponse.error(res, 'User not found', 404);
    }

    // Attach user data to the request object
    const user = users[0];
    delete user.password;
    req.user = user;

    next();
  } catch (error) {
    sendResponse.error(res, 'Token Authentication Failed', 403);
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  handleLogout,
  verifyAndAttachUser
};