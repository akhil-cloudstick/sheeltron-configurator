-- +migrate Up
-- Extra spec columns added to the Corelation/ CSVs (super-admin imports them).
-- Chassis gained DIMM/memory/bay/interface specs; ram & storage gained a numeric
-- capacity_gb (parsed from the capacity string) for sorting/filtering by size.

-- Chassis (server_units)
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS max_dimm_slots       INT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS max_memory_gb        INT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS drive_bays           INT;
ALTER TABLE server_units ADD COLUMN IF NOT EXISTS supported_interfaces TEXT;

-- Memory (ram_units)
ALTER TABLE ram_units ADD COLUMN IF NOT EXISTS capacity_gb INT;

-- Storage (ssd_units / hdd_units)
ALTER TABLE ssd_units ADD COLUMN IF NOT EXISTS capacity_gb INT;
ALTER TABLE hdd_units ADD COLUMN IF NOT EXISTS capacity_gb INT;

-- +migrate Down
ALTER TABLE hdd_units DROP COLUMN IF EXISTS capacity_gb;
ALTER TABLE ssd_units DROP COLUMN IF EXISTS capacity_gb;
ALTER TABLE ram_units DROP COLUMN IF EXISTS capacity_gb;

ALTER TABLE server_units DROP COLUMN IF EXISTS supported_interfaces;
ALTER TABLE server_units DROP COLUMN IF EXISTS drive_bays;
ALTER TABLE server_units DROP COLUMN IF EXISTS max_memory_gb;
ALTER TABLE server_units DROP COLUMN IF EXISTS max_dimm_slots;
