-- +migrate Up
-- A chassis can now hold multiple conditions (new and/or refurbished), each with its
-- own price. Replace the single type/price with explicit per-condition columns.
ALTER TABLE server_units DROP COLUMN IF EXISTS type;
ALTER TABLE server_units DROP COLUMN IF EXISTS price;
ALTER TABLE server_units ADD COLUMN condition_new         BOOLEAN DEFAULT FALSE;
ALTER TABLE server_units ADD COLUMN condition_refurbished BOOLEAN DEFAULT FALSE;
ALTER TABLE server_units ADD COLUMN price_new             NUMERIC(12,2);
ALTER TABLE server_units ADD COLUMN price_refurbished     NUMERIC(12,2);

-- +migrate Down
ALTER TABLE server_units DROP COLUMN price_refurbished;
ALTER TABLE server_units DROP COLUMN price_new;
ALTER TABLE server_units DROP COLUMN condition_refurbished;
ALTER TABLE server_units DROP COLUMN condition_new;
ALTER TABLE server_units ADD COLUMN price NUMERIC(12,2);
ALTER TABLE server_units ADD COLUMN type  TEXT;
