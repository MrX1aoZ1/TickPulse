package db

import (
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/models"
)

// TaskSortStats is a snapshot of Tasks.sort_order uniqueness.
type TaskSortStats struct {
	TaskCount      int
	DistinctRanks  int
	DuplicateRows  int
	DuplicateKeys  int
	UsersWithDups  int
	PerUser        []UserSortStats
	TopDuplicates  []DupRank
}

type UserSortStats struct {
	UserID        int    `db:"user_id"`
	TaskCount     int    `db:"task_count"`
	DistinctRanks int    `db:"distinct_ranks"`
	DuplicateRows int    `db:"duplicate_rows"`
}

type DupRank struct {
	SortOrder string `db:"sort_order"`
	N         int    `db:"n"`
}

func InspectTaskSortOrders(database *sqlx.DB) (TaskSortStats, error) {
	var stats TaskSortStats
	if err := database.Get(&stats.TaskCount, `SELECT COUNT(*) FROM Tasks`); err != nil {
		return stats, err
	}
	if err := database.Get(&stats.DistinctRanks, `SELECT COUNT(DISTINCT sort_order) FROM Tasks`); err != nil {
		return stats, err
	}
	if err := database.Get(&stats.DuplicateKeys, `
		SELECT COUNT(*) FROM (
			SELECT user_id, sort_order FROM Tasks
			GROUP BY user_id, sort_order
			HAVING COUNT(*) > 1
		) d`); err != nil {
		return stats, err
	}
	if err := database.Get(&stats.DuplicateRows, `
		SELECT COALESCE(SUM(n), 0) FROM (
			SELECT COUNT(*) AS n FROM Tasks
			GROUP BY user_id, sort_order
			HAVING COUNT(*) > 1
		) d`); err != nil {
		return stats, err
	}
	if err := database.Get(&stats.UsersWithDups, `
		SELECT COUNT(DISTINCT user_id) FROM (
			SELECT user_id FROM Tasks
			GROUP BY user_id, sort_order
			HAVING COUNT(*) > 1
		) d`); err != nil {
		return stats, err
	}
	if err := database.Select(&stats.PerUser, `
		SELECT
			user_id,
			COUNT(*) AS task_count,
			COUNT(DISTINCT sort_order) AS distinct_ranks,
			COUNT(*) - COUNT(DISTINCT sort_order) AS duplicate_rows
		FROM Tasks
		GROUP BY user_id
		ORDER BY duplicate_rows DESC, task_count DESC`); err != nil {
		return stats, err
	}
	if err := database.Select(&stats.TopDuplicates, `
		SELECT sort_order, COUNT(*) AS n
		FROM Tasks
		GROUP BY sort_order
		HAVING COUNT(*) > 1
		ORDER BY n DESC
		LIMIT 15`); err != nil {
		return stats, err
	}
	return stats, nil
}

func (s TaskSortStats) Format() string {
	out := fmt.Sprintf(
		"tasks=%d  distinct_ranks=%d  duplicate_keys=%d  rows_in_dup_groups=%d  users_with_dups=%d\n",
		s.TaskCount, s.DistinctRanks, s.DuplicateKeys, s.DuplicateRows, s.UsersWithDups,
	)
	for _, u := range s.PerUser {
		out += fmt.Sprintf(
			"  user_id=%d  tasks=%d  distinct=%d  extra_dups=%d\n",
			u.UserID, u.TaskCount, u.DistinctRanks, u.DuplicateRows,
		)
	}
	if len(s.TopDuplicates) > 0 {
		out += "  top duplicate ranks:\n"
		for _, d := range s.TopDuplicates {
			out += fmt.Sprintf("    %q  x%d\n", d.SortOrder, d.N)
		}
	}
	return out
}

type taskOrderRow struct {
	ID        string `db:"id"`
	UserID    int    `db:"user_id"`
	SortOrder string `db:"sort_order"`
}

// RebalanceTaskSortOrders assigns a unique LexoRank per (user_id, task)
// in the same order GET /api/tasks uses: sort_order ASC, created_at DESC, id ASC.
// Only users who currently have duplicate ranks are rewritten.
func RebalanceTaskSortOrders(database *sqlx.DB) (rewrittenUsers, rewrittenTasks int, err error) {
	var userIDs []int
	if err := database.Select(&userIDs, `
		SELECT user_id FROM (
			SELECT user_id FROM Tasks
			GROUP BY user_id, sort_order
			HAVING COUNT(*) > 1
		) d
		GROUP BY user_id`); err != nil {
		return 0, 0, err
	}

	for _, userID := range userIDs {
		n, err := rebalanceUserTaskSortOrders(database, userID)
		if err != nil {
			return rewrittenUsers, rewrittenTasks, err
		}
		rewrittenUsers++
		rewrittenTasks += n
		log.Printf("rebalanced user_id=%d tasks=%d", userID, n)
	}
	return rewrittenUsers, rewrittenTasks, nil
}

func rebalanceUserTaskSortOrders(database *sqlx.DB, userID int) (int, error) {
	var rows []taskOrderRow
	if err := database.Select(&rows, `
		SELECT id, user_id, sort_order FROM Tasks
		WHERE user_id = ?
		ORDER BY sort_order ASC, created_at DESC, id ASC`, userID); err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, nil
	}

	tx, err := database.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	lastRank := ""
	for _, row := range rows {
		lastRank = models.NextCategoryRank(lastRank)
		if _, err := tx.Exec(
			`UPDATE Tasks SET sort_order = ? WHERE id = ? AND user_id = ?`,
			lastRank, row.ID, userID,
		); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(rows), nil
}

// VerifyUserTaskRanks checks one user's tasks are unique and strictly increasing
// in GET /api/tasks order.
func VerifyUserTaskRanks(database *sqlx.DB, userID int) error {
	var ranks []string
	if err := database.Select(&ranks, `
		SELECT sort_order FROM Tasks
		WHERE user_id = ?
		ORDER BY sort_order ASC, created_at DESC, id ASC`, userID); err != nil {
		return err
	}
	seen := make(map[string]struct{}, len(ranks))
	var prev string
	for i, rank := range ranks {
		if _, err := models.ParseCategoryRank(rank); err != nil {
			return fmt.Errorf("user %d task[%d] unparseable sort_order %q: %w", userID, i, rank, err)
		}
		if _, ok := seen[rank]; ok {
			return fmt.Errorf("user %d duplicate sort_order %q", userID, rank)
		}
		seen[rank] = struct{}{}
		if i > 0 && rank <= prev {
			return fmt.Errorf("user %d ranks not increasing at %d: %q then %q", userID, i, prev, rank)
		}
		prev = rank
	}
	return nil
}
