package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// PackLine is one BOM line on a saved compatible pack. Option carries the full
// ConfigOption snapshot as raw JSON (stored as-is, so the salesman can rebuild the
// selection into a quote); LineTotal is recomputed server-side from the option price.
type PackLine struct {
	Category  string          `json:"category"` // processor | chassis | ram | storage
	Qty       int             `json:"qty"`
	Option    json.RawMessage `json:"option"` // full ConfigOption snapshot, pass-through
	LineTotal float64         `json:"line_total"`
}

// PackLines persists as JSONB via the Scanner/Valuer interfaces (no datatypes dep).
type PackLines []PackLine

func (p PackLines) Value() (driver.Value, error) {
	if p == nil {
		return "[]", nil
	}
	return json.Marshal(p)
}

func (p *PackLines) Scan(src interface{}) error {
	if src == nil {
		*p = PackLines{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported type for PackLines: %T", src)
	}
	return json.Unmarshal(b, p)
}

// Pack is an admin-built compatible bundle (created by admin/super_admin, listed by
// salesman/admin). Prices are snapshotted at save time, like quotes.
type Pack struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	PackNumber  string    `gorm:"column:pack_number" json:"pack_number"`
	Name        string    `gorm:"column:name" json:"name"`
	Description string    `gorm:"column:description" json:"description"`
	Lines       PackLines `gorm:"column:lines;type:jsonb" json:"lines"`
	Subtotal    float64   `gorm:"column:subtotal" json:"subtotal"`
	Gst         float64   `gorm:"column:gst" json:"gst"`
	GrandTotal  float64   `gorm:"column:grand_total" json:"grand_total"`
	CreatedBy   string    `gorm:"column:created_by" json:"created_by"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
}

func (Pack) TableName() string { return "packs" }
