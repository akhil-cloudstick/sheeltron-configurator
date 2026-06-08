package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// GST is fixed at 18% (per the project spec).
const gstRate = 0.18

// quoteRequest is the salesman's submitted quote (totals are recomputed server-side).
type quoteRequest struct {
	CustomerName    string `json:"customer_name"`
	CustomerCompany string `json:"customer_company"`
	CustomerEmail   string `json:"customer_email"`
	Units           int    `json:"units"` // identical-config multiplier (default 1)
	Lines           []struct {
		Category  string   `json:"category"`
		StockID   uint     `json:"stock_id"`
		Label     string   `json:"label"`
		Condition string   `json:"condition"`
		Qty       int      `json:"qty"`
		UnitPrice *float64 `json:"unit_price"` // null when the part is unpriced
	} `json:"lines"`
}

// CreateQuote — POST /api/quotes (salesman). Recomputes line/sub/gst/grand totals.
func CreateQuote(c echo.Context) error {
	var req quoteRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	if len(req.Lines) == 0 {
		return fail(c, http.StatusBadRequest, "a quote needs at least one line")
	}

	lines := make(models.QuoteLines, 0, len(req.Lines))
	var subtotal float64
	for _, l := range req.Lines {
		qty := l.Qty
		if qty < 1 {
			qty = 1
		}
		unit := 0.0
		if l.UnitPrice != nil {
			unit = *l.UnitPrice
		}
		lineTotal := unit * float64(qty)
		subtotal += lineTotal
		lines = append(lines, models.QuoteLine{
			Category: l.Category, StockID: l.StockID, Label: l.Label,
			Condition: l.Condition, Qty: qty, UnitPrice: unit, LineTotal: lineTotal,
		})
	}
	// units multiplies the whole configuration (N identical servers). Lines stay
	// per-unit; the totals scale by units.
	units := req.Units
	if units < 1 {
		units = 1
	}
	subtotal *= float64(units)
	gst := subtotal * gstRate
	grand := subtotal + gst

	q := models.Quote{
		CustomerName:    strings.TrimSpace(req.CustomerName),
		CustomerCompany: strings.TrimSpace(req.CustomerCompany),
		CustomerEmail:   strings.TrimSpace(req.CustomerEmail),
		Lines:           lines,
		Units:           units,
		Subtotal:        round2(subtotal),
		Gst:             round2(gst),
		GrandTotal:      round2(grand),
		CreatedBy:       actorOf(c),
	}

	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&q).Error; err != nil {
			return err
		}
		q.QuoteNumber = fmt.Sprintf("Q-%d-%05d", time.Now().Year(), q.ID)
		return tx.Model(&q).Update("quote_number", q.QuoteNumber).Error
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not save quote: "+err.Error())
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"success": true, "data": q})
}

// ListQuotes — GET /api/quotes. Admin/super_admin see every quote; a salesman sees only
// quotes created under the salesman role (auth is mocked, so "their own" == role-scoped).
// Newest first.
func ListQuotes(c echo.Context) error {
	q := config.DB.Order("id DESC")
	if actorOf(c) == "salesman" {
		q = q.Where("created_by = ?", "salesman")
	}
	var quotes []models.Quote
	if err := q.Find(&quotes).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not list quotes: "+err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": quotes})
}

// GetQuote — GET /api/quotes/:id. A salesman may only open salesman-created quotes.
func GetQuote(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}
	var q models.Quote
	if err := config.DB.First(&q, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fail(c, http.StatusNotFound, "quote not found")
		}
		return fail(c, http.StatusBadRequest, err.Error())
	}
	if actorOf(c) == "salesman" && q.CreatedBy != "salesman" {
		return fail(c, http.StatusNotFound, "quote not found")
	}
	return okData(c, q)
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}
