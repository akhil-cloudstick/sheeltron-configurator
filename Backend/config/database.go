package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	migrate "github.com/rubenv/sql-migrate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB is the shared GORM handle used by every controller (e.g. config.DB.Find(...)).
var DB *gorm.DB

// InitDB loads connection settings from the environment, opens a GORM Postgres
// connection, and runs the SQL migrations in ./migrations via sql-migrate.
//
// "Local vs shared DB" is purely the DB_HOST value — localhost for your own
// Postgres now, a server hostname later. No code change is needed to switch.
//
// Migrations are idempotent: sql-migrate records applied files in its
// gorp_migrations table, so the first boot builds the schema and later boots
// (or other apps pointed at the same shared DB) are safe no-ops.
func InitDB() {
	// Load .env for local dev; in Docker/production the env is already set.
	if err := godotenv.Load(); err != nil {
		log.Println("InitDB: no .env file found, relying on process environment")
	}

	host := getenv("DB_HOST", "localhost")
	port := getenv("DB_PORT", "5432")
	user := getenv("DB_USER", "postgres")
	password := getenv("DB_PASSWORD", "postgres")
	dbname := getenv("DB_NAME", "sheeltron")
	sslmode := getenv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Kolkata",
		host, port, user, password, dbname, sslmode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("InitDB: failed to connect to Postgres (%s:%s/%s): %v", host, port, dbname, err)
	}
	DB = db

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("InitDB: failed to get *sql.DB: %v", err)
	}

	migrations := &migrate.FileMigrationSource{Dir: "migrations"}
	n, err := migrate.Exec(sqlDB, "postgres", migrations, migrate.Up)
	if err != nil {
		log.Fatalf("InitDB: migration failed: %v", err)
	}
	log.Printf("InitDB: connected to %s:%s/%s, applied %d migration(s)", host, port, dbname, n)
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
