package models

import "time"

type User struct {
	ID        int       `db:"id" json:"id"`
	Email     string    `db:"email" json:"email"`
	Username  *string   `db:"username" json:"username"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// UserCredentials 用於 local 登入：把 UserAuth.credential 映成 password_hash，且不輸出到 JSON。
type UserCredentials struct {
	ID           int     `db:"id" json:"id"`
	Email        string  `db:"email" json:"email"`
	Username     *string `db:"username" json:"username"`
	PasswordHash string  `db:"password_hash" json:"-"`
}

func (c UserCredentials) ToUser() User {
	return User{ID: c.ID, Email: c.Email, Username: c.Username}
}
