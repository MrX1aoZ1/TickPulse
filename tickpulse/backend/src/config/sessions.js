const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// 1. 定義資料庫連線資訊
const options = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,

    // 🎯 核心修正：手動覆寫套件內建的資料表欄位長度設計
    createDatabaseTable: false, // 讓套件自動建表
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        },
        // 🔥 在這裡強制鎖定長度為 128，避免觸發 MySQL 1071 錯誤
        customStaticSchema: {
            session_id: 'VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL',
            expires: 'INT(11) UNSIGNED NOT NULL',
            data: 'MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
        }
    }
};

const sessionStore = new MySQLStore(options);

module.exports = sessionStore;