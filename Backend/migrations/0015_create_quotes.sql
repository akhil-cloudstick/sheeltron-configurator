-- +migrate Up
-- Saved sales quotes produced by the salesman configurator. Line items are snapshotted
-- as JSON (part label + condition + qty + unit price at save time) so a quote stays
-- stable even if stock prices change later. Totals are recomputed server-side on save.
CREATE TABLE quotes (
  id                SERIAL PRIMARY KEY,
  quote_number      TEXT,                         -- Q-<year>-<id padded>, set after insert
  customer_name     TEXT,
  customer_company  TEXT,
  customer_email    TEXT,
  lines             JSONB NOT NULL DEFAULT '[]',  -- [{category,stock_id,label,condition,qty,unit_price,line_total}]
  subtotal          NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst               NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by        TEXT,                         -- role/actor that saved it
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- +migrate Down
DROP TABLE quotes;
