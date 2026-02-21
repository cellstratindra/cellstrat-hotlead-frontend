import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { enrichLeads, saveLeads, searchLeads } from '../api/client'
import type { HotLead } from '../types/leads'
import { HotLeadsTable } from '../components/HotLeadsTable'
import { ExportCsvButton } from '../components/ExportCsvButton'

export function Dashboard() {
  const [city, setCity] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [region, setRegion] = useState('')
  const [leads, setLeads] = useState<HotLead[]>([])
  const [loading, setLoading] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSaveAll() {
    if (leads.length === 0) return
    setError(null)
    setSaveMessage(null)
    setSaving(true)
    try {
      const ids = await saveLeads(leads, city.trim() || undefined, specialty.trim() || undefined, region.trim() || undefined)
      setSaveMessage(`Saved ${ids.length} lead(s) to My Leads.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleEnrich() {
    if (leads.length === 0) return
    setError(null)
    setEnriching(true)
    try {
      const enriched = await enrichLeads(leads)
      setLeads(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    } finally {
      setEnriching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await searchLeads(city.trim(), specialty.trim(), region.trim() || undefined)
      setLeads(res.leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Hot Leads</h1>
            <Link to="/my-leads" className="text-blue-600 hover:underline">My Leads</Link>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
        <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Healthcare specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Country/Region (e.g. India)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && (
          <p className="mb-4 text-red-600" role="alert">
            {error}
          </p>
        )}
        {leads.length > 0 && (
          <>
            {saveMessage && <p className="mb-2 text-sm text-green-600">{saveMessage}</p>}
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <ExportCsvButton leads={leads} />
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save all'}
              </button>
              <button
                type="button"
                onClick={handleEnrich}
                disabled={enriching}
                className="rounded bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {enriching ? 'Enriching…' : 'Enrich with AI'}
              </button>
              <span className="text-sm text-gray-600">
                {leads.length} lead{leads.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <HotLeadsTable leads={leads} />
          </>
        )}
        {!loading && leads.length === 0 && !error && (
          <p className="text-gray-500">Enter a city and specialty, then click Search.</p>
        )}
      </div>
    </div>
  )
}
