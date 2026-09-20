package test_module

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"tickpulse/backend-go/internal/config"
	"tickpulse/backend-go/internal/db"
	"tickpulse/backend-go/internal/server"
)

const testPassword = "Password.123!"

var (
	testDB     *sqlx.DB
	testServer *httptest.Server
	emailSeq   atomic.Int64
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	cfg := config.Load()
	testDB = db.Connect(cfg)
	if err := db.EnsureTables(testDB); err != nil {
		fmt.Fprintf(os.Stderr, "ensure tables: %v\n", err)
		os.Exit(1)
	}
	testServer = httptest.NewServer(server.NewRouter(cfg, testDB))
	code := m.Run()
	testServer.Close()
	_ = testDB.Close()
	os.Exit(code)
}

type apiClient struct {
	t      *testing.T
	http   *http.Client
	emails []string
}

func newClient(t *testing.T) *apiClient {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	c := &apiClient{
		t:    t,
		http: &http.Client{Jar: jar, Timeout: 10 * time.Second},
	}
	t.Cleanup(func() {
		for i := len(c.emails) - 1; i >= 0; i-- {
			deleteUserByEmail(c.emails[i])
		}
	})
	return c
}

func uniqueEmail(t *testing.T) string {
	t.Helper()
	n := emailSeq.Add(1)
	return fmt.Sprintf("g%dt%d@tickpulse.test", time.Now().UnixNano(), n)
}

func (c *apiClient) do(method, path string, body any) *http.Response {
	c.t.Helper()
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		rdr = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, testServer.URL+path, rdr)
	if err != nil {
		c.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	return resp
}

func decodeJSON[T any](t *testing.T, resp *http.Response) T {
	t.Helper()
	defer resp.Body.Close()
	var out T
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("json decode failed (%s): %s", err, raw)
	}
	return out
}

func readBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}

type userDTO struct {
	ID    int     `json:"id"`
	Email string  `json:"email"`
	User  *string `json:"user"`
}

type authOK struct {
	Success bool    `json:"success"`
	Message string  `json:"message"`
	User    userDTO `json:"user"`
}

type authCheck struct {
	Authenticated bool    `json:"authenticated"`
	Message       string  `json:"message"`
	User          userDTO `json:"user"`
}

type errBody struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (c *apiClient) signUp(email string) authOK {
	c.t.Helper()
	c.emails = append(c.emails, email)
	resp := c.do(http.MethodPost, "/auth/sign-up", map[string]string{
		"email":    email,
		"password": testPassword,
	})
	if resp.StatusCode != http.StatusOK {
		c.t.Fatalf("sign-up status %d: %s", resp.StatusCode, readBody(c.t, resp))
	}
	out := decodeJSON[authOK](c.t, resp)
	if !out.Success || out.User.ID == 0 {
		c.t.Fatalf("sign-up payload: %+v", out)
	}
	return out
}

func (c *apiClient) login(email string) authOK {
	c.t.Helper()
	resp := c.do(http.MethodPost, "/auth/login", map[string]string{
		"email":    email,
		"password": testPassword,
	})
	if resp.StatusCode != http.StatusOK {
		c.t.Fatalf("login status %d: %s", resp.StatusCode, readBody(c.t, resp))
	}
	out := decodeJSON[authOK](c.t, resp)
	if !out.Success {
		c.t.Fatalf("login payload: %+v", out)
	}
	return out
}

func (c *apiClient) createTask(name string, extra map[string]any) map[string]any {
	c.t.Helper()
	body := map[string]any{"task_name": name}
	for k, v := range extra {
		body[k] = v
	}
	resp := c.do(http.MethodPost, "/api/tasks", body)
	if resp.StatusCode != http.StatusCreated {
		c.t.Fatalf("create task status %d: %s", resp.StatusCode, readBody(c.t, resp))
	}
	return decodeJSON[map[string]any](c.t, resp)
}

func sessionCookieName(c *http.Client) string {
	if testServer == nil {
		return ""
	}
	u := testServer.URL
	req, _ := http.NewRequest(http.MethodGet, u, nil)
	for _, cookie := range c.Jar.Cookies(req.URL) {
		if cookie.Name == "connect.sid" {
			return cookie.Value
		}
	}
	return ""
}

func deleteUserByEmail(email string) {
	if testDB == nil || email == "" {
		return
	}
	var id int
	if err := testDB.Get(&id, `SELECT id FROM Users WHERE email = ?`, email); err != nil {
		return
	}
	_, _ = testDB.Exec(`DELETE st FROM SubTasks st INNER JOIN Tasks t ON st.task_id = t.id WHERE t.user_id = ?`, id)
	_, _ = testDB.Exec(`DELETE FROM Tasks WHERE user_id = ?`, id)
	_, _ = testDB.Exec(`DELETE FROM Categories WHERE user_id = ?`, id)
	_, _ = testDB.Exec(`DELETE FROM UserAuth WHERE user_id = ?`, id)
	_, _ = testDB.Exec(`DELETE FROM Users WHERE id = ?`, id)
}
