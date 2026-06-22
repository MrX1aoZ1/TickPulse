const { verifyAndAttachUser } = require('../utils/authUtils');

function checkAuthenticated(req, res, next) {
	if (req.isAuthenticated()) return next();
	res.status(401).json({ message: 'Not authenticated' });
}

// For backend testing, if user is already logged in and want to login again, they will be redirected to home page
function checkNotAuthenticated(req, res, next) {
	if (req.isAuthenticated())
		return res.status(403).json({ message: 'Already authenticated' });
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

// for testing purposes
// const protect = async (req, res, next) => {
//     try {
//         let token = req.headers.authorization;

//         if (token && token.startsWith('Bearer')) {
//             token = token.split(' ')[1];
//             console.log('JWT Secret:', process.env.JWT_SECRET);
//             console.log('Token to Verify:', token);

//             try {
//                 const decoded = jwt.verify(token, process.env.JWT_SECRET);
//                 console.log('Decoded Token:', decoded);

//                 // Connect to the database
//                 const connection = await connectDB();

//                 // Query the user by ID
//                 const [rows] = await connection.query('SELECT * FROM Users WHERE id = ?', [decoded.id]);

//                 // Close the database connection
//                 await connection.end();

//                 if (rows.length === 0) {
//                     return res.status(401).json({ message: 'Not authorized, user not found' });
//                 }

//                 // Attach the user to the request object
//                 const user = rows[0];
//                 delete user.password; // Remove the password field
//                 req.user = user;

//                 next();
//             } catch (error) {
//                 console.error('JWT Verification Error:', error.message);
//                 return res.status(401).json({ message: 'Token failed', error: error.message });
//             }
//         } else {
//             res.status(401).json({ message: 'Not authorized, no token' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


module.exports = {
	checkAuthenticated,
	checkNotAuthenticated,
	protect
};

