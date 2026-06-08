// ./backend/models/User.js
const mysql = require('mysql2/promise');

// create User table
const createUserTable = async () => {
    try {
        // Connect to MySQL without specifying a database
        // const temp_connection = await mysql.createConnection({
        //     host: process.env.MYSQL_HOST,
        //     user: process.env.MYSQL_USER,
        //     password: process.env.MYSQL_PASSWORD,
        // });

        // // Create the database if it doesn't exist
        // const createDatabaseQuery = `CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\``;
        // await temp_connection.execute(createDatabaseQuery);
        // console.log(`Database ${process.env.MYSQL_DATABASE} created or already exists.`);

        // // Close the current connection and reconnect with the database specified
        // await temp_connection.end();

        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        // Create the Users table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Users (
                id INT AUTO_INCREMENT PRIMARY KEY,

                email VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(50),
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(createTableQuery);
        console.log('Users table created or already exists.');

        await connection.end();
    } catch (error) {
        console.error('Error creating Users table:', error);
    }
};

module.exports = createUserTable;