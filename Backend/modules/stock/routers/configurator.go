package routers

import (
	"configurator/modules/stock/controllers"

	"github.com/labstack/echo/v4"
)

// RegisterConfiguratorRoutes wires the read-only salesman configurator filter endpoints
// (compatibility narrowing done server-side) and the saved-quote endpoints.
func RegisterConfiguratorRoutes(e *echo.Echo) {
	g := e.Group("/api/configurator")
	g.GET("/processors", controllers.ConfigProcessors)
	g.GET("/chassis", controllers.ConfigChassis)
	g.GET("/memory", controllers.ConfigMemory)
	g.GET("/storage", controllers.ConfigStorage)

	// Quotes: salesman creates and sees their own; admin/super_admin review all.
	e.POST("/api/quotes", controllers.CreateQuote, controllers.RequireRole("salesman"))
	e.GET("/api/quotes", controllers.ListQuotes, controllers.RequireRole("salesman", "admin", "super_admin"))
	e.GET("/api/quotes/:id", controllers.GetQuote, controllers.RequireRole("salesman", "admin", "super_admin"))

	// Compatible packs: admin/super_admin build; salesman picks; admin manages.
	e.POST("/api/packs", controllers.CreatePack, controllers.RequireRole("admin", "super_admin"))
	e.GET("/api/packs", controllers.ListPacks, controllers.RequireRole("salesman", "admin", "super_admin"))
	e.GET("/api/packs/:id", controllers.GetPack, controllers.RequireRole("salesman", "admin", "super_admin"))
	e.DELETE("/api/packs/:id", controllers.DeletePack, controllers.RequireRole("admin", "super_admin"))
}
