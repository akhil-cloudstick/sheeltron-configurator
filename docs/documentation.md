# Sheeltron Configurator — API Documentation

Backend: Go + Echo + GORM. Base URL (local): `http://localhost:8080`.

> **How this document is organized.** The backend is split into **modules**, and
> each module exposes one or more **products**. The URL mirrors that hierarchy:
> `/api/<module>/<product>`. This document is structured the same way — one
> top-level section per module, one sub-section per product. As new products
> (CPU, RAM, …) and new modules are added, append them under the matching section.

## Table of contents

- [Conventions](#conventions) — response shape, status codes, common patterns
- [Modules & products](#modules--products) — index of what exists today
- **[Stock module](#stock-module)** — `/api/stock`
  - [Servers (chassis)](#stock--servers) — `/api/stock/servers`
  - [Processor / Memory / SSD / HDD](#stock--processor--memory--ssd--hdd) — `/api/stock/{processor,memory,ssd,hdd}`
- [System endpoints](#system-endpoints) — health, issues, change logs

---

## Conventions

These apply to **every** module and product unless a section says otherwise.

- All responses are JSON with a `success` boolean.
  - Single-item success: `{ "success": true, "data": ... }`.
  - List success: `{ "success": true, "response": { "total", "page", "limit", "data": [...] } }`.
  - Error: `{ "success": false, "error": "<message>" }`.
- HTTP status codes: `200` OK, `201` Created, `400` Bad Request (general/validation),
  `404` Not Found (missing resource). The API never returns `500`.
- URL hierarchy: `/api/<module>/<product>` (e.g. `/api/stock/servers`).
- Pagination is **opt-in** on list endpoints: pass `?page=` and/or `?limit=` to
  paginate. If neither is passed, **all** matching rows are returned and the
  `response` reports them as a single page (`page: 1`, `limit: total`).

## Modules & products

| Module | Product | Base path | Identity (dedup) | Status |
|---|---|---|---|---|
| Stock | Servers (chassis) | `/api/stock/servers` | `model` | ✅ Available |
| Stock | Processor | `/api/stock/processor` | `model` | ✅ Available |
| Stock | Memory | `/api/stock/memory` | `product_name` | ✅ Available |
| Stock | SSD | `/api/stock/ssd` | `product_name` | ✅ Available |
| Stock | HDD | `/api/stock/hdd` | `product_name` | ✅ Available |
| System | Issues | `/api/issues` | — | ✅ Available |
| System | Change logs | `/api/change-logs` | — | ✅ Available |

> When adding a product, drop its model/controller/router files under
> `modules/stock/{models,controllers,routers}`, register it in `routers/routers.go`, then
> add a row above and a sub-section below. Chassis has a bespoke controller (it carries a
> workflow `status`); processor/memory/ssd/hdd reuse the generic engine in
> `controllers/product_engine.go` via a small `UnitCfg` per type.

---

# Stock module

Base path: `/api/stock`. Manages physical inventory. Each product is a distinct type
of stock with its own schema, but all share the response conventions above and the
same CRUD + bulk-import shape.

<a id="stock--servers"></a>
## Stock → Servers (chassis)

Base path: `/api/stock/servers`. One row = one physical chassis. Chassis have **no
serial number** — the DB `id` is the only unique identifier. The bulk importer keys
on **model** (see [Bulk import](#bulk-import)).

### Endpoint summary

| Method | Path | Body / Query | Purpose |
|---|---|---|---|
| GET | `/api/stock/servers` | `?q=&brand=&model=&status=&page=&limit=` | List + filter + paginate |
| GET | `/api/stock/servers/:id` | — | Get one |
| POST | `/api/stock/servers` | JSON `ServerUnit` | Create one |
| PUT | `/api/stock/servers/:id` | JSON `ServerUnit` | Update one |
| DELETE | `/api/stock/servers/:id` | — | Delete one |
| POST | `/api/stock/servers/bulk-delete` | JSON `{ "ids": [..] }` | Delete many |
| POST | `/api/stock/servers/import` | multipart `file` (.xlsx/.csv) | Bulk import, merged by model |
| GET | `/api/stock/servers/template.csv` | — | Download blank CSV template |

### The `ServerUnit` object

| Field | Type | Notes |
|---|---|---|
| `id` | int | Read-only, assigned by the server — the only unique identifier |
| `brand` | string | Never overwritten by import |
| `model` | string | **Required**; the import dedup key |
| `motherboard` | string | |
| `heat_sink` | string | |
| `fan` | string | |
| `raid_card` | string | |
| `cards` | string | |
| `riser_1` | string | |
| `riser_2` | string | |
| `riser_3` | string | |
| `back_plane` | string | |
| `power_supply` | string | |
| `status` | string | One of the [status values](#server-status-values); defaults to `need_check` |
| `condition_new` | bool | Whether the unit is offered as New. Set in the UI (any role); never imported |
| `condition_refurbished` | bool | Whether the unit is offered as Refurbished. Set in the UI (any role); never imported |
| `price_new` | number\|null | Admin-only price for the New condition; kept only when `condition_new` is true |
| `price_refurbished` | number\|null | Admin-only price for the Refurbished condition; kept only when `condition_refurbished` is true |
| `remark` | string | Admin-only — not set by import |
| `created_at` | timestamp | Read-only |
| `updated_at` | timestamp | Read-only |

A unit may carry **both** conditions at once, each with its own price. A price whose
condition is not set is dropped on save. Both prices are **redacted (null)** for stock
managers on every read, and ignored on writes.

<a id="server-status-values"></a>
### Status values

`need_check` (default) · `testing` · `ready` · `reserved` · `shipped` · `rma` · `scrap`

The bulk importer normalizes free-text sheet values to these (e.g. `NEED TO BE CHECK`
→ `need_check`, `IN STOCK`/`AVAILABLE` → `ready`, `RETURNED` → `rma`). Blank or
unrecognized values fall back to `need_check`.

### List server units

`GET /api/stock/servers`

Query parameters (all optional):

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Case-insensitive search across `model`, `brand` |
| `brand` | string | — | Case-insensitive partial match |
| `model` | string | — | Case-insensitive partial match |
| `status` | string | — | Exact match on a status value |
| `page` | int | — | 1-based page number. Triggers pagination |
| `limit` | int | `50` | Page size, clamped to `1..500`. Triggers pagination |

Results are ordered by `id` descending (newest first). Pagination is opt-in — if
neither `page` nor `limit` is supplied, every matching row is returned and
`response.page`/`response.limit` describe the full set as one page.

**Request** (paginated)

```bash
curl "http://localhost:8080/api/stock/servers?q=DL385&status=ready&page=1&limit=20"
```

**Request** (all rows — no pagination)

```bash
curl "http://localhost:8080/api/stock/servers"
```

**Response** `200 OK`

```json
{
  "success": true,
  "response": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "id": 12,
        "brand": "HPE",
        "model": "HPE DL385 GEN10 PLUS V2 8SFF",
        "status": "ready",
        "condition_new": true,
        "condition_refurbished": false,
        "price_new": 120000,
        "price_refurbished": null,
        "created_at": "2026-06-01T10:00:00Z",
        "updated_at": "2026-06-01T10:00:00Z"
      }
    ]
  }
}
```

### Get one server unit

`GET /api/stock/servers/:id`

**Request**

```bash
curl http://localhost:8080/api/stock/servers/12
```

**Response** `200 OK`

```json
{ "success": true, "data": { "id": 12, "model": "HPE DL385 GEN10 PLUS V2 8SFF", "status": "ready" } }
```

**Not found** `404`

```json
{ "success": false, "error": "server unit not found" }
```

### Create a server unit

`POST /api/stock/servers`

`model` is required. `status` defaults to `need_check` when omitted. Conditions default
to false; a `price_*` is only kept when its `condition_*` is true (and is ignored for
stock managers).

**Request**

```bash
curl -X POST http://localhost:8080/api/stock/servers \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "HPE",
    "model": "HPE DL385 GEN10 PLUS V2 8SFF",
    "motherboard": "P09185-002",
    "status": "need_check",
    "condition_new": true,
    "price_new": 120000
  }'
```

**Response** `201 Created`

```json
{ "success": true, "data": { "id": 13, "model": "HPE DL385 GEN10 PLUS V2 8SFF", "status": "need_check" } }
```

**Errors** `400`

```json
{ "success": false, "error": "model is required" }
```
```json
{ "success": false, "error": "invalid status: foo" }
```

### Update a server unit

`PUT /api/stock/servers/:id`

Loads the existing unit, applies the posted fields, and saves. `model` is required.

**Request**

```bash
curl -X PUT http://localhost:8080/api/stock/servers/13 \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "HPE",
    "model": "HPE DL385 GEN10 PLUS V2 8SFF",
    "status": "testing",
    "remark": "moved to bench 3"
  }'
```

**Response** `200 OK`

```json
{ "success": true, "data": { "id": 13, "model": "HPE DL385 GEN10 PLUS V2 8SFF", "status": "testing" } }
```

**Errors** `400` / `404`

```json
{ "success": false, "error": "model is required" }
```
```json
{ "success": false, "error": "server unit not found" }
```

### Delete a server unit

`DELETE /api/stock/servers/:id`

Hard delete — the row is removed.

**Request**

```bash
curl -X DELETE http://localhost:8080/api/stock/servers/13
```

**Response** `200 OK`

```json
{ "success": true, "message": "server unit deleted" }
```

### Bulk delete

`POST /api/stock/servers/bulk-delete`

Delete many units in one call. Body is a JSON array of ids.

**Request**

```bash
curl -X POST http://localhost:8080/api/stock/servers/bulk-delete \
  -H "Content-Type: application/json" \
  -d '{ "ids": [13, 14, 15] }'
```

**Response** `200 OK`

```json
{ "success": true, "deleted": 3 }
```

**Errors** `400`

```json
{ "success": false, "error": "no ids provided" }
```

### Bulk import

`POST /api/stock/servers/import`

Multipart upload with field `file` (`.xlsx` or `.csv`). The intended workflow is
re-importing the **same maintained spreadsheet** repeatedly. Rows are matched by
**model**:

- **New model** → inserted (blank `STATUS` → `need_check`).
- **Existing model** → each field *except brand and model* is refreshed when the
  incoming cell is **non-empty and differs** from what's stored. Empty cells never
  blank out existing data. If nothing changed, the row is skipped.
- **Repeated model within one file** → merged into a single record the same way.

Model matching is normalized: case-insensitive, ignoring spaces and punctuation, so
`HPE DL 385 GEN 10` and `HPE DL385 GEN10` are treated as the same model (the original
string is stored verbatim). **Condition, prices, and remark are never imported** — they
are set in the UI (condition by any role, prices by admin). The header row is matched
tolerantly (punctuation/spacing/case-insensitive); a **MODEL** column is required.
Columns for fields that are not imported (`SL NO`, `SERIAL NO`, `PART NO`, `CPU`,
`HDD/SSD`, `RAM`, `TYPE`/`CONDITION`, `PRICE`, `REMARK`) are ignored if present.

**Request**

```bash
curl -X POST http://localhost:8080/api/stock/servers/import \
  -F "file=@./SERVERS LIST-2026.xlsx"
```

**Response** `200 OK`

```json
{
  "success": true,
  "inserted": 120,
  "updated": 0,
  "skipped": 2
}
```

- `inserted` — new models added
- `updated` — existing models whose fields were refreshed
- `skipped` — unchanged rows, in-file duplicates with no new data, and content rows
  with no MODEL

Re-running the unchanged file returns `inserted: 0, updated: 0, skipped: N`.

### Download CSV template

`GET /api/stock/servers/template.csv`

Returns a blank CSV (header row only) as a file download
(`server_stock_template.csv`), suitable for filling in and re-importing.

**Request**

```bash
curl -O -J http://localhost:8080/api/stock/servers/template.csv
```

Header columns:

```
BRAND, MODEL,
MOTHER BOARD, HEAT SINK, FAN, RAID CARD, CARDS,
RISER-1, RISER-II, RISER-III, BACK PLANE, POWER SUPPLY, STATUS
```

### Export (frontend)

The Chassis stock UI lets a user select rows and **Export** them to CSV. This is done
**client-side** from the already-loaded data — there is no export API endpoint. The CSV
includes every field; for **stock managers** the `PRICE NEW` / `PRICE REFURBISHED`
columns are omitted (and prices are already redacted by the API).

## Stock → Processor / Memory / SSD / HDD

These four types share the **exact same endpoints, response shapes and rules as Servers**
(list/get/create/update/delete, `bulk-delete`, `import`, `template.csv`) — only the base
path, fields and dedup identity differ. Like chassis: a unit carries multi-`condition`
(`condition_new`/`condition_refurbished`) and per-condition admin prices
(`price_new`/`price_refurbished`, redacted for stock managers), plus `remark`. **These new
types have no `status`.** Import dedups by the identity below, refreshes changed cells, and
**never imports condition/price/remark** (set in the UI). Rows imported with empty fields are
saved and flagged via [Issues](#issues).

| Type | Base path | Identity | Spec fields (also the CSV template, in order) |
|---|---|---|---|
| Processor | `/api/stock/processor` | `model` | `type, family, series, brand, model, cores, total_threads, base_frequency, max_turbo_frequency, cache_memory` |
| Memory | `/api/stock/memory` | `product_name` | `memory_brand, capacity, generation, rank, product_name` |
| SSD | `/api/stock/ssd` | `product_name` | `ssd_brand, interface, capacity, form_factor, speed, product_name` |
| HDD | `/api/stock/hdd` | `product_name` | `hdd_brand, interface, capacity, form_factor, speed, rpm_speed, product_name` |

Example (create a processor, admin):

```bash
curl -X POST http://localhost:8080/api/stock/processor \
  -H "Content-Type: application/json" \
  -d '{ "brand":"AMD", "model":"AMD EPYC 7402", "cores":"24 Cores",
        "condition_new":true, "price_new":50000 }'
```

Import response is counts-only plus an issue count:
`{ "success":true, "inserted":N, "updated":N, "skipped":N, "issues":N }`.

---

# System endpoints

Cross-cutting endpoints not tied to any module.

## Health check

`GET /health` — liveness probe.

```bash
curl http://localhost:8080/health
```

## Issues

`GET /api/issues?product_type=` — products imported with empty (non-identity) fields, still
open. A product is flagged on import/create when any spec field is empty, and the issue is
**auto-resolved** when the product is later saved with no empty fields. `missing_fields` is an
array of field keys (the UI highlights them).

```json
{ "success": true, "data": [
  { "id": 2, "product_type": "cpu", "product_id": 3, "label": "AMD EPYC 7402",
    "missing_fields": ["cache_memory"], "created_at": "2026-06-05T13:02:46Z" }
]}
```

## Change logs

`GET /api/change-logs?product_type=&product_id=&limit=` — permanent, newest-first audit of
every import and manual edit. One row per event: an `update` groups **all** changed fields
into a `changes` array (`{field, old, new}`); `create`/`delete` rows have an empty `changes`.
`actor` records who made the change (`admin` / `stock_manager` / `system`). Persisted forever
(never cleared). The UI groups rows by Year → Month → Day.

```json
{ "success": true, "data": [
  { "id": 9, "product_type": "cpu", "product_id": 3, "label": "AMD EPYC 7402",
    "source": "import", "action": "update", "actor": "admin",
    "changes": [ { "field": "Cores", "old": "32 Cores", "new": "48 Cores" } ],
    "changed_at": "2026-06-05T13:05:00Z" }
]}
```
