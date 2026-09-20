package main

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/db"
	"tickpulse/backend-go/internal/models"
	"tickpulse/backend-go/internal/services"
)

// Compares the SQL shapes from before vs after the sql_optimisation commits
// on a throwaway user, then deletes the rows.
//
//	cd backend-go
//	go run ./cmd/bench-sql
//
// Optional env: BENCH_N (default 3000), BENCH_ROUNDS (default 10),
// BENCH_CONTENT_BYTES (default 1024).
func main() {
	n := getenvInt("BENCH_N", 3000)
	rounds := getenvInt("BENCH_ROUNDS", 10)
	contentBytes := getenvInt("BENCH_CONTENT_BYTES", 1024)
	if n <= 0 || rounds <= 0 || contentBytes < 0 {
		log.Fatal("BENCH_N, BENCH_ROUNDS must be > 0; BENCH_CONTENT_BYTES must be >= 0")
	}

	cfg := config.Load()
	database := db.Connect(cfg)
	defer database.Close()
	if err := db.EnsureTables(database); err != nil {
		log.Fatalf("ensure tables: %v", err)
	}

	email := fmt.Sprintf("bench-%d@tickpulse.test", time.Now().UnixNano())
	userID, _, ids, err := seed(database, email, n, contentBytes)
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	defer cleanup(database, userID)

	if _, err := database.Exec(`ANALYZE TABLE Tasks`); err != nil {
		log.Printf("ANALYZE TABLE: %v", err)
	}

	fullCols := `id, user_id, category_id, task_name, content, status, priority,
		deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
		is_recurring, recurrence_rule, sort_order, created_at, updated_at`
	listCols := `id, user_id, category_id, task_name, status, priority,
		deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
		is_recurring, recurrence_rule, sort_order, created_at, updated_at`

	// Before our indexes: only the FK index on user_id, then filesort.
	listBefore := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		IGNORE INDEX (idx_tasks_user_sort, idx_tasks_user_category_sort)
		WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC`, fullCols)
	// Same SQL as GET /api/tasks today (optimizer may still pick the FK index).
	listAPI := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC`, listCols)
	// What idx_tasks_user_sort is built for: filter + order without filesort.
	listForced := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		FORCE INDEX (idx_tasks_user_sort)
		WHERE user_id = ? ORDER BY sort_order ASC`, listCols)

	reorderIDs := ids
	if len(reorderIDs) > 100 {
		reorderIDs = reorderIDs[:100]
	}

	fmt.Println("TickPulse SQL bench")
	fmt.Printf("  rows=%d  rounds=%d (+2 warmup)  content=%d bytes/task\n\n", n, rounds, contentBytes)
	printIndexes(database)

	must := func(label string, fn func() (time.Duration, error)) stats {
		s, err := bench(rounds, fn)
		if err != nil {
			log.Fatalf("%s: %v", label, err)
		}
		return s
	}

	fmt.Println("1. GET /api/tasks  (list, 1 round-trip)")
	before := must("before", func() (time.Duration, error) {
		return timeSelect(database, listBefore, userID)
	})
	api := must("api   ", func() (time.Duration, error) {
		return timeSelect(database, listAPI, userID)
	})
	forced := must("forced", func() (time.Duration, error) {
		return timeSelect(database, listForced, userID)
	})
	printStats("  before  full row, ignore list indexes", before)
	printStats("  api     no content, optimizer chooses", api)
	printStats("  forced  no content, FORCE INDEX list", forced)
	fmt.Printf("  api vs before     %s\n", ratio(before.avg, api.avg))
	fmt.Printf("  forced vs before  %s\n", ratio(before.avg, forced.avg))
	fmt.Println("  EXPLAIN before")
	printExplain(database, listBefore, userID)
	fmt.Println("  EXPLAIN api (current GET /api/tasks)")
	printExplain(database, listAPI, userID)
	fmt.Println("  EXPLAIN forced")
	printExplain(database, listForced, userID)
	fmt.Println("  handlers before")
	printHandlers(database, listBefore, userID)
	fmt.Println("  handlers forced")
	printHandlers(database, listForced, userID)
	fmt.Println()

	fmt.Println("2. PUT /api/tasks/reorder  ownership lookup (100 ids)")
	n1 := must("before", func() (time.Duration, error) {
		start := time.Now()
		for _, id := range reorderIDs {
			var task models.Task
			if err := database.Get(&task, `SELECT `+fullCols+` FROM Tasks WHERE id = ? AND user_id = ?`, id, userID); err != nil {
				return 0, err
			}
		}
		return time.Since(start), nil
	})
	inq := must("after ", func() (time.Duration, error) {
		start := time.Now()
		query, args, err := sqlx.In(
			`SELECT SQL_NO_CACHE id, sort_order FROM Tasks WHERE user_id = ? AND id IN (?)`,
			userID, reorderIDs,
		)
		if err != nil {
			return 0, err
		}
		query = database.Rebind(query)
		type rankRow struct {
			ID        string `db:"id"`
			SortOrder string `db:"sort_order"`
		}
		var rows []rankRow
		if err := database.Select(&rows, query, args...); err != nil {
			return 0, err
		}
		if len(rows) != len(reorderIDs) {
			return 0, fmt.Errorf("IN lookup got %d rows, want %d", len(rows), len(reorderIDs))
		}
		return time.Since(start), nil
	})
	printStats("  before  100x SELECT full row by id", n1)
	printStats("  after   1x IN (id, sort_order)", inq)
	fmt.Printf("  speedup              %s\n", ratio(n1.avg, inq.avg))
	fmt.Println("  (this one is round-trips: Docker MySQL on Windows is ~50ms each)")
}

func seed(database *sqlx.DB, email string, n, contentBytes int) (userID int, inbox string, ids []string, err error) {
	users := &services.UserService{DB: database}
	hash, err := bcrypt.GenerateFromPassword([]byte("bench"), 4)
	if err != nil {
		return 0, "", nil, err
	}
	hashStr := string(hash)
	user, err := users.CreateUserAccount(email, "bench", "local", email, &hashStr, nil)
	if err != nil {
		return 0, "", nil, err
	}
	userID = user.ID
	inbox = fmt.Sprintf("inbox_%d", userID)
	blob := strings.Repeat("n", contentBytes)

	ids = make([]string, 0, n)
	lastRank := ""
	const batch = 400
	for i := 0; i < n; i += batch {
		size := batch
		if i+size > n {
			size = n - i
		}
		query := `INSERT INTO Tasks (id, category_id, user_id, task_name, content, status, sort_order) VALUES `
		args := make([]any, 0, size*7)
		for j := 0; j < size; j++ {
			if j > 0 {
				query += ","
			}
			query += "(?, ?, ?, ?, ?, ?, ?)"
			id := uuid.NewString()
			ids = append(ids, id)
			lastRank = models.NextCategoryRank(lastRank)
			status := "pending"
			if j%5 == 0 {
				status = "completed"
			}
			args = append(args, id, inbox, userID, fmt.Sprintf("bench #%d", i+j+1), blob, status, lastRank)
		}
		if _, err := database.Exec(query, args...); err != nil {
			return userID, inbox, nil, err
		}
		fmt.Printf("seeded %d/%d\r", i+size, n)
	}
	fmt.Printf("seeded %d/%d\n", n, n)
	return userID, inbox, ids, nil
}

func cleanup(database *sqlx.DB, userID int) {
	_, _ = database.Exec(`DELETE st FROM SubTasks st INNER JOIN Tasks t ON st.task_id = t.id WHERE t.user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Tasks WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Categories WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM UserAuth WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Users WHERE id = ?`, userID)
}

func timeSelect(database *sqlx.DB, query string, userID int) (time.Duration, error) {
	start := time.Now()
	var rows []models.Task
	if err := database.Select(&rows, query, userID); err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, fmt.Errorf("list returned 0 rows")
	}
	return time.Since(start), nil
}

type stats struct {
	avg time.Duration
	min time.Duration
	p50 time.Duration
}

func bench(rounds int, fn func() (time.Duration, error)) (stats, error) {
	for i := 0; i < 2; i++ {
		if _, err := fn(); err != nil {
			return stats{}, err
		}
	}
	samples := make([]time.Duration, 0, rounds)
	var sum time.Duration
	min := time.Duration(1<<63 - 1)
	for i := 0; i < rounds; i++ {
		d, err := fn()
		if err != nil {
			return stats{}, err
		}
		samples = append(samples, d)
		sum += d
		if d < min {
			min = d
		}
	}
	sort.Slice(samples, func(i, j int) bool { return samples[i] < samples[j] })
	return stats{
		avg: sum / time.Duration(rounds),
		min: min,
		p50: samples[len(samples)/2],
	}, nil
}

func printStats(label string, s stats) {
	fmt.Printf("  %s  avg=%-10s  min=%-10s  p50=%s\n", label, s.avg.Round(time.Microsecond), s.min.Round(time.Microsecond), s.p50.Round(time.Microsecond))
}

func ratio(before, after time.Duration) string {
	if after <= 0 {
		return "n/a"
	}
	r := float64(before) / float64(after)
	return fmt.Sprintf("%.1fx faster", r)
}

func printIndexes(database *sqlx.DB) {
	type idx struct {
		Name   string `db:"INDEX_NAME"`
		Column string `db:"COLUMN_NAME"`
		Seq    int    `db:"SEQ_IN_INDEX"`
	}
	var rows []idx
	err := database.Select(&rows, `
		SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
		FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'tasks'
		ORDER BY INDEX_NAME, SEQ_IN_INDEX`)
	if err != nil {
		log.Printf("indexes: %v", err)
		return
	}
	fmt.Println("Tasks indexes")
	cur := ""
	var cols []string
	flush := func() {
		if cur != "" {
			fmt.Printf("  %s (%s)\n", cur, strings.Join(cols, ", "))
		}
	}
	for _, r := range rows {
		if r.Name != cur {
			flush()
			cur = r.Name
			cols = nil
		}
		cols = append(cols, r.Column)
	}
	flush()
	fmt.Println()
}

func printHandlers(database *sqlx.DB, query string, userID int) {
	if _, err := database.Exec(`FLUSH STATUS`); err != nil {
		log.Printf("FLUSH STATUS: %v", err)
		return
	}
	if _, err := timeSelect(database, query, userID); err != nil {
		log.Printf("handlers query: %v", err)
		return
	}
	type kv struct {
		Name  string `db:"Variable_name"`
		Value string `db:"Value"`
	}
	var rows []kv
	err := database.Select(&rows, `
		SHOW SESSION STATUS WHERE Variable_name IN (
			'Handler_read_rnd_next', 'Handler_read_next', 'Handler_read_key',
			'Sort_rows', 'Sort_scan'
		)`)
	if err != nil {
		log.Printf("SHOW STATUS: %v", err)
		return
	}
	parts := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.Value == "0" {
			continue
		}
		parts = append(parts, r.Name+"="+r.Value)
	}
	if len(parts) == 0 {
		fmt.Println("    (no handler counters)")
		return
	}
	fmt.Printf("    %s\n", strings.Join(parts, "  "))
}

func printExplain(database *sqlx.DB, query string, userID int) {
	rows, err := database.Query("EXPLAIN "+query, userID)
	if err != nil {
		log.Printf("EXPLAIN: %v", err)
		return
	}
	defer rows.Close()
	cols, _ := rows.Columns()
	want := map[string]bool{"type": true, "key": true, "rows": true, "Extra": true, "filtered": true}
	for rows.Next() {
		raw := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range raw {
			ptrs[i] = &raw[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			log.Printf("EXPLAIN scan: %v", err)
			return
		}
		parts := make([]string, 0, 4)
		for i, col := range cols {
			if !want[col] {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s=%s", col, stringify(raw[i])))
		}
		fmt.Printf("  %s\n", strings.Join(parts, "  "))
	}
}

func stringify(v any) string {
	switch t := v.(type) {
	case nil:
		return "NULL"
	case []byte:
		return string(t)
	default:
		return fmt.Sprint(t)
	}
}

func getenvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		log.Fatalf("invalid %s=%q", key, raw)
	}
	return n
}
