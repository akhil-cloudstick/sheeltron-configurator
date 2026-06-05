package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
)

// ListIssues — GET /api/issues?product_type=  (unresolved, newest first).
// missing_fields is returned as a string array for the UI to highlight.
func ListIssues(c echo.Context) error {
	productType := strings.TrimSpace(c.QueryParam("product_type"))
	from := strings.TrimSpace(c.QueryParam("from"))
	to := strings.TrimSpace(c.QueryParam("to"))

	tx := config.DB.Model(&models.StockIssue{}).Where("resolved_at IS NULL")
	if productType != "" {
		tx = tx.Where("product_type = ?", productType)
	}
	if from != "" {
		tx = tx.Where("created_at >= ?", from)
	}
	if to != "" {
		tx = tx.Where("created_at < ?", to)
	}
	var rows []models.StockIssue
	if err := tx.Order("created_at DESC, id DESC").Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not list issues: "+err.Error())
	}

	out := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		missing := []string{}
		if strings.TrimSpace(r.MissingFields) != "" {
			missing = strings.Split(r.MissingFields, ",")
		}
		out = append(out, map[string]interface{}{
			"id":             r.ID,
			"product_type":   r.ProductType,
			"product_id":     r.ProductID,
			"label":          r.Label,
			"missing_fields": missing,
			"created_at":     r.CreatedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": out})
}

// ListChangeLogs — GET /api/change-logs?product_type=&product_id=&limit=  (newest first).
func ListChangeLogs(c echo.Context) error {
	productType := strings.TrimSpace(c.QueryParam("product_type"))
	productIDStr := strings.TrimSpace(c.QueryParam("product_id"))
	from := strings.TrimSpace(c.QueryParam("from"))
	to := strings.TrimSpace(c.QueryParam("to"))
	limit, _ := strconv.Atoi(strings.TrimSpace(c.QueryParam("limit")))
	if limit < 1 || limit > 2000 {
		limit = 500
	}

	tx := config.DB.Model(&models.StockChangeLog{})
	if productType != "" {
		tx = tx.Where("product_type = ?", productType)
	}
	if productIDStr != "" {
		if pid, err := strconv.Atoi(productIDStr); err == nil {
			tx = tx.Where("product_id = ?", pid)
		}
	}
	if from != "" {
		tx = tx.Where("changed_at >= ?", from)
	}
	if to != "" {
		tx = tx.Where("changed_at < ?", to)
	}
	var rows []models.StockChangeLog
	if err := tx.Order("changed_at DESC, id DESC").Limit(limit).Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not list change logs: "+err.Error())
	}

	stockManager := isStockManager(c)
	out := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		var changes []FieldChange
		if strings.TrimSpace(r.Changes) != "" {
			_ = json.Unmarshal([]byte(r.Changes), &changes)
		} else if r.Field != "" {
			// Legacy per-field row → present as a one-element change set.
			changes = []FieldChange{{Field: r.Field, Old: r.OldValue, New: r.NewValue}}
		}
		// Stock managers must not see price changes. Drop price rows; if an update
		// then has nothing left to show, skip the whole row for them.
		if stockManager && len(changes) > 0 {
			kept := changes[:0:0]
			for _, ch := range changes {
				if !strings.HasPrefix(ch.Field, priceChangePrefix) {
					kept = append(kept, ch)
				}
			}
			if len(kept) == 0 && r.Action == "update" {
				continue
			}
			changes = kept
		}
		out = append(out, map[string]interface{}{
			"id":           r.ID,
			"product_type": r.ProductType,
			"product_id":   r.ProductID,
			"label":        r.Label,
			"source":       r.Source,
			"action":       r.Action,
			"actor":        r.Actor,
			"changes":      changes,
			"reason":       r.Reason,
			"changed_at":   r.ChangedAt,
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": out})
}
