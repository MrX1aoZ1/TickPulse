package license

// Catalog is a stand-in for a future payment provider.
// Tests and local demos redeem these keys; Stripe (or similar) would later
// issue the same shape of key after a successful checkout.
var Catalog = map[string]string{
	"BK67-M61S-DH4Y-H6E9": "normal",
	"9X7P-2R4F-8K3Q-5T6Z": "normal",
	"3F9K-7T2W-4XQZ-8R5Y": "normal",
	"L2M9-N4P6-Q8R1-S3T5": "normal",
	"HOI8-B40V-C8L4-MN27": "normal",

	"NBUN-JW8N-SUIS-451N": "premium",
	"B2N8-LM9S-DH4Y-CQ1W": "premium",
	"A5B8-D3C7-E1F9-G4H6": "premium",
	"K9J8-H7G6-F5D4-S3A2": "premium",
	"Z1Y2-X3W4-V5U6-T7S8": "premium",
}

const (
	TypeNormal  = "normal"
	TypePremium = "premium"
	TypeInvalid = "invalid"

	DemoNormal  = "BK67-M61S-DH4Y-H6E9"
	DemoPremium = "NBUN-JW8N-SUIS-451N"
)

func Lookup(key string) string {
	if t, ok := Catalog[key]; ok {
		return t
	}
	return TypeInvalid
}

func IsPremium(key string) bool {
	return Lookup(key) == TypePremium
}
