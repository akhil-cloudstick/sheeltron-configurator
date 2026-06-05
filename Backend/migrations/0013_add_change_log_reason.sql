-- +migrate Up
-- Free-text reason recorded with a bulk price update (shown only for bulk rows).
ALTER TABLE stock_change_logs ADD COLUMN reason TEXT;

-- +migrate Down
ALTER TABLE stock_change_logs DROP COLUMN reason;
