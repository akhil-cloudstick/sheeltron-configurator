package controllers

import "configurator/modules/stock/models"

// CpuCfg wires the generic engine for processor stock. Deduped by model; no status.
var CpuCfg = UnitCfg[models.CpuUnit]{
	typeKey:       "cpu",
	noun:          "processor",
	identityKey:   "model",
	identityLabel: "MODEL",
	templateName:  "processor_stock_template.csv",
	searchCols:    []string{"model", "brand", "family", "series"},
	templateHdrs: []string{
		"TYPE", "FAMILY", "SERIES", "BRAND", "MODEL", "CORES",
		"TOTAL THREADS", "BASE FREQUENCY", "MAX TURBO FREQUENCY", "CACHE MEMORY",
	},
	headerToField: map[string]string{
		"type":              "type",
		"family":            "family",
		"series":            "series",
		"brand":             "brand",
		"model":             "model",
		"cores":             "cores",
		"totalthreads":      "total_threads", "threads": "total_threads",
		"basefrequency":     "base_frequency", "basefreq": "base_frequency",
		"maxturbofrequency": "max_turbo_frequency", "maxturbofreq": "max_turbo_frequency", "turbofrequency": "max_turbo_frequency",
		"cachememory":       "cache_memory", "cache": "cache_memory",
	},
	// Correlation import: derived socket + flags from Corelation/cpus.csv.
	corrTemplateName: "processor_correlation_template.csv",
	corrTemplateHdrs: []string{"MODEL", "SOCKET", "IS SERVER", "NEEDS REVIEW", "SOCKET NOTE"},
	corrHeaderToField: map[string]string{
		"model":       "model",
		"socket":      "socket",
		"isserver":    "is_server",
		"needsreview": "needs_review",
		"socketnote":  "socket_note",
	},
	corrFields: func(u *models.CpuUnit) []FieldKV {
		return []FieldKV{
			{"socket", "Socket", u.Socket},
			{"is_server", "Is server", yesNo(u.IsServer)},
			{"needs_review", "Needs review", yesNo(u.NeedsReview)},
			{"socket_note", "Socket note", u.SocketNote},
		}
	},
	setField: func(u *models.CpuUnit, key, val string) {
		switch key {
		case "type":
			u.Type = val
		case "family":
			u.Family = val
		case "series":
			u.Series = val
		case "brand":
			u.Brand = val
		case "model":
			u.Model = val
		case "cores":
			u.Cores = val
		case "total_threads":
			u.TotalThreads = val
		case "base_frequency":
			u.BaseFrequency = val
		case "max_turbo_frequency":
			u.MaxTurboFrequency = val
		case "cache_memory":
			u.CacheMemory = val
		case "socket":
			u.Socket = val
		case "is_server":
			u.IsServer = corrBool(val)
		case "needs_review":
			u.NeedsReview = corrBool(val)
		case "socket_note":
			u.SocketNote = val
		}
	},
	fields: func(u *models.CpuUnit) []FieldKV {
		return []FieldKV{
			{"type", "Type", u.Type},
			{"family", "Family", u.Family},
			{"series", "Series", u.Series},
			{"brand", "Brand", u.Brand},
			{"cores", "Cores", u.Cores},
			{"total_threads", "Total threads", u.TotalThreads},
			{"base_frequency", "Base frequency", u.BaseFrequency},
			{"max_turbo_frequency", "Max turbo frequency", u.MaxTurboFrequency},
			{"cache_memory", "Cache memory", u.CacheMemory},
		}
	},
	identity:  func(u *models.CpuUnit) string { return u.Model },
	pricing:   func(u *models.CpuUnit) *models.Pricing { return &u.Pricing },
	getRemark: func(u *models.CpuUnit) string { return u.Remark },
	getID:     func(u *models.CpuUnit) uint { return u.ID },
	setID:     func(u *models.CpuUnit, id uint) { u.ID = id },
}
