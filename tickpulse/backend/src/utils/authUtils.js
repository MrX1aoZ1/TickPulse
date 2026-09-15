const { v4: uuidv4 } = require('uuid');
const { sendResponse } = require('./response');
connectDB = require('../config/db');

function handleLogout(req, res) {
  try {
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


module.exports = {
  handleLogout,
};