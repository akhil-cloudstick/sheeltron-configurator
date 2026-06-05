import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('scroll-thin overflow-x-auto rounded-card border border-border bg-surface', className)}>
      <table className="w-full border-collapse text-body">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="sticky top-0 z-10 border-b border-border bg-subtle">{children}</thead>
}

export function TH({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-3 py-2 text-left text-meta font-semibold uppercase text-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function TR({
  children,
  className,
  flash,
}: {
  children: ReactNode
  className?: string
  flash?: boolean
}) {
  return (
    <tr className={cn('border-b border-border last:border-0 hover:bg-subtle/70', flash && 'row-flash', className)}>
      {children}
    </tr>
  )
}

export function TD({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={cn('px-3 py-2 align-middle text-secondary', className)} {...rest}>
      {children}
    </td>
  )
}

/** Right-aligned actions cell. */
export function TDActions({ children }: { children: ReactNode }) {
  return (
    <td className="px-3 py-2 text-right">
      <div className="flex justify-end gap-1">{children}</div>
    </td>
  )
}
