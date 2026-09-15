package utils

import "github.com/gin-gonic/gin"

func Success(c *gin.Context, data gin.H, code ...int) {
	status := 200
	if len(code) > 0 {
		status = code[0]
	}
	payload := gin.H{"success": true}
	for k, v := range data {
		payload[k] = v
	}
	c.JSON(status, payload)
}

func Error(c *gin.Context, message string, code int) {
	c.JSON(code, gin.H{"success": false, "error": message})
}
