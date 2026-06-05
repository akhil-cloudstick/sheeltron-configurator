# Sheeltron Configurator — Changelog

A running log of changes, decisions, and daily plans for the project. Newest
entries are added at the top of the relevant date.

Format: dates are `DD/MM/YY`; each entry shows the time it was logged in
`HH:MM AM/PM` on its own line, separate from the message.

---

## 06/06/26

**`12:10 AM`**
- Dev-server fix: Vite was failing to load `/src/main.tsx` (`Does the file exist?`) → browser got raw TSX → `Uncaught SyntaxError: missing ) after argument list`. Root cause: the UNC share is mapped to **two** drive letters (`S:` and `Y:`); Vite realpaths resolved files and Windows canonicalizes the share to `Y:`, mismatching the `S:` launch root. Added `resolve.preserveSymlinks: true` to `vite.config.ts` so paths stay on the launch drive — `npm run dev` from `S:` now serves cleanly on `:5173`. Also fixed `Frontend/.env`: `VITE_API_BASE_URL` had stray leading spaces in its value.

**`12:00 AM`**
- Configurator fix: the **"Your configuration" rail no longer keeps stale data**. The build store was wrapped in zustand `persist` (localStorage `sheeltron.configurator`), so a completed build survived a refresh and a saved quote was never cleared. The store is now **session-only** (in-memory; legacy persisted key is wiped on load) and `reset()` runs **after a quote saves**. Going back to change an earlier pick already dropped the previous selection + everything downstream via the select cascade.

---

## 05/06/26

**`11:18 PM`**
- New **Super Admin** role: same interface as admin, plus a per-product **Import correlation** button that enriches existing stock from the `Corelation/` CSVs (socket / ram_type / drive form factors / needs_review); storage CSV is split by KIND on the SSD vs HDD pages. Admin keeps edit + price but no add/import; stock manager unchanged.
- Super admin can expand any product row to see **all columns** and edit the compatibility keys.
- New **Coverage by socket** dashboard (super-admin only): CPU↔chassis socket matrix + cards, computed live from the enriched tables.
- New **Salesman** role + **configurator** portal: Processor → Chassis → RAM → Storage wizard with compatibility filtered **by the backend**; each item is split by condition (New/Refurbished priced separately); per-item quantity; GST-18% quote saved to the backend (`Q-YYYY-NNNNN`) with browser print-to-PDF + CSV.
- New **All quotes** page (admin + super admin) listing saved quotes.
- Configurator UX: one-filter-at-a-time **accordion** narrowing, centered fixed-height panel, Back/Continue at the bottom, and **locked step order** (no skipping ahead).

**`03:40 PM`**
- Issues + Change logs: added a **date filter** (calendar) next to the type dropdown on both pages; the listing now defaults to **today** and the user can pick any other day (clearing the date shows all). Issues page also gained the **product-type filter** dropdown it was missing. Backend `/api/issues` and `/api/change-logs` now accept `from`/`to` instant bounds. Change logs row layout reordered: product number first, time moved to the last column (single line).

**`03:05 PM`**
- Import "updated" count now means only **existing DB rows changed** (so it matches the change log). In-file duplicate model rows are merged but counted as skipped, not updated — a fresh import now shows `updated: 0`.

**`02:52 PM`**
- Change logs now record condition + price edits too. Stock managers viewing the change log don't see price changes (condition changes still show); admins see everything.

**`02:30 PM`**
- Change logs: one row per edit now groups **all** changed fields (not one row per field), tracks `remark`, records **who** made the change (admin/stock manager), and fixed the timestamp (was showing year 0001). The page groups entries by Year → Month → Day, newest first, with pagination.
- Issues & Change logs tables now show the product **ID** and are paginated; the Issues "Fix" button opens the edit drawer **in place** (no redirect) and clears the issue on save.

**`01:49 PM`**
- Added Processor, Memory, SSD and HDD as real stock types (storage split into SSD + HDD); dropped Network. Each behaves like Chassis: list/search/filter/import/export/bulk-delete, manual multi-condition + admin per-condition prices. New types have no status; deduped on import by model (processor) or product name (ram/ssd/hdd). Conditions/prices never imported.
- New **Issues** page: rows imported with empty fields are saved + flagged; fixing and saving the product auto-clears the issue.
- New **Change logs** page: permanent field-level audit (old→new) of every import and manual edit, with date/time.
- Backend: generic `product_engine.go` + per-type `UnitCfg` (chassis stays bespoke for its status); shared `stock_issues` + `stock_change_logs` tables (migrations 0005–0010).

**`11:27 AM`**
- Chassis `type` → **`condition`**, now multi-valued: a unit can be **both New and Refurbished**. Replaced the single `type`/`price` with `condition_new`/`condition_refurbished` booleans and per-condition `price_new`/`price_refurbished` (migration `0004`). A price is kept only for a set condition; both prices are redacted for stock managers (who can set conditions but not prices).
- Condition and prices are **no longer imported** — set manually in the UI. Dropped the `TYPE` column from the import template/parser; `STATUS` is still imported.
- Chassis table: shows more inline data (Motherboard, Heat sink, RAID card, Power supply), a single **Condition** column (New/Refurbished pills, replacing Type), and per-condition prices for admins. Compacted the search bar / filters / dropdowns (new `Dropdown size="sm"`).
- Selecting rows now also shows an **Export** button (next to bulk delete) that downloads the selected units as CSV — admins get all columns, stock managers' CSV omits the price columns. Client-side, no API endpoint.
- Pricing page (Catalog → Chassis) edits per-condition New/Refurbished prices inline.

## 04/06/26

**`07:44 PM`**
- Chassis stock reworked: chassis now have **no serial number** — the DB `id` is the only unique identifier. Removed `serial_no`, `sl_no`, `part_no`, `cpu`, `hdd_ssd`, `ram` from the model, DB (migration `0003`), import, and UI. Removed the GIGABYTE serial auto-generation.
- CSV import is now **keyed by MODEL** (normalized, case/space/punctuation-insensitive): new model → insert; existing model → refresh each field except brand only when the incoming cell is non-empty and differs; unchanged rows skipped. In-file duplicate models merge. `PRICE`/`REMARK` are not imported. Import response is counts-only (`inserted`/`updated`/`skipped`).
- `type` default is now null (admin sets after import); `status` still defaults to `need_check`.
- New `POST /api/stock/servers/bulk-delete` (`{ids:[]}`). Chassis table now has per-row select + select-all + bulk delete, and a **Product No** column showing `id`.

**`04:55 PM`**
- Merged Stock + Catalog into one section: admin sees it as "Catalog" with editable prices; stock manager sees it as "Stock".
- Price hidden for stock manager in the UI and redacted/ignored by the backend (via role header).

**`04:35 PM`**
- Chassis stock: added `type` (new/refurbished, default new) and single `price` (nullable).
- CSV import: blank/`N/A` serials on GIGABYTE rows auto-generate a per-model serial; other brands still skipped. List search now covers brand + type.
- Frontend: renamed Server → Chassis; added Type + Price columns, search, and dynamic per-field filters. Catalog → Chassis now edits the real chassis stock (price/type), not mock.

**`03:03 PM`**
- **Frontend — Admin Portal built** (`Configurator/Frontend`; React + Vite + TS + Tailwind).
- Two roles: admin (all modules) and stock manager (Stock only).
- Stock → Servers wired to the live API; CPU/RAM/Storage, Catalog, and Pricing & Rules on mock data.

**`12:00 PM`**
- **Plan:** Build the frontend, then integrate the backend APIs with the
  frontend module, then test the integrated flow.

## 03/06/26

**`08:00 PM`**
- **Backend setup:** Set up Go with the Echo framework and a local PostgreSQL
  database.
- **Server stock CRUD — completed:**
  - Bulk upload of stock data by admins; rows with missing or duplicate serial
    numbers are automatically skipped.
  - Add stock items individually.
  - View stock listings with pagination.
  - View details of a single server unit.
  - Edit and delete records.
