package models

import (
	"encoding/json"
	"testing"
)

func TestMidpointSortOrder(t *testing.T) {
	prev, next := 0.0, 2.0
	got, err := MidpointSortOrder(&prev, &next)
	if err != nil || got != 1.0 {
		t.Fatalf("got %v err %v", got, err)
	}

	onlyPrev := 5.0
	got, err = MidpointSortOrder(&onlyPrev, nil)
	if err != nil || got != 6.0 {
		t.Fatalf("append after prev: got %v err %v", got, err)
	}

	onlyNext := 5.0
	got, err = MidpointSortOrder(nil, &onlyNext)
	if err != nil || got != 4.0 {
		t.Fatalf("insert before next: got %v err %v", got, err)
	}

	_, err = MidpointSortOrder(nil, nil)
	if err != ErrReorderBoundsOmitted {
		t.Fatalf("expected ErrReorderBoundsOmitted, got %v", err)
	}
}

func TestRankBetween(t *testing.T) {
	first := NextCategoryRank("")
	second := NextCategoryRank(first)
	third := NextCategoryRank(second)

	mid, err := RankBetween(first, third)
	if err != nil {
		t.Fatal(err)
	}
	if !(first < mid && mid < third) {
		t.Fatalf("mid %q not between %q and %q", mid, first, third)
	}

	before, err := RankBetween("", second)
	if err != nil || before == "" || before >= second {
		t.Fatalf("genPrev: before=%q second=%q err=%v", before, second, err)
	}

	after, err := RankBetween(second, "")
	if err != nil || after <= second {
		t.Fatalf("genNext: after=%q second=%q err=%v", after, second, err)
	}

	only, err := RankBetween("", "")
	if err != nil || only == "" {
		t.Fatalf("middle: %q err=%v", only, err)
	}
}

func TestNextCategoryRank(t *testing.T) {
	first := NextCategoryRank("")
	if first == "" {
		t.Fatal("empty last order should still produce a rank")
	}
	second := NextCategoryRank(first)
	if second == "" || second == first {
		t.Fatalf("next rank should advance: first=%s second=%s", first, second)
	}
	if _, err := ParseCategoryRank(second); err != nil {
		t.Fatalf("generated rank not parseable: %v", err)
	}
}

func TestNormalizeCategoryRank(t *testing.T) {
	ok := InitialCategoryRank
	got, err := NormalizeCategoryRank(ok)
	if err != nil || got == "" {
		t.Fatalf("valid rank: got %q err %v", got, err)
	}
	if _, err := NormalizeCategoryRank("not-a-rank"); err == nil {
		t.Fatal("expected error for invalid rank")
	}
}

func TestFlexRankUnmarshalJSON(t *testing.T) {
	var fromString FlexRank
	if err := json.Unmarshal([]byte(`"0|0i0000:"`), &fromString); err != nil {
		t.Fatal(err)
	}
	if fromString.String() != "0|0i0000:" {
		t.Fatalf("got %q", fromString)
	}

	var fromNumber FlexRank
	if err := json.Unmarshal([]byte(`100`), &fromNumber); err != nil {
		t.Fatal(err)
	}
	if fromNumber.String() != "100" {
		t.Fatalf("got %q", fromNumber)
	}
}
