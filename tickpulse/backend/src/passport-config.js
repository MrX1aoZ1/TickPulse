const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy

const bcrypt = require('bcrypt')
const connectDB = require('./config/db');

const { getUserByEmail, getUserById, getUserByProvider, createUserAccount, isProviderLinked } = require('./services/userServices')

// Password comparision with the database
function initialize(passport) {
  /**
    * Local Strategy: Login with email and password
    */
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

  /**
   * Google OAuth 2.0 Strategy: Handles signup, login, and post-login account binding
   */
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true // 🌟 REQUIRED: Enables access to 'req' to check login status
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails[0].value;
          const username = profile.displayName || email.split('@')[0];

          // Scenario A: User is already logged in (Account Linking Flow)
          if (req.user) {
            const isAlreadyLinked = await isProviderLinked('google', googleId);
            if (isAlreadyLinked) {
              return done(null, false, { message: 'This Google account is already linked to another user.' });
            }
            
            await userService.linkProviderToUser(req.user.id, 'google', googleId);
            return done(null, req.user); // Keep the current user logged in
          }

          // Scenario B: User is NOT logged in (Standard Login/Signup Flow)
          const existingUser = await getUserByProvider('google', googleId);
          if (existingUser) {
            return done(null, existingUser); // Old User: Log them in
          }

          // New User: Register account, link Google, and initialize inbox atomically
          const newUser = await createUserAccount(email, username, 'google', googleId, null);
          return done(null, newUser);

        } catch (error) {
          console.error('Google OAuth Strategy Error:', error);
          return done(error);
        }
      }
    )
  );

  /**
   * Session Serialization
   */
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id); 
      done(null, user);
    } catch (e) {
      done(e);
    }
  })
}

module.exports = initialize