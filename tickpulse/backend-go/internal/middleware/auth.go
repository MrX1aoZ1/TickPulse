package middleware

import (
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"

	"tickpulse/backend-go/internal/models"
	"tickpulse/backend-go/internal/services"
)

func SessionUserID(c *gin.Context) (int, bool) {
	session := sessions.Default(c)
	v := session.Get("user_id")
	if v == nil {
		v = session.Get("user")
	}
	if v == nil {
		return 0, false
	}
	switch n := v.(type) {
	case int:
		return n, true
	case int64:
		return int(n), true
	case float64:
		return int(n), true
	default:
		return 0, false
	}
}

func SaveLogin(c *gin.Context, userID int) error {
	session := sessions.Default(c)
	session.Set("user_id", userID)
	return session.Save()
}

func CheckNotAuthenticated() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := SessionUserID(c); ok {
			c.JSON(400, gin.H{"message": "Already authenticated"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func CheckAuthenticated() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := SessionUserID(c); ok {
			c.Next()
			return
		}
		c.JSON(401, gin.H{"message": "Unauthorized, please login first"})
		c.Abort()
	}
}

// Protect 對應 authMiddleware.js 的 protect：讀 session 裡的 user_id，再載入使用者。
func Protect(users *services.UserService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := SessionUserID(c)
		if !ok {
			c.JSON(401, gin.H{"message": "Not authorized, please login first"})
			c.Abort()
			return
		}
		user, err := users.GetUserByID(id)
		if err != nil || user == nil {
			c.JSON(401, gin.H{"message": "Not authorized, please login first"})
			c.Abort()
			return
		}
		c.Set("user", user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) *models.User {
	v, ok := c.Get("user")
	if !ok {
		return nil
	}
	u, _ := v.(*models.User)
	return u
}
