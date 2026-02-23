import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
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
  const demoChartData = [
    { name: 'Done', value: kpis.demoToDeal.actual, color: 'var(--color-primary)' },
    { name: 'Remaining', value: Math.max(0, kpis.demoToDeal.target - kpis.demoToDeal.actual), color: 'rgb(226 232 240)' },
  ]

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
          <div className="h-16 w-16 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demoChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={18}
                  outerRadius={28}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {demoChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-navy)]">
              {kpis.demoToDeal.actual}<span className="text-slate-400 font-normal text-base">/{kpis.demoToDeal.target}</span>
            </p>
            <p className="text-xs text-slate-500">Target vs Actual</p>
          </div>
        </div>
      </div>

      {/* No-Show Rate: vertical bars on mobile for at-a-glance, line on desktop */}
      <div className="rounded-[var(--radius-card)] border-default bg-white/80 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-2)]">
          <UserX className="h-4 w-4 text-[var(--color-warning)]" aria-hidden />
          <h3 className="text-sm font-medium text-[var(--color-navy)]">No-Show Rate</h3>
        </div>
        <div className="h-16 md:hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpis.noShowRateTrend} layout="vertical" margin={{ top: 4, right: 4, left: 24, bottom: 0 }}>
              <XAxis type="number" hide domain={[0, 'auto']} />
              <YAxis type="category" dataKey="name" width={24} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [v, 'No-shows']} />
              <Bar dataKey="value" fill="var(--color-warning)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-16 hidden md:block">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpis.noShowRateTrend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="name" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip formatter={(v: number) => [v, 'No-shows']} />
              <Line type="monotone" dataKey="value" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
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
