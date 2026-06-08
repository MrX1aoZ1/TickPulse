require('dotenv').config();
const mysql = require('mysql2/promise');

//connect to mysql database
const connectDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('MySQL connected');
        return connection; // Return the connection if needed elsewhere
    } catch (error) {
        console.error('MySQL connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;