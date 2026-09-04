package models

// Category.sort_order 存 github.com/misa198/lexorank-go 字串，例如 "0|0i0000:"。
type Category struct {
	ID           string `db:"id" json:"id"`
	UserID       int    `db:"user_id" json:"user_id"`
	CategoryName string `db:"category_name" json:"category_name"`
	Color        string `db:"color" json:"color"`
	SortOrder    string `db:"sort_order" json:"sort_order"`
}
