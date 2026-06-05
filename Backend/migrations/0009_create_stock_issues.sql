-- +migrate Up
-- A product imported with empty (non-identity) fields gets an unresolved issue.
-- Auto-resolved when the product is later saved with no empty fields.
CREATE TABLE stock_issues (
  id             SERIAL PRIMARY KEY,
  product_type   TEXT NOT NULL,          -- chassis | cpu | ram | ssd | hdd
  product_id     INT  NOT NULL,
  label          TEXT,                    -- denormalized identity value (model / product name)
  missing_fields TEXT,                    -- comma-separated field keys still empty
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ              -- NULL = open
);
CREATE INDEX idx_stock_issues_lookup ON stock_issues(product_type, product_id);
CREATE INDEX idx_stock_issues_open ON stock_issues(resolved_at);

-- +migrate Down
DROP TABLE stock_issues;
