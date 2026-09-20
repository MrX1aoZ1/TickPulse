package models

type UserAuth struct {
	ID         int     `db:"id" json:"id"`
	UserID     int     `db:"user_id" json:"user_id"`
	Provider   string  `db:"provider" json:"provider"`
	ProviderID *string `db:"provider_id" json:"provider_id"`
	Credential *string `db:"credential" json:"-"`
}
