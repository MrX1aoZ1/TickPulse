const mysql = require('mysql2/promise');

const createUserAuthTable = async () => {
    try {
        // Connect to MySQL database
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS UserAuth (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                
                provider VARCHAR(20) NOT NULL,
                provider_id VARCHAR(255) NULL,
                credential VARCHAR(255) NULL,

                FOREIGN KEY (user_id) REFERENCES Users(id),
                UNIQUE KEY unique_provider_identity (provider, provider_id),

                CONSTRAINT check_credential_or_provider_id CHECK (
                    (provider = 'local' AND credential IS NOT NULL) OR 
                    (provider <> 'local' AND provider_id IS NOT NULL)
                )
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(createTableQuery);
        console.log('User Auth table created or already exists.');
        await connection.end();
    } catch (error) {
        console.error('Error creating User Auth table:', error);
        throw error;
    }
};

module.exports = createUserAuthTable;