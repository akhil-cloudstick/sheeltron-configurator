import { IconChevronLeft, IconChevronRight } from './Icons'
import { cn } from '@/lib/cn'

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number
  limit: number
  total: number
  onPage: (next: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2 text-caption text-muted">
      <span>
        {from}–{to} of <span className="font-semibold text-secondary">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)} label="Previous page">
          <IconChevronLeft />
        </PageBtn>
        <span className="px-2 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <PageBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)} label="Next page">
          <IconChevronRight />
        </PageBtn>
      </div>
    </div>
  )
}

function PageBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-control border border-border bg-surface text-secondary',
        'hover:bg-subtle disabled:opacity-30 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}
