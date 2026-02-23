import { useEffect, useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { getCoverage } from '../api/client'
import type { CoverageResponse } from '../api/client'

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']

export function Coverage() {
  const [data, setData] = useState<CoverageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCoverage()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const chartData = useMemo(() => {
    if (!data?.cities?.length) return []
    const total = data.total_clinics || 1
    return data.cities
      .map((city) => ({
        city,
        clinics: data.city_counts[city] ?? 0,
        share: Math.round(((data.city_counts[city] ?? 0) / total) * 100),
      }))
      .sort((a, b) => b.clinics - a.clinics)
  }, [data])

  const topCity = chartData[0] ?? null
  const emergingCity = chartData.length > 1 ? chartData[chartData.length - 1] : null

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] p-[var(--edge-padding)] md:p-[var(--space-6)] pb-20 md:pb-[var(--space-6)]">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-[var(--space-4)] text-sm text-slate-500" aria-label="Breadcrumb">
          <span>Analytics</span>
          <span className="mx-[var(--space-2)]">›</span>
          <span className="font-medium text-[var(--color-navy)]">Coverage</span>
        </nav>

        {loading && (
          <div className="flex items-center gap-[var(--space-2)] text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
            Loading coverage…
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-[var(--space-4)] py-[var(--space-3)] text-red-700" role="alert">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* At-a-glance metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-4)] mb-[var(--space-6)]">
              <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-5)] shadow-[var(--shadow-card)]">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total pipeline reach</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-navy)]">{data.total_clinics}</p>
                <p className="text-sm text-slate-500 mt-0.5">Clinics</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-5)] shadow-[var(--shadow-card)]">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Market saturation</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-navy)]">{data.cities.length}</p>
                <p className="text-sm text-slate-500 mt-0.5">Cities</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-5)] shadow-[var(--shadow-card)]">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Lead velocity</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-navy)]">—</p>
                <p className="text-sm text-slate-500 mt-0.5">Avg. time in pipeline</p>
              </div>
            </div>

            {data.cities.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-[var(--space-6)] text-center text-slate-500">
                No saved leads yet. Save leads from the Dashboard to see coverage.
              </div>
            ) : (
              <>
                {/* Desktop: two-column distribution (60% chart, 40% sidebar) */}
                <div className="hidden md:grid md:grid-cols-[1fr_minmax(200px,320px)] gap-[var(--space-6)]">
                  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-5)] shadow-[var(--shadow-card)] min-h-[280px]">
                    <h2 className="text-sm font-semibold text-[var(--color-navy)] mb-[var(--space-4)]">Clinic distribution by city</h2>
                    <div className="h-[240px] w-full min-w-0" style={{ minHeight: 240 }}>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="city" width={90} tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number) => [value, 'Clinics']}
                            labelFormatter={(label) => label}
                            contentStyle={{ borderRadius: 'var(--radius-button)', border: 'var(--border-default)' }}
                          />
                          <Bar dataKey="clinics" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex flex-col gap-[var(--space-4)]">
                    {topCity && (
                      <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Top performing city</p>
                        <p className="mt-1 font-semibold text-[var(--color-navy)]">{topCity.city}</p>
                        <p className="text-lg font-bold text-[var(--color-primary)]">{topCity.clinics} clinics</p>
                        <p className="text-xs text-slate-500">{topCity.share}% of pipeline</p>
                      </div>
                    )}
                    {emergingCity && emergingCity.city !== topCity?.city && (
                      <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Emerging market</p>
                        <p className="mt-1 font-semibold text-[var(--color-navy)]">{emergingCity.city}</p>
                        <p className="text-lg font-bold text-slate-700">{emergingCity.clinics} clinics</p>
                        <p className="text-xs text-slate-500">{emergingCity.share}% of pipeline</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile: compact progress list */}
                <div className="md:hidden space-y-[var(--space-4)]">
                  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
                    <h2 className="text-sm font-semibold text-[var(--color-navy)] mb-[var(--space-4)]">Clinic distribution</h2>
                    <ul className="space-y-[var(--space-3)]">
                      {chartData.map((row, i) => (
                        <li key={row.city} className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-800">{row.city}</span>
                            <span className="text-slate-600">{row.clinics} ({row.share}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.share}%`,
                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {topCity && (
                    <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white/90 backdrop-blur-sm p-[var(--space-4)] shadow-[var(--shadow-card)]">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Top city</p>
                      <p className="mt-1 font-semibold text-[var(--color-navy)]">{topCity.city}</p>
                      <p className="text-[var(--color-primary)] font-bold">{topCity.clinics} clinics</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
