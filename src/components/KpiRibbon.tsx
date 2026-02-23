import { Clock, Target, UserX } from 'lucide-react'

export interface KpiRibbonData {
  demoToDeal: { actual: number; target: number }
  noShowRateTrend: { name: string; value: number }[]
  leadResponseTimeHours: number
}

/** API response uses snake_case */
export interface KpiRibbonApiResponse {
  demo_to_deal: { actual: number; target: number }
  no_show_rate_trend: { name: string; value: number }[]
  lead_response_time_hours: number
}

const STUB_DATA: KpiRibbonData = {
  demoToDeal: { actual: 4, target: 10 },
  noShowRateTrend: [
    { name: 'W1', value: 7 },
    { name: 'W2', value: 5 },
    { name: 'W3', value: 4 },
    { name: 'W4', value: 3 },
  ],
  leadResponseTimeHours: 2.4,
}

interface KpiRibbonProps {
  data?: KpiRibbonData | null
  loading?: boolean
}

export function KpiRibbon({ data = STUB_DATA, loading = false }: KpiRibbonProps) {
  const kpis = data ?? STUB_DATA

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-4)] mb-[var(--space-6)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-[var(--space-3)]" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-4)] mb-[var(--space-6)]" role="region" aria-label="Sales Command Center">
      {/* Demo-to-Deal */}
      <div className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <Target className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">Demo-to-Deal</h3>
        </div>
        <div className="flex items-center gap-[var(--space-4)]">
          <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <span className="text-xl font-bold text-[var(--color-primary)]">{kpis.demoToDeal.actual}</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-navy)]">
              {kpis.demoToDeal.actual}<span className="text-slate-400 font-normal text-base">/{kpis.demoToDeal.target}</span>
            </p>
            <p className="text-xs text-slate-500">Target vs Actual</p>
          </div>
        </div>
      </div>

      {/* No-Show Rate */}
      <div className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <UserX className="h-4 w-4 text-[var(--color-warning)]" aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">No-Show Rate</h3>
        </div>
        <div className="h-16 flex items-center">
          <p className="text-sm text-slate-600">
            {kpis.noShowRateTrend.length > 0
              ? kpis.noShowRateTrend.map((d) => `${d.name}: ${d.value}`).join(' · ')
              : '—'}
          </p>
        </div>
        <p className="text-xs text-slate-500 mt-[var(--space-1)]">Downward trend = better attendance</p>
      </div>

      {/* Lead Response Time */}
      <div className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <Clock className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">Lead Response Time</h3>
        </div>
        <div className="flex items-baseline gap-[var(--space-1)]">
          <span className="text-2xl font-bold text-[var(--color-navy)] tabular-nums">
            {kpis.leadResponseTimeHours}h
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-[var(--space-1)]">Avg speed-to-lead</p>
      </div>
    </div>
  )
}
