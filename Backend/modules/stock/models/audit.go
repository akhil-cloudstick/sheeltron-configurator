package models

import "time"

// StockIssue flags a product that was imported with empty (non-identity) fields.
// It is auto-resolved (resolved_at set) when the product is later saved with no
// empty fields. MissingFields is a comma-separated list of field keys.
type StockIssue struct {
	ID            uint       `gorm:"column:id;primaryKey" json:"id"`
	ProductType   string     `gorm:"column:product_type" json:"product_type"`
	ProductID     uint       `gorm:"column:product_id" json:"product_id"`
	Label         string     `gorm:"column:label" json:"label"`
	MissingFields string     `gorm:"column:missing_fields" json:"missing_fields"`
	CreatedAt     time.Time  `gorm:"column:created_at" json:"created_at"`
	ResolvedAt    *time.Time `gorm:"column:resolved_at" json:"resolved_at"`
}

func (StockIssue) TableName() string { return "stock_issues" }

// StockChangeLog is one row of the permanent audit trail. For update rows it holds
// a single field's old/new value; for create/delete rows field is empty.
type StockChangeLog struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	ProductType string    `gorm:"column:product_type" json:"product_type"`
	ProductID   uint      `gorm:"column:product_id" json:"product_id"`
	Label       string    `gorm:"column:label" json:"label"`
	Field       string    `gorm:"column:field" json:"field"`
	OldValue    string    `gorm:"column:old_value" json:"old_value"`
	NewValue    string    `gorm:"column:new_value" json:"new_value"`
	Source      string    `gorm:"column:source" json:"source"`
	Action      string    `gorm:"column:action" json:"action"`
	Actor       string    `gorm:"column:actor" json:"actor"` // admin | stock_manager | system
	// Changes holds a JSON array of {field, old, new} for an update event — all fields
	// changed in one save grouped into this single row. Empty for create/delete.
	Changes     string    `gorm:"column:changes" json:"-"`
	// Reason is the free-text justification recorded with a bulk price update.
	// Empty for import/manual rows; surfaced in the UI only for source="bulk".
	Reason      string    `gorm:"column:reason" json:"reason"`
	ChangedAt   time.Time `gorm:"column:changed_at;autoCreateTime" json:"changed_at"`
}

func (StockChangeLog) TableName() string { return "stock_change_logs" }
