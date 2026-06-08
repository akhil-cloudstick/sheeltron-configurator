# Configurator — Developer Handoff

Everything needed to build the **sales-team configurator wizard** is in this
`Corelation/` folder. This file is the index: what to build, the data to build it
from, and the exact filtering behaviour (already implemented as a reference you can
read and port).

---

## 1. TL;DR — what you're building

A **processor-first wizard** that lets a sales rep assemble a *guaranteed-valid*
server build. The rep picks a CPU; everything downstream narrows to only what is
compatible. Incompatible options are **hidden, never greyed**.

```
Step 1 Processor → Step 2 Chassis → Step 3 RAM → Step 4 Storage → (Step 5 Quote)
```

Compatibility is **attribute-based** — each catalog row carries keys, and you filter
by matching keys at runtime (no precomputed matrix).

---

## 2. The package (what to use)

| File | Role |
|---|---|
| **`compatibility-explorer.html`** | **Working reference implementation.** Open it in a browser — it *is* the spec for the UX, the per-step facets, and the exact filter logic. Read its `<script>` to see every join. Port that behaviour to React. |
| **`README_compatibility.md`** | The **data contract** — file schemas, the join rules, coverage, and known gaps. |
| `cpus.csv`, `chassis.csv`, `ram.csv`, `storage.csv` | The **catalog data** to seed the wizard (one row per stock item, with derived compatibility keys + `stock_id` + `condition_*`). |
| `socket_map.csv` | Reference: how CPU socket is derived (for auditing / future CPUs). |
| `*-stock-*.csv` | Raw backend stock exports (inputs the above are generated from — don't build the UI off these directly). |
| `scripts/` | The regeneration pipeline (`build_corr.py` → CSVs, `build_viz.py` → explorer). Re-run after a stock re-export. See `scripts/README.md`. Python stdlib only. |

> The explorer embeds the data inline for a no-server demo. In the real app, load the
> four catalog CSVs (or have the backend serve them as JSON) into your store.

---

## 3. The join contract (the only compatibility rules)

| Step links | Rule |
|---|---|
| CPU → Chassis (type) | `cpu.socket === chassis.cpu_socket` |
| CPU → Chassis (qty) | `cpuQty <= chassis.max_sockets` (1 / 2 / 4) |
| Chassis → RAM (type) | `ram.ram_type === chassis.ram_type` |
| Chassis → RAM (qty) | `ramQty <= chassis.max_dimm_slots` and `totalRamGb <= chassis.max_memory_gb` (each when set) |
| Chassis → Storage (form factor) | `chassis.drive_form_factors.split(';').includes(storage.form_factor)` (empty = unknown → show all) |
| Chassis → Storage (interface) | `chassis.supported_interfaces.split(';').includes(storage.interface)` **only when set** (empty = unknown → don't filter) |
| Chassis → Storage (qty) | `totalDrives <= chassis.drive_bays` (when set) |
| Chassis → Network | not filtered in v1 — show all (chassis slot data is too thin) |

**Always exclude** rows with `needs_review === "yes"`, and CPUs with
`is_server === "no"`, from the wizard.

> **Slot/interface fields are best-effort — apply only when set, never treat blank as
> "unsupported".** `max_sockets` reliable. Of the 114 chassis: `supported_interfaces`
> **73/114** (all 64 with a datasheet), `max_memory_gb` **44/114**, `max_dimm_slots`
> **50/114**, `drive_bays` **59/114**. Blanks are where no datasheet exists (50/114) or the
> HPE Gen10-Plus/EPYC spec-table didn't parse (~14) — top up by hand. Interface is advisory.

---

## 4. Per-step spec (mirror the explorer)

**Step 1 · Processor** — the rep narrows, then picks:
- Vendor tabs: **All / Intel / AMD**.
- Facets (each with live counts, single-select + "All", reset the ones below):
  **1 Family → 2 Series → 3 Cores**.
- Free-text search bypasses the facets.
- The model list stays gated ("pick a core count…") while a set is large (>15) so the
  rep never faces a 384-row dump. A "show non-server" toggle reveals desktop CPUs.
- Selecting a CPU fixes its **socket** (shown on the badge).

**Step 2 · Chassis** — only chassis whose `cpu_socket` matches the CPU:
- A **Brand** facet (HPE / Dell / …) with counts narrows the list.
- Chassis are grouped by `model_family` (drive-bay variants collapse); each shows
  `max_sockets` (1P/2P/4P), `ram_type`, `drive_form_factors`, `drive_bays`,
  `supported_interfaces`, and stock count.
- Selecting a chassis fixes `ram_type` + `drive_form_factors` + `drive_bays` + `supported_interfaces`.

**Step 3 · RAM** — only the chassis's DDR generation:
- Facets: **DDR generation** (fixed by chassis), **Brand**, **Speed (MT/s)**.
- The "why" line shows the chassis's `max_dimm_slots` / `max_memory_gb` (when known) for the quantity rule.

**Step 4 · Storage** — only the chassis's drive form factor(s) **and** supported interface(s):
- Filtered by `drive_form_factors` and (when known) `supported_interfaces`.
- Facets: **Type** (HDD / SSD / NVMe), **Brand**, **Speed**.
- The "why" line shows the bay cap (`up to N drives`) for the quantity rule.

**Reset cascade** (critical): changing the **CPU** clears chassis + its brand filter +
all RAM/storage selections; changing the **chassis** clears the RAM/storage facet
selections. (See `resetSpareFacets()` / the `onclick` handlers in the reference.)

---

## 5. Condition (New / Refurbished)

There is **no condition step**. Condition is chosen **per BOM line**: each catalog row
carries `condition_new` / `condition_refurbished` booleans, so a line offers whichever
it's available in (and the price follows that choice). A *new* CPU in a *refurb*
chassis is valid.

---

## 6. Where to read the logic in the reference

In `compatibility-explorer.html`'s script:
- `renderFacets()` — Step 1 family/series/cores faceting + gating.
- `renderChassis()` — the socket join + brand facet.
- `renderSpares()` — the RAM (ram_type) and Storage (form-factor) joins + their facets.
- `buildFacet(...)` — the generic count-badged chip filter (reuse pattern in React).
Port these as pure functions over your loaded arrays.

---

## 7. Data quality / gaps to handle in the UI

- **`needs_review` rows**: 5 chassis (Lenovo Metro, ASUS Assembled, Hyve Edge, Dell
  E33S/E10S) and assorted non-server CPUs — keep hidden until corrected at source.
- **Brand typo**: stock has both `QUANTA` and `QUAUNTA` (one mistyped row). Fix it in
  the backend stock and re-export, or add a normalization map — don't hard-code around it.
- **Sockets with no CPUs**: `LGA1151` / `LGA1356` entry boxes (R230/R340/R350/R420)
  have no matching CPUs in stock — those chassis simply won't appear; that's expected.
- **NVMe drives** usually have no Gb/s speed (PCIe) — no speed chip is normal.

---

## 8. NOT in this dataset — you must add it

This package solves **compatibility + catalog**. To finish the configurator you still need:

1. **Prices** — add `price_new` / `price_refurb` per item (admin-entered; currently absent).
   Sales reps must **not** see prices until the Quote step.
2. **Quantities** — CPU qty = sockets populated, RAM qty = DIMMs, multiple storage/NIC lines.
3. **Step 5 Quote** — running BOM, subtotal, **GST 18%**, grand total, quote number
   `Q-YYYY-NNNNN`, **snapshot prices** onto the saved quote, PDF + Excel export.
4. **Network step** — currently unfiltered; decide if/how to constrain by chassis slots.
5. **Auth / roles** — `user` (sales) vs `admin`; price visibility gated by role.
6. **Persistence** — save quotes; reference items by their `stock_id`.

See `../../docs/01_PRD.md` and `../../docs/data_model.md` for the full target spec.

---

## 9. Suggested build order

1. Load the 4 catalog CSVs into the store (mock store now, backend later).
2. Build Step 1 → Step 4 with the joins above (the explorer is your acceptance test —
   same picks should yield the same lists).
3. Add prices + the Quote step + export.
4. Wire auth/roles and persistence.
