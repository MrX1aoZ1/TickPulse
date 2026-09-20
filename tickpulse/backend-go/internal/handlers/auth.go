package handlers

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/middleware"
	"tickpulse/backend-go/internal/services"
	"tickpulse/backend-go/internal/utils"
)

const (
	googleOAuthState = "tickpulse_google_oauth"
	githubOAuthState = "tickpulse_github_oauth"
)

// AuthHandler 對應 src/controllers/authController.js
type AuthHandler struct {
	Cfg   config.Config
	Users *services.UserService
}

func (h *AuthHandler) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.Cfg.GoogleClientID,
		ClientSecret: h.Cfg.GoogleClientSecret,
		RedirectURL:  h.Cfg.GoogleCallbackURL,
		Scopes:       []string{"profile", "email"},
		Endpoint:     google.Endpoint,
	}
}

func (h *AuthHandler) githubOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.Cfg.GitHubClientID,
		ClientSecret: h.Cfg.GitHubClientSecret,
		RedirectURL:  h.Cfg.GitHubCallbackURL,
		Scopes:       []string{"read:user", "user:email"},
		Endpoint:     github.Endpoint,
	}
}

func (h *AuthHandler) CheckAuthStatus(c *gin.Context) {
	id, ok := middleware.SessionUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"authenticated": false, "message": "Not authenticated"})
		return
	}
	user, err := h.Users.GetUserByID(id)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"authenticated": false, "message": "Not authenticated"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"authenticated": true,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"user":  user.Username,
		},
	})
}

func (h *AuthHandler) SignUp(c *gin.Context) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Error(c, "Server error during sign-up", 500)
		return
	}

	existing, err := h.Users.GetUserByEmail(body.Email)
	if err != nil {
		log.Println("Sign-up error:", err)
		utils.Error(c, "Server error during sign-up", 500)
		return
	}
	if existing != nil {
		utils.Error(c, "Email already exists", 400)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		log.Println("Sign-up error:", err)
		utils.Error(c, "Server error during sign-up", 500)
		return
	}

	username := body.Email
	if i := strings.Index(body.Email, "@"); i > 0 {
		username = body.Email[:i]
	}
	hashStr := string(hashed)
	newUser, err := h.Users.CreateUserAccount(body.Email, username, "local", body.Email, &hashStr, nil)
	if err != nil {
		log.Println("Sign-up error:", err)
		utils.Error(c, "Server error during sign-up", 500)
		return
	}

	utils.Success(c, gin.H{
		"user": gin.H{"id": newUser.ID, "email": newUser.Email},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Error(c, "Server Error", 500)
		return
	}

	user, err := h.Users.GetUserByEmail(body.Email)
	if err != nil {
		log.Println("Login Error:", err)
		utils.Error(c, "Server Error", 500)
		return
	}
	if user == nil {
		utils.Error(c, "Email not registered", 401)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		utils.Error(c, "Password incorrect", 402)
		return
	}

	if err := middleware.SaveLogin(c, user.ID); err != nil {
		log.Println("Session Error:", err)
		utils.Error(c, "Session initialization failed", 500)
		return
	}

	utils.Success(c, gin.H{
		"message": "Login successful",
		"user":    gin.H{"id": user.ID, "email": user.Email},
	})
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	h.startOAuth(c, h.googleOAuthConfig(), googleOAuthState)
}

func (h *AuthHandler) GitHubLogin(c *gin.Context) {
	if h.Cfg.GitHubClientID == "" || h.Cfg.GitHubClientSecret == "" {
		h.clientRedirect(c, oauthFailPathFromNext(c)+"?error=server_error")
		return
	}
	h.startOAuth(c, h.githubOAuthConfig(), githubOAuthState)
}

func (h *AuthHandler) startOAuth(c *gin.Context, cfg *oauth2.Config, state string) {
	if c.Query("next") == "/sign-up" {
		state += ":sign-up"
	}
	c.Redirect(http.StatusFound, cfg.AuthCodeURL(state, oauth2.AccessTypeOnline))
}

func oauthFailPathFromNext(c *gin.Context) string {
	if c.Query("next") == "/sign-up" {
		return "/sign-up"
	}
	return "/login"
}

func oauthFailPath(state string) string {
	if strings.HasSuffix(state, ":sign-up") {
		return "/sign-up"
	}
	return "/login"
}

// clientRedirect issues a 200 HTML page that then navigates to the frontend.
// A 302 from :3000 to :3001 can drop the session cookie (bounce-tracking / cross-origin redirect).
func (h *AuthHandler) clientRedirect(c *gin.Context, path string) {
	dest := h.Cfg.ClientURL + path
	c.Header("Cache-Control", "no-store")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(fmt.Sprintf(
		`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=%s">
<title>Redirecting…</title>
</head>
<body>
<p>Redirecting…</p>
<script>window.location.replace(%q);</script>
</body>
</html>`, html.EscapeString(dest), dest)))
}

type googleProfile struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type githubUser struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func oauthAuthCode(c *gin.Context, fail func(string)) (string, bool) {
	if c.Query("error") != "" {
		fail("auth_failed")
		return "", false
	}
	code := c.Query("code")
	if code == "" {
		fail("auth_failed")
		return "", false
	}
	return code, true
}

func (h *AuthHandler) oauthFail(c *gin.Context) func(string) {
	failPath := oauthFailPath(c.Query("state"))
	return func(code string) {
		h.clientRedirect(c, failPath+"?error="+code)
	}
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	fail := h.oauthFail(c)
	code, ok := oauthAuthCode(c, fail)
	if !ok {
		return
	}

	cfg := h.googleOAuthConfig()
	tok, err := cfg.Exchange(c.Request.Context(), code)
	if err != nil {
		log.Println("Google Callback Error:", err)
		fail("server_error")
		return
	}

	resp, err := cfg.Client(c.Request.Context(), tok).Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		log.Println("Google Callback Error:", err)
		fail("server_error")
		return
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	var profile googleProfile
	if err := json.Unmarshal(raw, &profile); err != nil || profile.ID == "" {
		log.Println("Google Callback Error:", err)
		fail("server_error")
		return
	}

	email := profile.Email
	username := profile.Name
	if username == "" && strings.Contains(email, "@") {
		username = strings.Split(email, "@")[0]
	}

	h.completeOAuth(c, "google", profile.ID, email, username, fail)
}

func (h *AuthHandler) GitHubCallback(c *gin.Context) {
	fail := h.oauthFail(c)
	code, ok := oauthAuthCode(c, fail)
	if !ok {
		return
	}

	cfg := h.githubOAuthConfig()
	tok, err := cfg.Exchange(c.Request.Context(), code)
	if err != nil {
		log.Println("GitHub Callback Error:", err)
		fail("server_error")
		return
	}

	client := cfg.Client(c.Request.Context(), tok)
	var profile githubUser
	if err := githubAPIGet(client, "https://api.github.com/user", &profile); err != nil || profile.ID == 0 {
		log.Println("GitHub Callback Error:", err)
		fail("server_error")
		return
	}

	email := profile.Email
	if email == "" {
		var emails []githubEmail
		if err := githubAPIGet(client, "https://api.github.com/user/emails", &emails); err != nil {
			log.Println("GitHub Callback Error:", err)
			fail("server_error")
			return
		}
		email = pickGitHubEmail(emails)
	}
	if email == "" {
		email = fmt.Sprintf("%d+%s@users.noreply.github.com", profile.ID, profile.Login)
	}

	username := profile.Name
	if username == "" {
		username = profile.Login
	}

	h.completeOAuth(c, "github", strconv.FormatInt(profile.ID, 10), email, username, fail)
}

func githubAPIGet(client *http.Client, rawURL string, dest any) error {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "tickpulse")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("github api %s: %s", resp.Status, strings.TrimSpace(string(raw)))
	}
	return json.Unmarshal(raw, dest)
}

func pickGitHubEmail(emails []githubEmail) string {
	var fallback string
	for _, e := range emails {
		if e.Email == "" {
			continue
		}
		if e.Primary && e.Verified {
			return e.Email
		}
		if e.Verified && fallback == "" {
			fallback = e.Email
		}
		if fallback == "" {
			fallback = e.Email
		}
	}
	return fallback
}

func (h *AuthHandler) completeOAuth(c *gin.Context, provider, providerID, email, username string, fail func(string)) {
	failPath := oauthFailPath(c.Query("state"))
	logErr := func(err error) {
		log.Println(provider, "OAuth error:", err)
		fail("server_error")
	}

	var userID int
	if id, ok := middleware.SessionUserID(c); ok {
		linked, err := h.Users.IsProviderLinked(provider, providerID)
		if err != nil {
			logErr(err)
			return
		}
		if linked {
			msg := url.QueryEscape("This account is already linked to another user.")
			h.clientRedirect(c, failPath+"?error="+msg)
			return
		}
		if err := h.Users.LinkProviderToUser(id, provider, providerID); err != nil {
			logErr(err)
			return
		}
		userID = id
	} else {
		existing, err := h.Users.GetUserByProvider(provider, providerID)
		if err != nil {
			logErr(err)
			return
		}
		if existing != nil {
			userID = existing.ID
		} else if byEmail, err := h.Users.GetUserAccountByEmail(email); err != nil {
			logErr(err)
			return
		} else if byEmail != nil {
			if err := h.Users.LinkProviderToUser(byEmail.ID, provider, providerID); err != nil {
				logErr(err)
				return
			}
			userID = byEmail.ID
		} else {
			created, err := h.Users.CreateUserAccount(email, username, provider, providerID, nil, nil)
			if err != nil {
				logErr(err)
				return
			}
			userID = created.ID
		}
	}

	user, err := h.Users.GetUserByID(userID)
	if err != nil || user == nil {
		log.Println(provider, "OAuth session error:", err)
		fail("session_error")
		return
	}
	if err := middleware.SaveLogin(c, user.ID); err != nil {
		log.Println(provider, "OAuth session error:", err)
		fail("session_error")
		return
	}

	h.clientRedirect(c, "/auth/callback")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	session := sessions.Default(c)
	session.Clear()
	_ = session.Save()
	secure := false
	c.SetCookie("connect.sid", "", -1, "/", "", secure, true)
	utils.Success(c, gin.H{"success": true})
}

func PublicData(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":   "Public Data, No Authentication Required",
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	})
}
