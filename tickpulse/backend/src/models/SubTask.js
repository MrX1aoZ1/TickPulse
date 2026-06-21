const mysql = require('mysql2/promise');

const createSubtaskTable = async () => {
    try {
        // Connect to MySQL database
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS SubTasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                task_id VARCHAR(50) NOT NULL,
                
                subtask_name VARCHAR(255),
                is_done TINYINT(1) DEFAULT 0,
                sort_order DOUBLE DEFAULT 0.0,

                FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTableQuery);
        console.log('Subtask table created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Error creating Subtask table:', error);
        throw error;
    }
};

module.exports = createSubtaskTable;