package models

import "time"

// Task.sort_order 在 schema 是 DOUBLE，拖曳排序用前後權重取中點（fractional indexing）。
type Task struct {
	ID             string     `db:"id" json:"id"`
	UserID         int        `db:"user_id" json:"user_id"`
	CategoryID     *string    `db:"category_id" json:"category_id"`
	TaskName       string     `db:"task_name" json:"task_name"`
	Content        *string    `db:"content" json:"content"`
	Status         string     `db:"status" json:"status"`
	Priority       string     `db:"priority" json:"priority"`
	Deadline       *time.Time `db:"deadline" json:"deadline"`
	StartTime      *time.Time `db:"start_time" json:"start_time"`
	EndTime        *time.Time `db:"end_time" json:"end_time"`
	IsAllDay       bool       `db:"is_all_day" json:"is_all_day"`
	ReminderType   int        `db:"reminder_type" json:"reminder_type"`
	ReminderTime   *time.Time `db:"reminder_time" json:"reminder_time"`
	IsRecurring    bool       `db:"is_recurring" json:"is_recurring"`
	RecurrenceRule *string    `db:"recurrence_rule" json:"recurrence_rule"`
	SortOrder      float64    `db:"sort_order" json:"sort_order"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}
