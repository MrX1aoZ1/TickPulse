package handlers

import (
	"database/sql"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/middleware"
	"tickpulse/backend-go/internal/models"
)

const taskColumns = `id, user_id, category_id, task_name, content, status, priority,
	deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
	is_recurring, recurrence_rule, sort_order, created_at, updated_at`

var allowedTaskColumns = map[string]bool{
	"id": true, "user_id": true, "category_id": true, "task_name": true,
	"content": true, "status": true, "priority": true, "deadline": true,
	"start_time": true, "end_time": true, "is_all_day": true,
	"reminder_type": true, "reminder_time": true, "is_recurring": true,
	"recurrence_rule": true, "sort_order": true,
}

type TaskHandler struct {
	DB *sqlx.DB
}

type createTaskRequest struct {
	TaskName       string  `json:"task_name"`
	CategoryID     *string `json:"category_id"`
	Priority       string  `json:"priority"`
	Deadline       *string `json:"deadline"`
	StartTime      *string `json:"start_time"`
	EndTime        *string `json:"end_time"`
	IsAllDay       *bool   `json:"is_all_day"`
	ReminderType   *int    `json:"reminder_type"`
	ReminderTime   *string `json:"reminder_time"`
	IsRecurring    *bool   `json:"is_recurring"`
	RecurrenceRule *string `json:"recurrence_rule"`
}

type reorderTaskRequest struct {
	PrevOrder *float64 `json:"prev_order"`
	NextOrder *float64 `json:"next_order"`
}

func (h *TaskHandler) getTask(id string, userID int) (*models.Task, error) {
	var task models.Task
	err := h.DB.Get(&task, `SELECT `+taskColumns+` FROM tasks WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (h *TaskHandler) GetTasks(c *gin.Context) {
	user := middleware.CurrentUser(c)
	tasks := make([]models.Task, 0)
	err := h.DB.Select(&tasks, `
		SELECT `+taskColumns+`
		FROM tasks
		WHERE user_id = ?
		ORDER BY sort_order ASC, created_at DESC`, user.ID)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	c.JSON(200, tasks)
}

func (h *TaskHandler) GetTaskByID(c *gin.Context) {
	user := middleware.CurrentUser(c)
	task, err := h.getTask(c.Param("taskId"), user.ID)
	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"message": "Task not found"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	c.JSON(200, task)
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var body createTaskRequest
	if err := c.ShouldBindJSON(&body); err != nil || body.TaskName == "" {
		c.JSON(400, gin.H{"message": "Missing required fields: id and task_name are mandatory."})
		return
	}

	task := models.Task{
		ID:           uuid.NewString(),
		UserID:       user.ID,
		TaskName:     body.TaskName,
		Status:       "pending",
		Priority:     "none",
		IsAllDay:     true,
		ReminderType: 1,
		SortOrder:    0,
	}
	if body.Priority != "" {
		task.Priority = body.Priority
	}
	inboxID := fmt.Sprintf("inbox_%d", user.ID)
	if body.CategoryID != nil && *body.CategoryID != "" {
		task.CategoryID = body.CategoryID
	} else {
		task.CategoryID = &inboxID
	}
	if body.IsAllDay != nil {
		task.IsAllDay = *body.IsAllDay
	}
	if body.ReminderType != nil {
		task.ReminderType = *body.ReminderType
	}
	if body.IsRecurring != nil {
		task.IsRecurring = *body.IsRecurring
	}
	if body.RecurrenceRule != nil && *body.RecurrenceRule != "" {
		task.RecurrenceRule = body.RecurrenceRule
	}

	_, err := h.DB.Exec(`
		INSERT INTO tasks (
			id, user_id, category_id, task_name, content, status, priority,
			deadline, start_time, end_time, is_all_day, reminder_type, reminder_time,
			is_recurring, recurrence_rule, sort_order
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		task.ID, task.UserID, task.CategoryID, task.TaskName, task.Content, task.Status, task.Priority,
		emptyToNil(body.Deadline), emptyToNil(body.StartTime), emptyToNil(body.EndTime),
		task.IsAllDay, task.ReminderType, emptyToNil(body.ReminderTime),
		task.IsRecurring, task.RecurrenceRule, task.SortOrder,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}

	created, err := h.getTask(task.ID, user.ID)
	if err != nil {
		c.JSON(201, gin.H{
			"id":          task.ID,
			"user_id":     task.UserID,
			"category_id": task.CategoryID,
			"task_name":   task.TaskName,
			"content":     task.Content,
			"status":      task.Status,
			"priority":    task.Priority,
			"deadline":    emptyToNil(body.Deadline),
			"sort_order":  task.SortOrder,
		})
		return
	}
	c.JSON(201, created)
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var updates map[string]any
	if err := c.ShouldBindJSON(&updates); err != nil || len(updates) == 0 {
		c.JSON(400, gin.H{"message": "No fields provided for updates"})
		return
	}

	assignments := make([]string, 0)
	values := make([]any, 0)
	for key, val := range updates {
		if !allowedTaskColumns[key] {
			continue
		}
		assignments = append(assignments, fmt.Sprintf("`%s` = ?", key))
		values = append(values, val)
	}
	if len(assignments) == 0 {
		c.JSON(400, gin.H{"message": "No fields provided for updates"})
		return
	}

	taskID := c.Param("taskId")
	values = append(values, taskID, user.ID)
	q := fmt.Sprintf("UPDATE tasks SET %s WHERE id = ? AND user_id = ?", strings.Join(assignments, ", "))
	res, err := h.DB.Exec(q, values...)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(404, gin.H{"message": "Task not found or access denied"})
		return
	}

	task, err := h.getTask(taskID, user.ID)
	if err != nil {
		c.JSON(200, gin.H{"id": taskID})
		return
	}
	c.JSON(200, task)
}

func (h *TaskHandler) UpdateTaskOrder(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var body reorderTaskRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"message": "Reorder bounds omitted"})
		return
	}

	newSortOrder, err := models.MidpointSortOrder(body.PrevOrder, body.NextOrder)
	if err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	taskID := c.Param("taskId")
	res, err := h.DB.Exec(
		`UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?`,
		newSortOrder, taskID, user.ID,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(404, gin.H{"message": "Task reordering failed"})
		return
	}

	task, err := h.getTask(taskID, user.ID)
	if err != nil {
		c.JSON(200, gin.H{"id": taskID, "sort_order": newSortOrder})
		return
	}
	c.JSON(200, task)
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res, err := h.DB.Exec(`DELETE FROM tasks WHERE id = ? AND user_id = ?`, c.Param("taskId"), user.ID)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(404, gin.H{"message": "Task not found or unauthorized"})
		return
	}
	c.JSON(200, gin.H{"message": "Task deleted successfully"})
}

func emptyToNil(v *string) any {
	if v == nil || *v == "" {
		return nil
	}
	return *v
}
