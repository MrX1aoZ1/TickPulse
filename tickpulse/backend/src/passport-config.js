const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const connectDB = require('./config/db');

// Obtain user info. by email from the database
async function getUserByEmail(email) {
  const connection = await connectDB();
  try {
    const [users] = await connection.query('SELECT * FROM Users WHERE email = ?', [email]);
    return users[0] || null;
  } finally {
    await connection.end();
  }
}

// Obtain user info. by ID from database
async function getUserById(id) {
  const connection = await connectDB();
  try {
    const [users] = await connection.query('SELECT * FROM Users WHERE id = ?', [id]);
    return users[0] || null;
  } finally {
    await connection.end();
  }
}

// Password comparision with the database
function initialize(passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Email not registered' });
          }
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Password incorrect' });
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id); // Search User ID from Database
      done(null, user);
    } catch (e) {
      done(e);
    }
  })
}

module.exports = initialize