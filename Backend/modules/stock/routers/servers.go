package routers

import (
	"configurator/modules/stock/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterServerRoutes wires the server-stock endpoints under /api/stock/servers.
// Future stock types get their own RegisterXxxRoutes in this package
// (e.g. /api/stock/cpus, /api/stock/ram).
func RegisterServerRoutes(e *echo.Echo) {
	g := e.Group("/api/stock/servers")

	g.GET("", controllers.ListServerUnits)
	g.GET("/:id", controllers.GetServerUnit)
	g.POST("", controllers.CreateServerUnit)
	g.PUT("/:id", controllers.UpdateServerUnit)
	g.DELETE("/:id", controllers.DeleteServerUnit)
	g.POST("/bulk-delete", controllers.BulkDeleteServerUnits)

	g.POST("/import", controllers.ImportServerUnits)
	g.GET("/template.csv", controllers.DownloadTemplate)

	// Correlation import (super-admin only): enrich chassis with derived compatibility keys.
	g.POST("/import-correlation", controllers.ImportCorrelation(controllers.ServerCorrCfg), controllers.RequireSuperAdmin)
	g.GET("/correlation-template.csv", controllers.DownloadCorrelationTemplate(controllers.ServerCorrCfg))
}
