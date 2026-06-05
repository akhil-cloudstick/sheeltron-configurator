package main

import (
	"os"

	"configurator/config"
	"configurator/routers"

	"github.com/labstack/echo/v4"
)

func main() {
	config.InitDB()

	e := echo.New()
	routers.InitRoutes(e)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
