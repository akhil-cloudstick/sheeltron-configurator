import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controlBase =
  'w-full rounded-control border bg-surface px-3 py-2 text-body text-primary placeholder:text-muted ' +
  'transition-colors duration-fast focus:outline-none focus-visible:outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/40'

export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-caption font-semibold text-secondary">
          {label}
          {required && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden />}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(controlBase, invalid ? 'border-danger' : 'border-border', className)}
      {...rest}
    />
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(controlBase, 'pr-8', invalid ? 'border-danger' : 'border-border', className)}
      {...rest}
    >
      {children}
    </select>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(controlBase, 'resize-y', invalid ? 'border-danger' : 'border-border', className)}
      {...rest}
    />
  )
})
