package models

import "time"

// CpuUnit is one processor product. Deduped on import by Model. No workflow status —
// only condition + prices (set manually in the UI).
type CpuUnit struct {
	ID                uint      `gorm:"column:id;primaryKey" json:"id"`
	Type              string    `gorm:"column:type" json:"type"`
	Family            string    `gorm:"column:family" json:"family"`
	Series            string    `gorm:"column:series" json:"series"`
	Brand             string    `gorm:"column:brand" json:"brand"`
	Model             string    `gorm:"column:model" json:"model"`
	Cores             string    `gorm:"column:cores" json:"cores"`
	TotalThreads      string    `gorm:"column:total_threads" json:"total_threads"`
	BaseFrequency     string    `gorm:"column:base_frequency" json:"base_frequency"`
	MaxTurboFrequency string    `gorm:"column:max_turbo_frequency" json:"max_turbo_frequency"`
	CacheMemory       string    `gorm:"column:cache_memory" json:"cache_memory"`
	// Compatibility keys derived in Corelation/ (written by the correlation import).
	Socket      string `gorm:"column:socket" json:"socket"`
	IsServer    bool   `gorm:"column:is_server;default:true" json:"is_server"`
	NeedsReview bool   `gorm:"column:needs_review;default:false" json:"needs_review"`
	SocketNote  string `gorm:"column:socket_note" json:"socket_note"`
	Pricing
	Remark    string    `gorm:"column:remark" json:"remark"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (CpuUnit) TableName() string { return "cpu_units" }
