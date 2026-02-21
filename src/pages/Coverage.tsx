import { useEffect, useState } from 'react'
import { getCoverage } from '../api/client'

export function Coverage() {
  const [data, setData] = useState<{ cities: string[]; city_counts: Record<string, number>; total_clinics: number } | null>(null)
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Coverage</h1>
        </header>
        {loading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden />
            Loading coverage…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</div>
        )}
        {data && !loading && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-gray-700">
              <strong>Total clinics in pipeline:</strong> {data.total_clinics}
            </p>
            <p className="mb-4 text-gray-700">
              <strong>Cities:</strong> {data.cities.length}
            </p>
            <div className="overflow-x-auto rounded border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">City</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Clinics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.cities.map((city) => (
                    <tr key={city} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{city}</td>
                      <td className="px-4 py-2">{data.city_counts[city] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.cities.length === 0 && (
              <p className="text-gray-500">No saved leads yet. Save leads from the Dashboard to see coverage.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
