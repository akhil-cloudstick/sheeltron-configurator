-- +migrate Up
-- Compatibility keys derived in Configurator/Corelation/ (super-admin imports them).
-- These enrich the existing stock rows so the configurator can filter by socket / ram /
-- form-factor. Only the columns that are new per table are added here; storage tables
-- already carry interface/form_factor/speed.

-- Chassis (server_units)
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS model_family        TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS cpu_socket          TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS max_sockets         INT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS ram_type            TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS drive_form_factors  TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS datasheet           TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS source              TEXT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS is_server           BOOLEAN DEFAULT TRUE;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS needs_review        BOOLEAN DEFAULT FALSE;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS compat_note         TEXT;

-- Processors (cpu_units)
ALTER TABLE cpu_units ADD COLUMN IF NOT EXISTS socket        TEXT;
ALTER TABLE cpu_units ADD COLUMN IF NOT EXISTS is_server     BOOLEAN DEFAULT TRUE;
ALTER TABLE cpu_units ADD COLUMN IF NOT EXISTS needs_review  BOOLEAN DEFAULT FALSE;
ALTER TABLE cpu_units ADD COLUMN IF NOT EXISTS socket_note   TEXT;

-- Memory (ram_units) — ram_type mirrors the existing generation column for the wizard key
ALTER TABLE ram_units ADD COLUMN IF NOT EXISTS ram_type      TEXT;
ALTER TABLE ram_units ADD COLUMN IF NOT EXISTS needs_review  BOOLEAN DEFAULT FALSE;

-- Storage (ssd_units / hdd_units) — interface/form_factor/speed already exist
ALTER TABLE ssd_units ADD COLUMN IF NOT EXISTS needs_review  BOOLEAN DEFAULT FALSE;
ALTER TABLE hdd_units ADD COLUMN IF NOT EXISTS needs_review  BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cpu_units_socket    ON cpu_units(socket);
CREATE INDEX IF NOT EXISTS idx_server_units_socket ON server_units(cpu_socket);

-- +migrate Down
DROP INDEX IF EXISTS idx_server_units_socket;
DROP INDEX IF EXISTS idx_cpu_units_socket;

ALTER TABLE hdd_units DROP COLUMN IF EXISTS needs_review;
ALTER TABLE ssd_units DROP COLUMN IF EXISTS needs_review;

ALTER TABLE ram_units DROP COLUMN IF EXISTS needs_review;
ALTER TABLE ram_units DROP COLUMN IF EXISTS ram_type;

ALTER TABLE cpu_units DROP COLUMN IF EXISTS socket_note;
ALTER TABLE cpu_units DROP COLUMN IF EXISTS needs_review;
ALTER TABLE cpu_units DROP COLUMN IF EXISTS is_server;
ALTER TABLE cpu_units DROP COLUMN IF EXISTS socket;

ALTER TABLE server_units DROP COLUMN IF EXISTS compat_note;
ALTER TABLE server_units DROP COLUMN IF EXISTS needs_review;
ALTER TABLE server_units DROP COLUMN IF EXISTS is_server;
ALTER TABLE server_units DROP COLUMN IF EXISTS source;
ALTER TABLE server_units DROP COLUMN IF EXISTS datasheet;
ALTER TABLE server_units DROP COLUMN IF EXISTS drive_form_factors;
ALTER TABLE server_units DROP COLUMN IF EXISTS ram_type;
ALTER TABLE server_units DROP COLUMN IF EXISTS max_sockets;
ALTER TABLE server_units DROP COLUMN IF EXISTS cpu_socket;
ALTER TABLE server_units DROP COLUMN IF EXISTS model_family;
