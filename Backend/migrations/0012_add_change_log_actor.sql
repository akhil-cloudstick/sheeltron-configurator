-- +migrate Up
-- Who made the change: 'admin' | 'stock_manager' | 'system'.
ALTER TABLE stock_change_logs ADD COLUMN actor TEXT;

-- +migrate Down
ALTER TABLE stock_change_logs DROP COLUMN actor;
