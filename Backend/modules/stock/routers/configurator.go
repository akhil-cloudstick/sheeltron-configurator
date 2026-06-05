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

	// Quotes: salesman creates; admin/super_admin review.
	e.POST("/api/quotes", controllers.CreateQuote, controllers.RequireRole("salesman"))
	e.GET("/api/quotes", controllers.ListQuotes, controllers.RequireRole("admin", "super_admin"))
	e.GET("/api/quotes/:id", controllers.GetQuote, controllers.RequireRole("admin", "super_admin"))
}
