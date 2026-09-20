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

const listCols = `id, user_id, category_id, task_name, status, priority,
	deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
	is_recurring, recurrence_rule, sort_order, created_at, updated_at`

// Times category-filtered list SQL vs loading a user's full task set.
//
//	cd backend-go
//	go run ./cmd/bench-category
//
// Optional: BENCH_N (default 100000), BENCH_CATEGORIES (default 5), BENCH_ROUNDS (default 8).
func main() {
	n := getenvInt("BENCH_N", 100000)
	nCats := getenvInt("BENCH_CATEGORIES", 5)
	rounds := getenvInt("BENCH_ROUNDS", 8)
	if n <= 0 || nCats < 2 || rounds <= 0 {
		log.Fatal("BENCH_N > 0, BENCH_CATEGORIES >= 2, BENCH_ROUNDS > 0")
	}

	cfg := config.Load()
	database := db.Connect(cfg)
	defer database.Close()
	if err := db.EnsureTables(database); err != nil {
		log.Fatalf("ensure tables: %v", err)
	}

	email := fmt.Sprintf("bench-cat-%d@tickpulse.test", time.Now().UnixNano())
	userID, catIDs, err := seed(database, email, n, nCats)
	if err != nil {
		log.Fatalf("seed: %v", err)
	}
	defer cleanup(database, userID)
	if _, err := database.Exec(`ANALYZE TABLE Tasks`); err != nil {
		log.Printf("ANALYZE TABLE: %v", err)
	}

	target := catIDs[len(catIDs)/2]
	fullSQL := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		WHERE user_id = ? ORDER BY sort_order ASC`, listCols)
	ignoreSQL := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		IGNORE INDEX (idx_tasks_user_category_sort, idx_tasks_user_sort)
		WHERE user_id = ? AND category_id = ?
		ORDER BY sort_order ASC`, listCols)
	apiSQL := fmt.Sprintf(`
		SELECT SQL_NO_CACHE %s FROM Tasks
		FORCE INDEX (idx_tasks_user_category_sort)
		WHERE user_id = ? AND category_id = ?
		ORDER BY sort_order ASC`, listCols)

	fmt.Println("TickPulse category-filter bench")
	fmt.Printf("  rows=%d  categories=%d  target≈%d tasks  rounds=%d (+2 warmup)\n\n",
		n, nCats, n/nCats, rounds)

	must := func(label string, fn func() (time.Duration, error)) stats {
		s, err := bench(rounds, fn)
		if err != nil {
			log.Fatalf("%s: %v", label, err)
		}
		return s
	}

	full := must("full", func() (time.Duration, error) {
		return timeSelect(database, fullSQL, userID)
	})
	ignore := must("ignore", func() (time.Duration, error) {
		return timeSelect(database, ignoreSQL, userID, target)
	})
	api := must("api", func() (time.Duration, error) {
		return timeSelect(database, apiSQL, userID, target)
	})

	fmt.Println("GET /api/tasks")
	printStats("  before  load all tasks for the user", full)
	printStats("  ignore  WHERE category_id, no list indexes", ignore)
	printStats("  api     WHERE category_id + composite index", api)
	fmt.Printf("  api vs load-all     %s\n", ratio(full.avg, api.avg))
	fmt.Printf("  api vs ignore       %s\n\n", ratio(ignore.avg, api.avg))

	fmt.Println("EXPLAIN load-all")
	printExplain(database, fullSQL, userID)
	fmt.Println("EXPLAIN ignore")
	printExplain(database, ignoreSQL, userID, target)
	fmt.Println("EXPLAIN api (current GET /api/tasks?category_id=)")
	printExplain(database, apiSQL, userID, target)
	fmt.Println("handlers load-all")
	printHandlers(database, fullSQL, userID)
	fmt.Println("handlers api")
	printHandlers(database, apiSQL, userID, target)
}

func seed(database *sqlx.DB, email string, n, nCats int) (userID int, catIDs []string, err error) {
	users := &services.UserService{DB: database}
	hash, err := bcrypt.GenerateFromPassword([]byte("bench"), 4)
	if err != nil {
		return 0, nil, err
	}
	hashStr := string(hash)
	user, err := users.CreateUserAccount(email, "bench", "local", email, &hashStr, nil)
	if err != nil {
		return 0, nil, err
	}
	userID = user.ID
	inbox := fmt.Sprintf("inbox_%d", userID)
	catIDs = []string{inbox}
	rank := models.InitialCategoryRank
	for i := 1; i < nCats; i++ {
		rank = models.NextCategoryRank(rank)
		id := uuid.NewString()
		if _, err := database.Exec(
			`INSERT INTO Categories (id, user_id, category_name, sort_order) VALUES (?, ?, ?, ?)`,
			id, userID, fmt.Sprintf("Cat %d", i), rank,
		); err != nil {
			return userID, nil, err
		}
		catIDs = append(catIDs, id)
	}

	const batch = 1000
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
			idx := i + j
			cat := catIDs[idx%len(catIDs)]
			status := "pending"
			if j%5 == 0 {
				status = "completed"
			}
			args = append(args, uuid.NewString(), cat, userID, fmt.Sprintf("t%d", idx), status, fmt.Sprintf("0|%08d:", idx))
		}
		if _, err := database.Exec(query, args...); err != nil {
			return userID, nil, err
		}
		fmt.Printf("seeded %d/%d\r", i+size, n)
	}
	fmt.Printf("seeded %d/%d\n", n, n)
	return userID, catIDs, nil
}

func cleanup(database *sqlx.DB, userID int) {
	_, _ = database.Exec(`DELETE st FROM SubTasks st INNER JOIN Tasks t ON st.task_id = t.id WHERE t.user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Tasks WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Categories WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM UserAuth WHERE user_id = ?`, userID)
	_, _ = database.Exec(`DELETE FROM Users WHERE id = ?`, userID)
}

func timeSelect(database *sqlx.DB, query string, args ...any) (time.Duration, error) {
	start := time.Now()
	var rows []models.Task
	if err := database.Select(&rows, query, args...); err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, fmt.Errorf("query returned 0 rows")
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
	fmt.Printf("%s  avg=%-10s  min=%-10s  p50=%s\n", label, s.avg.Round(time.Microsecond), s.min.Round(time.Microsecond), s.p50.Round(time.Microsecond))
}

func ratio(before, after time.Duration) string {
	if after <= 0 {
		return "n/a"
	}
	return fmt.Sprintf("%.1fx faster", float64(before)/float64(after))
}

func printExplain(database *sqlx.DB, query string, args ...any) {
	rows, err := database.Query("EXPLAIN "+query, args...)
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

func printHandlers(database *sqlx.DB, query string, args ...any) {
	if _, err := database.Exec(`FLUSH STATUS`); err != nil {
		log.Printf("FLUSH STATUS: %v", err)
		return
	}
	if _, err := timeSelect(database, query, args...); err != nil {
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
			'Handler_read_key', 'Handler_read_next', 'Handler_read_rnd_next',
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
	fmt.Printf("  %s\n", strings.Join(parts, "  "))
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
