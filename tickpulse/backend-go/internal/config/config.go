package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config 對應 backend/.env。優先讀 backend-go/.env，缺的再沿用 ../backend/.env。
type Config struct {
	MySQLHost          string
	MySQLUser          string
	MySQLPassword      string
	MySQLDatabase      string
	Port               string
	AccessSecret       string
	ClientURL          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleCallbackURL  string
}

func Load() Config {
	for _, p := range []string{
		".env",
		"../backend/.env",
		"../../backend/.env",
	} {
		_ = godotenv.Load(p)
	}

	cfg := Config{
		MySQLHost:          getenv("MYSQL_HOST", "localhost"),
		MySQLUser:          getenv("MYSQL_USER", "root"),
		MySQLPassword:      os.Getenv("MYSQL_PASSWORD"),
		MySQLDatabase:      getenv("MYSQL_DATABASE", "tickpulse_db"),
		Port:               getenv("PORT", "3000"),
		AccessSecret:       os.Getenv("ACCESS_TOKEN_SECRET"),
		ClientURL:          getenv("CLIENT_URL", "http://localhost:3001"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleCallbackURL:  getenv("GOOGLE_CALLBACK_URL", "http://localhost:3000/auth/google/callback"),
	}
	if cfg.AccessSecret == "" {
		log.Fatal("ACCESS_TOKEN_SECRET is required")
	}
	return cfg
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
