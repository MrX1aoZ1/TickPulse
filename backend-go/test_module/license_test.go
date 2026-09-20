package test_module

import (
	"net/http"
	"testing"

	"tickpulse/backend-go/internal/license"
)

// License is not enforced on signup/calendar yet; these cover the dormant API.
func TestLicenseAPINotRequiredOnSignup(t *testing.T) {
	c := newClient(t)
	email := uniqueEmail(t)
	c.signUp(email)
	c.login(email)

	resp := c.do(http.MethodGet, "/api/license", nil)
	out := decodeJSON[map[string]any](t, resp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d: %v", resp.StatusCode, out)
	}
	if out["licenseType"] != license.TypeInvalid {
		t.Fatalf("unset key should be invalid, got %v", out["licenseType"])
	}

	resp = c.do(http.MethodPut, "/api/license", map[string]string{
		"newKey": license.DemoPremium,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("upgrade status %d: %s", resp.StatusCode, readBody(t, resp))
	}
}

func TestLicenseRequiresAuth(t *testing.T) {
	c := newClient(t)
	resp := c.do(http.MethodGet, "/api/license", nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status %d, want 401", resp.StatusCode)
	}
}
