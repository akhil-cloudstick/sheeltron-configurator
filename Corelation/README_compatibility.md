# Configurator Correlation / Compatibility Dataset

This folder holds the **compatibility data the configurator wizard filters on**. The
approach is **attribute-based** (per `docs/data_model.md`): every catalog row carries
its compatibility keys, and the wizard joins on those keys at runtime. There is **no
giant precomputed CPU×chassis matrix** — joins are cheap and the data self-maintains
when a row is added.

## Wizard flow this data supports

```
Processor (show ALL; Intel/AMD tabs)
   │  selecting a CPU fixes its socket
   ▼
Chassis  (show only chassis whose cpu_socket == selected CPU socket)
   │  selecting a chassis fixes ram_type + drive_form_factors + max_sockets
   ▼
RAM / Storage / Network  (filtered off the chosen chassis)
   ▼
Quote     (each BOM line is independently New or Refurbished; price follows)
```

Condition (New/Refurb) is **not** a wizard step — it is chosen **per BOM line item**.
Every catalog file carries `condition_new` / `condition_refurbished` boolean columns
(straight from the live stock) so the UI can offer the line's available condition(s)
and pick the matching price.

## Inputs vs outputs

**Inputs** (the actual stock exported from the backend — do not edit by hand here):
`chassis-stock-114.csv`, `processor-stock-384.csv`, `memory-stock-227.csv`,
`hdd-stock-267.csv`, `ssd-stock-268.csv`. Each has `ID`, `CONDITION NEW`,
`CONDITION REFURBISHED`, `REMARK`, timestamps.

**Outputs** (generated — what the wizard consumes): `cpus.csv`, `chassis.csv`,
`ram.csv`, `storage.csv`, `socket_map.csv`. Every output row keeps its source
`stock_id` so the wizard/quote can link back to real stock.

## Join contract (what the developer codes)

| Relationship | Rule |
|---|---|
| **CPU ↔ chassis** (type) | `cpu.socket == chassis.cpu_socket` |
| **CPU ↔ chassis** (qty) | `cpu_qty <= chassis.max_sockets` (1 / 2 / 4) |
| **RAM ↔ chassis** (type) | `ram.ram_type == chassis.ram_type` |
| **RAM ↔ chassis** (qty) | `ram_qty <= chassis.max_dimm_slots` and `total_ram_gb <= chassis.max_memory_gb` (each only when set) |
| **Storage ↔ chassis** (form factor) | `storage.form_factor` ∈ `chassis.drive_form_factors` (split `;`; empty = unknown → show all) |
| **Storage ↔ chassis** (interface) | `storage.interface` ∈ `chassis.supported_interfaces` **only when set** (empty = unknown → don't filter) |
| **Storage ↔ chassis** (qty) | `total_drives <= chassis.drive_bays` (when set) |
| **Network ↔ chassis** | not filtered in v1 (chassis slot data too thin) — show all NICs |

> **Caveat on slot/interface fields (coverage depends on the datasheet).** `max_sockets`
> is reliable. The rest are extracted from the matched datasheet PDF + stock `BACK PLANE`
> text, so they are blank when **(a)** no datasheet exists (50/114 chassis — Lenovo/Quanta
> have none, and many specific models aren't in the PDF set) or **(b)** the datasheet's
> spec-table layout fragments under text extraction (mainly HPE Gen10-Plus / EPYC).
> Current coverage of the **114** rows:
> - `supported_interfaces` — **73/114** (all 64 matched chassis; datasheet storage section + backplane text). Best-effort, **advisory** (may over/understate); filter only when set.
> - `max_dimm_slots` — **50/114** (50/64 matched).
> - `max_memory_gb` — **44/114** (44/64 matched); handles both "N TB max" and "up to N TB".
> - `drive_bays` — **59/114** (from the model name's SFF/LFF tokens).
>
> The ~14 matched chassis still missing slots/memory are HPE Gen10-Plus / EPYC (+ a few
> Fujitsu/Inspur) — top up by hand or with a vendor-specific parser. Apply every field
> **only when set**; never assume a blank means "unsupported".

**Always exclude rows where `needs_review == yes`** from the wizard until a human
confirms them (they have missing/uncertain compatibility keys). `is_server == no`
rows (desktop/workstation CPUs, edge appliances) should also be hidden from the
server configurator.

For the rare cert/BIOS exception that the socket rule gets wrong, add an overrides
layer later (`chassis_cpu_overrides` / `chassis_ram_overrides` per `data_model.md`):
an allow/block list checked after the attribute join. Not needed for v1.

## Files

### `cpus.csv` — processor catalog (one row per stock CPU)
`stock_id, brand, family, series, model, cores, threads, base_ghz, turbo_ghz, cache, condition_new, condition_refurbished, socket, is_server, needs_review, socket_note`
- **`socket`** is the compatibility key (derived — see `socket_map.csv`).
- `is_server=no` → desktop/workstation part, hide from configurator.

### `chassis.csv` — one row per stock chassis (stock IDs preserved)
`stock_id, brand, model, model_family, cpu_socket, max_sockets, ram_type, max_dimm_slots, max_memory_gb, drive_form_factors, drive_bays, supported_interfaces, condition_new, condition_refurbished, datasheet, source, is_server, needs_review, note`
- **`cpu_socket`, `ram_type`, `drive_form_factors`** are the type-match keys; **`max_sockets`**, **`max_dimm_slots`**, **`max_memory_gb`**, **`drive_bays`**, **`supported_interfaces`** add quantity/interface validation (see contract + caveat). `max_dimm_slots`/`max_memory_gb` are extracted from the matched datasheet PDF.
- `model_family` = normalized model (bay counts / "ProLiant"/"PowerEdge" stripped) for grouping drive-bay variants of the same platform in the chassis list.
- `datasheet` = matched PDF under `Servers Data Sheet/` (`none` if no sheet) — for human verification only; the keys are derived from the model/generation, not parsed from the PDF.
- `source` = `derived` (from model name) or `manual` (needs a human).

### `ram.csv` — memory catalog
`stock_id, brand, capacity, capacity_gb, ram_type, rank, condition_new, condition_refurbished, product_name, needs_review`
- **`ram_type`** (DDR2/3/4/5) is the compatibility key (from the stock `GENERATION` column).
- **`capacity_gb`** is the numeric size (for the `total_ram <= max_memory_gb` check); blank rows are flagged `needs_review`.

### `storage.csv` — HDD + SSD merged
`stock_id, kind, brand, interface, capacity, capacity_gb, form_factor, speed, rpm, condition_new, condition_refurbished, product_name, needs_review`
- **`interface`** (SATA/SAS/NVMe) + **`form_factor`** (2.5" SFF / 3.5" LFF) are the keys; **`capacity_gb`** is the numeric size (for quote totals).

### `socket_map.csv` — reference rule table
Documents how a CPU `family`/`series`/model-number maps to a socket. Auditable and
used by the build script. Key rule: **Intel Xeon Scalable socket = the 2nd digit of
the model number** (x1xx/x2xx→LGA3647, x3xx→LGA4189, x4xx/x5xx→LGA4677).

## Coverage (current build)

| Catalog | Rows | Compatibility key resolved |
|---|---|---|
| CPUs | 384 stock | 258 confident socket; 271 server-class. Non-server (Core i / Pentium / Celeron / Ryzen / Threadripper / Xeon W) flagged `is_server=no`. |
| Chassis | 114 | **109 confident (95%)**; 5 `needs_review`. Sockets present: LGA2011/2011-3/3647/4189/4677, SP3/SP5. RAM: DDR3/DDR4/DDR5. |
| RAM | 227 | All have DDR generation (DDR2×3, DDR3×62, DDR4×146, DDR5×16). |
| Storage | 535 | HDD×267 + SSD×268; interface+form-factor resolved for most; blanks flagged `needs_review`. |
| Datasheets | 64/114 chassis matched | Verification pointers only; uneven source coverage (Lenovo/Quanta have no PDFs). |

### Known gaps (not silently hidden)

- **5 chassis need manual entry:** `LENOVO METRO`, `ASUS ASSEMBLED SERVER`,
  `GIGABYTE HYVE EDGE METAL G10`, `DELL POWEREDGE E33S`, `DELL POWEREDGE E10S`
  (non-standard / edge units — no socket/ram derivable from the name).
- **Entry-server sockets have no CPUs in the current spares list:** `LGA1151`
  (R230/R340/R350 — Xeon E) and `LGA1356` (R420 — Xeon E5-2400). Those chassis will
  show zero compatible CPUs until matching CPUs are added, or treat them as
  out-of-scope (the catalog is dual-socket EPYC/Xeon-focused).
- **Spares carry no prices yet** — add `price_new`/`price_refurb` before the Quote step.
- **CPU rows had quality issues** in the source (wrong core counts, dup SKUs); deduped
  by normalized model, but core/clock values are passed through as-is — re-verify before
  showing specs.

## Regenerating

Built by `scripts/build_corr.py` from the actual-stock CSVs in this folder
(`chassis-stock-*.csv`, `processor-stock-*.csv`, `memory-stock-*.csv`,
`hdd-stock-*.csv`, `ssd-stock-*.csv` — matched by prefix, so the row-count suffix can
change) plus the datasheets in `Servers Data Sheet/`. Re-export stock from the
backend into this folder, run `python scripts/build_corr.py`, then review any new
`needs_review=yes` rows. Outputs (`cpus/chassis/ram/storage/socket_map.csv`) are
overwritten. Run `python scripts/build_viz.py` afterwards to refresh
`compatibility-explorer.html`. See `scripts/README.md`.
