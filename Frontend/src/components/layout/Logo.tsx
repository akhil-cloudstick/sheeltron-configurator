import { cn } from '@/lib/cn'
import logoUrl from '@/assets/sheeltron-logo.png'

/**
 * Brand logo (swirl icon + SHEELTRON wordmark, red-on-transparent).
 * Source PNG lives at src/assets/sheeltron-logo.png (docs/04_VISUAL_DESIGN.md §2.7).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Sheeltron"
      className={cn('h-8 w-auto select-none', className)}
    />
  )
}
