package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// QuoteLine is one BOM line snapshotted onto a saved quote.
type QuoteLine struct {
	Category  string  `json:"category"` // processor | chassis | ram | storage
	StockID   uint    `json:"stock_id"`
	Label     string  `json:"label"`
	Condition string  `json:"condition"` // new | refurbished | unset
	Qty       int     `json:"qty"`
	UnitPrice float64 `json:"unit_price"`
	LineTotal float64 `json:"line_total"`
}

// QuoteLines persists as JSONB via the Scanner/Valuer interfaces (no datatypes dep).
type QuoteLines []QuoteLine

func (q QuoteLines) Value() (driver.Value, error) {
	if q == nil {
		return "[]", nil
	}
	return json.Marshal(q)
}

func (q *QuoteLines) Scan(src interface{}) error {
	if src == nil {
		*q = QuoteLines{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported type for QuoteLines: %T", src)
	}
	return json.Unmarshal(b, q)
}

// Quote is a saved sales quote (created by salesman, listed by admin/super_admin).
type Quote struct {
	ID              uint       `gorm:"column:id;primaryKey" json:"id"`
	QuoteNumber     string     `gorm:"column:quote_number" json:"quote_number"`
	CustomerName    string     `gorm:"column:customer_name" json:"customer_name"`
	CustomerCompany string     `gorm:"column:customer_company" json:"customer_company"`
	CustomerEmail   string     `gorm:"column:customer_email" json:"customer_email"`
	Lines           QuoteLines `gorm:"column:lines;type:jsonb" json:"lines"`
	Units           int        `gorm:"column:units;default:1" json:"units"`
	Subtotal        float64    `gorm:"column:subtotal" json:"subtotal"`
	Gst             float64    `gorm:"column:gst" json:"gst"`
	GrandTotal      float64    `gorm:"column:grand_total" json:"grand_total"`
	CreatedBy       string     `gorm:"column:created_by" json:"created_by"`
	CreatedAt       time.Time  `gorm:"column:created_at" json:"created_at"`
}

func (Quote) TableName() string { return "quotes" }
