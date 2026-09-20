package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"tickpulse/backend-go/internal/license"
	"tickpulse/backend-go/internal/middleware"
	"tickpulse/backend-go/internal/services"
)

type LicenseHandler struct {
	Users *services.UserService
}

func (h *LicenseHandler) GetLicense(c *gin.Context) {
	id, ok := middleware.SessionUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Not authenticated"})
		return
	}
	user, err := h.Users.GetUserByID(id)
	if err != nil || user == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server Error"})
		return
	}
	key := ""
	if user.LicenseKey != nil {
		key = *user.LicenseKey
	}
	c.JSON(http.StatusOK, gin.H{
		"licenseKey":  key,
		"licenseType": license.Lookup(key),
	})
}

func (h *LicenseHandler) UpdateLicense(c *gin.Context) {
	id, ok := middleware.SessionUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Not authenticated"})
		return
	}
	var body struct {
		NewKey string `json:"newKey"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid license Key"})
		return
	}

	switch license.Lookup(body.NewKey) {
	case license.TypeInvalid:
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid license Key"})
		return
	case license.TypeNormal:
		c.JSON(http.StatusBadRequest, gin.H{"message": "This license key is for \"Normal\" user"})
		return
	}

	if err := h.Users.SetLicenseKey(id, body.NewKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Server Error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "License Key updated successfully"})
}
