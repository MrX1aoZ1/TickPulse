// ./backend/models/Timer.js
const mysql = require('mysql2/promise');

// create Timer table
const createTimerTable = async () => {
    try {
        // Connect to MySQL database
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
        
        // Create the Timers table
        const createTimerQuery = `
            CREATE TABLE IF NOT EXISTS Timer (
                timer_id INT AUTO_INCREMENT PRIMARY KEY,
                timer_duration TIME,
                date DATETIME,
                user_id INT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES Users(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTimerQuery);
        console.log('Timers table created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Error creating Timers table:', error);
    }
};

module.exports = createTimerTable;