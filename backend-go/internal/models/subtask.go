package models

type SubTask struct {
	ID          int     `db:"id" json:"id"`
	TaskID      string  `db:"task_id" json:"task_id"`
	SubtaskName *string `db:"subtask_name" json:"subtask_name"`
	IsDone      bool    `db:"is_done" json:"is_done"`
	SortOrder   float64 `db:"sort_order" json:"sort_order"`
}
