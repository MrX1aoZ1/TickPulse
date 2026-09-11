package server

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/handlers"
	"tickpulse/backend-go/internal/middleware"
	"tickpulse/backend-go/internal/services"
)

func NewRouter(cfg config.Config, database *sqlx.DB) *gin.Engine {
	users := &services.UserService{DB: database}
	authH := &handlers.AuthHandler{Cfg: cfg, Users: users}
	taskH := &handlers.TaskHandler{DB: database}
	catH := &handlers.CategoryHandler{DB: database}
	licH := &handlers.LicenseHandler{Users: users}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	store := cookie.NewStore([]byte(cfg.AccessSecret))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   int((24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   false,
	})
	r.Use(sessions.Sessions("connect.sid", store))

	r.GET("/api/data", handlers.PublicData)

	auth := r.Group("/auth")
	{
		auth.GET("/check", authH.CheckAuthStatus)
		auth.POST("/sign-up", middleware.CheckNotAuthenticated(), authH.SignUp)
		auth.POST("/login", middleware.CheckNotAuthenticated(), authH.Login)
		auth.GET("/google", authH.GoogleLogin)
		auth.GET("/google/callback", authH.GoogleCallback)
		auth.POST("/logout", authH.Logout)
	}

	tasks := r.Group("/api/tasks")
	tasks.Use(middleware.Protect(users))
	{
		tasks.GET("", taskH.GetTasks)
		tasks.POST("", taskH.CreateTask)
		tasks.PUT("/reorder", taskH.ReorderTasks)
		tasks.PUT("/:taskId/reorder", taskH.UpdateTaskOrder)
		tasks.GET("/:taskId", taskH.GetTaskByID)
		tasks.PUT("/:taskId", taskH.UpdateTask)
		tasks.DELETE("/:taskId", taskH.DeleteTask)
	}

	categories := r.Group("/api/categories")
	categories.Use(middleware.Protect(users))
	{
		categories.GET("", catH.GetAllCategory)
		categories.POST("", catH.CreateCategory)
		categories.GET("/:categoryId", catH.GetTasksByCategory)
		categories.PUT("/:categoryId/order", catH.UpdateCategoryOrder)
		categories.PUT("/:categoryId", catH.UpdateCategory)
		categories.DELETE("/:categoryId", catH.DeleteCategory)
	}

	lic := r.Group("/api/license")
	lic.Use(middleware.Protect(users))
	{
		lic.GET("", licH.GetLicense)
		lic.PUT("", licH.UpdateLicense)
	}

	return r
}
