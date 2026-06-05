
package controllers

import "configurator/modules/stock/models"

// RamCfg wires the generic engine for memory stock. Deduped by product name; no status.
var RamCfg = UnitCfg[models.RamUnit]{
	typeKey:       "ram",
	noun:          "memory module",
	identityKey:   "product_name",
	identityLabel: "PRODUCT NAME",
	templateName:  "memory_stock_template.csv",
	searchCols:    []string{"product_name", "memory_brand"},
	templateHdrs:  []string{"MEMORY BRAND", "CAPACITY", "GENERATION", "RANK", "PRODUCT NAME"},
	headerToField: map[string]string{
		"memorybrand": "memory_brand", "brand": "memory_brand",
		"capacity":    "capacity",
		"generation":  "generation",
		"rank":        "rank",
		"productname": "product_name", "product": "product_name",
	},
	// Correlation import: derived ram_type (DDR generation) + needs_review from Corelation/ram.csv.
	corrTemplateName: "memory_correlation_template.csv",
	corrTemplateHdrs: []string{"PRODUCT NAME", "RAM TYPE", "NEEDS REVIEW"},
	corrHeaderToField: map[string]string{
		"productname": "product_name", "product": "product_name",
		"ramtype":     "ram_type",
		"needsreview": "needs_review",
	},
	corrFields: func(u *models.RamUnit) []FieldKV {
		return []FieldKV{
			{"ram_type", "RAM type", u.RamType},
			{"needs_review", "Needs review", yesNo(u.NeedsReview)},
		}
	},
	setField: func(u *models.RamUnit, key, val string) {
		switch key {
		case "memory_brand":
			u.MemoryBrand = val
		case "capacity":
			u.Capacity = val
		case "generation":
			u.Generation = val
		case "rank":
			u.Rank = val
		case "product_name":
			u.ProductName = val
		case "ram_type":
			u.RamType = val
		case "needs_review":
			u.NeedsReview = corrBool(val)
		}
	},
	fields: func(u *models.RamUnit) []FieldKV {
		return []FieldKV{
			{"memory_brand", "Memory brand", u.MemoryBrand},
			{"capacity", "Capacity", u.Capacity},
			{"generation", "Generation", u.Generation},
			{"rank", "Rank", u.Rank},
		}
	},
	identity:  func(u *models.RamUnit) string { return u.ProductName },
	pricing:   func(u *models.RamUnit) *models.Pricing { return &u.Pricing },
	getRemark: func(u *models.RamUnit) string { return u.Remark },
	getID:     func(u *models.RamUnit) uint { return u.ID },
	setID:     func(u *models.RamUnit, id uint) { u.ID = id },
}
