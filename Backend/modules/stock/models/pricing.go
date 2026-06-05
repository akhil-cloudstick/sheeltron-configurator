package models

// Pricing is the shared multi-condition pricing block embedded by every stock
// product (chassis, cpu, ram, ssd, hdd). A unit can carry both conditions at once,
// each with its own admin-only price. Embedding keeps the JSON/DB columns flat.
type Pricing struct {
	ConditionNew         bool     `gorm:"column:condition_new" json:"condition_new"`
	ConditionRefurbished bool     `gorm:"column:condition_refurbished" json:"condition_refurbished"`
	PriceNew             *float64 `gorm:"column:price_new" json:"price_new"`
	PriceRefurbished     *float64 `gorm:"column:price_refurbished" json:"price_refurbished"`
}

// Redact clears both prices (stock managers may never see or set prices).
func (p *Pricing) Redact() {
	p.PriceNew = nil
	p.PriceRefurbished = nil
}

// NormalizeToConditions drops a price whose condition is not set.
func (p *Pricing) NormalizeToConditions() {
	if !p.ConditionNew {
		p.PriceNew = nil
	}
	if !p.ConditionRefurbished {
		p.PriceRefurbished = nil
	}
}
