package main

import (
	"log"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/db"
	"tickpulse/backend-go/internal/server"
)

func main() {
	cfg := config.Load()
	database := db.Connect(cfg)
	if err := db.EnsureTables(database); err != nil {
		log.Printf("Error during initialization: %v", err)
	}

	r := server.NewRouter(cfg, database)
	_ = r.SetTrustedProxies(nil)

	log.Printf("Server is running on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
