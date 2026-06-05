package controllers

import (
	"encoding/json"
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

// packRequest is the admin's submitted pack. Totals are recomputed server-side; the
// per-line option blob is stored as-is so the salesman can rebuild the selection.
type packRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Lines       []struct {
		Category string          `json:"category"`
		Qty      int             `json:"qty"`
		Option   json.RawMessage `json:"option"`
	} `json:"lines"`
}

// CreatePack — POST /api/packs (admin/super_admin). Recomputes line/sub/gst/grand totals.
func CreatePack(c echo.Context) error {
	var req packRequest
	if err := c.Bind(&req); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.Name) == "" {
		return fail(c, http.StatusBadRequest, "a pack needs a name")
	}
	if len(req.Lines) == 0 {
		return fail(c, http.StatusBadRequest, "a pack needs at least one line")
	}

	lines := make(models.PackLines, 0, len(req.Lines))
	var subtotal float64
	for _, l := range req.Lines {
		qty := l.Qty
		if qty < 1 {
			qty = 1
		}
		// Pull just the price out of the option snapshot to compute the line total;
		// the rest of the option is stored untouched.
		var opt struct {
			Price *float64 `json:"price"`
		}
		if len(l.Option) > 0 {
			_ = json.Unmarshal(l.Option, &opt)
		}
		unit := 0.0
		if opt.Price != nil {
			unit = *opt.Price
		}
		lineTotal := unit * float64(qty)
		subtotal += lineTotal
		lines = append(lines, models.PackLine{
			Category: l.Category, Qty: qty, Option: l.Option, LineTotal: lineTotal,
		})
	}
	gst := subtotal * gstRate
	grand := subtotal + gst

	p := models.Pack{
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		Lines:       lines,
		Subtotal:    round2(subtotal),
		Gst:         round2(gst),
		GrandTotal:  round2(grand),
		CreatedBy:   actorOf(c),
	}

	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&p).Error; err != nil {
			return err
		}
		p.PackNumber = fmt.Sprintf("P-%d-%05d", time.Now().Year(), p.ID)
		return tx.Model(&p).Update("pack_number", p.PackNumber).Error
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not save pack: "+err.Error())
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"success": true, "data": p})
}

// ListPacks — GET /api/packs (salesman/admin/super_admin). Newest first.
func ListPacks(c echo.Context) error {
	var packs []models.Pack
	if err := config.DB.Order("id DESC").Find(&packs).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not list packs: "+err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": packs})
}

// GetPack — GET /api/packs/:id (salesman/admin/super_admin).
func GetPack(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}
	var p models.Pack
	if err := config.DB.First(&p, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fail(c, http.StatusNotFound, "pack not found")
		}
		return fail(c, http.StatusBadRequest, err.Error())
	}
	return okData(c, p)
}

// DeletePack — DELETE /api/packs/:id (admin/super_admin).
func DeletePack(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}
	if err := config.DB.Delete(&models.Pack{}, id).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not delete pack: "+err.Error())
	}
	return okData(c, map[string]interface{}{"id": id})
}
