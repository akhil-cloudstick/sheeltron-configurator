-- +migrate Up
CREATE TABLE cpu_units (
  id                      SERIAL PRIMARY KEY,
  type                    TEXT,
  family                  TEXT,
  series                  TEXT,
  brand                   TEXT,
  model                   TEXT,                 -- identity (deduped on import)
  cores                   TEXT,
  total_threads           TEXT,
  base_frequency          TEXT,
  max_turbo_frequency     TEXT,
  cache_memory            TEXT,
  condition_new           BOOLEAN DEFAULT FALSE,
  condition_refurbished   BOOLEAN DEFAULT FALSE,
  price_new               NUMERIC(12,2),
  price_refurbished       NUMERIC(12,2),
  remark                  TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- +migrate Down
DROP TABLE cpu_units;
