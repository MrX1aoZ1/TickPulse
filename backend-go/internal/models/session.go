package models

type Session struct {
	SessionID string `db:"session_id" json:"session_id"`
	Expires   uint32 `db:"expires" json:"expires"`
	Data      string `db:"data" json:"-"`
}
