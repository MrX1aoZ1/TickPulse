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
	"recurrence_rule": true,
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
	PrevID *string `json:"prev_id"`
	NextID *string `json:"next_id"`
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

	nextRank, err := h.nextRankInCategory(user.ID, task.CategoryID)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	task.SortOrder = nextRank

	_, err = h.DB.Exec(`
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
	taskID := c.Param("taskId")
	var body reorderTaskRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"message": "Invalid request body"})
		return
	}

	orders, err := h.applyReorder(user.ID, []string{taskID}, derefTaskID(body.PrevID), derefTaskID(body.NextID))
	if err != nil {
		writeReorderError(c, err)
		return
	}
	task, getErr := h.getTask(taskID, user.ID)
	if getErr != nil {
		c.JSON(200, gin.H{"id": taskID, "sort_order": orders[taskID]})
		return
	}
	c.JSON(200, task)
}

type reorderManyRequest struct {
	IDs    []string `json:"ids"`
	PrevID *string  `json:"prev_id"`
	NextID *string  `json:"next_id"`
}

func (h *TaskHandler) ReorderTasks(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var body reorderManyRequest
	if err := c.ShouldBindJSON(&body); err != nil || len(body.IDs) == 0 {
		c.JSON(400, gin.H{"message": "ids are required"})
		return
	}

	orders, err := h.applyReorder(user.ID, body.IDs, derefTaskID(body.PrevID), derefTaskID(body.NextID))
	if err != nil {
		writeReorderError(c, err)
		return
	}
	c.JSON(200, gin.H{"ids": body.IDs, "sort_orders": orders})
}

type reorderError struct {
	Status  int
	Message string
}

func (e *reorderError) Error() string { return e.Message }

func writeReorderError(c *gin.Context, err error) {
	if re, ok := err.(*reorderError); ok {
		c.JSON(re.Status, gin.H{"message": re.Message})
		return
	}
	c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
}

func (h *TaskHandler) applyReorder(userID int, ids []string, prevID, nextID string) (map[string]string, error) {
	if len(ids) == 0 || len(ids) > 100 {
		return nil, &reorderError{Status: 400, Message: "invalid ids length"}
	}
	moving := make(map[string]bool, len(ids))
	clean := make([]string, 0, len(ids))
	for _, raw := range ids {
		id := strings.TrimSpace(raw)
		if id == "" || moving[id] {
			return nil, &reorderError{Status: 400, Message: "duplicate or empty task id"}
		}
		if _, err := h.getTask(id, userID); err == sql.ErrNoRows {
			return nil, &reorderError{Status: 404, Message: "Task not found or unauthorized"}
		} else if err != nil {
			return nil, err
		}
		moving[id] = true
		clean = append(clean, id)
	}

	prevRank, err := h.neighborSortOrder(userID, prevID, moving)
	if err != nil {
		return nil, &reorderError{Status: 400, Message: err.Error()}
	}
	nextRank, err := h.neighborSortOrder(userID, nextID, moving)
	if err != nil {
		return nil, &reorderError{Status: 400, Message: err.Error()}
	}

	tx, err := h.DB.Beginx()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	orders := make(map[string]string, len(clean))
	cursor := prevRank
	for _, id := range clean {
		rank, err := models.RankBetween(cursor, nextRank)
		if err != nil {
			return nil, &reorderError{Status: 400, Message: "Could not compute LexoRank"}
		}
		res, err := tx.Exec(`UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?`, rank, id, userID)
		if err != nil {
			return nil, err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return nil, &reorderError{Status: 404, Message: "Task reordering failed"}
		}
		orders[id] = rank
		cursor = rank
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return orders, nil
}

func derefTaskID(id *string) string {
	if id == nil {
		return ""
	}
	return strings.TrimSpace(*id)
}

func (h *TaskHandler) neighborSortOrder(userID int, neighborID string, moving map[string]bool) (string, error) {
	if neighborID == "" {
		return "", nil
	}
	if moving[neighborID] {
		return "", fmt.Errorf("neighbor cannot be one of the moved tasks")
	}
	task, err := h.getTask(neighborID, userID)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("neighbor task not found")
	}
	if err != nil {
		return "", err
	}
	return task.SortOrder, nil
}

func (h *TaskHandler) nextRankInCategory(userID int, categoryID *string) (string, error) {
	var last string
	var err error
	if categoryID == nil || *categoryID == "" {
		err = h.DB.Get(&last, `
			SELECT sort_order FROM tasks
			WHERE user_id = ? AND (category_id IS NULL OR category_id = '')
			ORDER BY sort_order DESC LIMIT 1`, userID)
	} else {
		err = h.DB.Get(&last, `
			SELECT sort_order FROM tasks
			WHERE user_id = ? AND category_id = ?
			ORDER BY sort_order DESC LIMIT 1`, userID, *categoryID)
	}
	if err == sql.ErrNoRows {
		return models.NextCategoryRank(""), nil
	}
	if err != nil {
		return "", err
	}
	return models.NextCategoryRank(last), nil
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
