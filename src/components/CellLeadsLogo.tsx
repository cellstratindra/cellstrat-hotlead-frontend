/**
 * CellLeads Pro by Cellstrat – logo mark + wordmark.
 * Uses theme variables for mobile-agnostic colors.
 */
interface CellLeadsLogoProps {
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

export function CellLeadsLogo({ iconOnly = false, size = 'md', className = '' }: CellLeadsLogoProps) {
  const { mark: markSize, text, by } = sizes[size]

  const mark = (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect width={28} height={28} rx={8} fill="var(--color-primary)" />
      <circle cx={14} cy={14} r={5} fill="white" />
      <circle cx={7} cy={10} r={2.5} fill="rgba(255,255,255,.5)" />
      <circle cx={21} cy={10} r={2.5} fill="rgba(255,255,255,.5)" />
      <circle cx={10} cy={21} r={2.5} fill="rgba(255,255,255,.5)" />
      <circle cx={18} cy={21} r={2.5} fill="rgba(255,255,255,.5)" />
    </svg>
  )

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} aria-label="CellLeads Pro by Cellstrat">
        {mark}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-[var(--space-2)] ${className}`}
      aria-label="CellLeads Pro by Cellstrat"
    >
      {mark}
      <span className="flex flex-col leading-tight">
        <span className={`font-extrabold text-[var(--color-navy)] ${text}`} style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' }}>
          CellLeads<span className="text-[var(--color-accent2)]">.</span>
        </span>
        <span className={`font-normal text-slate-500 ${by}`}>
          by Cellstrat
        </span>
      </span>
    </span>
  )
}
