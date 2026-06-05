-- +migrate Up
-- Group a multi-field edit into ONE log row: `changes` holds a JSON array of
-- {field, old, new}. The legacy field/old_value/new_value columns stay for older rows.
ALTER TABLE stock_change_logs ADD COLUMN changes TEXT;

-- +migrate Down
ALTER TABLE stock_change_logs DROP COLUMN changes;
