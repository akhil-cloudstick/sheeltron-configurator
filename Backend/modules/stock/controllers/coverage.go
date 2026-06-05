package controllers

import (
	"net/http"
	"regexp"
	"sort"
	"strings"

	"configurator/config"
	"configurator/modules/stock/models"

	"github.com/labstack/echo/v4"
)

// ============================================================================
// Coverage dashboard (super-admin / admin) — GET /api/stock/coverage.
//
// Aggregates the enriched stock tables into the "Coverage by socket" view ported
// from the Corelation/ explorer: the CPU↔Chassis socket matrix plus the coverage
// cards. Counts exclude needs_review rows; CPU counts also exclude non-server parts.
// All numbers come from the live DB (no demo data) and carry no prices.
// ============================================================================

type coverageBar struct {
	Label string `json:"label"`
	Count int    `json:"count"`
}

type socketRow struct {
	Socket  string `json:"socket"`
	Cpus    int    `json:"cpus"`
	Chassis int    `json:"chassis"`
	Status  string `json:"status"` // "ok" | "no_cpus" (chassis present but no compatible CPU)
}

// pcCodeToMTs maps DDR2/3 bandwidth codes (PCx-NNNNN) to their MT/s data rate.
var pcCodeToMTs = map[string]string{
	"4200": "533", "5300": "667", "6400": "800",
	"8500": "1066", "10600": "1333", "12800": "1600", "14900": "1866",
	"17000": "2133", "19200": "2400", "21300": "2666", "23400": "2933", "25600": "3200",
}

// ddrSpeeds are the standard DDR4/5 MT/s tokens that appear directly in product names.
var ddrSpeeds = []string{
	"8800", "8400", "8000", "7200", "6400", "6000", "5600", "5200", "4800",
	"4400", "4000", "3600", "3200", "2933", "2666", "2400", "2133", "1866", "1600", "1333", "1066",
}

var pcCodeRe = regexp.MustCompile(`PC[2-5]L?[ -]?(\d{4,5})`)

// deriveRamSpeed best-effort extracts the MT/s data rate from a memory product name
// (DDR4/5 carry it directly, e.g. "PC4 2666V"; DDR2/3 carry the bandwidth code).
func deriveRamSpeed(name string) string {
	u := strings.ToUpper(name)
	if m := pcCodeRe.FindStringSubmatch(u); m != nil {
		if v, ok := pcCodeToMTs[m[1]]; ok {
			return v
		}
	}
	for _, s := range ddrSpeeds {
		if strings.Contains(u, s) {
			return s
		}
	}
	return "(unknown)"
}

// bars turns a tally map into a count-desc (then label-asc) sorted slice.
func bars(m map[string]int) []coverageBar {
	out := make([]coverageBar, 0, len(m))
	for k, v := range m {
		out = append(out, coverageBar{Label: k, Count: v})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Label < out[j].Label
	})
	return out
}

// GetCoverage — GET /api/stock/coverage
func GetCoverage(c echo.Context) error {
	var cpus []models.CpuUnit
	if err := config.DB.Find(&cpus).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read processors: "+err.Error())
	}
	var chassis []models.ServerUnit
	if err := config.DB.Find(&chassis).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read chassis: "+err.Error())
	}
	var rams []models.RamUnit
	if err := config.DB.Find(&rams).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read memory: "+err.Error())
	}
	var ssds []models.SsdUnit
	if err := config.DB.Find(&ssds).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read SSDs: "+err.Error())
	}
	var hdds []models.HddUnit
	if err := config.DB.Find(&hdds).Error; err != nil {
		return fail(c, http.StatusBadRequest, "could not read HDDs: "+err.Error())
	}

	cpuBySocket := map[string]int{}
	for i := range cpus {
		u := &cpus[i]
		if u.NeedsReview || !u.IsServer {
			continue
		}
		if s := strings.TrimSpace(u.Socket); s != "" {
			cpuBySocket[s]++
		}
	}

	chassisBySocket := map[string]int{}
	byBrand := map[string]int{}
	byRam := map[string]int{}
	byFf := map[string]int{}
	for i := range chassis {
		u := &chassis[i]
		if u.NeedsReview {
			continue
		}
		if s := strings.TrimSpace(u.CpuSocket); s != "" {
			chassisBySocket[s]++
		}
		if b := strings.TrimSpace(u.Brand); b != "" {
			byBrand[b]++
		}
		if r := strings.TrimSpace(u.RamType); r != "" {
			byRam[r]++
		}
		ff := strings.TrimSpace(u.DriveFormFactors)
		if ff == "" {
			byFf["(none)"]++
		} else {
			for _, part := range strings.Split(ff, ";") {
				p := strings.TrimSpace(part)
				if p == "" {
					p = "(none)"
				}
				byFf[p]++
			}
		}
	}

	byGen := map[string]int{}
	bySpeed := map[string]int{}
	for i := range rams {
		u := &rams[i]
		if u.NeedsReview {
			continue
		}
		g := strings.TrimSpace(u.RamType)
		if g == "" {
			g = strings.TrimSpace(u.Generation)
		}
		if g != "" {
			byGen[g]++
		}
		bySpeed[deriveRamSpeed(u.ProductName)]++
	}

	// Storage = SSD + HDD merged. Type is NVMe when the interface says so, else the kind.
	byStType := map[string]int{}
	byStFf := map[string]int{}
	byStIface := map[string]int{}
	addStorage := func(kind, iface, ff string, review bool) {
		if review {
			return
		}
		iface = strings.TrimSpace(iface)
		t := kind
		if strings.EqualFold(iface, "NVMe") {
			t = "NVMe"
		}
		byStType[t]++
		if ff = strings.TrimSpace(ff); ff != "" {
			byStFf[ff]++
		} else {
			byStFf["(none)"]++
		}
		if iface != "" {
			byStIface[iface]++
		} else {
			byStIface["(none)"]++
		}
	}
	for i := range ssds {
		addStorage("SSD", ssds[i].Interface, ssds[i].FormFactor, ssds[i].NeedsReview)
	}
	for i := range hdds {
		addStorage("HDD", hdds[i].Interface, hdds[i].FormFactor, hdds[i].NeedsReview)
	}

	// Socket matrix = union of CPU sockets and chassis sockets, sorted by name.
	socketSet := map[string]bool{}
	for s := range cpuBySocket {
		socketSet[s] = true
	}
	for s := range chassisBySocket {
		socketSet[s] = true
	}
	sockets := make([]string, 0, len(socketSet))
	for s := range socketSet {
		sockets = append(sockets, s)
	}
	sort.Strings(sockets)

	matrix := make([]socketRow, 0, len(sockets))
	for _, s := range sockets {
		cp, ch := cpuBySocket[s], chassisBySocket[s]
		status := "ok"
		if ch > 0 && cp == 0 {
			status = "no_cpus"
		}
		matrix = append(matrix, socketRow{Socket: s, Cpus: cp, Chassis: ch, Status: status})
	}

	return okData(c, map[string]interface{}{
		"socket_matrix":          matrix,
		"chassis_by_brand":       bars(byBrand),
		"chassis_by_ram_type":    bars(byRam),
		"chassis_by_form_factor": bars(byFf),
		"ram_by_generation":      bars(byGen),
		"ram_by_speed":           bars(bySpeed),
		"storage_by_type":        bars(byStType),
		"storage_by_form_factor": bars(byStFf),
		"storage_by_interface":   bars(byStIface),
	})
}
