-- +migrate Up
ALTER TABLE server_units ADD COLUMN type  TEXT DEFAULT 'new';
ALTER TABLE server_units ADD COLUMN price NUMERIC(12,2);

-- +migrate Down
ALTER TABLE server_units DROP COLUMN price;
ALTER TABLE server_units DROP COLUMN type;

