-- +migrate Up
-- Permanent field-level audit trail for imports AND manual edits. Never cleared.
CREATE TABLE stock_change_logs (
  id            SERIAL PRIMARY KEY,
  product_type  TEXT NOT NULL,           -- chassis | cpu | ram | ssd | hdd
  product_id    INT  NOT NULL,
  label         TEXT,                     -- identity value at the time of change
  field         TEXT,                     -- human field label (empty for create/delete rows)
  old_value     TEXT,
  new_value     TEXT,
  source        TEXT,                     -- import | manual
  action        TEXT,                     -- create | update | delete
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stock_change_logs_time ON stock_change_logs(changed_at DESC);
CREATE INDEX idx_stock_change_logs_product ON stock_change_logs(product_type, product_id);

-- +migrate Down
DROP TABLE stock_change_logs;
