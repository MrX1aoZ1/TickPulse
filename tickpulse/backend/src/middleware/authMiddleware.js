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
	await verifyAndAttachUser(req, res, next);
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

