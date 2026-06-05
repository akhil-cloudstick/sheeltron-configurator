package controllers

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// ============================================================================
// Response helpers (RDS convention: never 500; {success,error} shape).
// Shared across the stock module — future cpus.go / ram.go reuse these.
// ============================================================================

func fail(c echo.Context, code int, msg string) error {
	return c.JSON(code, map[string]interface{}{"success": false, "error": msg})
}

func okData(c echo.Context, data interface{}) error {
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": data})
}

// isStockManager reports whether the caller is a stock manager (no real auth yet —
// the frontend sends the mocked role in the X-User-Role header). Stock managers may
// never see or set prices, so prices are redacted on reads and ignored on writes.
func isStockManager(c echo.Context) bool {
	return strings.EqualFold(c.Request().Header.Get("X-User-Role"), "stock_manager")
}

// actorOf returns who is performing the request, for the change-log (admin /
// stock_manager / system when no role header is present).
func actorOf(c echo.Context) string {
	role := strings.ToLower(strings.TrimSpace(c.Request().Header.Get("X-User-Role")))
	if role == "" {
		return "system"
	}
	return role
}

// redactPrices clears both per-condition prices (used for stock-manager reads/writes).
func redactPrices(u *models.ServerUnit) {
	u.PriceNew = nil
	u.PriceRefurbished = nil
}

// copyFloatPtr returns a new pointer to a copy of the value (or nil), so the result
// is not aliased to the source pointer.
func copyFloatPtr(p *float64) *float64 {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}

// normalizePricesToConditions drops a price whose condition is not set, so a price
// never lingers for a condition the unit no longer has.
func normalizePricesToConditions(u *models.ServerUnit) {
	if !u.ConditionNew {
		u.PriceNew = nil
	}
	if !u.ConditionRefurbished {
		u.PriceRefurbished = nil
	}
}

// ============================================================================
// CRUD handlers — server stock units
// ============================================================================

// ListServerUnits — GET /api/stock/servers?q=&brand=&model=&status=&page=&limit=
func ListServerUnits(c echo.Context) error {
	// Models
	var units []models.ServerUnit
	var total int64

	// Params
	q := strings.TrimSpace(c.QueryParam("q"))
	brand := strings.TrimSpace(c.QueryParam("brand"))
	model := strings.TrimSpace(c.QueryParam("model"))
	status := strings.TrimSpace(c.QueryParam("status"))

	// Pagination is opt-in: only applied when page and/or limit is passed.
	// If neither is present, every matching row is returned.
	pageStr := strings.TrimSpace(c.QueryParam("page"))
	limitStr := strings.TrimSpace(c.QueryParam("limit"))
	paginate := pageStr != "" || limitStr != ""
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 500 {
		limit = 50
	}

	// Action
	tx := config.DB.Model(&models.ServerUnit{})
	if q != "" {
		like := "%" + q + "%"
		tx = tx.Where("model ILIKE ? OR brand ILIKE ?", like, like)
	}
	if brand != "" {
		tx = tx.Where("brand ILIKE ?", "%"+brand+"%")
	}
	if model != "" {
		tx = tx.Where("model ILIKE ?", "%"+model+"%")
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}

	if err := tx.Count(&total).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not count stock: "+err.Error())
	}

	query := tx.Order("id DESC")
	if paginate {
		query = query.Limit(limit).Offset((page - 1) * limit)
	}
	if err := query.Find(&units).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not list stock: "+err.Error())
	}

	// When not paginating, report the full set as a single page.
	if !paginate {
		page = 1
		limit = int(total)
	}

	// Stock managers must not see prices.
	if isStockManager(c) {
		for i := range units {
			redactPrices(&units[i])
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"response": map[string]interface{}{
			"total": total,
			"page":  page,
			"limit": limit,
			"data":  units,
		},
	})
}

// GetServerUnit — GET /api/stock/servers/:id
func GetServerUnit(c echo.Context) error {
	// Params
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}

	// Action
	var unit models.ServerUnit
	if err := config.DB.First(&unit, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fail(c, http.StatusNotFound, "server unit not found")
		}
		return fail(c, http.StatusBadRequest, err.Error())
	}
	if isStockManager(c) {
		redactPrices(&unit)
	}
	return okData(c, unit)
}

// CreateServerUnit — POST /api/stock/servers
func CreateServerUnit(c echo.Context) error {
	// Models
	var unit models.ServerUnit

	// Params
	if err := c.Bind(&unit); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	unit.ID = 0
	unit.Model = strings.TrimSpace(unit.Model)
	if unit.Model == "" {
		return fail(c, http.StatusBadRequest, "model is required")
	}
	if unit.Status == "" {
		unit.Status = models.StatusNeedCheck
	}
	if !models.IsValidStatus(unit.Status) {
		return fail(c, http.StatusBadRequest, "invalid status: "+unit.Status)
	}
	if isStockManager(c) {
		redactPrices(&unit) // stock managers cannot set prices
	}
	normalizePricesToConditions(&unit)

	// Action — create + audit in one transaction.
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&unit).Error; err != nil {
			return err
		}
		if err := logChanges(tx, "chassis", unit.ID, unit.Model, "manual", "create", actorOf(c), nil); err != nil {
			return err
		}
		return syncIssue(tx, "chassis", unit.ID, unit.Model, missingFieldKeys(serverFields(&unit)))
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not create server unit: "+err.Error())
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"success": true, "data": unit})
}

// UpdateServerUnit — PUT /api/stock/servers/:id
func UpdateServerUnit(c echo.Context) error {
	// Params
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}

	// Models — load existing, bind changes onto it
	var unit models.ServerUnit
	if err := config.DB.First(&unit, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fail(c, http.StatusNotFound, "server unit not found")
		}
		return fail(c, http.StatusBadRequest, err.Error())
	}
	// Preserve current prices for stock managers. Deep-copy the values — c.Bind reuses
	// existing non-nil pointers, so a plain pointer copy would be mutated by the bind.
	existingNew := copyFloatPtr(unit.PriceNew)
	existingRef := copyFloatPtr(unit.PriceRefurbished)
	oldFields := serverChangeFields(&unit) // snapshot for change-log diff (before bind)
	if err := c.Bind(&unit); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	unit.ID = uint(id)
	unit.Model = strings.TrimSpace(unit.Model)
	if unit.Model == "" {
		return fail(c, http.StatusBadRequest, "model is required")
	}
	if unit.Status == "" {
		unit.Status = models.StatusNeedCheck
	}
	if !models.IsValidStatus(unit.Status) {
		return fail(c, http.StatusBadRequest, "invalid status: "+unit.Status)
	}
	if isStockManager(c) {
		// ignore any price change from a stock manager (conditions may still change)
		unit.PriceNew, unit.PriceRefurbished = existingNew, existingRef
	}
	normalizePricesToConditions(&unit)

	changes := diffFields(oldFields, serverChangeFields(&unit))
	// Action — Save writes every column; record audit in the same transaction.
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&unit).Error; err != nil {
			return err
		}
		if err := logChanges(tx, "chassis", unit.ID, unit.Model, "manual", "update", actorOf(c), changes); err != nil {
			return err
		}
		return syncIssue(tx, "chassis", unit.ID, unit.Model, missingFieldKeys(serverFields(&unit)))
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not update server unit: "+err.Error())
	}
	if isStockManager(c) {
		redactPrices(&unit)
	}
	return okData(c, unit)
}

// DeleteServerUnit — DELETE /api/stock/servers/:id (hard delete — row is removed)
func DeleteServerUnit(c echo.Context) error {
	// Params
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return fail(c, http.StatusBadRequest, "invalid id")
	}

	// Action
	var unit models.ServerUnit
	if err := config.DB.First(&unit, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fail(c, http.StatusNotFound, "server unit not found")
		}
		return fail(c, http.StatusBadRequest, err.Error())
	}
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&unit).Error; err != nil {
			return err
		}
		if err := logChanges(tx, "chassis", unit.ID, unit.Model, "manual", "delete", actorOf(c), nil); err != nil {
			return err
		}
		return syncIssue(tx, "chassis", unit.ID, unit.Model, nil) // resolve any open issue
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not delete server unit: "+err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "message": "server unit deleted"})
}

// BulkDeleteServerUnits — POST /api/stock/servers/bulk-delete  body {"ids":[1,2,3]}
func BulkDeleteServerUnits(c echo.Context) error {
	var body struct {
		IDs []uint `json:"ids"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, http.StatusBadRequest, "invalid request body")
	}
	if len(body.IDs) == 0 {
		return fail(c, http.StatusBadRequest, "no ids provided")
	}

	var units []models.ServerUnit
	config.DB.Where("id IN ?", body.IDs).Find(&units)
	var deleted int64
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		res := tx.Where("id IN ?", body.IDs).Delete(&models.ServerUnit{})
		if res.Error != nil {
			return res.Error
		}
		deleted = res.RowsAffected
		for i := range units {
			u := &units[i]
			if err := logChanges(tx, "chassis", u.ID, u.Model, "manual", "delete", actorOf(c), nil); err != nil {
				return err
			}
			if err := syncIssue(tx, "chassis", u.ID, u.Model, nil); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return fail(c, http.StatusBadRequest, "could not delete server units: "+err.Error())
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"success": true,
		"deleted": deleted,
	})
}

// ============================================================================
// Bulk import — server stock (.xlsx / .csv), deduped/merged by MODEL.
//
// Users re-import the same sheet repeatedly. A model not yet in stock is inserted;
// a model already present has each field (except brand/model) refreshed when the
// incoming cell is non-empty and differs — unchanged rows are skipped. Within one
// file, repeated models merge into a single record the same way.
// ============================================================================

// ImportServerUnits — POST /api/stock/servers/import (multipart field "file").
func ImportServerUnits(c echo.Context) error {
	// Params
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

	// Action — parse sheet -> units
	parsed, err := parseServerSheet(ext, src)
	if err != nil {
		return fail(c, http.StatusBadRequest, err.Error())
	}

	// Load every existing unit once and index by normalized model.
	var existingRows []models.ServerUnit
	if err := config.DB.Find(&existingRows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read existing stock: "+err.Error())
	}
	byModel := make(map[string]*models.ServerUnit, len(existingRows))
	for i := range existingRows {
		byModel[normModel(existingRows[i].Model)] = &existingRows[i]
	}

	inserted, updated, skipped := 0, 0, parsed.Skipped
	changed := map[*models.ServerUnit][]FieldChange{} // existing rows touched this run
	newByModel := map[string]*models.ServerUnit{}     // brand-new models, keyed for in-file merge
	var inserts []*models.ServerUnit

	for _, in := range parsed.Units {
		key := normModel(in.Model)
		if ex, ok := byModel[key]; ok {
			if ch := applyImportUpdate(ex, in); len(ch) > 0 {
				changed[ex] = append(changed[ex], ch...)
				updated++
			} else {
				skipped++
			}
			continue
		}
		if nw, ok := newByModel[key]; ok {
			// Duplicate of a model that is new in this file — merge its data into the
			// pending (not-yet-inserted) record. It's still a duplicate row, so it counts
			// as skipped, NOT updated (no existing DB row is being updated here).
			applyImportUpdate(nw, in)
			skipped++
			continue
		}
		// Brand-new model.
		rec := in
		if rec.Status == "" {
			rec.Status = models.StatusNeedCheck
		}
		newByModel[key] = &rec
		inserts = append(inserts, &rec)
		inserted++
	}

	// Persist + audit inside a transaction.
	issues := 0
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		for ex, ch := range changed {
			if err := tx.Save(ex).Error; err != nil {
				return err
			}
			if err := logChanges(tx, "chassis", ex.ID, ex.Model, "import", "update", actorOf(c), ch); err != nil {
				return err
			}
			missing := missingFieldKeys(serverFields(ex))
			if len(missing) > 0 {
				issues++
			}
			if err := syncIssue(tx, "chassis", ex.ID, ex.Model, missing); err != nil {
				return err
			}
		}
		for _, rec := range inserts {
			if err := tx.Create(rec).Error; err != nil {
				return err
			}
			if err := logChanges(tx, "chassis", rec.ID, rec.Model, "import", "create", actorOf(c), nil); err != nil {
				return err
			}
			missing := missingFieldKeys(serverFields(rec))
			if len(missing) > 0 {
				issues++
			}
			if err := syncIssue(tx, "chassis", rec.ID, rec.Model, missing); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return fail(c, http.StatusBadRequest, "import failed during save: "+err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"success":  true,
		"inserted": inserted,
		"updated":  updated,
		"skipped":  skipped,
		"issues":   issues,
	})
}

// applyImportUpdate copies non-empty, differing fields from an imported row onto an
// existing record, leaving brand and model (the identity) untouched. Price/condition/
// remark are never imported. Returns the list of field changes (empty = no change).
func applyImportUpdate(ex *models.ServerUnit, in models.ServerUnit) []FieldChange {
	var changes []FieldChange
	set := func(label string, dst *string, val string) {
		v := strings.TrimSpace(val)
		if v != "" && v != *dst {
			changes = append(changes, FieldChange{Field: label, Old: *dst, New: v})
			*dst = v
		}
	}
	set("Motherboard", &ex.Motherboard, in.Motherboard)
	set("Heat sink", &ex.HeatSink, in.HeatSink)
	set("Fan", &ex.Fan, in.Fan)
	set("RAID card", &ex.RaidCard, in.RaidCard)
	set("Cards", &ex.Cards, in.Cards)
	set("Riser 1", &ex.Riser1, in.Riser1)
	set("Riser 2", &ex.Riser2, in.Riser2)
	set("Riser 3", &ex.Riser3, in.Riser3)
	set("Back plane", &ex.BackPlane, in.BackPlane)
	set("Power supply", &ex.PowerSupply, in.PowerSupply)
	set("Status", &ex.Status, in.Status)
	return changes
}

// serverFields are the chassis data fields used for issue (missing) detection,
// manual-edit diffing, and change-log labels. Identity (model), condition, price and
// remark are excluded.
func serverFields(u *models.ServerUnit) []FieldKV {
	return []FieldKV{
		{"brand", "Brand", u.Brand},
		{"motherboard", "Motherboard", u.Motherboard},
		{"heat_sink", "Heat sink", u.HeatSink},
		{"fan", "Fan", u.Fan},
		{"raid_card", "RAID card", u.RaidCard},
		{"cards", "Cards", u.Cards},
		{"riser_1", "Riser 1", u.Riser1},
		{"riser_2", "Riser 2", u.Riser2},
		{"riser_3", "Riser 3", u.Riser3},
		{"back_plane", "Back plane", u.BackPlane},
		{"power_supply", "Power supply", u.PowerSupply},
		{"status", "Status", u.Status},
	}
}

// serverChangeFields are the fields tracked for the change-log diff: the data fields,
// remark, and the condition/price block (remark/condition/price are excluded from
// issue/missing detection). Price rows are redacted for stock managers at read time.
func serverChangeFields(u *models.ServerUnit) []FieldKV {
	out := append(serverFields(u), FieldKV{"remark", "Remark", u.Remark})
	return append(out, pricingChangeFields(&u.Pricing)...)
}

// normModel canonicalizes a model for dedup matching: lowercase, keeping only
// letters and digits (so "HPE DL 385 GEN 10" and "HPE DL385 GEN10" collapse to the
// same key). The original model string is stored verbatim.
func normModel(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// DownloadTemplate — GET /api/stock/servers/template.csv
func DownloadTemplate(c echo.Context) error {
	csvData := strings.Join(serverTemplateHeaders, ",") + "\r\n"
	c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="server_stock_template.csv"`)
	return c.Blob(http.StatusOK, "text/csv; charset=utf-8", []byte(csvData))
}

// ============================================================================
// Server-sheet parsing (specific to server stock — lives in this module).
// When cpu/ram/storage stock are added, each gets its own parser file here.
// ============================================================================

// parseResult holds parsed units and a count of rows that were dropped during
// parsing (had content but no usable MODEL). Truly blank rows are ignored silently.
type parseResult struct {
	Units   []models.ServerUnit
	Skipped int
}

// serverTemplateHeaders is the canonical header row (also used for the CSV template).
// Chassis are keyed by MODEL; STATUS is imported (blank STATUS -> need_check). CONDITION
// and PRICE are never imported — they are set manually in the UI (condition by any role,
// price by admin). REMARK is not imported either.
var serverTemplateHeaders = []string{
	"BRAND", "MODEL",
	"MOTHER BOARD", "HEAT SINK", "FAN", "RAID CARD", "CARDS",
	"RISER-1", "RISER-II", "RISER-III", "BACK PLANE", "POWER SUPPLY",
	"STATUS",
}

// headerToField maps a normalized header (letters+digits only, lowercased) to a
// logical field key. Tolerant of the sheet's punctuation/spacing variations.
// Columns not listed here (e.g. SL NO, SERIAL NO, PART NO, CPU, HDD/SSD, RAM,
// TYPE/CONDITION, PRICE, REMARK) are ignored if present in the uploaded sheet.
var headerToField = map[string]string{
	"brand":       "brand",
	"model":       "model",
	"motherboard": "motherboard", "mainboard": "motherboard", "mb": "motherboard",
	"heatsink":    "heat_sink",
	"fan":         "fan",
	"raidcard":    "raid_card", "raid": "raid_card",
	"cards":       "cards", "card": "cards",
	"riser1":      "riser_1", "riseri": "riser_1",
	"riser2":      "riser_2", "riserii": "riser_2",
	"riser3":      "riser_3", "riseriii": "riser_3",
	"backplane":   "back_plane",
	"powersupply": "power_supply", "psu": "power_supply", "power": "power_supply",
	"status":      "status",
}

// parseServerSheet reads an uploaded .xlsx or .csv stream into ServerUnit rows.
func parseServerSheet(ext string, r io.Reader) (*parseResult, error) {
	var rows [][]string
	var err error

	switch ext {
	case ".xlsx", ".xlsm", ".xls":
		rows, err = readXLSX(r)
	case ".csv":
		rows, err = readCSV(r)
	default:
		return nil, fmt.Errorf("unsupported file type %q (use .xlsx or .csv)", ext)
	}
	if err != nil {
		return nil, err
	}
	return rowsToUnits(rows)
}

func readXLSX(r io.Reader) ([][]string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("could not read Excel file: %w", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		return nil, fmt.Errorf("workbook has no sheets")
	}
	return f.GetRows(sheet)
}

func readCSV(r io.Reader) ([][]string, error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	cr.TrimLeadingSpace = true
	return cr.ReadAll()
}

func rowsToUnits(rows [][]string) (*parseResult, error) {
	res := &parseResult{}
	if len(rows) == 0 {
		return nil, fmt.Errorf("file is empty")
	}

	header := rows[0]
	colMap := make(map[int]string, len(header))
	for i, h := range header {
		if key, ok := headerToField[normalizeHeader(h)]; ok {
			colMap[i] = key
		}
	}
	if !containsValue(colMap, "model") {
		return nil, fmt.Errorf("no MODEL column found in header row")
	}

	for ri := 1; ri < len(rows); ri++ {
		row := rows[ri]

		if isEmptyRow(row) {
			continue
		}

		var u models.ServerUnit
		for ci, key := range colMap {
			if ci >= len(row) {
				continue
			}
			setField(&u, key, strings.TrimSpace(row[ci]))
		}

		// MODEL is the identity — a content row without one cannot be matched.
		if strings.TrimSpace(u.Model) == "" {
			res.Skipped++
			continue
		}
		// Normalize STATUS only when present, so blank cells stay empty and the importer
		// can tell "leave as-is" (skip on update) from an explicit value.
		if u.Status != "" {
			u.Status = normalizeStatus(u.Status)
		}
		res.Units = append(res.Units, u)
	}

	return res, nil
}

func setField(u *models.ServerUnit, key, val string) {
	switch key {
	case "brand":
		u.Brand = val
	case "model":
		u.Model = val
	case "motherboard":
		u.Motherboard = val
	case "heat_sink":
		u.HeatSink = val
	case "fan":
		u.Fan = val
	case "raid_card":
		u.RaidCard = val
	case "cards":
		u.Cards = val
	case "riser_1":
		u.Riser1 = val
	case "riser_2":
		u.Riser2 = val
	case "riser_3":
		u.Riser3 = val
	case "back_plane":
		u.BackPlane = val
	case "power_supply":
		u.PowerSupply = val
	case "status":
		u.Status = val
	}
}

// normalizeStatus maps free-text sheet status (e.g. "NEED TO BE CHECK") to a
// canonical status value, defaulting to need_check when blank or unrecognized.
func normalizeStatus(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" {
		return models.StatusNeedCheck
	}
	if models.IsValidStatus(s) {
		return s
	}
	switch {
	case strings.Contains(s, "need"), strings.Contains(s, "check"):
		return models.StatusNeedCheck
	case strings.Contains(s, "test"):
		return models.StatusTesting
	case strings.Contains(s, "ready"), strings.Contains(s, "stock"), strings.Contains(s, "available"):
		return models.StatusReady
	case strings.Contains(s, "reserve"):
		return models.StatusReserved
	case strings.Contains(s, "ship"), strings.Contains(s, "deliver"):
		return models.StatusShipped
	case strings.Contains(s, "rma"), strings.Contains(s, "return"):
		return models.StatusRMA
	case strings.Contains(s, "scrap"), strings.Contains(s, "dead"), strings.Contains(s, "write"):
		return models.StatusScrap
	default:
		return models.StatusNeedCheck
	}
}

// normalizeHeader strips everything but letters/digits and lowercases.
func normalizeHeader(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(unicode.ToLower(r))
		}
	}
	return b.String()
}

func isEmptyRow(row []string) bool {
	for _, c := range row {
		if strings.TrimSpace(c) != "" {
			return false
		}
	}
	return true
}

func containsValue(m map[int]string, want string) bool {
	for _, v := range m {
		if v == want {
			return true
		}
	}
	return false
}
