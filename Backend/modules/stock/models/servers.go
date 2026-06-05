package models

import "time"

// ServerUnit is one physical chassis in the warehouse. Units are keyed by MODEL
// at import time (deduped); the DB id is the only unique identifier — there is no
// serial number. The schema is owned by migrations/ — GORM is used for queries only.
type ServerUnit struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	Brand       string    `gorm:"column:brand" json:"brand"`
	Model       string    `gorm:"column:model" json:"model"`
	Motherboard string    `gorm:"column:motherboard" json:"motherboard"`
	HeatSink    string    `gorm:"column:heat_sink" json:"heat_sink"`
	Fan         string    `gorm:"column:fan" json:"fan"`
	RaidCard    string    `gorm:"column:raid_card" json:"raid_card"`
	Cards       string    `gorm:"column:cards" json:"cards"`
	Riser1      string    `gorm:"column:riser_1" json:"riser_1"`
	Riser2      string    `gorm:"column:riser_2" json:"riser_2"`
	Riser3      string    `gorm:"column:riser_3" json:"riser_3"`
	BackPlane   string    `gorm:"column:back_plane" json:"back_plane"`
	PowerSupply string    `gorm:"column:power_supply" json:"power_supply"`
	Status      string    `gorm:"column:status;default:need_check" json:"status"`
	// Compatibility keys derived in Corelation/ (written by the super-admin correlation
	// import; used by the configurator to filter and by the coverage dashboard).
	ModelFamily      string `gorm:"column:model_family" json:"model_family"`
	CpuSocket        string `gorm:"column:cpu_socket" json:"cpu_socket"`
	MaxSockets       *int   `gorm:"column:max_sockets" json:"max_sockets"`
	RamType          string `gorm:"column:ram_type" json:"ram_type"`
	DriveFormFactors string `gorm:"column:drive_form_factors" json:"drive_form_factors"`
	Datasheet        string `gorm:"column:datasheet" json:"datasheet"`
	Source           string `gorm:"column:source" json:"source"`
	IsServer         bool   `gorm:"column:is_server;default:true" json:"is_server"`
	NeedsReview      bool   `gorm:"column:needs_review;default:false" json:"needs_review"`
	CompatNote       string `gorm:"column:compat_note" json:"compat_note"`
	// Shared multi-condition pricing (condition_new/refurbished + price_new/refurbished).
	// Conditions are set manually in the UI (never imported); prices are admin-only.
	Pricing
	Remark      string    `gorm:"column:remark" json:"remark"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName pins the table name regardless of GORM's pluralizer.
func (ServerUnit) TableName() string { return "server_units" }

// Lifecycle states for a unit (matches data_model.md unit_status).
const (
	StatusNeedCheck = "need_check"
	StatusTesting   = "testing"
	StatusReady     = "ready"
	StatusReserved  = "reserved"
	StatusShipped   = "shipped"
	StatusRMA       = "rma"
	StatusScrap     = "scrap"
)

// ValidStatuses is the allowed set for the status column.
var ValidStatuses = map[string]bool{
	StatusNeedCheck: true,
	StatusTesting:   true,
	StatusReady:     true,
	StatusReserved:  true,
	StatusShipped:   true,
	StatusRMA:       true,
	StatusScrap:     true,
}

// IsValidStatus reports whether s is an allowed status value.
func IsValidStatus(s string) bool { return ValidStatuses[s] }
