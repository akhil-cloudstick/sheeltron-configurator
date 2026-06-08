package controllers

import (
	"strconv"
	"strings"

	"configurator/modules/stock/models"
)

// ServerCorrCfg adapts the chassis (server_units) table to the generic correlation
// importer. Chassis keeps its bespoke status-bearing controller for normal stock CRUD,
// but the correlation import only writes the derived compatibility keys (matched by
// model), so it can reuse ImportCorrelation / DownloadCorrelationTemplate. Only the
// closures those handlers touch are populated.
var ServerCorrCfg = UnitCfg[models.ServerUnit]{
	typeKey:       "chassis",
	noun:          "chassis",
	identityKey:   "model",
	identityLabel: "MODEL",
	corrTemplateName: "chassis_correlation_template.csv",
	corrTemplateHdrs: []string{
		"MODEL", "MODEL FAMILY", "CPU SOCKET", "MAX SOCKETS", "RAM TYPE",
		"MAX DIMM SLOTS", "MAX MEMORY GB", "DRIVE FORM FACTORS", "DRIVE BAYS",
		"SUPPORTED INTERFACES", "DATASHEET", "SOURCE", "IS SERVER", "NEEDS REVIEW", "NOTE",
	},
	corrHeaderToField: map[string]string{
		"model":               "model",
		"modelfamily":         "model_family",
		"cpusocket":           "cpu_socket",
		"maxsockets":          "max_sockets",
		"ramtype":             "ram_type",
		"maxdimmslots":        "max_dimm_slots",
		"maxmemorygb":         "max_memory_gb",
		"driveformfactors":    "drive_form_factors",
		"drivebays":           "drive_bays",
		"supportedinterfaces": "supported_interfaces",
		"datasheet":           "datasheet",
		"source":              "source",
		"isserver":            "is_server",
		"needsreview":         "needs_review",
		"note":                "compat_note",
	},
	corrFields: func(u *models.ServerUnit) []FieldKV {
		return []FieldKV{
			{"model_family", "Model family", u.ModelFamily},
			{"cpu_socket", "CPU socket", u.CpuSocket},
			{"max_sockets", "Max sockets", intPtrStr(u.MaxSockets)},
			{"ram_type", "RAM type", u.RamType},
			{"max_dimm_slots", "Max DIMM slots", intPtrStr(u.MaxDimmSlots)},
			{"max_memory_gb", "Max memory (GB)", intPtrStr(u.MaxMemoryGB)},
			{"drive_form_factors", "Drive form factors", u.DriveFormFactors},
			{"drive_bays", "Drive bays", intPtrStr(u.DriveBays)},
			{"supported_interfaces", "Supported interfaces", u.SupportedInterfaces},
			{"datasheet", "Datasheet", u.Datasheet},
			{"source", "Source", u.Source},
			{"is_server", "Is server", yesNo(u.IsServer)},
			{"needs_review", "Needs review", yesNo(u.NeedsReview)},
			{"compat_note", "Note", u.CompatNote},
		}
	},
	setField: func(u *models.ServerUnit, key, val string) {
		switch key {
		case "model":
			u.Model = val
		case "model_family":
			u.ModelFamily = val
		case "cpu_socket":
			u.CpuSocket = val
		case "max_sockets":
			if n, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
				u.MaxSockets = &n
			}
		case "ram_type":
			u.RamType = val
		case "max_dimm_slots":
			if n, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
				u.MaxDimmSlots = &n
			}
		case "max_memory_gb":
			if n, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
				u.MaxMemoryGB = &n
			}
		case "drive_form_factors":
			u.DriveFormFactors = val
		case "drive_bays":
			if n, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
				u.DriveBays = &n
			}
		case "supported_interfaces":
			u.SupportedInterfaces = val
		case "datasheet":
			u.Datasheet = val
		case "source":
			u.Source = val
		case "is_server":
			u.IsServer = corrBool(val)
		case "needs_review":
			u.NeedsReview = corrBool(val)
		case "compat_note":
			u.CompatNote = val
		}
	},
	identity: func(u *models.ServerUnit) string { return u.Model },
	getID:    func(u *models.ServerUnit) uint { return u.ID },
}
