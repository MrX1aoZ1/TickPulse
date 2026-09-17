package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// Config 只讀 backend-go/.env（cwd 下的 .env，或從倉庫根目錄指向 backend-go/.env）。
type Config struct {
	MySQLHost          string
	MySQLPort          string
	MySQLUser          string
	MySQLPassword      string
	MySQLDatabase      string
	Port               string
	AccessSecret       string
	ClientURL          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleCallbackURL  string
	GitHubClientID     string
	GitHubClientSecret string
	GitHubCallbackURL  string
}

func Load() Config {
	for _, p := range dotenvCandidates() {
		_ = godotenv.Load(p)
	}

	cfg := Config{
		MySQLHost:          getenv("MYSQL_HOST", "localhost"),
		MySQLPort:          getenv("MYSQL_PORT", "3306"),
		MySQLUser:          getenv("MYSQL_USER", "root"),
		MySQLPassword:      os.Getenv("MYSQL_PASSWORD"),
		MySQLDatabase:      getenv("MYSQL_DATABASE", "tickpulse_db"),
		Port:               getenv("PORT", "3000"),
		AccessSecret:       os.Getenv("ACCESS_TOKEN_SECRET"),
		ClientURL:          getenv("CLIENT_URL", "http://localhost:3001"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleCallbackURL:  getenv("GOOGLE_CALLBACK_URL", "http://localhost:3000/auth/google/callback"),
		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		GitHubCallbackURL:  getenv("GITHUB_CALLBACK_URL", "http://localhost:3000/auth/github/callback"),
	}
	if cfg.AccessSecret == "" {
		log.Fatal("ACCESS_TOKEN_SECRET is required")
	}
	return cfg
}

func dotenvCandidates() []string {
	seen := map[string]struct{}{}
	var out []string
	add := func(p string) {
		if p == "" {
			return
		}
		abs, err := filepath.Abs(p)
		if err != nil {
			abs = p
		}
		if _, ok := seen[abs]; ok {
			return
		}
		seen[abs] = struct{}{}
		out = append(out, p)
	}

	add(".env")
	add("backend-go/.env")

	dir, err := os.Getwd()
	if err != nil {
		return out
	}
	for i := 0; i < 8; i++ {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			add(filepath.Join(dir, ".env"))
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return out
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
