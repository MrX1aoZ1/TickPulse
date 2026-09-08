package main

import (
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/db"
	"tickpulse/backend-go/internal/models"
	"tickpulse/backend-go/internal/services"
)

// Seeds a stable local user plus random categories/tasks for frontend login.
//
//	go run ./cmd/inituser
//
// Optional env: INIT_EMAIL, INIT_PASSWORD, INIT_CATEGORIES (default 5), INIT_TASKS (default 16).
func main() {
	email := getenv("INIT_EMAIL", "test@tickpulse.com")
	password := getenv("INIT_PASSWORD", "Password.123!")
	nCategories := getenvInt("INIT_CATEGORIES", 5)
	nTasks := getenvInt("INIT_TASKS", 16)
	rng := rand.New(rand.NewPCG(uint64(time.Now().UnixNano()), uint64(os.Getpid())))

	cfg := config.Load()
	database := db.Connect(cfg)
	if err := db.EnsureTables(database); err != nil {
		log.Fatalf("ensure tables: %v", err)
	}
	users := &services.UserService{DB: database}

	existing, err := users.GetUserByEmail(email)
	if err != nil {
		log.Fatalf("lookup user: %v", err)
	}

	var userID int
	created := false
	if existing != nil {
		userID = existing.ID
		log.Printf("User already exists (id=%d). Reusing it.", userID)
	} else {
		hashed, err := bcrypt.GenerateFromPassword([]byte(password), 10)
		if err != nil {
			log.Fatal(err)
		}
		hashStr := string(hashed)
		user, err := users.CreateUserAccount(email, "Tester", "local", email, &hashStr)
		if err != nil {
			log.Fatalf("create user: %v", err)
		}
		userID = user.ID
		created = true
		log.Printf("Created user id=%d", userID)
	}

	inboxID := fmt.Sprintf("inbox_%d", userID)
	newCats, err := seedRandomCategories(database, rng, userID, nCategories)
	if err != nil {
		log.Fatalf("seed categories: %v", err)
	}
	categoryIDs := append([]string{inboxID}, newCats...)

	existingIDs := make([]string, 0)
	if err := database.Select(&existingIDs, `SELECT id FROM Categories WHERE user_id = ?`, userID); err == nil && len(existingIDs) > 0 {
		categoryIDs = existingIDs
	}

	if err := seedRandomTasks(database, rng, userID, categoryIDs, nTasks); err != nil {
		log.Fatalf("seed tasks: %v", err)
	}

	fmt.Println()
	fmt.Println("Frontend login")
	fmt.Printf("  email:    %s\n", email)
	fmt.Printf("  password: %s\n", password)
	fmt.Printf("  user_id:  %d\n", userID)
	if created {
		fmt.Println("  status:   new account")
	} else {
		fmt.Println("  status:   existing account (password unchanged)")
	}
	fmt.Printf("  added:    %d categor(ies), %d task(s)\n", nCategories, nTasks)
	fmt.Println()
	fmt.Println("Start the API and UI, then log in with the email above.")
}

func seedRandomCategories(database *sqlx.DB, rng *rand.Rand, userID, n int) ([]string, error) {
	lastOrder := ""
	var last models.Category
	err := database.Get(&last, `
		SELECT id, user_id, category_name, color, sort_order
		FROM Categories WHERE user_id = ? ORDER BY sort_order DESC LIMIT 1`, userID)
	if err == nil {
		lastOrder = last.SortOrder
	}

	ids := make([]string, 0, n)
	for i := 0; i < n; i++ {
		lastOrder = models.NextCategoryRank(lastOrder)
		id := uuid.NewString()
		name := pick(rng, categoryNames) + " " + strconv.Itoa(rng.IntN(90)+10)
		color := randomColor(rng)
		if _, err := database.Exec(
			`INSERT INTO Categories (id, user_id, category_name, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
			id, userID, name, color, lastOrder,
		); err != nil {
			return nil, err
		}
		ids = append(ids, id)
		log.Printf("Category %s  name=%q  color=%s  sort_order=%s", id, name, color, lastOrder)
	}
	return ids, nil
}

func seedRandomTasks(database *sqlx.DB, rng *rand.Rand, userID int, categoryIDs []string, n int) error {
	now := time.Now()
	lastByCat := map[string]string{}
	for i := 0; i < n; i++ {
		id := uuid.NewString()
		categoryID := pick(rng, categoryIDs)
		name := pick(rng, taskNames)
		content := maybeString(rng, 0.75, pick(rng, taskContents))
		status := pick(rng, []string{"pending", "pending", "pending", "completed", "cancelled", "deleted"})
		priority := pick(rng, []string{"none", "low", "medium", "high"})
		isAllDay := rng.IntN(2) == 0
		isRecurring := rng.IntN(4) == 0
		reminderType := rng.IntN(2)
		sortOrder := models.NextCategoryRank(lastByCat[categoryID])
		lastByCat[categoryID] = sortOrder

		var deadline, startTime, endTime, reminderTime any
		dayOffset := rng.IntN(21) - 7
		base := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, dayOffset)
		if rng.Float64() < 0.7 {
			d := base
			deadline = d.Format("2006-01-02")
		}
		if isAllDay {
			if rng.Float64() < 0.4 {
				startTime = base
				endTime = base.Add(24 * time.Hour)
			}
		} else {
			startHour := 8 + rng.IntN(10)
			start := base.Add(time.Duration(startHour)*time.Hour + time.Duration(rng.IntN(4)*15)*time.Minute)
			end := start.Add(time.Duration(30+rng.IntN(150)) * time.Minute)
			startTime = start
			endTime = end
		}
		if reminderType == 1 && rng.Float64() < 0.6 {
			reminderTime = base.Add(-time.Duration(15+rng.IntN(120)) * time.Minute)
		}

		var recurrence any
		if isRecurring {
			recurrence = pick(rng, recurrenceRules)
		}

		if _, err := database.Exec(`
			INSERT INTO Tasks (
				id, user_id, category_id, task_name, content, status, priority,
				deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
				is_recurring, recurrence_rule, sort_order
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, userID, categoryID, name, content, status, priority,
			deadline, startTime, endTime, isAllDay, reminderType, reminderTime,
			isRecurring, recurrence, sortOrder,
		); err != nil {
			return err
		}

		nSubs := rng.IntN(4)
		for s := 0; s < nSubs; s++ {
			subName := pick(rng, subtaskNames)
			if _, err := database.Exec(
				`INSERT INTO SubTasks (task_id, subtask_name, is_done, sort_order) VALUES (?, ?, ?, ?)`,
				id, subName, rng.IntN(2), float64(s),
			); err != nil {
				return err
			}
		}
		log.Printf("Task %s  %q  cat=%s  status=%s  priority=%s  subs=%d", id, name, categoryID, status, priority, nSubs)
	}
	return nil
}

func randomColor(rng *rand.Rand) string {
	return fmt.Sprintf("#%02X%02X%02X", rng.IntN(256), rng.IntN(256), rng.IntN(256))
}

func pick[T any](rng *rand.Rand, items []T) T {
	return items[rng.IntN(len(items))]
}

func maybeString(rng *rand.Rand, p float64, value string) any {
	if rng.Float64() < p {
		return value
	}
	return nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		log.Fatalf("invalid %s=%q", key, raw)
	}
	return n
}

var categoryNames = []string{
	"Work", "Personal", "Study", "Health", "Finance", "Errands", "Side Project", "Reading",
}

var taskNames = []string{
	"Write weekly report", "Reply to emails", "Grocery run", "Review pull request",
	"Stretch break", "Call the bank", "Prep slides", "Read a chapter",
	"Backup laptop", "Plan weekend trip", "Fix leaking faucet", "Update resume",
	"Water the plants", "Book dentist", "Clean inbox", "Sketch UI mockup",
}

var taskContents = []string{
	"Need this done before Friday standup.",
	"Blocked on waiting for a reply.",
	"Low effort, high impact.",
	"Remember to attach the spreadsheet.",
	"Can skip if time runs out.",
	"Check notes in the shared folder.",
}

var recurrenceRules = []string{
	"FREQ=DAILY",
	"FREQ=WEEKLY;BYDAY=MO",
	"FREQ=WEEKLY;BYDAY=WE,FR",
	"FREQ=MONTHLY;BYMONTHDAY=1",
}

var subtaskNames = []string{
	"Outline", "First draft", "Review", "Send", "Follow up", "Archive",
}
