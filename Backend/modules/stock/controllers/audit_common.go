package controllers

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"configurator/modules/stock/models"

	"gorm.io/gorm"
)

// priceChangePrefix marks change-log field labels that carry price info — these are
// redacted when a stock manager views the change log.
const priceChangePrefix = "Price"

// pricingChangeFields turns the condition/price block into diffable fields for the
// change-log. Conditions are visible to everyone; price rows are hidden from stock
// managers at read time (their labels start with priceChangePrefix).
func pricingChangeFields(p *models.Pricing) []FieldKV {
	boolStr := func(b bool) string {
		if b {
			return "Yes"
		}
		return "No"
	}
	priceStr := func(v *float64) string {
		if v == nil {
			return ""
		}
		return strconv.FormatFloat(*v, 'f', -1, 64)
	}
	return []FieldKV{
		{"condition_new", "Condition (New)", boolStr(p.ConditionNew)},
		{"condition_refurbished", "Condition (Refurbished)", boolStr(p.ConditionRefurbished)},
		{"price_new", priceChangePrefix + " (New)", priceStr(p.PriceNew)},
		{"price_refurbished", priceChangePrefix + " (Refurbished)", priceStr(p.PriceRefurbished)},
	}
}

// FieldKV is one data field of a product (key = form/import field key, label = human
// name, value = current string value). Identity, condition, price and remark are NOT
// included — only the importable spec fields used for missing-detection / diffing.
type FieldKV struct {
	Key   string
	Label string
	Value string
}

// FieldChange records a single field changing during an import or manual edit.
type FieldChange struct {
	Field string `json:"field"` // human label
	Old   string `json:"old"`
	New   string `json:"new"`
}

// missingFieldKeys returns the keys of fields whose value is empty.
func missingFieldKeys(fs []FieldKV) []string {
	var out []string
	for _, f := range fs {
		if strings.TrimSpace(f.Value) == "" {
			out = append(out, f.Key)
		}
	}
	return out
}

// diffFields compares two ordered field snapshots (same keys) and returns the changes.
func diffFields(oldF, newF []FieldKV) []FieldChange {
	om := make(map[string]FieldKV, len(oldF))
	for _, f := range oldF {
		om[f.Key] = f
	}
	var changes []FieldChange
	for _, nf := range newF {
		of := om[nf.Key]
		if strings.TrimSpace(of.Value) != strings.TrimSpace(nf.Value) {
			changes = append(changes, FieldChange{Field: nf.Label, Old: of.Value, New: nf.Value})
		}
	}
	return changes
}

// logChanges appends ONE row to the permanent change-log per event. For an update,
// every changed field is grouped into the row's `changes` JSON. create/delete write a
// single row with no changes. An update with no changes is not logged.
func logChanges(tx *gorm.DB, productType string, id uint, label, source, action, actor string, changes []FieldChange) error {
	row := &models.StockChangeLog{
		ProductType: productType, ProductID: id, Label: label, Source: source, Action: action, Actor: actor,
	}
	if len(changes) > 0 {
		b, err := json.Marshal(changes)
		if err != nil {
			return err
		}
		row.Changes = string(b)
	} else if action == "update" {
		return nil // nothing actually changed
	}
	return tx.Create(row).Error
}

// logBulkPriceChange appends ONE change-log row for a bulk price update. It mirrors
// logChanges but stamps source="bulk", action="update" and carries the run's reason.
// Caller guarantees changes is non-empty (only changed prices are logged).
func logBulkPriceChange(tx *gorm.DB, productType string, id uint, label, actor, reason string, changes []FieldChange) error {
	b, err := json.Marshal(changes)
	if err != nil {
		return err
	}
	row := &models.StockChangeLog{
		ProductType: productType, ProductID: id, Label: label,
		Source: "bulk", Action: "update", Actor: actor,
		Reason: reason, Changes: string(b),
	}
	return tx.Create(row).Error
}

// syncIssue upserts/resolves the open issue for a product. If missing is non-empty it
// creates or refreshes an unresolved issue; otherwise it resolves any open issue.
func syncIssue(tx *gorm.DB, productType string, id uint, label string, missing []string) error {
	var open models.StockIssue
	findErr := tx.Where("product_type = ? AND product_id = ? AND resolved_at IS NULL", productType, id).
		First(&open).Error

	if len(missing) == 0 {
		if findErr == nil {
			now := time.Now()
			return tx.Model(&open).Update("resolved_at", now).Error
		}
		return nil
	}

	mf := strings.Join(missing, ",")
	if findErr == nil {
		return tx.Model(&open).Update("missing_fields", mf).Error
	}
	return tx.Create(&models.StockIssue{
		ProductType: productType, ProductID: id, Label: label, MissingFields: mf,
	}).Error
}
