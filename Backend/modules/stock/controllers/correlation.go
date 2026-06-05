package controllers

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"configurator/config"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// ============================================================================
// Correlation import (super-admin only) — generic engine.
//
// The Corelation/ pipeline derives compatibility keys (CPU socket, chassis
// cpu_socket/ram_type/drive_form_factors, storage interface/form_factor,
// needs_review, …) and emits one enriched CSV per product. The super-admin
// uploads these to ENRICH the existing stock rows: each row is matched to stock
// by normalized identity (model / product_name) and its key columns are filled
// in. Rows with no stock match are inserted, so a first import also seeds.
//
// This is intentionally separate from the stock /import handler (ImportUnits):
// it has its own header map, writes only the compatibility-key fields, and is
// gated to the super_admin role at the route layer.
// ============================================================================

// RequireSuperAdmin gates a route to the super_admin role (mocked via X-User-Role).
// Correlation imports rewrite catalog compatibility keys, so only super-admins may run them.
func RequireSuperAdmin(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !strings.EqualFold(c.Request().Header.Get("X-User-Role"), "super_admin") {
			return fail(c, http.StatusForbidden, "super_admin role required")
		}
		return next(c)
	}
}

// corrBool parses the Corelation/ yes|no (and true|1|y) booleans.
func corrBool(val string) bool {
	switch strings.ToLower(strings.TrimSpace(val)) {
	case "yes", "true", "1", "y":
		return true
	default:
		return false
	}
}

// yesNo renders a bool back to the Corelation/ canonical string (for corrFields diffing).
func yesNo(b bool) string {
	if b {
		return "yes"
	}
	return "no"
}

// intPtrStr renders a nullable int for corrFields diffing ("" when nil).
func intPtrStr(p *int) string {
	if p == nil {
		return ""
	}
	return fmt.Sprintf("%d", *p)
}

// ImportCorrelation — POST /api/stock/<product>/import-correlation (multipart field "file").
func ImportCorrelation[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return fail(c, http.StatusBadRequest, "no file uploaded (expected multipart field 'file')")
		}
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		src, err := fileHeader.Open()
		if err != nil {
			return fail(c, http.StatusBadRequest, "could not open uploaded file")
		}
		defer src.Close()

		parsed, skipped, err := parseCorrUnits(cfg, ext, src)
		if err != nil {
			return fail(c, http.StatusBadRequest, err.Error())
		}

		var existingRows []T
		if err := config.DB.Find(&existingRows).Error; err != nil {
			return fail(c, http.StatusBadRequest, "could not read existing stock: "+err.Error())
		}
		byKey := make(map[string]*T, len(existingRows))
		for i := range existingRows {
			byKey[normModel(cfg.identity(&existingRows[i]))] = &existingRows[i]
		}

		inserted, updated := 0, 0
		changedRows := map[*T][]FieldChange{}
		newByKey := map[string]*T{}
		var inserts []*T

		for i := range parsed {
			in := &parsed[i]
			key := normModel(cfg.identity(in))
			if ex, ok := byKey[key]; ok {
				if changes := applyCorr(cfg, ex, in); len(changes) > 0 {
					changedRows[ex] = append(changedRows[ex], changes...)
					updated++
				} else {
					skipped++
				}
				continue
			}
			if nw, ok := newByKey[key]; ok {
				applyCorr(cfg, nw, in) // merge a duplicate model new in this file
				skipped++
				continue
			}
			rec := *in
			newByKey[key] = &rec
			inserts = append(inserts, &rec)
			inserted++
		}

		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			for ex, changes := range changedRows {
				if err := tx.Save(ex).Error; err != nil {
					return err
				}
				if err := logChanges(tx, cfg.typeKey, cfg.getID(ex), cfg.identity(ex), "correlation", "update", actorOf(c), changes); err != nil {
					return err
				}
			}
			for _, rec := range inserts {
				if err := tx.Create(rec).Error; err != nil {
					return err
				}
				if err := logChanges(tx, cfg.typeKey, cfg.getID(rec), cfg.identity(rec), "correlation", "create", actorOf(c), nil); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return fail(c, http.StatusBadRequest, "correlation import failed during save: "+err.Error())
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true, "inserted": inserted, "updated": updated, "skipped": skipped,
		})
	}
}

// applyCorr copies non-empty, differing compatibility-key fields from incoming onto
// existing (identity untouched) and returns the changes for the audit log.
func applyCorr[T any](cfg UnitCfg[T], existing, incoming *T) []FieldChange {
	inMap := make(map[string]FieldKV)
	for _, f := range cfg.corrFields(incoming) {
		inMap[f.Key] = f
	}
	var changes []FieldChange
	for _, ef := range cfg.corrFields(existing) {
		nf := inMap[ef.Key]
		v := strings.TrimSpace(nf.Value)
		if v != "" && v != ef.Value {
			cfg.setField(existing, ef.Key, v)
			changes = append(changes, FieldChange{Field: ef.Label, Old: ef.Value, New: v})
		}
	}
	return changes
}

// parseCorrUnits reads a correlation sheet into units, requiring the identity column.
// For storage (cfg.corrKind != ""), rows whose `kind` column != corrKind are dropped.
func parseCorrUnits[T any](cfg UnitCfg[T], ext string, r io.Reader) ([]T, int, error) {
	var rows [][]string
	var err error
	switch ext {
	case ".xlsx", ".xlsm", ".xls":
		rows, err = readXLSX(r)
	case ".csv":
		rows, err = readCSV(r)
	default:
		return nil, 0, fmt.Errorf("unsupported file type %q (use .xlsx or .csv)", ext)
	}
	if err != nil {
		return nil, 0, err
	}
	if len(rows) == 0 {
		return nil, 0, fmt.Errorf("file is empty")
	}

	header := rows[0]
	colMap := make(map[int]string, len(header))
	kindCol := -1
	for i, h := range header {
		nh := normalizeHeader(h)
		if nh == "kind" {
			kindCol = i
		}
		if key, ok := cfg.corrHeaderToField[nh]; ok {
			colMap[i] = key
		}
	}
	if !containsValue(colMap, cfg.identityKey) {
		return nil, 0, fmt.Errorf("no %s column found in header row", cfg.identityLabel)
	}
	if cfg.corrKind != "" && kindCol < 0 {
		return nil, 0, fmt.Errorf("no KIND column found (needed to split %s rows)", cfg.corrKind)
	}

	skipped := 0
	var units []T
	for ri := 1; ri < len(rows); ri++ {
		row := rows[ri]
		if isEmptyRow(row) {
			continue
		}
		if cfg.corrKind != "" {
			if kindCol >= len(row) || !strings.EqualFold(strings.TrimSpace(row[kindCol]), cfg.corrKind) {
				continue // belongs to the other storage kind
			}
		}
		var u T
		for ci, key := range colMap {
			if ci >= len(row) {
				continue
			}
			cfg.setField(&u, key, strings.TrimSpace(row[ci]))
		}
		if strings.TrimSpace(cfg.identity(&u)) == "" {
			skipped++
			continue
		}
		units = append(units, u)
	}
	return units, skipped, nil
}

// DownloadCorrelationTemplate — GET /api/stock/<product>/correlation-template.csv
func DownloadCorrelationTemplate[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		csvData := strings.Join(cfg.corrTemplateHdrs, ",") + "\r\n"
		c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+cfg.corrTemplateName+`"`)
		return c.Blob(http.StatusOK, "text/csv; charset=utf-8", []byte(csvData))
	}
}
