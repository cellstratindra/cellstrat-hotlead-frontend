/**
 * Hot Leads by Cellstrat – logo mark + wordmark.
 * Uses theme variables for mobile-agnostic colors.
 */
interface HotLeadsLogoProps {
  /** Compact: icon only (e.g. narrow mobile header) */
  iconOnly?: boolean
  /** Size of the mark; affects overall scale */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { mark: 24, text: 'text-base', by: 'text-[10px]' },
  md: { mark: 28, text: 'text-lg', by: 'text-xs' },
  lg: { mark: 32, text: 'text-xl', by: 'text-sm' },
} as const

export function HotLeadsLogo({ iconOnly = false, size = 'md', className = '' }: HotLeadsLogoProps) {
  const { mark: markSize, text, by } = sizes[size]

  const mark = (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      {/* Flame: hot leads */}
      <path
        d="M12 2C10 5 7 8 7 13c0 3 2 5 5 5s5-2 5-5c0-5-3-8-5-11z"
        fill="currentColor"
        style={{ color: 'var(--color-primary)' }}
      />
    </svg>
  )

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} aria-label="Hot Leads by Cellstrat">
        {mark}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-[var(--space-2)] ${className}`}
      aria-label="Hot Leads by Cellstrat"
    >
      {mark}
      <span className="flex flex-col leading-tight">
        <span className={`font-bold text-[var(--color-navy)] ${text}`}>
          Hot Leads
        </span>
        <span className={`font-normal text-slate-500 ${by}`}>
          by Cellstrat
        </span>
      </span>
    </span>
  )
}
