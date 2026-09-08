package test_module

import (
	"net/http"
	"strings"
	"testing"
)

func TestAuthEdgeCases(t *testing.T) {
	c := newClient(t)
	email := uniqueEmail(t)
	c.signUp(email)

	t.Run("duplicate_email_rejected", func(t *testing.T) {
		anon := newClient(t)
		resp := anon.do(http.MethodPost, "/auth/sign-up", map[string]string{
			"email":    email,
			"password": testPassword,
		})
		body := decodeJSON[errBody](t, resp)
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status %d body %+v", resp.StatusCode, body)
		}
	})

	t.Run("wrong_password_rejected", func(t *testing.T) {
		anon := newClient(t)
		resp := anon.do(http.MethodPost, "/auth/login", map[string]string{
			"email":    email,
			"password": "WrongPassword!",
		})
		defer resp.Body.Close()
		if resp.StatusCode != 402 {
			t.Fatalf("status %d, want 402", resp.StatusCode)
		}
	})

	t.Run("unknown_email_rejected", func(t *testing.T) {
		anon := newClient(t)
		resp := anon.do(http.MethodPost, "/auth/login", map[string]string{
			"email":    uniqueEmail(t),
			"password": testPassword,
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status %d, want 401", resp.StatusCode)
		}
	})

	t.Run("login_while_already_authenticated", func(t *testing.T) {
		c.login(email)
		resp := c.do(http.MethodPost, "/auth/login", map[string]string{
			"email":    email,
			"password": testPassword,
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status %d, want 400 Already authenticated", resp.StatusCode)
		}
	})
}

func TestPublicDataDoesNotNeedAuth(t *testing.T) {
	c := newClient(t)
	resp := c.do(http.MethodGet, "/api/data", nil)
	out := decodeJSON[map[string]any](t, resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d: %v", resp.StatusCode, out)
	}
	if out["message"] == nil {
		t.Fatalf("payload: %v", out)
	}
}

func TestUnauthenticatedTaskRoutes(t *testing.T) {
	c := newClient(t)
	resp := c.do(http.MethodGet, "/api/tasks", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("GET /api/tasks status %d, want 401", resp.StatusCode)
	}
}

func TestTaskCRUDAndOwnership(t *testing.T) {
	owner := newClient(t)
	intruder := newClient(t)
	ownerEmail := uniqueEmail(t)
	intruderEmail := uniqueEmail(t)

	owner.signUp(ownerEmail)
	intruder.signUp(intruderEmail)
	ownerUser := owner.login(ownerEmail)
	intruder.login(intruderEmail)

	created := owner.createTask("Owner Task", map[string]any{
		"user_id": 999999,
	})
	taskID, _ := created["id"].(string)
	if taskID == "" {
		t.Fatalf("missing task id: %v", created)
	}
	if int(created["user_id"].(float64)) != ownerUser.User.ID {
		t.Fatalf("client-supplied user_id was honored: %v", created["user_id"])
	}

	t.Run("owner_can_read", func(t *testing.T) {
		resp := owner.do(http.MethodGet, "/api/tasks/"+taskID, nil)
		task := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK || task["task_name"] != "Owner Task" {
			t.Fatalf("status %d payload %v", resp.StatusCode, task)
		}
	})

	t.Run("intruder_cannot_read", func(t *testing.T) {
		resp := intruder.do(http.MethodGet, "/api/tasks/"+taskID, nil)
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status %d, want 404", resp.StatusCode)
		}
	})

	t.Run("owner_can_update", func(t *testing.T) {
		resp := owner.do(http.MethodPut, "/api/tasks/"+taskID, map[string]any{
			"task_name": "Renamed Task",
			"status":    "completed",
		})
		task := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK || task["task_name"] != "Renamed Task" {
			t.Fatalf("status %d payload %v", resp.StatusCode, task)
		}
	})

	t.Run("intruder_cannot_update", func(t *testing.T) {
		resp := intruder.do(http.MethodPut, "/api/tasks/"+taskID, map[string]any{
			"task_name": "Hijacked",
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status %d, want 404", resp.StatusCode)
		}
	})

	t.Run("reorder", func(t *testing.T) {
		firstID := taskID
		second := owner.createTask("Second Task", nil)
		secondID, _ := second["id"].(string)
		resp := owner.do(http.MethodPut, "/api/tasks/"+secondID+"/reorder", map[string]any{
			"prev_id": nil,
			"next_id": firstID,
		})
		task := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d payload %v", resp.StatusCode, task)
		}
		rank, _ := task["sort_order"].(string)
		if rank == "" || !strings.Contains(rank, "|") {
			t.Fatalf("sort_order=%v want lexorank string", task["sort_order"])
		}

		list := owner.do(http.MethodGet, "/api/tasks", nil)
		tasks := decodeJSON[[]map[string]any](t, list)
		if list.StatusCode != http.StatusOK || len(tasks) < 2 {
			t.Fatalf("list status %d len %d", list.StatusCode, len(tasks))
		}
		if tasks[0]["id"] != secondID {
			t.Fatalf("expected %s first after reorder, got %v", secondID, tasks[0]["id"])
		}
	})

	t.Run("reorder_batch_keeps_relative_order", func(t *testing.T) {
		a := owner.createTask("Batch A", nil)
		b := owner.createTask("Batch B", nil)
		c := owner.createTask("Batch C", nil)
		aID, _ := a["id"].(string)
		bID, _ := b["id"].(string)
		cID, _ := c["id"].(string)
		if aID == "" || bID == "" || cID == "" {
			t.Fatalf("missing ids: %v %v %v", a, b, c)
		}

		resp := owner.do(http.MethodPut, "/api/tasks/reorder", map[string]any{
			"ids":     []string{bID, cID},
			"prev_id": nil,
			"next_id": aID,
		})
		body := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d payload %v", resp.StatusCode, body)
		}

		list := owner.do(http.MethodGet, "/api/tasks", nil)
		tasks := decodeJSON[[]map[string]any](t, list)
		if list.StatusCode != http.StatusOK {
			t.Fatalf("list status %d", list.StatusCode)
		}
		ids := make([]string, 0, 3)
		for _, task := range tasks {
			id, _ := task["id"].(string)
			if id == aID || id == bID || id == cID {
				ids = append(ids, id)
			}
		}
		if len(ids) != 3 || ids[0] != bID || ids[1] != cID || ids[2] != aID {
			t.Fatalf("expected B,C,A got %v", ids)
		}
	})

	t.Run("reorder_batch_rejects_foreign_id", func(t *testing.T) {
		mine := owner.createTask("Mine", nil)
		mineID, _ := mine["id"].(string)
		foreign := intruder.createTask("Foreign", nil)
		foreignID, _ := foreign["id"].(string)
		resp := owner.do(http.MethodPut, "/api/tasks/reorder", map[string]any{
			"ids": []string{mineID, foreignID},
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status %d, want 404", resp.StatusCode)
		}
	})

	t.Run("reorder_batch_rejects_neighbor_in_moving_set", func(t *testing.T) {
		a := owner.createTask("N A", nil)
		b := owner.createTask("N B", nil)
		aID, _ := a["id"].(string)
		bID, _ := b["id"].(string)
		resp := owner.do(http.MethodPut, "/api/tasks/reorder", map[string]any{
			"ids":     []string{aID, bID},
			"next_id": bID,
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status %d, want 400", resp.StatusCode)
		}
	})

	t.Run("intruder_cannot_delete", func(t *testing.T) {
		resp := intruder.do(http.MethodDelete, "/api/tasks/"+taskID, nil)
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("status %d, want 404", resp.StatusCode)
		}
	})

	t.Run("owner_can_delete", func(t *testing.T) {
		resp := owner.do(http.MethodDelete, "/api/tasks/"+taskID, nil)
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status %d", resp.StatusCode)
		}
		missing := owner.do(http.MethodGet, "/api/tasks/"+taskID, nil)
		defer missing.Body.Close()
		if missing.StatusCode != http.StatusNotFound {
			t.Fatalf("deleted task still readable: %d", missing.StatusCode)
		}
	})
}

func TestCategoryCRUDAndInboxGuard(t *testing.T) {
	c := newClient(t)
	email := uniqueEmail(t)
	signed := c.signUp(email)
	c.login(email)
	inbox := inboxID(signed.User.ID)

	t.Run("cannot_delete_inbox", func(t *testing.T) {
		resp := c.do(http.MethodDelete, "/api/categories/"+inbox, nil)
		body := decodeJSON[errBody](t, resp)
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status %d body %+v", resp.StatusCode, body)
		}
	})

	var categoryID string
	t.Run("create_and_list", func(t *testing.T) {
		resp := c.do(http.MethodPost, "/api/categories", map[string]string{
			"name":  "Work",
			"color": "#FF0000",
		})
		created := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("status %d payload %v", resp.StatusCode, created)
		}
		categoryID, _ = created["category_id"].(string)
		if categoryID == "" {
			t.Fatalf("missing category_id: %v", created)
		}

		list := c.do(http.MethodGet, "/api/categories", nil)
		cats := decodeJSON[[]map[string]any](t, list)
		if list.StatusCode != http.StatusOK || len(cats) < 2 {
			t.Fatalf("list status %d len %d", list.StatusCode, len(cats))
		}
	})

	t.Run("reorder_uses_neighbor_ids", func(t *testing.T) {
		created := c.do(http.MethodPost, "/api/categories", map[string]string{
			"name":  "Later",
			"color": "#00FF00",
		})
		later := decodeJSON[map[string]any](t, created)
		laterID, _ := later["category_id"].(string)
		if created.StatusCode != http.StatusCreated || laterID == "" {
			t.Fatalf("create later: %d %v", created.StatusCode, later)
		}

		resp := c.do(http.MethodPut, "/api/categories/"+laterID+"/order", map[string]any{
			"prev_id": nil,
			"next_id": inbox,
		})
		body := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("reorder status %d body %v", resp.StatusCode, body)
		}
		rank, _ := body["sort_order"].(string)
		if rank == "" {
			t.Fatalf("missing sort_order: %v", body)
		}

		list := c.do(http.MethodGet, "/api/categories", nil)
		cats := decodeJSON[[]map[string]any](t, list)
		if list.StatusCode != http.StatusOK || len(cats) < 2 {
			t.Fatalf("list status %d len %d", list.StatusCode, len(cats))
		}
		if cats[0]["id"] != laterID {
			t.Fatalf("expected %s first, got %v", laterID, cats[0]["id"])
		}
	})

	t.Run("reorder_rejects_foreign_neighbor", func(t *testing.T) {
		other := newClient(t)
		otherEmail := uniqueEmail(t)
		other.signUp(otherEmail)
		other.login(otherEmail)
		created := other.do(http.MethodPost, "/api/categories", map[string]string{"name": "Secret"})
		secret := decodeJSON[map[string]any](t, created)
		secretID, _ := secret["category_id"].(string)

		resp := c.do(http.MethodPut, "/api/categories/"+categoryID+"/order", map[string]any{
			"prev_id": secretID,
		})
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("status %d, want 400", resp.StatusCode)
		}
	})

	t.Run("delete_moves_tasks_to_inbox", func(t *testing.T) {
		task := c.createTask("Move me", map[string]any{"category_id": categoryID})
		taskID, _ := task["id"].(string)

		del := c.do(http.MethodDelete, "/api/categories/"+categoryID, nil)
		_ = decodeJSON[map[string]any](t, del)
		if del.StatusCode != http.StatusOK {
			t.Fatalf("delete status %d", del.StatusCode)
		}

		resp := c.do(http.MethodGet, "/api/tasks/"+taskID, nil)
		got := decodeJSON[map[string]any](t, resp)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("task status %d payload %v", resp.StatusCode, got)
		}
		if got["category_id"] != inbox {
			t.Fatalf("category_id=%v want %s", got["category_id"], inbox)
		}
	})
}
