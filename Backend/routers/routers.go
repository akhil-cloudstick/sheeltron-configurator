package routers

import (
	"net/http"

	stockrouters "configurator/modules/stock/routers"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// InitRoutes wires global middleware and registers every module's routes.
// Add new modules here (e.g. stockrouters.RegisterCpuRoutes(e)).
func InitRoutes(e *echo.Echo) {
	// No request logger — keep the terminal quiet. Only panics (Recover) and
	// anything we log explicitly should appear. Add middleware.Logger() back
	// temporarily when debugging request flow.
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{"success": true, "status": "ok"})
	})

	// Stock module
	stockrouters.RegisterServerRoutes(e)       // chassis (server_units)
	stockrouters.RegisterProductRoutes(e)      // processor / memory / ssd / hdd
	stockrouters.RegisterAuditRoutes(e)        // import issues + change logs
	stockrouters.RegisterConfiguratorRoutes(e) // salesman configurator filters + quotes
}
