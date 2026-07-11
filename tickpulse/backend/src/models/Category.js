// ./backend/models/Category.js
const mysql = require('mysql2/promise');

/**
 * Creates the Category table in the database if it doesn't already exist.
 * This table stores categories associated with users.
 * @async
 * @function createCategoryTable
 * @returns {Promise<void>} A promise that resolves when the table is created or if it already exists.
 * @throws {Error} If there is an error connecting to the database or executing the query.
 */
const createCategoryTable = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Categories (
                id VARCHAR(50) PRIMARY KEY,
                user_id INT NOT NULL,
                
                category_name VARCHAR(255),
                color VARCHAR(7) DEFAULT '#FFFFFF',
                sort_order VARCHAR(255) DEFAULT 'a',

                FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTableQuery);
        console.log('Category table created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Error creating Category table:', error);
    }
};

module.exports = createCategoryTable;