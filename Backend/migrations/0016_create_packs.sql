-- +migrate Up
-- Admin-built "compatible packs": prebuilt, socket-compatible server bundles a salesman
-- can pick instead of walking the 4-step wizard. Each line snapshots the full chosen
-- ConfigOption (so a salesman can reconstruct the selection into a quote) plus qty and
-- the computed line total. Totals are recomputed server-side on save, mirroring quotes.
CREATE TABLE packs (
  id           SERIAL PRIMARY KEY,
  pack_number  TEXT,                          -- P-<year>-<id padded>, set after insert
  name         TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  lines        JSONB NOT NULL DEFAULT '[]',   -- [{category,qty,option:{...full ConfigOption...},line_total}]
  subtotal     NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst          NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total  NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by   TEXT,                          -- role/actor that saved it
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_packs_created_at ON packs(created_at DESC);

-- +migrate Down
DROP TABLE packs;
