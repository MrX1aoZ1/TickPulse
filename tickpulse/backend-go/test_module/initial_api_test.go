package test_module

import (
	"fmt"
	"net/http"
	"testing"
)

// Mirrors backend/test_module/initial_api_test.js, with the original bugs fixed:
// - Test 6 posted to /tasks (404) instead of /api/tasks, so a "401" pass was unreliable.
// - Test 4 treated empty categories as success; signup always creates Inbox.
func TestInitialAPIFlow(t *testing.T) {
	c := newClient(t)
	email := uniqueEmail(t)

	t.Run("1_sign_up", func(t *testing.T) {
		out := c.signUp(email)
		if out.User.Email != email {
			t.Fatalf("email mismatch: %s", out.User.Email)
		}
	})

	var userID int
	t.Run("2_login", func(t *testing.T) {
		out := c.login(email)
		userID = out.User.ID
		if sessionCookieName(c.http) == "" {
			t.Fatal("login did not set connect.sid")
		}
	})

	t.Run("3_create_task", func(t *testing.T) {
		task := c.createTask("Auto Test Task", map[string]any{
			"user_id":     userID,
			"category_id": inboxID(userID),
			"status":      "pending",
			"sort_order":  "100",
		})
		if task["task_name"] != "Auto Test Task" {
			t.Fatalf("task payload: %v", task)
		}
		if task["id"] == nil || task["id"] == "" {
			t.Fatal("created task missing id")
		}
	})

	t.Run("4_list_categories", func(t *testing.T) {
		resp := c.do(http.MethodGet, "/api/categories", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("categories status %d: %s", resp.StatusCode, readBody(t, resp))
		}
		cats := decodeJSON[[]map[string]any](t, resp)
		if len(cats) == 0 {
			t.Fatal("expected at least Inbox after sign-up")
		}
		foundInbox := false
		for _, cat := range cats {
			if cat["id"] == inboxID(userID) {
				foundInbox = true
			}
		}
		if !foundInbox {
			t.Fatalf("missing inbox_%d in %v", userID, cats)
		}
	})

	t.Run("5_logout", func(t *testing.T) {
		resp := c.do(http.MethodPost, "/auth/logout", nil)
		out := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("logout status %d: %v", resp.StatusCode, out)
		}
	})

	t.Run("6_create_task_after_logout_rejected", func(t *testing.T) {
		resp := c.do(http.MethodPost, "/api/tasks", map[string]any{
			"task_name":   "Insecure Auto Test Task",
			"category_id": inboxID(userID),
			"status":      "pending",
			"sort_order":  0.0,
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("expected 401 after logout, got %d", resp.StatusCode)
		}
	})
}

func inboxID(userID int) string {
	return fmt.Sprintf("inbox_%d", userID)
}
