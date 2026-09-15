package models

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/misa198/lexorank-go"
)

var ErrReorderBoundsOmitted = errors.New("reorder bounds omitted")

// InitialCategoryRank 對齊前端 lexorank 預設起點（見 CategoryList.jsx）。
const InitialCategoryRank = "0|0i0000:"

// FlexRank 接受 JSON 字串或數字，寫入前再交給 lexorank.ParseRank 驗證。
type FlexRank string

func (r *FlexRank) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}
	if len(data) > 0 && data[0] == '"' {
		var s string
		if err := json.Unmarshal(data, &s); err != nil {
			return err
		}
		*r = FlexRank(s)
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(data, &n); err != nil {
		return err
	}
	*r = FlexRank(n.String())
	return nil
}

func (r FlexRank) String() string {
	return string(r)
}

// MidpointSortOrder 對應 task 拖曳排序：用前後 DOUBLE 權重取中點。
func MidpointSortOrder(prev, next *float64) (float64, error) {
	switch {
	case prev != nil && next != nil:
		return (*prev + *next) / 2, nil
	case prev != nil:
		return *prev + 1.0, nil
	case next != nil:
		return *next - 1.0, nil
	default:
		return 0, ErrReorderBoundsOmitted
	}
}

func ParseCategoryRank(s string) (lexorank.Rank, error) {
	return lexorank.ParseRank(s)
}

func SafeParseCategoryRank(s string) lexorank.Rank {
	if s == "" || !strings.Contains(s, "|") {
		return lexorank.Middle()
	}
	rank, err := lexorank.ParseRank(s)
	if err != nil {
		return lexorank.Middle()
	}
	return rank
}

// NextCategoryRank 對齊前端：沒有上一筆用 Middle()，有則 parse.GenNext()。
func NextCategoryRank(lastSortOrder string) string {
	if lastSortOrder == "" {
		return lexorank.Middle().String()
	}
	rank, err := lexorank.ParseRank(lastSortOrder)
	if err != nil {
		return lexorank.Middle().String()
	}
	return rank.GenNext().String()
}

// RankBetween 依前後鄰居在後端算出新的 LexoRank。prev/next 為空表示沒有該側鄰居。
func RankBetween(prev, next string) (string, error) {
	switch {
	case prev == "" && next == "":
		return lexorank.Middle().String(), nil
	case prev == "":
		rank, err := lexorank.ParseRank(next)
		if err != nil {
			return "", err
		}
		return rank.GenPrev().String(), nil
	case next == "":
		rank, err := lexorank.ParseRank(prev)
		if err != nil {
			return "", err
		}
		return rank.GenNext().String(), nil
	default:
		left, err := lexorank.ParseRank(prev)
		if err != nil {
			return "", err
		}
		right, err := lexorank.ParseRank(next)
		if err != nil {
			return "", err
		}
		if left.CompareTo(right) >= 0 {
			return right.GenNext().String(), nil
		}
		mid, err := left.Between(right)
		if err != nil {
			return left.GenNext().String(), nil
		}
		return mid.String(), nil
	}
}

func NormalizeCategoryRank(s string) (string, error) {
	rank, err := lexorank.ParseRank(s)
	if err != nil {
		return "", err
	}
	return rank.String(), nil
}
