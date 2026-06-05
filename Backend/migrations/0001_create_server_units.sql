-- +migrate Up
CREATE TABLE server_units (
  id            SERIAL PRIMARY KEY,
  sl_no         INT,
  brand         TEXT,
  model         TEXT,
  part_no       TEXT,
  serial_no     TEXT UNIQUE NOT NULL,                 -- upsert / identity key
  cpu           TEXT,
  hdd_ssd       TEXT,
  ram           TEXT,
  motherboard   TEXT,
  heat_sink     TEXT,
  fan           TEXT,
  raid_card     TEXT,
  cards         TEXT,
  riser_1       TEXT,
  riser_2       TEXT,
  riser_3       TEXT,
  back_plane    TEXT,
  power_supply  TEXT,
  status        TEXT DEFAULT 'need_check',            -- need_check|testing|ready|reserved|shipped|rma|scrap
  remark        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_server_units_status ON server_units(status);

-- +migrate Down
DROP TABLE server_units;
