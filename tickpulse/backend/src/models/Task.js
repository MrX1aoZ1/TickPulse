// ./backend/models/Task.js
const mysql = require('mysql2/promise');

// create Task table
const createTaskTable = async () => {
    try {
        // Connect to MySQL database
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        // Create the Tasks table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Tasks (
                    id VARCHAR(50) PRIMARY KEY,
                    user_id INT NOT NULL,
                    category_id VARCHAR(50) DEFAULT 'inbox',

                    task_name VARCHAR(255) NOT NULL,
                    content TEXT DEFAULT NULL,
                    status ENUM('pending', 'completed', 'cancelled', 'deleted') DEFAULT 'pending',
                    priority ENUM('none', 'low', 'medium', 'high') DEFAULT 'none',
                    deadline DATE DEFAULT NULL,

                    start_time TIMESTAMP NULL DEFAULT NULL,
                    end_time TIMESTAMP NULL DEFAULT NULL,
                    is_all_day BOOLEAN DEFAULT TRUE,
                    reminder_type TINYINT(1) DEFAULT 1,
                    reminder_time TIMESTAMP NULL DEFAULT NULL,

                    is_recurring BOOLEAN DEFAULT FALSE,
                    recurrence_rule VARCHAR(255) DEFAULT NULL,

                    sort_order VARCHAR(255) DEFAULT '0|0i0000:',

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTableQuery);
        console.log('Tasks table created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Error creating Tasks table:', error);
        throw error;
    }
};

module.exports = createTaskTable;