package main

import (
	"fmt"
	"log"
	"os"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/db"
)

// Rewrites duplicate Tasks.sort_order values into unique LexoRanks.
//
//	go run ./cmd/rebalance-sort           # inspect only
//	go run ./cmd/rebalance-sort --apply   # write, then verify
func main() {
	apply := false
	for _, arg := range os.Args[1:] {
		if arg == "--apply" || arg == "-apply" {
			apply = true
		}
	}

	cfg := config.Load()
	database := db.Connect(cfg)
	if err := db.EnsureTables(database); err != nil {
		log.Fatalf("ensure tables: %v", err)
	}

	before, err := db.InspectTaskSortOrders(database)
	if err != nil {
		log.Fatalf("inspect: %v", err)
	}
	fmt.Println("BEFORE")
	fmt.Print(before.Format())

	if !apply {
		fmt.Println("Dry run. Re-run with --apply to rewrite duplicate ranks.")
		return
	}

	users, tasks, err := db.RebalanceTaskSortOrders(database)
	if err != nil {
		log.Fatalf("rebalance: %v", err)
	}
	fmt.Printf("rewrote users=%d tasks=%d\n", users, tasks)

	after, err := db.InspectTaskSortOrders(database)
	if err != nil {
		log.Fatalf("inspect after: %v", err)
	}
	fmt.Println("AFTER")
	fmt.Print(after.Format())

	for _, u := range after.PerUser {
		if err := db.VerifyUserTaskRanks(database, u.UserID); err != nil {
			log.Fatalf("verify user %d: %v", u.UserID, err)
		}
		fmt.Printf("verify user_id=%d OK (unique, increasing, parseable)\n", u.UserID)
	}

	if after.DuplicateKeys != 0 {
		log.Fatalf("still have %d duplicate (user_id, sort_order) keys", after.DuplicateKeys)
	}
	fmt.Println("rebalance complete")
}
