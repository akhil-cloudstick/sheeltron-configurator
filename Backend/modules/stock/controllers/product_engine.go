package controllers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// unitCfg describes one stock product type so the generic handlers below can serve it.
// All type-specific access goes through these closures, so there is no per-type CRUD
// duplication. Chassis keeps its own (status-bearing) controller; cpu/ram/ssd/hdd use this.
type UnitCfg[T any] struct {
	typeKey       string   // audit product_type, e.g. "cpu"
	noun          string   // for messages, e.g. "processor"
	identityKey   string   // field key of the dedup identity, e.g. "model" / "product_name"
	identityLabel string   // human label, e.g. "Model" / "Product name"
	templateName  string   // download filename, e.g. "cpu_stock_template.csv"
	searchCols    []string // DB columns matched by ?q=
	templateHdrs  []string // CSV template header row
	headerToField map[string]string

	setField func(u *T, key, val string)        // apply one parsed cell
	fields   func(u *T) []FieldKV               // non-identity data fields (missing/diff/log)
	identity func(u *T) string                  // identity value (also the audit label)
	pricing   func(u *T) *models.Pricing         // pointer to the embedded Pricing block
	getRemark func(u *T) string                  // remark value (tracked in change-log, not in missing)
	getID     func(u *T) uint
	setID     func(u *T, id uint)

	// Correlation import (super-admin only): writes the derived compatibility keys from
	// Corelation/ onto existing rows (matched by identity), inserting unmatched rows.
	// Distinct from the stock import above — different headers, different written fields.
	corrTemplateName  string              // download filename for the correlation template
	corrTemplateHdrs  []string            // correlation CSV header row
	corrHeaderToField map[string]string   // correlation header -> field key
	corrFields        func(u *T) []FieldKV // the compatibility-key fields written/diffed
	corrKind          string              // storage only: keep only rows whose `kind` column == this
}

// changeFields are the fields tracked for the change-log diff: the data fields plus
// remark (remark is optional, so it is excluded from issue/missing detection).
func changeFields[T any](cfg UnitCfg[T], u *T) []FieldKV {
	out := append(cfg.fields(u), FieldKV{"remark", "Remark", cfg.getRemark(u)})
	return append(out, pricingChangeFields(cfg.pricing(u))...)
}

// ---- CRUD --------------------------------------------------------------------

func ListUnits[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		var units []T
		var total int64

		q := strings.TrimSpace(c.QueryParam("q"))
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

		tx := config.DB.Model(new(T))
		if q != "" && len(cfg.searchCols) > 0 {
			like := "%" + q + "%"
			conds := make([]string, 0, len(cfg.searchCols))
			args := make([]interface{}, 0, len(cfg.searchCols))
			for _, col := range cfg.searchCols {
				conds = append(conds, col+" ILIKE ?")
				args = append(args, like)
			}
			tx = tx.Where(strings.Join(conds, " OR "), args...)
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
		if !paginate {
			page = 1
			limit = int(total)
		}
		if isStockManager(c) {
			for i := range units {
				cfg.pricing(&units[i]).Redact()
			}
		}
		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true,
			"response": map[string]interface{}{
				"total": total, "page": page, "limit": limit, "data": units,
			},
		})
	}
}

func GetUnit[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			return fail(c, http.StatusBadRequest, "invalid id")
		}
		var unit T
		if err := config.DB.First(&unit, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fail(c, http.StatusNotFound, cfg.noun+" not found")
			}
			return fail(c, http.StatusBadRequest, err.Error())
		}
		if isStockManager(c) {
			cfg.pricing(&unit).Redact()
		}
		return okData(c, unit)
	}
}

func CreateUnit[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		var unit T
		if err := c.Bind(&unit); err != nil {
			return fail(c, http.StatusBadRequest, "invalid request body")
		}
		cfg.setID(&unit, 0)
		idv := strings.TrimSpace(cfg.identity(&unit))
		if idv == "" {
			return fail(c, http.StatusBadRequest, strings.ToLower(cfg.identityLabel)+" is required")
		}
		cfg.setField(&unit, cfg.identityKey, idv)
		if isStockManager(c) {
			cfg.pricing(&unit).Redact()
		}
		cfg.pricing(&unit).NormalizeToConditions()

		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&unit).Error; err != nil {
				return err
			}
			id := cfg.getID(&unit)
			if err := logChanges(tx, cfg.typeKey, id, idv, "manual", "create", actorOf(c), nil); err != nil {
				return err
			}
			return syncIssue(tx, cfg.typeKey, id, idv, missingFieldKeys(cfg.fields(&unit)))
		}); err != nil {
			return fail(c, http.StatusBadRequest, "could not create "+cfg.noun+": "+err.Error())
		}
		return c.JSON(http.StatusCreated, map[string]interface{}{"success": true, "data": unit})
	}
}

func UpdateUnit[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			return fail(c, http.StatusBadRequest, "invalid id")
		}
		var unit T
		if err := config.DB.First(&unit, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fail(c, http.StatusNotFound, cfg.noun+" not found")
			}
			return fail(c, http.StatusBadRequest, err.Error())
		}
		// Snapshot old field values + prices BEFORE bind (bind reuses pointers).
		oldFields := changeFields(cfg, &unit)
		oldNew := copyFloatPtr(cfg.pricing(&unit).PriceNew)
		oldRef := copyFloatPtr(cfg.pricing(&unit).PriceRefurbished)

		if err := c.Bind(&unit); err != nil {
			return fail(c, http.StatusBadRequest, "invalid request body")
		}
		cfg.setID(&unit, uint(id))
		idv := strings.TrimSpace(cfg.identity(&unit))
		if idv == "" {
			return fail(c, http.StatusBadRequest, strings.ToLower(cfg.identityLabel)+" is required")
		}
		cfg.setField(&unit, cfg.identityKey, idv)
		p := cfg.pricing(&unit)
		if isStockManager(c) {
			p.PriceNew, p.PriceRefurbished = oldNew, oldRef
		}
		p.NormalizeToConditions()

		changes := diffFields(oldFields, changeFields(cfg, &unit))
		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Save(&unit).Error; err != nil {
				return err
			}
			if err := logChanges(tx, cfg.typeKey, uint(id), idv, "manual", "update", actorOf(c), changes); err != nil {
				return err
			}
			return syncIssue(tx, cfg.typeKey, uint(id), idv, missingFieldKeys(cfg.fields(&unit)))
		}); err != nil {
			return fail(c, http.StatusBadRequest, "could not update "+cfg.noun+": "+err.Error())
		}
		if isStockManager(c) {
			cfg.pricing(&unit).Redact()
		}
		return okData(c, unit)
	}
}

func DeleteUnit[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			return fail(c, http.StatusBadRequest, "invalid id")
		}
		var unit T
		if err := config.DB.First(&unit, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fail(c, http.StatusNotFound, cfg.noun+" not found")
			}
			return fail(c, http.StatusBadRequest, err.Error())
		}
		label := cfg.identity(&unit)
		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Delete(&unit).Error; err != nil {
				return err
			}
			if err := logChanges(tx, cfg.typeKey, uint(id), label, "manual", "delete", actorOf(c), nil); err != nil {
				return err
			}
			return syncIssue(tx, cfg.typeKey, uint(id), label, nil) // resolve any open issue
		}); err != nil {
			return fail(c, http.StatusBadRequest, "could not delete "+cfg.noun+": "+err.Error())
		}
		return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "message": cfg.noun + " deleted"})
	}
}

func BulkDeleteUnits[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		var body struct {
			IDs []uint `json:"ids"`
		}
		if err := c.Bind(&body); err != nil {
			return fail(c, http.StatusBadRequest, "invalid request body")
		}
		if len(body.IDs) == 0 {
			return fail(c, http.StatusBadRequest, "no ids provided")
		}
		var units []T
		config.DB.Where("id IN ?", body.IDs).Find(&units)
		var deleted int64
		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			res := tx.Where("id IN ?", body.IDs).Delete(new(T))
			if res.Error != nil {
				return res.Error
			}
			deleted = res.RowsAffected
			for i := range units {
				id := cfg.getID(&units[i])
				label := cfg.identity(&units[i])
				if err := logChanges(tx, cfg.typeKey, id, label, "manual", "delete", actorOf(c), nil); err != nil {
					return err
				}
				if err := syncIssue(tx, cfg.typeKey, id, label, nil); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return fail(c, http.StatusBadRequest, "could not delete "+cfg.noun+"s: "+err.Error())
		}
		return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "deleted": deleted})
	}
}

// ---- Import / template -------------------------------------------------------

func DownloadProductTemplate[T any](cfg UnitCfg[T]) echo.HandlerFunc {
	return func(c echo.Context) error {
		csvData := strings.Join(cfg.templateHdrs, ",") + "\r\n"
		c.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+cfg.templateName+`"`)
		return c.Blob(http.StatusOK, "text/csv; charset=utf-8", []byte(csvData))
	}
}

func ImportUnits[T any](cfg UnitCfg[T]) echo.HandlerFunc {
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

		parsedUnits, skipped, err := parseUnits(cfg, ext, src)
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

		for i := range parsedUnits {
			in := &parsedUnits[i]
			key := normModel(cfg.identity(in))
			if ex, ok := byKey[key]; ok {
				if changes := applyImport(cfg, ex, in); len(changes) > 0 {
					changedRows[ex] = append(changedRows[ex], changes...)
					updated++
				} else {
					skipped++
				}
				continue
			}
			if nw, ok := newByKey[key]; ok {
				// Duplicate of a model new in this file — merge data into the pending
				// record. Still a duplicate row → skipped, not updated.
				applyImport(cfg, nw, in)
				skipped++
				continue
			}
			rec := *in
			newByKey[key] = &rec
			inserts = append(inserts, &rec)
			inserted++
		}

		issues := 0
		if err := config.DB.Transaction(func(tx *gorm.DB) error {
			for ex, changes := range changedRows {
				if err := tx.Save(ex).Error; err != nil {
					return err
				}
				id := cfg.getID(ex)
				label := cfg.identity(ex)
				if err := logChanges(tx, cfg.typeKey, id, label, "import", "update", actorOf(c), changes); err != nil {
					return err
				}
				missing := missingFieldKeys(cfg.fields(ex))
				if len(missing) > 0 {
					issues++
				}
				if err := syncIssue(tx, cfg.typeKey, id, label, missing); err != nil {
					return err
				}
			}
			for _, rec := range inserts {
				if err := tx.Create(rec).Error; err != nil {
					return err
				}
				id := cfg.getID(rec)
				label := cfg.identity(rec)
				if err := logChanges(tx, cfg.typeKey, id, label, "import", "create", actorOf(c), nil); err != nil {
					return err
				}
				missing := missingFieldKeys(cfg.fields(rec))
				if len(missing) > 0 {
					issues++
				}
				if err := syncIssue(tx, cfg.typeKey, id, label, missing); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return fail(c, http.StatusBadRequest, "import failed during save: "+err.Error())
		}

		return c.JSON(http.StatusOK, map[string]interface{}{
			"success": true, "inserted": inserted, "updated": updated, "skipped": skipped, "issues": issues,
		})
	}
}

// applyImport copies non-empty, differing data fields from incoming onto existing
// (identity/condition/price/remark untouched) and returns the changes.
func applyImport[T any](cfg UnitCfg[T], existing, incoming *T) []FieldChange {
	inMap := make(map[string]FieldKV)
	for _, f := range cfg.fields(incoming) {
		inMap[f.Key] = f
	}
	var changes []FieldChange
	for _, ef := range cfg.fields(existing) {
		nf := inMap[ef.Key]
		v := strings.TrimSpace(nf.Value)
		if v != "" && v != ef.Value {
			cfg.setField(existing, ef.Key, v)
			changes = append(changes, FieldChange{Field: ef.Label, Old: ef.Value, New: v})
		}
	}
	return changes
}

// parseUnits reads an uploaded sheet into units, requiring the identity column.
// Returns the units and a count of content rows skipped for lacking an identity.
func parseUnits[T any](cfg UnitCfg[T], ext string, r io.Reader) ([]T, int, error) {
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
	for i, h := range header {
		if key, ok := cfg.headerToField[normalizeHeader(h)]; ok {
			colMap[i] = key
		}
	}
	if !containsValue(colMap, cfg.identityKey) {
		return nil, 0, fmt.Errorf("no %s column found in header row", cfg.identityLabel)
	}

	skipped := 0
	var units []T
	for ri := 1; ri < len(rows); ri++ {
		row := rows[ri]
		if isEmptyRow(row) {
			continue
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
