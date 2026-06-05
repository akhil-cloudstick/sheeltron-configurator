-- +migrate Up
-- Chassis stock is now keyed by MODEL (deduped at import time); the DB id is the
-- only unique identifier. Drop the serial number and the per-unit compute columns,
-- and let type default to NULL (admin sets it after import).
ALTER TABLE server_units DROP COLUMN IF EXISTS serial_no;  -- also drops its unique index
ALTER TABLE server_units DROP COLUMN IF EXISTS sl_no;
ALTER TABLE server_units DROP COLUMN IF EXISTS part_no;
ALTER TABLE server_units DROP COLUMN IF EXISTS cpu;
ALTER TABLE server_units DROP COLUMN IF EXISTS hdd_ssd;
ALTER TABLE server_units DROP COLUMN IF EXISTS ram;
ALTER TABLE server_units ALTER COLUMN type DROP DEFAULT;   -- type now NULL by default
-- status keeps DEFAULT 'need_check'

-- +migrate Down
ALTER TABLE server_units ALTER COLUMN type SET DEFAULT 'new';
ALTER TABLE server_units ADD COLUMN ram          TEXT;
ALTER TABLE server_units ADD COLUMN hdd_ssd      TEXT;
ALTER TABLE server_units ADD COLUMN cpu          TEXT;
ALTER TABLE server_units ADD COLUMN part_no      TEXT;
ALTER TABLE server_units ADD COLUMN sl_no        INT;
-- recreate serial_no as nullable (existing rows have no serial to satisfy NOT NULL/UNIQUE)
ALTER TABLE server_units ADD COLUMN serial_no    TEXT;
