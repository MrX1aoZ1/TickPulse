package license

import "testing"

func TestLookup(t *testing.T) {
	if Lookup(DemoNormal) != TypeNormal {
		t.Fatalf("demo normal: %s", Lookup(DemoNormal))
	}
	if Lookup(DemoPremium) != TypePremium {
		t.Fatalf("demo premium: %s", Lookup(DemoPremium))
	}
	if Lookup("AAAA-BBBB-CCCC-DDDD") != TypeInvalid {
		t.Fatal("unknown key should be invalid")
	}
	if IsPremium(DemoNormal) {
		t.Fatal("normal key must not be premium")
	}
	if !IsPremium(DemoPremium) {
		t.Fatal("premium demo key should pass")
	}
}
