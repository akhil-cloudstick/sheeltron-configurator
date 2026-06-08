package models

import "time"

// HddUnit is one HDD product. Deduped on import by ProductName.
type HddUnit struct {
	ID          uint   `gorm:"column:id;primaryKey" json:"id"`
	HddBrand    string `gorm:"column:hdd_brand" json:"hdd_brand"`
	Interface   string `gorm:"column:interface" json:"interface"`
	Capacity    string `gorm:"column:capacity" json:"capacity"`
	CapacityGB  *int   `gorm:"column:capacity_gb" json:"capacity_gb"`
	FormFactor  string `gorm:"column:form_factor" json:"form_factor"`
	Speed       string `gorm:"column:speed" json:"speed"`
	RpmSpeed    string `gorm:"column:rpm_speed" json:"rpm_speed"`
	ProductName string `gorm:"column:product_name" json:"product_name"`
	// needs_review flag from the Corelation/ storage dataset (written by the import).
	NeedsReview bool `gorm:"column:needs_review;default:false" json:"needs_review"`
	Pricing
	Remark    string    `gorm:"column:remark" json:"remark"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (HddUnit) TableName() string { return "hdd_units" }
