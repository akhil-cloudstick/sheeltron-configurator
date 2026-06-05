package models

import "time"

// RamUnit is one memory product. Deduped on import by ProductName.
type RamUnit struct {
	ID          uint   `gorm:"column:id;primaryKey" json:"id"`
	MemoryBrand string `gorm:"column:memory_brand" json:"memory_brand"`
	Capacity    string `gorm:"column:capacity" json:"capacity"`
	Generation  string `gorm:"column:generation" json:"generation"`
	Rank        string `gorm:"column:rank" json:"rank"`
	ProductName string `gorm:"column:product_name" json:"product_name"`
	// Compatibility keys derived in Corelation/ (RamType mirrors Generation for the
	// configurator key). Written by the correlation import.
	RamType     string `gorm:"column:ram_type" json:"ram_type"`
	NeedsReview bool   `gorm:"column:needs_review;default:false" json:"needs_review"`
	Pricing
	Remark    string    `gorm:"column:remark" json:"remark"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (RamUnit) TableName() string { return "ram_units" }
