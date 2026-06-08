package controllers

import (
	"strconv"
	"strings"

	"configurator/modules/stock/models"
)

// SsdCfg wires the generic engine for SSD stock. Deduped by product name; no status.
var SsdCfg = UnitCfg[models.SsdUnit]{
	typeKey:       "ssd",
	noun:          "SSD",
	identityKey:   "product_name",
	identityLabel: "PRODUCT NAME",
	templateName:  "ssd_stock_template.csv",
	searchCols:    []string{"product_name", "ssd_brand"},
	templateHdrs:  []string{"SSD BRAND", "INTERFACE", "CAPACITY", "FORM FACTOR", "SPEED", "PRODUCT NAME"},
	headerToField: map[string]string{
		"ssdbrand":   "ssd_brand", "brand": "ssd_brand",
		"interface":  "interface",
		"capacity":   "capacity",
		"formfactor": "form_factor",
		"speed":      "speed",
		"productname": "product_name", "product": "product_name",
	},
	// Correlation import: derived interface/form_factor/speed + needs_review from
	// Corelation/storage.csv (only rows where KIND == SSD).
	corrTemplateName: "ssd_correlation_template.csv",
	corrTemplateHdrs: []string{"KIND", "PRODUCT NAME", "INTERFACE", "CAPACITY GB", "FORM FACTOR", "SPEED", "NEEDS REVIEW"},
	corrHeaderToField: map[string]string{
		"productname": "product_name", "product": "product_name",
		"interface":   "interface",
		"capacitygb":  "capacity_gb",
		"formfactor":  "form_factor",
		"speed":       "speed",
		"needsreview": "needs_review",
	},
	corrKind: "SSD",
	corrFields: func(u *models.SsdUnit) []FieldKV {
		return []FieldKV{
			{"interface", "Interface", u.Interface},
			{"capacity_gb", "Capacity (GB)", intPtrStr(u.CapacityGB)},
			{"form_factor", "Form factor", u.FormFactor},
			{"speed", "Speed", u.Speed},
			{"needs_review", "Needs review", yesNo(u.NeedsReview)},
		}
	},
	setField: func(u *models.SsdUnit, key, val string) {
		switch key {
		case "ssd_brand":
			u.SsdBrand = val
		case "interface":
			u.Interface = val
		case "capacity":
			u.Capacity = val
		case "capacity_gb":
			if n, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
				u.CapacityGB = &n
			}
		case "form_factor":
			u.FormFactor = val
		case "speed":
			u.Speed = val
		case "product_name":
			u.ProductName = val
		case "needs_review":
			u.NeedsReview = corrBool(val)
		}
	},
	fields: func(u *models.SsdUnit) []FieldKV {
		return []FieldKV{
			{"ssd_brand", "SSD brand", u.SsdBrand},
			{"interface", "Interface", u.Interface},
			{"capacity", "Capacity", u.Capacity},
			{"form_factor", "Form factor", u.FormFactor},
			{"speed", "Speed", u.Speed},
		}
	},
	identity:  func(u *models.SsdUnit) string { return u.ProductName },
	pricing:   func(u *models.SsdUnit) *models.Pricing { return &u.Pricing },
	getRemark: func(u *models.SsdUnit) string { return u.Remark },
	getID:     func(u *models.SsdUnit) uint { return u.ID },
	setID:     func(u *models.SsdUnit, id uint) { u.ID = id },
}
