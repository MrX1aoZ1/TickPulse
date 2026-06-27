const connectDB = require('../config/db');

/**
 * Fetch local user credentials by email (with password joined from UserAuth).
 */
async function getUserByEmail(email) {
    const connection = await connectDB();
    try {
        /**
         * Fetch user credentials from UserAuth by joining with Users table.
         * Aliasing 'credential' as 'password' to maintain compatibility with 
         * Passport's local strategy logic below.
         */
        const [users] = await connection.query(
            `SELECT u.*, ua.credential AS password 
            FROM Users u
            JOIN UserAuth ua ON u.id = ua.user_id
            WHERE u.email = ? AND ua.provider = 'local'`,
            [email]
        );
        return users[0] || null;
    } finally {
        await connection.end();
    }
}

/**
 * Fetch a user profile by their primary database ID.
 */
async function getUserById(id) {
    const connection = await connectDB();
    try {
        const [users] = await connection.query('SELECT * FROM Users WHERE id = ?', [id]);
        return users[0] || null;
    } finally {
        await connection.end();
    }
}

/**
 * Fetch a user profile by OAuth provider details (1. Google ID).
 */
async function getUserByProvider(provider, providerId) {
    const connection = await connectDB();
    try {
        const [auths] = await connection.query(
            'SELECT user_id FROM UserAuth WHERE provider = ? AND provider_id = ?',
            [provider, providerId]
        );
        if (auths.length === 0) return null;

        const [users] = await connection.query('SELECT * FROM Users WHERE id = ?', [auths[0].user_id]);
        return users[0] || null;
    } finally {
        await connection.end();
    }
}

/**
 * Check if a specific OAuth provider identity is already bound to any account.
 */
async function isProviderLinked(provider, providerId) {
  const connection = await connectDB();
  try {
    const [auths] = await connection.query(
      'SELECT * FROM UserAuth WHERE provider = ? AND provider_id = ?',
      [provider, providerId]
    );
    return auths.length > 0;
  } finally {
    await connection.end();
  }
}

/**
 * Link a new OAuth provider identity (e.g., Google) to an existing logged-in user.
 */
async function linkProviderToUser(userId, provider, providerId) {
  const connection = await connectDB();
  try {
    await connection.query(
      'INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, ?, ?, ?)',
      [userId, provider, providerId, null]
    );
    return true;
  } finally {
    await connection.end();
  }
}


/**
 * Create and initialize a brand new user account by default Categories.
 */
async function createUserAccount(email, username, provider, providerId, password = null) {
    let connection;
    try {
        connection = await connectDB();
        await connection.beginTransaction();

        const [userResult] = await connection.query(
            'INSERT INTO Users (email, username) VALUES (?, ?)',
            [email, username]
        );
        const insertedUserId = userResult.insertId;

        await connection.query(
            'INSERT INTO UserAuth (user_id, provider, provider_id, credential) VALUES (?, ?, ?, ?)',
            [insertedUserId, provider, providerId, password]
        );

        /**
          * Initialize system default categories for the user.
          * Note: Deterministic ID - Initialize the system default Inbox for the new user.
          * Using a predictable ID avoids duplicate primary key errors in multi-user environments 
          * and eliminates the need for an extra SELECT query when creating new tasks.
          */
        const defaultInboxId = `inbox_${insertedUserId}`;
        await connection.query(
            'INSERT INTO Categories (id, user_id, category_name) VALUES (?, ?, ?)',
            [defaultInboxId, insertedUserId, 'Inbox']
        );

        await connection.commit();
        return { id: insertedUserId, email };

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Sign-up Failure, Rolling back:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = {
    getUserByEmail,
    getUserById,
    getUserByProvider,
    isProviderLinked,
    linkProviderToUser,
    createUserAccount
};  