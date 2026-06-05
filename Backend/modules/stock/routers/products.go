package routers

import (
	"configurator/modules/stock/controllers"

	"github.com/labstack/echo/v4"
)

// registerProduct wires the 8 standard stock endpoints for one generic product type.
func registerProduct[T any](e *echo.Echo, base string, cfg controllers.UnitCfg[T]) {
	g := e.Group(base)
	g.GET("", controllers.ListUnits(cfg))
	g.GET("/:id", controllers.GetUnit(cfg))
	g.POST("", controllers.CreateUnit(cfg))
	g.PUT("/:id", controllers.UpdateUnit(cfg))
	g.DELETE("/:id", controllers.DeleteUnit(cfg))
	g.POST("/bulk-delete", controllers.BulkDeleteUnits(cfg))
	g.POST("/import", controllers.ImportUnits(cfg))
	g.GET("/template.csv", controllers.DownloadProductTemplate(cfg))

	// Correlation import (super-admin only): enrich rows with derived compatibility keys.
	g.POST("/import-correlation", controllers.ImportCorrelation(cfg), controllers.RequireSuperAdmin)
	g.GET("/correlation-template.csv", controllers.DownloadCorrelationTemplate(cfg))
}

// RegisterProductRoutes wires the generic stock product types (processor/memory/ssd/hdd).
// Chassis has its own RegisterServerRoutes (it carries a workflow status).
func RegisterProductRoutes(e *echo.Echo) {
	registerProduct(e, "/api/stock/processor", controllers.CpuCfg)
	registerProduct(e, "/api/stock/memory", controllers.RamCfg)
	registerProduct(e, "/api/stock/ssd", controllers.SsdCfg)
	registerProduct(e, "/api/stock/hdd", controllers.HddCfg)

	// Cross-type bulk price adjustment (admin only; records to the change-log).
	e.POST("/api/stock/bulk-price", controllers.BulkPriceUpdate)

	// Coverage dashboard (CPU↔chassis socket matrix + cards) — computed from the
	// enriched tables; read-only, no prices.
	e.GET("/api/stock/coverage", controllers.GetCoverage)
}

// RegisterAuditRoutes wires the cross-cutting import Issues + Change-logs endpoints.
func RegisterAuditRoutes(e *echo.Echo) {
	e.GET("/api/issues", controllers.ListIssues)
	e.GET("/api/change-logs", controllers.ListChangeLogs)
}
