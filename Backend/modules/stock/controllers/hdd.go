package controllers

import "configurator/modules/stock/models"

// HddCfg wires the generic engine for HDD stock. Deduped by product name; no status.
var HddCfg = UnitCfg[models.HddUnit]{
	typeKey:       "hdd",
	noun:          "HDD",
	identityKey:   "product_name",
	identityLabel: "PRODUCT NAME",
	templateName:  "hdd_stock_template.csv",
	searchCols:    []string{"product_name", "hdd_brand"},
	templateHdrs:  []string{"HDD BRAND", "INTERFACE", "CAPACITY", "FORM FACTOR", "SPEED", "RPM SPEED", "PRODUCT NAME"},
	headerToField: map[string]string{
		"hddbrand":   "hdd_brand", "brand": "hdd_brand",
		"interface":  "interface",
		"capacity":   "capacity",
		"formfactor": "form_factor",
		"speed":      "speed",
		"rpmspeed":   "rpm_speed", "rpm": "rpm_speed",
		"productname": "product_name", "product": "product_name",
	},
	// Correlation import: derived interface/form_factor/speed/rpm + needs_review from
	// Corelation/storage.csv (only rows where KIND == HDD).
	corrTemplateName: "hdd_correlation_template.csv",
	corrTemplateHdrs: []string{"KIND", "PRODUCT NAME", "INTERFACE", "FORM FACTOR", "SPEED", "RPM", "NEEDS REVIEW"},
	corrHeaderToField: map[string]string{
		"productname": "product_name", "product": "product_name",
		"interface":   "interface",
		"formfactor":  "form_factor",
		"speed":       "speed",
		"rpm":         "rpm_speed", "rpmspeed": "rpm_speed",
		"needsreview": "needs_review",
	},
	corrKind: "HDD",
	corrFields: func(u *models.HddUnit) []FieldKV {
		return []FieldKV{
			{"interface", "Interface", u.Interface},
			{"form_factor", "Form factor", u.FormFactor},
			{"speed", "Speed", u.Speed},
			{"rpm_speed", "RPM speed", u.RpmSpeed},
			{"needs_review", "Needs review", yesNo(u.NeedsReview)},
		}
	},
	setField: func(u *models.HddUnit, key, val string) {
		switch key {
		case "hdd_brand":
			u.HddBrand = val
		case "interface":
			u.Interface = val
		case "capacity":
			u.Capacity = val
		case "form_factor":
			u.FormFactor = val
		case "speed":
			u.Speed = val
		case "rpm_speed":
			u.RpmSpeed = val
		case "product_name":
			u.ProductName = val
		case "needs_review":
			u.NeedsReview = corrBool(val)
		}
	},
	fields: func(u *models.HddUnit) []FieldKV {
		return []FieldKV{
			{"hdd_brand", "HDD brand", u.HddBrand},
			{"interface", "Interface", u.Interface},
			{"capacity", "Capacity", u.Capacity},
			{"form_factor", "Form factor", u.FormFactor},
			{"speed", "Speed", u.Speed},
			{"rpm_speed", "RPM speed", u.RpmSpeed},
		}
	},
	identity:  func(u *models.HddUnit) string { return u.ProductName },
	pricing:   func(u *models.HddUnit) *models.Pricing { return &u.Pricing },
	getRemark: func(u *models.HddUnit) string { return u.Remark },
	getID:     func(u *models.HddUnit) uint { return u.ID },
	setID:     func(u *models.HddUnit, id uint) { u.ID = id },
}
