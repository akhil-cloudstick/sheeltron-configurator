-- +migrate Up
CREATE TABLE ram_units (
  id                      SERIAL PRIMARY KEY,
  memory_brand            TEXT,
  capacity                TEXT,
  generation              TEXT,
  rank                    TEXT,
  product_name            TEXT,                 -- identity (deduped on import)
  condition_new           BOOLEAN DEFAULT FALSE,
  condition_refurbished   BOOLEAN DEFAULT FALSE,
  price_new               NUMERIC(12,2),
  price_refurbished       NUMERIC(12,2),
  remark                  TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- +migrate Down
DROP TABLE ram_units;
