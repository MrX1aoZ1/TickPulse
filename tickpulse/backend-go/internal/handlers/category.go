package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/middleware"
	"tickpulse/backend-go/internal/models"
)

const categoryColumns = `id, user_id, category_name, color, sort_order`

type CategoryHandler struct {
	DB *sqlx.DB
}

type createCategoryRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type updateCategoryRequest struct {
	Name  *string `json:"name"`
	Color *string `json:"color"`
}

type reorderCategoryRequest struct {
	PrevID *string `json:"prev_id"`
	NextID *string `json:"next_id"`
}

func (h *CategoryHandler) getCategory(id string, userID int) (*models.Category, error) {
	var category models.Category
	err := h.DB.Get(&category, `SELECT `+categoryColumns+` FROM categories WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (h *CategoryHandler) GetTasksByCategory(c *gin.Context) {
	user := middleware.CurrentUser(c)
	tasks := make([]models.Task, 0)
	err := h.DB.Select(&tasks, `
		SELECT `+taskColumns+`
		FROM tasks
		WHERE category_id = ? AND user_id = ?
		ORDER BY sort_order ASC`,
		c.Param("categoryId"), user.ID,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	if len(tasks) == 0 {
		c.JSON(200, gin.H{"message": "No tasks found for this category"})
		return
	}
	c.JSON(200, tasks)
}

func (h *CategoryHandler) GetAllCategory(c *gin.Context) {
	user := middleware.CurrentUser(c)
	log.Println(user.ID)

	categories := make([]models.Category, 0)
	err := h.DB.Select(&categories, `
		SELECT `+categoryColumns+`
		FROM categories
		WHERE user_id = ?
		ORDER BY sort_order ASC`, user.ID)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	if len(categories) == 0 {
		c.JSON(404, gin.H{"message": "No categories found"})
		return
	}
	c.JSON(200, categories)
}

func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var body createCategoryRequest
	if err := c.ShouldBindJSON(&body); err != nil || body.Name == "" {
		c.JSON(400, gin.H{"message": "Missing required fields: id"})
		return
	}

	var last models.Category
	err := h.DB.Get(&last, `
		SELECT `+categoryColumns+`
		FROM categories
		WHERE user_id = ?
		ORDER BY sort_order DESC
		LIMIT 1`, user.ID)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	lastOrder := ""
	if err == nil {
		lastOrder = last.SortOrder
	}
	nextOrder := models.NextCategoryRank(lastOrder)
	log.Println(nextOrder)

	color := body.Color
	if color == "" {
		color = "#FFFFFF"
	}

	category := models.Category{
		ID:           uuid.NewString(),
		UserID:       user.ID,
		CategoryName: body.Name,
		Color:        color,
		SortOrder:    nextOrder,
	}

	_, err = h.DB.Exec(
		`INSERT INTO categories (id, user_id, category_name, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
		category.ID, category.UserID, category.CategoryName, category.Color, category.SortOrder,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}

	c.JSON(201, gin.H{
		"category_id": category.ID,
		"user_id":     category.UserID,
		"name":        category.CategoryName,
		"color":       category.Color,
		"sort_order":  category.SortOrder,
	})
}

func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	user := middleware.CurrentUser(c)
	categoryID := c.Param("categoryId")
	var body updateCategoryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"message": "Invalid request body"})
		return
	}
	log.Println(body)

	existing, err := h.getCategory(categoryID, user.ID)
	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"message": "Category not found or unauthorized"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}

	if body.Name != nil {
		existing.CategoryName = *body.Name
	}
	if body.Color != nil {
		existing.Color = *body.Color
	}

	_, err = h.DB.Exec(
		`UPDATE categories SET category_name = ?, color = ? WHERE id = ? AND user_id = ?`,
		existing.CategoryName, existing.Color, categoryID, user.ID,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message":     "Category updated successfully",
		"category_id": existing.ID,
		"name":        existing.CategoryName,
		"color":       existing.Color,
	})
}

func (h *CategoryHandler) UpdateCategoryOrder(c *gin.Context) {
	user := middleware.CurrentUser(c)
	categoryID := c.Param("categoryId")
	var body reorderCategoryRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"message": "Invalid request body"})
		return
	}

	prevRank, err := h.neighborSortOrder(user.ID, derefID(body.PrevID), categoryID)
	if err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}
	nextRank, err := h.neighborSortOrder(user.ID, derefID(body.NextID), categoryID)
	if err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	sortOrder, err := models.RankBetween(prevRank, nextRank)
	if err != nil {
		c.JSON(400, gin.H{"message": "Could not compute LexoRank"})
		return
	}

	res, err := h.DB.Exec(
		`UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?`,
		sortOrder, categoryID, user.ID,
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(404, gin.H{"message": "Category not found or unauthorized"})
		return
	}
	c.JSON(200, gin.H{"message": "Order updated successfully", "sort_order": sortOrder})
}

func derefID(id *string) string {
	if id == nil {
		return ""
	}
	return strings.TrimSpace(*id)
}

func (h *CategoryHandler) neighborSortOrder(userID int, neighborID, movingID string) (string, error) {
	if neighborID == "" {
		return "", nil
	}
	if neighborID == movingID {
		return "", fmt.Errorf("neighbor cannot be the moved category")
	}
	cat, err := h.getCategory(neighborID, userID)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("neighbor category not found")
	}
	if err != nil {
		return "", err
	}
	return cat.SortOrder, nil
}

func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	user := middleware.CurrentUser(c)
	categoryID := c.Param("categoryId")
	if strings.HasPrefix(categoryID, "inbox_") {
		c.JSON(400, gin.H{"message": "System default list cannot be deleted"})
		return
	}

	tx, err := h.DB.Beginx()
	if err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	defer tx.Rollback()

	inboxID := fmt.Sprintf("inbox_%d", user.ID)
	if _, err := tx.Exec(
		`UPDATE tasks SET category_id = ? WHERE category_id = ? AND user_id = ?`,
		inboxID, categoryID, user.ID,
	); err != nil {
		log.Println("Delete Category Error:", err)
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}

	res, err := tx.Exec(`DELETE FROM categories WHERE id = ? AND user_id = ?`, categoryID, user.ID)
	if err != nil {
		log.Println("Delete Category Error:", err)
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(404, gin.H{"message": "Category not found or unauthorized"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(500, gin.H{"message": "Server error", "error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "Category deleted successfully, tasks moved to Inbox"})
}
