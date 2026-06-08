package controllers

import (
	"net/http"
	"strings"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
)

// ============================================================================
// Salesman configurator — read-only compatibility filtering (done server-side).
//
// The wizard narrows processor-first: pick a CPU (fixes a socket) → chassis whose
// cpu_socket matches → RAM whose ram_type matches the chassis → storage whose form
// factor the chassis accepts. needs_review rows are always excluded. Each catalog row
// is SPLIT BY CONDITION into ConfigOption entries so a part sold as both New and
// Refurbished appears twice with its own price. Salesman sees prices (redaction only
// fires for stock_manager), so no redaction here.
// ============================================================================

// ConfigOption is one selectable line in the wizard (a catalog row × one condition).
type ConfigOption struct {
	StockID   uint     `json:"stock_id"`
	Kind      string   `json:"kind"` // cpu | chassis | ram | ssd | hdd
	Brand     string   `json:"brand"`
	Label     string   `json:"label"`     // model / product_name
	Condition string   `json:"condition"` // new | refurbished | unset
	Price     *float64 `json:"price"`

	// Optional display / facet fields (only the ones relevant to the kind are set).
	Socket              string `json:"socket,omitempty"`
	Family              string `json:"family,omitempty"`
	Series              string `json:"series,omitempty"`
	Cores               string `json:"cores,omitempty"`
	Threads             string `json:"threads,omitempty"`
	RamType             string `json:"ram_type,omitempty"`
	DriveFormFactors    string `json:"drive_form_factors,omitempty"`
	MaxSockets          *int   `json:"max_sockets,omitempty"`
	MaxDimmSlots        *int   `json:"max_dimm_slots,omitempty"`
	MaxMemoryGB         *int   `json:"max_memory_gb,omitempty"`
	DriveBays           *int   `json:"drive_bays,omitempty"`
	SupportedInterfaces string `json:"supported_interfaces,omitempty"`
	Capacity            string `json:"capacity,omitempty"`
	CapacityGB          *int   `json:"capacity_gb,omitempty"`
	Speed               string `json:"speed,omitempty"`
	Interface           string `json:"interface,omitempty"`
	FormFactor          string `json:"form_factor,omitempty"`
	Type                string `json:"type,omitempty"` // storage: HDD | SSD | NVMe
}

// splitByCondition expands a base option into one entry per available condition (or a
// single "unset" entry when neither condition is set, so the row stays selectable).
func splitByCondition(base ConfigOption, p models.Pricing) []ConfigOption {
	var out []ConfigOption
	if p.ConditionNew {
		e := base
		e.Condition = "new"
		e.Price = p.PriceNew
		out = append(out, e)
	}
	if p.ConditionRefurbished {
		e := base
		e.Condition = "refurbished"
		e.Price = p.PriceRefurbished
		out = append(out, e)
	}
	if len(out) == 0 {
		e := base
		e.Condition = "unset"
		e.Price = nil
		out = append(out, e)
	}
	return out
}

func configOK(c echo.Context, opts []ConfigOption) error {
	if opts == nil {
		opts = []ConfigOption{}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "data": opts})
}

// GET /api/configurator/processors — server CPUs (compatibility starting point).
func ConfigProcessors(c echo.Context) error {
	var rows []models.CpuUnit
	if err := config.DB.Where("is_server = ? AND needs_review = ?", true, false).
		Order("family, model").Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load processors: "+err.Error())
	}
	var out []ConfigOption
	for i := range rows {
		u := &rows[i]
		if strings.TrimSpace(u.Socket) == "" {
			continue // can't anchor a build without a socket
		}
		base := ConfigOption{
			StockID: u.ID, Kind: "cpu", Brand: u.Brand, Label: u.Model,
			Socket: u.Socket, Family: u.Family, Series: u.Series,
			Cores: u.Cores, Threads: u.TotalThreads,
		}
		out = append(out, splitByCondition(base, u.Pricing)...)
	}
	return configOK(c, out)
}

// GET /api/configurator/chassis?socket=LGA4677 — chassis matching the CPU socket.
func ConfigChassis(c echo.Context) error {
	socket := strings.TrimSpace(c.QueryParam("socket"))
	if socket == "" {
		return fail(c, http.StatusBadRequest, "socket is required")
	}
	var rows []models.ServerUnit
	// Only chassis the wizard can fully constrain a build on: the spec fields the
	// downstream RAM/storage steps depend on must all be present (a missing one would
	// leave RAM caps or the storage interface filter unbounded). datasheet must be a
	// real path (the correlation dataset uses "none" for rows it couldn't source).
	if err := config.DB.Where(
		"cpu_socket = ? AND needs_review = ? AND max_dimm_slots IS NOT NULL AND "+
			"max_memory_gb IS NOT NULL AND supported_interfaces <> '' AND "+
			"datasheet <> '' AND lower(datasheet) <> 'none'", socket, false).
		Order("brand, model").Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load chassis: "+err.Error())
	}
	var out []ConfigOption
	for i := range rows {
		u := &rows[i]
		base := ConfigOption{
			StockID: u.ID, Kind: "chassis", Brand: u.Brand, Label: u.Model,
			Socket: u.CpuSocket, RamType: u.RamType, DriveFormFactors: u.DriveFormFactors,
			MaxSockets: u.MaxSockets, MaxDimmSlots: u.MaxDimmSlots, MaxMemoryGB: u.MaxMemoryGB,
			DriveBays: u.DriveBays, SupportedInterfaces: u.SupportedInterfaces,
		}
		out = append(out, splitByCondition(base, u.Pricing)...)
	}
	return configOK(c, out)
}

// GET /api/configurator/memory?ram_type=DDR4 — RAM matching the chassis DDR generation.
func ConfigMemory(c echo.Context) error {
	ramType := strings.TrimSpace(c.QueryParam("ram_type"))
	if ramType == "" {
		return fail(c, http.StatusBadRequest, "ram_type is required")
	}
	var rows []models.RamUnit
	// ram_type mirrors generation; match either (correlation import may fill only one).
	if err := config.DB.Where(
		"COALESCE(NULLIF(ram_type, ''), generation) = ? AND needs_review = ?", ramType, false).
		Order("memory_brand, capacity").Find(&rows).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load memory: "+err.Error())
	}
	var out []ConfigOption
	for i := range rows {
		u := &rows[i]
		rt := u.RamType
		if rt == "" {
			rt = u.Generation
		}
		base := ConfigOption{
			StockID: u.ID, Kind: "ram", Brand: u.MemoryBrand, Label: u.ProductName,
			RamType: rt, Capacity: u.Capacity, CapacityGB: u.CapacityGB,
			Speed: deriveRamSpeed(u.ProductName),
		}
		out = append(out, splitByCondition(base, u.Pricing)...)
	}
	return configOK(c, out)
}

// GET /api/configurator/storage?form_factors=2.5" SFF;3.5" LFF — SSD+HDD by form factor.
// When the chassis has no form-factor data, all drives are returned (handoff rule).
func ConfigStorage(c echo.Context) error {
	raw := strings.TrimSpace(c.QueryParam("form_factors"))
	allowed := map[string]bool{}
	for _, ff := range strings.Split(raw, ";") {
		if ff = strings.TrimSpace(ff); ff != "" {
			allowed[ff] = true
		}
	}
	keep := func(ff string) bool { return len(allowed) == 0 || allowed[strings.TrimSpace(ff)] }

	// Drive interfaces the chassis accepts (e.g. "SATA;SAS;NVMe"). Empty → allow all,
	// matching the form-factor handoff rule. Matched case-insensitively.
	rawIface := strings.TrimSpace(c.QueryParam("supported_interfaces"))
	allowedIface := map[string]bool{}
	for _, ifc := range strings.Split(rawIface, ";") {
		if ifc = strings.TrimSpace(ifc); ifc != "" {
			allowedIface[strings.ToLower(ifc)] = true
		}
	}
	keepIface := func(ifc string) bool {
		return len(allowedIface) == 0 || allowedIface[strings.ToLower(strings.TrimSpace(ifc))]
	}

	var out []ConfigOption
	var ssds []models.SsdUnit
	if err := config.DB.Where("needs_review = ?", false).Order("ssd_brand, capacity").Find(&ssds).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load SSDs: "+err.Error())
	}
	for i := range ssds {
		u := &ssds[i]
		if !keep(u.FormFactor) || !keepIface(u.Interface) {
			continue
		}
		base := ConfigOption{
			StockID: u.ID, Kind: "ssd", Brand: u.SsdBrand, Label: u.ProductName,
			Capacity: u.Capacity, CapacityGB: u.CapacityGB, Speed: u.Speed, Interface: u.Interface,
			FormFactor: u.FormFactor, Type: storageType("SSD", u.Interface),
		}
		out = append(out, splitByCondition(base, u.Pricing)...)
	}
	var hdds []models.HddUnit
	if err := config.DB.Where("needs_review = ?", false).Order("hdd_brand, capacity").Find(&hdds).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not load HDDs: "+err.Error())
	}
	for i := range hdds {
		u := &hdds[i]
		if !keep(u.FormFactor) || !keepIface(u.Interface) {
			continue
		}
		base := ConfigOption{
			StockID: u.ID, Kind: "hdd", Brand: u.HddBrand, Label: u.ProductName,
			Capacity: u.Capacity, CapacityGB: u.CapacityGB, Speed: u.Speed, Interface: u.Interface,
			FormFactor: u.FormFactor, Type: storageType("HDD", u.Interface),
		}
		out = append(out, splitByCondition(base, u.Pricing)...)
	}
	return configOK(c, out)
}

func storageType(kind, iface string) string {
	if strings.EqualFold(strings.TrimSpace(iface), "NVMe") {
		return "NVMe"
	}
	return kind
}
