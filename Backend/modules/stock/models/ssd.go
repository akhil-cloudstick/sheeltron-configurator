package models

import "time"

// SsdUnit is one SSD product. Deduped on import by ProductName.
type SsdUnit struct {
	ID          uint   `gorm:"column:id;primaryKey" json:"id"`
	SsdBrand    string `gorm:"column:ssd_brand" json:"ssd_brand"`
	Interface   string `gorm:"column:interface" json:"interface"`
	Capacity    string `gorm:"column:capacity" json:"capacity"`
	FormFactor  string `gorm:"column:form_factor" json:"form_factor"`
	Speed       string `gorm:"column:speed" json:"speed"`
	ProductName string `gorm:"column:product_name" json:"product_name"`
	// needs_review flag from the Corelation/ storage dataset (written by the import).
	NeedsReview bool `gorm:"column:needs_review;default:false" json:"needs_review"`
	Pricing
	Remark    string    `gorm:"column:remark" json:"remark"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (SsdUnit) TableName() string { return "ssd_units" }
