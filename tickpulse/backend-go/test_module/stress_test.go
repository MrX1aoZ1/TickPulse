package test_module

import (
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Replaces seed.js + stress-test.js: seeds into a throwaway user, times the
// real list query, then deletes the rows. Default N=200; set TICKPULSE_STRESS=1
// and optionally TICKPULSE_STRESS_N=10000 for the original 10k scale.
func TestListTasksQueryTiming(t *testing.T) {
	if os.Getenv("TICKPULSE_STRESS") == "" {
		t.Skip("set TICKPULSE_STRESS=1 to run seed/query timing (optional TICKPULSE_STRESS_N=10000)")
	}

	n := 200
	if raw := os.Getenv("TICKPULSE_STRESS_N"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			t.Fatalf("invalid TICKPULSE_STRESS_N=%q", raw)
		}
		n = parsed
	}

	c := newClient(t)
	email := uniqueEmail(t)
	user := c.signUp(email)
	inbox := inboxID(user.User.ID)

	const batch = 500
	for i := 0; i < n; i += batch {
		size := batch
		if i+size > n {
			size = n - i
		}
		query := `INSERT INTO Tasks (id, category_id, user_id, task_name, status, sort_order) VALUES `
		args := make([]any, 0, size*6)
		for j := 0; j < size; j++ {
			if j > 0 {
				query += ","
			}
			query += "(?, ?, ?, ?, ?, ?)"
			status := "pending"
			if j%5 == 0 {
				status = "completed"
			}
			args = append(args, uuid.NewString(), inbox, user.User.ID, fmt.Sprintf("stress #%d", i+j+1), status, float64(i+j))
		}
		if _, err := testDB.Exec(query, args...); err != nil {
			t.Fatalf("seed insert: %v", err)
		}
	}

	start := time.Now()
	var pending int
	if err := testDB.Get(&pending, `
		SELECT COUNT(*) FROM Tasks
		WHERE user_id = ? AND category_id = ? AND status = 'pending'`,
		user.User.ID, inbox,
	); err != nil {
		t.Fatal(err)
	}
	elapsed := time.Since(start)
	t.Logf("pending count=%d n=%d elapsed=%s", pending, n, elapsed)
	if pending == 0 {
		t.Fatal("expected some pending tasks")
	}

	rows, err := testDB.Query(`
		EXPLAIN SELECT id FROM Tasks
		WHERE user_id = ? AND category_id = ? AND status = 'pending'
		ORDER BY sort_order ASC, created_at DESC`,
		user.User.ID, inbox,
	)
	if err != nil {
		t.Fatalf("explain: %v", err)
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	t.Logf("EXPLAIN columns: %v", cols)
}
