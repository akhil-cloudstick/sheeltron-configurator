package controllers

import (
	"math"
	"net/http"
	"strconv"
	"strings"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// bulkPriceReq is the body for POST /api/stock/bulk-price. The filter column is owned
// by the backend (derived from Type) so the client never names a DB column.
type bulkPriceReq struct {
	Type            string  `json:"type"`             // chassis|cpu|ram|ssd|hdd
	FilterValue     string  `json:"filter_value"`     // optional; "" = every row of the type
	IDs             []uint  `json:"ids"`              // optional explicit row allow-list (takes precedence over FilterValue)
	Target          string  `json:"target"`           // new|refurb|both
	Direction       string  `json:"direction"`        // increase|decrease
	AdjustmentType  string  `json:"adjustment_type"`  // percent|absolute
	AdjustmentValue float64 `json:"adjustment_value"` // always >= 0; Direction supplies the sign
	Reason          string  `json:"reason"`           // required on commit (recorded in change-log)
	DryRun          bool    `json:"dry_run"`          // true = preview only, no writes
}

// bulkPriceItem is one affected row in the preview/result payload.
type bulkPriceItem struct {
	ID        uint     `json:"id"`
	Label     string   `json:"label"`
	OldNew    *float64 `json:"old_new"`
	NewNew    *float64 `json:"new_new"`
	OldRefurb *float64 `json:"old_refurb"`
	NewRefurb *float64 `json:"new_refurb"`
}

// filterColFor maps a bulk type to the single column its Filter dropdown narrows by.
var filterColFor = map[string]string{
	"chassis": "model",
	"cpu":     "family",
	"ram":     "generation",
	"ssd":     "interface",
	"hdd":     "interface",
}

// BulkPriceUpdate — POST /api/stock/bulk-price. Adjusts the New and/or Refurbished
// price of every (filtered) unit of one type by a percent or flat amount, recording
// one source="bulk" change-log row per affected unit with the run's reason. Admin only.
func BulkPriceUpdate(c echo.Context) error {
	if isStockManager(c) {
		return fail(c, http.StatusForbidden, "prices are admin-only")
	}
	var req bulkPriceReq
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	col, ok := filterColFor[req.Type]
	if !ok {
		return fail(c, http.StatusBadRequest, "invalid type: "+req.Type)
	}
	if req.Target != "new" && req.Target != "refurb" && req.Target != "both" {
		return fail(c, http.StatusBadRequest, "invalid target (new|refurb|both)")
	}
	if req.Direction != "increase" && req.Direction != "decrease" {
		return fail(c, http.StatusBadRequest, "invalid direction (increase|decrease)")
	}
	if req.AdjustmentType != "percent" && req.AdjustmentType != "absolute" {
		return fail(c, http.StatusBadRequest, "invalid adjustment_type (percent|absolute)")
	}
	if req.AdjustmentValue < 0 {
		return fail(c, http.StatusBadRequest, "adjustment_value must be >= 0")
	}
	if !req.DryRun && strings.TrimSpace(req.Reason) == "" {
		return fail(c, http.StatusBadRequest, "reason is required")
	}

	switch req.Type {
	case "chassis":
		return runBulkPrice[models.ServerUnit](c, req, "chassis", col,
			func(u *models.ServerUnit) uint { return u.ID },
			func(u *models.ServerUnit) string { return u.Model },
			func(u *models.ServerUnit) *models.Pricing { return &u.Pricing })
	case "cpu":
		return runBulkPrice[models.CpuUnit](c, req, "cpu", col, CpuCfg.getID, CpuCfg.identity, CpuCfg.pricing)
	case "ram":
		return runBulkPrice[models.RamUnit](c, req, "ram", col, RamCfg.getID, RamCfg.identity, RamCfg.pricing)
	case "ssd":
		return runBulkPrice[models.SsdUnit](c, req, "ssd", col, SsdCfg.getID, SsdCfg.identity, SsdCfg.pricing)
	case "hdd":
		return runBulkPrice[models.HddUnit](c, req, "hdd", col, HddCfg.getID, HddCfg.identity, HddCfg.pricing)
	}
	return fail(c, http.StatusBadRequest, "invalid type: "+req.Type)
}

// pendingChange holds the computed update for one unit before it is written.
type pendingChange struct {
	id      uint
	label   string
	newP    *float64
	refurbP *float64
	setNew  bool
	setRef  bool
	changes []FieldChange
}

// runBulkPrice does the type-generic work: load the (filtered) rows, compute the new
// prices for the targeted conditions, and (unless DryRun) persist + log them.
func runBulkPrice[T any](
	c echo.Context, req bulkPriceReq, typeKey, col string,
	getID func(*T) uint, identity func(*T) string, pricing func(*T) *models.Pricing,
) error {
	q := config.DB.Model(new(T))
	if len(req.IDs) > 0 {
		// Explicit allow-list (admin unchecked some rows in the UI).
		q = q.Where("id IN ?", req.IDs)
	} else if strings.TrimSpace(req.FilterValue) != "" {
		q = q.Where(col+" = ?", req.FilterValue)
	}
	var rows []T
	if err := q.Order("id ASC").Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load stock: "+err.Error())
	}

	touchNew := req.Target == "new" || req.Target == "both"
	touchRef := req.Target == "refurb" || req.Target == "both"

	items := make([]bulkPriceItem, 0, len(rows))
	var pending []pendingChange
	var oldTotal, newTotal float64

	for i := range rows {
		p := pricing(&rows[i])
		oldNew := copyFloatPtr(p.PriceNew)
		oldRef := copyFloatPtr(p.PriceRefurbished)
		newNew := copyFloatPtr(oldNew)
		newRef := copyFloatPtr(oldRef)
		pc := pendingChange{id: getID(&rows[i]), label: identity(&rows[i])}

		// An unset (nil) price is treated as 0, so a flat adjustment can seed a price
		// from empty. The row only changes when the computed value actually differs.
		if touchNew {
			base := 0.0
			if oldNew != nil {
				base = *oldNew
			}
			v := adjustPrice(base, req)
			if v != base {
				newNew = &v
				pc.newP, pc.setNew = &v, true
				pc.changes = append(pc.changes, FieldChange{
					Field: priceChangePrefix + " (New)", Old: floatStr(oldNew), New: floatStr(&v),
				})
			}
		}
		if touchRef {
			base := 0.0
			if oldRef != nil {
				base = *oldRef
			}
			v := adjustPrice(base, req)
			if v != base {
				newRef = &v
				pc.refurbP, pc.setRef = &v, true
				pc.changes = append(pc.changes, FieldChange{
					Field: priceChangePrefix + " (Refurbished)", Old: floatStr(oldRef), New: floatStr(&v),
				})
			}
		}

		if len(pc.changes) == 0 {
			continue // no price actually moved for this unit
		}

		items = append(items, bulkPriceItem{
			ID: pc.id, Label: pc.label,
			OldNew: oldNew, NewNew: newNew, OldRefurb: oldRef, NewRefurb: newRef,
		})
		oldTotal += sumPtr(oldNew, oldRef)
		newTotal += sumPtr(newNew, newRef)
		pending = append(pending, pc)
	}

	if !req.DryRun && len(pending) > 0 {
		actor := actorOf(c)
		reason := strings.TrimSpace(req.Reason)
		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			for _, pc := range pending {
				updates := map[string]interface{}{}
				if pc.setNew {
					updates["price_new"] = pc.newP
				}
				if pc.setRef {
					updates["price_refurbished"] = pc.refurbP
				}
				if err := tx.Model(new(T)).Where("id = ?", pc.id).Updates(updates).Error; err != nil {
					return err
				}
				if err := logBulkPriceChange(tx, typeKey, pc.id, pc.label, actor, reason, pc.changes); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return fail(c, http.StatusBadRequest, "bulk price update failed: "+err.Error())
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":   true,
		"committed": !req.DryRun,
		"affected":  len(items),
		"old_total": oldTotal,
		"new_total": newTotal,
		"items":     items,
	})
}

// adjustPrice applies the percent/flat adjustment in the chosen direction, clamping at
// 0 and rounding to 2 decimals.
func adjustPrice(price float64, req bulkPriceReq) float64 {
	delta := req.AdjustmentValue
	if req.AdjustmentType == "percent" {
		delta = price * req.AdjustmentValue / 100
	}
	out := price + delta
	if req.Direction == "decrease" {
		out = price - delta
	}
	if out < 0 {
		out = 0
	}
	return math.Round(out*100) / 100
}

// floatStr renders a nullable price for the change-log (empty when nil).
func floatStr(p *float64) string {
	if p == nil {
		return ""
	}
	return strconv.FormatFloat(*p, 'f', -1, 64)
}

// sumPtr adds the non-nil values of two price pointers.
func sumPtr(a, b *float64) float64 {
	var s float64
	if a != nil {
		s += *a
	}
	if b != nil {
		s += *b
	}
	return s
}
