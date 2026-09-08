package db

import (
	"fmt"
	"log"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/models"
)

func Connect(cfg config.Config) *sqlx.DB {
	if err := ensureDatabase(cfg); err != nil {
		log.Fatalf("MySQL connection error: %v", err)
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		cfg.MySQLUser, cfg.MySQLPassword, cfg.MySQLHost, cfg.MySQLDatabase)

	database, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		log.Fatalf("MySQL connection error: %v", err)
	}
	database.SetMaxOpenConns(10)
	database.SetMaxIdleConns(10)
	log.Println("MySQL connected")
	return database
}

func ensureDatabase(cfg config.Config) error {
	if !validDBName(cfg.MySQLDatabase) {
		return fmt.Errorf("invalid MYSQL_DATABASE name: %q", cfg.MySQLDatabase)
	}
	adminDSN := fmt.Sprintf("%s:%s@tcp(%s:3306)/?parseTime=true&charset=utf8mb4&loc=Local",
		cfg.MySQLUser, cfg.MySQLPassword, cfg.MySQLHost)
	conn, err := sqlx.Connect("mysql", adminDSN)
	if err != nil {
		return err
	}
	defer conn.Close()

	_, err = conn.Exec(fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		cfg.MySQLDatabase,
	))
	if err != nil {
		return err
	}
	log.Printf("Database %s created or already exists", cfg.MySQLDatabase)
	return nil
}

func validDBName(name string) bool {
	if name == "" {
		return false
	}
	for _, r := range name {
		ok := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_'
		if !ok {
			return false
		}
	}
	return true
}

// EnsureTables 對應各 models/*.js 的 CREATE TABLE IF NOT EXISTS。
func EnsureTables(database *sqlx.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS Users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL UNIQUE,
			username VARCHAR(50),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS UserAuth (
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
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS Categories (
			id VARCHAR(50) PRIMARY KEY,
			user_id INT NOT NULL,
			category_name VARCHAR(255),
			color VARCHAR(7) DEFAULT '#FFFFFF',
			sort_order VARCHAR(255) DEFAULT '0|0i0000:',
			FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS Tasks (
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
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS SubTasks (
			id INT AUTO_INCREMENT PRIMARY KEY,
			task_id VARCHAR(50) NOT NULL,
			subtask_name VARCHAR(255),
			is_done TINYINT(1) DEFAULT 0,
			sort_order DOUBLE DEFAULT 0.0,
			FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS sessions (
			session_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
			expires INT(11) UNSIGNED NOT NULL,
			data MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}

	for _, stmt := range stmts {
		if _, err := database.Exec(stmt); err != nil {
			return err
		}
	}
	if err := migrateTaskSortOrder(database); err != nil {
		return err
	}
	log.Println("All tables created or already exist")
	return nil
}

func migrateTaskSortOrder(database *sqlx.DB) error {
	var dataType string
	err := database.Get(&dataType, `
		SELECT DATA_TYPE FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE()
		  AND COLUMN_NAME = 'sort_order'
		  AND TABLE_NAME IN ('Tasks', 'tasks')
		LIMIT 1`)
	if err != nil || dataType == "" {
		return nil
	}
	lower := strings.ToLower(dataType)
	if strings.Contains(lower, "char") || strings.Contains(lower, "text") {
		return nil
	}

	type row struct {
		ID         string  `db:"id"`
		UserID     int     `db:"user_id"`
		CategoryID *string `db:"category_id"`
	}
	var rows []row
	if err := database.Select(&rows, `
		SELECT id, user_id, category_id FROM Tasks
		ORDER BY user_id, category_id, sort_order ASC, created_at ASC`); err != nil {
		return err
	}

	if _, err := database.Exec(`ALTER TABLE Tasks MODIFY COLUMN sort_order VARCHAR(255) DEFAULT '0|0i0000:'`); err != nil {
		return err
	}

	lastKey, lastRank := "", ""
	for _, r := range rows {
		cat := ""
		if r.CategoryID != nil {
			cat = *r.CategoryID
		}
		key := fmt.Sprintf("%d|%s", r.UserID, cat)
		if key != lastKey {
			lastKey = key
			lastRank = ""
		}
		lastRank = models.NextCategoryRank(lastRank)
		if _, err := database.Exec(`UPDATE Tasks SET sort_order = ? WHERE id = ?`, lastRank, r.ID); err != nil {
			return err
		}
	}
	log.Println("Migrated Tasks.sort_order to LexoRank VARCHAR(255)")
	return nil
}
