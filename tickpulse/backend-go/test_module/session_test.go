package test_module

import (
	"net/http"
	"testing"
)

// Mirrors backend/test_module/session_test.js, without hardcoded users or a 15s sleep.
func TestSessionIsolation(t *testing.T) {
	a := newClient(t)
	b := newClient(t)
	emailA := uniqueEmail(t)
	emailB := uniqueEmail(t)

	a.signUp(emailA)
	b.signUp(emailB)

	t.Run("1_login_user_a", func(t *testing.T) {
		a.login(emailA)
		if sessionCookieName(a.http) == "" {
			t.Fatal("user A missing session cookie")
		}
	})

	var userAID int
	t.Run("2_session_persists_on_check", func(t *testing.T) {
		resp := a.do(http.MethodGet, "/auth/check", nil)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("check status %d: %s", resp.StatusCode, readBody(t, resp))
		}
		out := decodeJSON[authCheck](t, resp)
		if !out.Authenticated || out.User.Email != emailA {
			t.Fatalf("check payload: %+v", out)
		}
		userAID = out.User.ID
	})

	t.Run("3_login_user_b", func(t *testing.T) {
		b.login(emailB)
		if sessionCookieName(b.http) == "" {
			t.Fatal("user B missing session cookie")
		}
	})

	t.Run("4_session_ids_and_identities_isolated", func(t *testing.T) {
		if sessionCookieName(a.http) == sessionCookieName(b.http) {
			t.Fatal("both users received the same connect.sid value")
		}
		resp := b.do(http.MethodGet, "/auth/check", nil)
		out := decodeJSON[authCheck](t, resp)
		if resp.StatusCode != http.StatusOK || out.User.ID == userAID {
			t.Fatalf("expected distinct user B, got %+v", out)
		}
		if out.User.Email != emailB {
			t.Fatalf("user B email: %s", out.User.Email)
		}
	})

	t.Run("5_forged_cookie_rejected", func(t *testing.T) {
		jarless := newClient(t)
		req, err := http.NewRequest(http.MethodGet, testServer.URL+"/api/tasks", nil)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("Cookie", "connect.sid=s%3AFAKE_SESSION_ID_HACK_999.invalidSignatureString12345")
		resp, err := jarless.http.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("forged cookie got %d, want 401", resp.StatusCode)
		}
	})

	t.Run("6_logout_invalidates_session", func(t *testing.T) {
		logout := a.do(http.MethodPost, "/auth/logout", nil)
		_ = decodeJSON[map[string]any](t, logout)

		resp := a.do(http.MethodGet, "/auth/check", nil)
		out := decodeJSON[authCheck](t, resp)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("dead session got %d (%+v), want 401", resp.StatusCode, out)
		}
		if out.Authenticated {
			t.Fatal("session still authenticated after logout")
		}
	})
}
