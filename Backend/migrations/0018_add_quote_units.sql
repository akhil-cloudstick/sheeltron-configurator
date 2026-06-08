-- +migrate Up
-- A quote can represent N identical server configurations (the salesman "multiply
-- this configuration" feature). Lines stay per-unit; units multiplies the totals.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS units INT NOT NULL DEFAULT 1;

-- +migrate Down
ALTER TABLE quotes DROP COLUMN IF EXISTS units;
