import { Clock, Target, UserX, Radio } from 'lucide-react'
import type { StatsResponse } from '../api/client'

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

const INDUSTRY_AVG_RESPONSE_HOURS = 1.2

interface KpiRibbonProps {
  data?: KpiRibbonData | null
  stats?: StatsResponse | null
  loading?: boolean
}

function demoToDealAccent(actual: number, target: number): 'good' | 'warning' | 'danger' {
  if (target <= 0) return 'good'
  const pct = actual / target
  if (pct >= 1) return 'good'
  if (pct >= 0.5) return 'warning'
  return 'danger'
}

function noShowAccent(trend: { value: number }[]): 'good' | 'warning' | 'neutral' {
  if (trend.length === 0) return 'neutral'
  const latest = trend[trend.length - 1]?.value ?? 0
  if (latest === 0) return 'good'
  if (latest <= 5) return 'warning'
  return 'neutral'
}

function responseTimeAccent(hours: number): 'good' | 'warning' | 'neutral' {
  if (hours <= 1) return 'good'
  if (hours <= 2) return 'warning'
  return 'neutral'
}

const accentBorderClass = {
  good: 'border-l-4 border-[var(--color-kpi-good)]',
  warning: 'border-l-4 border-[var(--color-kpi-warning)]',
  danger: 'border-l-4 border-[var(--color-kpi-danger)]',
  neutral: 'border-l-4 border-[var(--color-kpi-neutral)]',
}

const accentTextClass = {
  good: 'text-[var(--color-kpi-good)]',
  warning: 'text-[var(--color-kpi-warning)]',
  danger: 'text-[var(--color-kpi-danger)]',
  neutral: 'text-[var(--color-navy)]',
}

export function KpiRibbon({ data = STUB_DATA, stats = null, loading = false }: KpiRibbonProps) {
  const kpis = data ?? STUB_DATA
  const demoAccent = demoToDealAccent(kpis.demoToDeal.actual, kpis.demoToDeal.target)
  const noShowAccentVal = noShowAccent(kpis.noShowRateTrend)
  const responseAccent = responseTimeAccent(kpis.leadResponseTimeHours)
  const progressPct = kpis.demoToDeal.target > 0
    ? Math.min(100, (kpis.demoToDeal.actual / kpis.demoToDeal.target) * 100)
    : 0
  const noShowMax = Math.max(1, ...kpis.noShowRateTrend.map((d) => d.value))

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-4)] mb-[var(--space-6)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-[var(--space-3)]" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-4)] mb-[var(--space-6)]" role="region" aria-label="Sales Command Center">
      {/* Card 1: Demo → Deal Rate */}
      <div className={`rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] ${accentBorderClass[demoAccent]}`}>
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <Target className={`h-4 w-4 ${accentTextClass[demoAccent]}`} aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">Demo → Deal Rate</h3>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${accentTextClass[demoAccent]}`}>{kpis.demoToDeal.actual}</p>
        <p className="text-xs text-slate-500">of {kpis.demoToDeal.target} target</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${demoAccent === 'good' ? 'bg-[var(--color-kpi-good)]' : demoAccent === 'warning' ? 'bg-[var(--color-kpi-warning)]' : 'bg-[var(--color-kpi-danger)]'}`}
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
        <p className={`text-[10px] mt-1 ${demoAccent === 'good' ? 'text-[var(--color-kpi-good)]' : 'text-[var(--color-kpi-danger)]'}`}>
          {demoAccent === 'good' ? 'On track' : '↓ Below target'}
        </p>
      </div>

      {/* Card 2: No-Show Rate */}
      <div className={`rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] ${accentBorderClass[noShowAccentVal]}`}>
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <UserX className={`h-4 w-4 ${accentTextClass[noShowAccentVal]}`} aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]" title="Downward trend = better attendance">
            No-Show Rate
          </h3>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${accentTextClass[noShowAccentVal]}`}>
          {kpis.noShowRateTrend.length > 0
            ? `${kpis.noShowRateTrend[kpis.noShowRateTrend.length - 1]?.value ?? 0}%`
            : '0%'}
        </p>
        <p className="text-xs text-slate-500">This month</p>
        {kpis.noShowRateTrend.length > 0 && (
          <div className="mt-2 flex items-end gap-0.5 h-6" aria-hidden>
            {kpis.noShowRateTrend.map((d) => (
              <div
                key={d.name}
                className="flex-1 min-w-[4px] rounded-sm bg-slate-200"
                style={{ height: `${noShowMax > 0 ? (d.value / noShowMax) * 100 : 0}%`, minHeight: '2px' }}
                title={`${d.name}: ${d.value}`}
              />
            ))}
          </div>
        )}
        <p className={`text-[10px] mt-1 ${noShowAccentVal === 'good' ? 'text-[var(--color-kpi-good)]' : 'text-slate-500'}`}>
          {noShowAccentVal === 'good' ? '↓ Improving' : 'Stable'}
        </p>
      </div>

      {/* Card 3: Lead Response Time */}
      <div className={`rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] ${accentBorderClass[responseAccent]}`}>
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <Clock className={`h-4 w-4 ${accentTextClass[responseAccent]}`} aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">Lead Response Time</h3>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${accentTextClass[responseAccent]}`}>
          {kpis.leadResponseTimeHours}h
        </p>
        <p className="text-xs text-slate-500">Avg speed-to-lead</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Industry avg: {INDUSTRY_AVG_RESPONSE_HOURS}h</p>
        <p className={`text-[10px] mt-1 ${responseAccent === 'good' ? 'text-[var(--color-kpi-good)]' : 'text-slate-500'}`}>
          {responseAccent === 'good' ? '↑ Excellent' : responseAccent === 'warning' ? 'Good' : 'Needs improvement'}
        </p>
      </div>

      {/* Card 4: Platform Reach */}
      <div className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)] border-l-4 border-[var(--color-primary)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <Radio className="h-4 w-4 text-[var(--color-primary)]" aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">Platform Reach</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-[var(--color-primary)]">{stats?.total_leads ?? 0}</p>
        <p className="text-xs text-slate-500">saved leads</p>
        {((stats?.by_stage as { new?: number } | undefined)?.new ?? 0) > 0 && (
          <span className="inline-flex items-center mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            +{(stats?.by_stage as { new?: number })?.new ?? 0} new
          </span>
        )}
        <p className="text-[10px] text-[var(--color-kpi-good)] mt-1">↑ Since last week</p>
      </div>
    </div>
  )
}
