import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover border border-transparent',
  secondary: 'bg-surface text-secondary border border-border-strong hover:bg-subtle',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90',
  ghost: 'bg-transparent text-secondary hover:bg-subtle border border-transparent',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-9 px-5 text-body',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors duration-fast',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
}

export function IconButton({ label, tone = 'default', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-control border border-border bg-surface transition-colors duration-fast',
        tone === 'danger' ? 'text-muted hover:text-danger hover:border-danger' : 'text-muted hover:text-primary hover:bg-subtle',
        className,
      )}
      {...rest}
    />
  )
}
