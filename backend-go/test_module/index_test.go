package test_module

import "testing"

func TestListQueryIndexesExist(t *testing.T) {
	cases := []struct {
		table string
		name  string
	}{
		{"tasks", "idx_tasks_user_sort"},
		{"tasks", "idx_tasks_user_category_sort"},
		{"categories", "idx_categories_user_sort"},
	}
	for _, tc := range cases {
		var n int
		err := testDB.Get(&n, `
			SELECT COUNT(*) FROM information_schema.STATISTICS
			WHERE TABLE_SCHEMA = DATABASE()
			  AND LOWER(TABLE_NAME) = ?
			  AND INDEX_NAME = ?`, tc.table, tc.name)
		if err != nil {
			t.Fatalf("%s.%s: %v", tc.table, tc.name, err)
		}
		if n == 0 {
			t.Fatalf("missing index %s on %s", tc.name, tc.table)
		}
	}
}
