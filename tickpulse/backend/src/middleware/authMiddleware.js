function checkAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
        return next();
    }
	res.status(401).json({ message: 'Unauthorized, please login first' });
}

// For backend testing, if user is already logged in and want to login again, they will be redirected to home page
function checkNotAuthenticated(req, res, next) {
	if (req.isAuthenticated())
		return res.status(400).json({ message: 'Already authenticated' });
	next();
}

const protect = async (req, res, next) => {
	// 🎯 判斷 Session 是否已經通過驗證 (Passport.js 機制)
    if (req.isAuthenticated && req.isAuthenticated()) {
        // 成功登入，req.user 會由 Passport 自動從 Session 反序列化出來，直接放行！
        return next();
    }
    
    // 如果沒有 req.isAuthenticated (代表可能沒用 Passport)，但有手動掛載的 user session
    if (req.session && req.session.user) {
        req.user = req.session.user;
        return next();
    }

    // ❌ 如果都沒有，就代表未驗證，拒絕存取
    return res.status(401).json({ message: 'Not authorized, please login first' });
};

module.exports = {
	checkAuthenticated,
	checkNotAuthenticated,
	protect
};

