import { useMemo } from 'react'
import { Input, Dropdown, IconSearch, IconClose } from '@/components/ui'
import {
  FILTERABLE_FIELDS,
  distinctValues,
  fieldLabel,
  type ActiveFilter,
} from './chassisFilter'
import type { ServerUnit } from '@/types/server'
import { cn } from '@/lib/cn'

/** Search box + dynamic, per-field filters (chips) over the full chassis dataset. */
export function ChassisFilters({
  data,
  search,
  onSearch,
  filters,
  onFiltersChange,
}: {
  data: ServerUnit[]
  search: string
  onSearch: (v: string) => void
  filters: ActiveFilter[]
  onFiltersChange: (f: ActiveFilter[]) => void
}) {
  // Fields not already in use are offered in the "Add filter" picker.
  const available = useMemo(
    () => FILTERABLE_FIELDS.filter((f) => !filters.some((af) => af.field === f.key)),
    [filters],
  )

  function addFilter(field: string) {
    if (!field) return
    onFiltersChange([...filters, { field, value: '' }])
  }
  function setValue(field: string, value: string) {
    onFiltersChange(filters.map((f) => (f.field === field ? { ...f, value } : f)))
  }
  function remove(field: string) {
    onFiltersChange(filters.filter((f) => f.field !== field))
  }

  return (
    // Search + active filter chips + add-filter all on one compact, wrapping row.
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative w-64 shrink-0">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch width={14} height={14} />
        </span>
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search brand, model…"
          className="h-8 py-1 pl-7 text-caption"
        />
      </div>

      <Dropdown
        value=""
        onChange={addFilter}
        options={available.map((f) => ({ value: f.key, label: f.label }))}
        placeholder="+ Add filter…"
        ariaLabel="Add filter"
        size="sm"
        className="w-40 shrink-0"
      />

      {filters.map((f) => (
        <FilterChip
          key={f.field}
          filter={f}
          options={distinctValues(data, f.field)}
          onChange={(v) => setValue(f.field, v)}
          onRemove={() => remove(f.field)}
        />
      ))}

      {(filters.length > 0 || search) && (
        <button
          onClick={() => {
            onSearch('')
            onFiltersChange([])
          }}
          className="shrink-0 text-caption font-medium text-muted hover:text-primary"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

function FilterChip({
  filter,
  options,
  onChange,
  onRemove,
}: {
  filter: ActiveFilter
  options: string[]
  onChange: (v: string) => void
  onRemove: () => void
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-control border pl-2.5 pr-1 text-caption',
        filter.value ? 'border-accent/40 bg-accent-soft/40' : 'border-border bg-surface',
      )}
    >
      <span className="font-semibold text-secondary">{fieldLabel(filter.field)}:</span>
      <Dropdown
        value={filter.value}
        onChange={onChange}
        options={[{ value: '', label: 'any' }, ...options.map((o) => ({ value: o, label: o }))]}
        placeholder="any"
        ariaLabel={`${fieldLabel(filter.field)} value`}
        className="w-auto"
        buttonClassName="border-0 bg-transparent px-1 py-0 hover:bg-transparent max-w-[200px]"
        menuWidth="min-w-[12rem]"
      />
      <button
        onClick={onRemove}
        aria-label={`Remove ${fieldLabel(filter.field)} filter`}
        className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted hover:bg-subtle hover:text-danger"
      >
        <IconClose width={13} height={13} />
      </button>
    </span>
  )
}
