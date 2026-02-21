import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addSourceToFeature,
  createProductFeature,
  getLeads,
  getSourcesForFeature,
  listProductFeatures,
  mergeProductFeatures,
  syncFeaturesFromReviews,
  updateProductFeature,
} from '../api/client'
import type { FeatureSourceItem } from '../api/client'
import type { ProductFeature } from '../types/leads'

export function ProductBacklog() {
  const [features, setFeatures] = useState<ProductFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [renameOpen, setRenameOpen] = useState<{ id: number; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSubmitting, setRenameSubmitting] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeFrom, setMergeFrom] = useState<number | null>(null)
  const [mergeInto, setMergeInto] = useState<number | null>(null)
  const [mergeSubmitting, setMergeSubmitting] = useState(false)
  const [sourcesForFeature, setSourcesForFeature] = useState<{ featureId: number; featureName: string; sources: FeatureSourceItem[] } | null>(null)
  const [tagSourceOpen, setTagSourceOpen] = useState<{ featureId: number; featureName: string } | null>(null)
  const [tagLeadId, setTagLeadId] = useState<number | ''>('')
  const [tagManualName, setTagManualName] = useState('')
  const [tagSubmitting, setTagSubmitting] = useState(false)
  const [savedLeads, setSavedLeads] = useState<{ id: number; name: string }[]>([])
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await listProductFeatures()
      setFeatures(res.features)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load product features')
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    setAddSubmitting(true)
    try {
      await createProductFeature(addName.trim())
      setAddName('')
      setAddOpen(false)
      await load()
    } finally {
      setAddSubmitting(false)
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameOpen || !renameValue.trim()) return
    setRenameSubmitting(true)
    try {
      await updateProductFeature(renameOpen.id, { canonical_name: renameValue.trim() })
      setRenameOpen(null)
      setRenameValue('')
      await load()
    } finally {
      setRenameSubmitting(false)
    }
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault()
    if (mergeFrom == null || mergeInto == null || mergeFrom === mergeInto) return
    setMergeSubmitting(true)
    try {
      await mergeProductFeatures(mergeFrom, mergeInto)
      setMergeOpen(false)
      setMergeFrom(null)
      setMergeInto(null)
      await load()
    } finally {
      setMergeSubmitting(false)
    }
  }

  async function handleViewSources(featureId: number) {
    const feature = features.find((f) => f.id === featureId)
    const res = await getSourcesForFeature(featureId)
    setSourcesForFeature({ featureId, featureName: feature?.canonical_name ?? 'Feature', sources: res.sources })
  }

  async function openTagSource(featureId: number) {
    const feature = features.find((f) => f.id === featureId)
    setTagSourceOpen({ featureId, featureName: feature?.canonical_name ?? 'Feature' })
    setTagLeadId('')
    setTagManualName('')
    try {
      const leads = await getLeads()
      setSavedLeads(leads.map((l) => ({ id: l.id, name: l.name })))
    } catch {
      setSavedLeads([])
    }
  }

  async function handleTagSource(e: React.FormEvent) {
    e.preventDefault()
    if (!tagSourceOpen) return
    const useLead = tagLeadId !== ''
    const useManual = tagManualName.trim() !== ''
    if (!useLead && !useManual) return
    setTagSubmitting(true)
    try {
      await addSourceToFeature(tagSourceOpen.featureId, {
        lead_id: useLead ? Number(tagLeadId) : null,
        source_label: useManual ? tagManualName.trim() : null,
      })
      setTagSourceOpen(null)
      setTagLeadId('')
      setTagManualName('')
      if (sourcesForFeature?.featureId === tagSourceOpen.featureId) {
        const res = await getSourcesForFeature(tagSourceOpen.featureId)
        setSourcesForFeature((prev) => (prev ? { ...prev, sources: res.sources } : null))
      }
      await load()
    } finally {
      setTagSubmitting(false)
    }
  }

  async function handleSyncFromReviews() {
    setSyncMessage(null)
    setSyncLoading(true)
    try {
      const saved = await getLeads()
      const ids = saved.map((l) => l.id)
      if (ids.length === 0) {
        setSyncMessage('No saved leads. Save leads from Dashboard first.')
      } else {
        const res = await syncFeaturesFromReviews(ids)
        setSyncMessage(`Synced ${res.synced} lead(s); ${res.occurrences_created} feature occurrence(s) created.`)
        await load()
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Product backlog (CellAssist)</h1>
        <p className="text-sm text-gray-600 mb-4">Canonical features with occurrence count. Add from reviews, meetings, or manually.</p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Add feature
          </button>
          <button
            type="button"
            onClick={() => setMergeOpen(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Merge features
          </button>
          <button
            type="button"
            onClick={handleSyncFromReviews}
            disabled={syncLoading}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {syncLoading ? 'Syncing…' : 'Sync from reviews'}
          </button>
          {syncMessage && <span className="text-sm text-gray-600">{syncMessage}</span>}
        </div>
        {loadError && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
            <button type="button" onClick={() => load()} className="ml-2 underline">Retry</button>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : features.length === 0 && !loadError ? (
          <p className="text-sm text-gray-500">No features yet. Add one or sync from reviews on the Dashboard.</p>
        ) : features.length > 0 ? (
          <div className="rounded border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-800">Feature</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-800 w-24">Score</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-900">{f.canonical_name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{f.occurrence_count ?? 0}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewSources(f.id)}
                          className="text-blue-600 hover:underline"
                        >
                          View sources
                        </button>
                        <button
                          type="button"
                          onClick={() => openTagSource(f.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Tag lead
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRenameOpen({ id: f.id, name: f.canonical_name }); setRenameValue(f.canonical_name) }}
                          className="text-gray-600 hover:underline"
                        >
                          Rename
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {sourcesForFeature && (
          <div className="mt-4 rounded border border-gray-200 bg-white p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Where &quot;{sourcesForFeature.featureName}&quot; came from</h2>
            <p className="text-xs text-gray-500 mb-2">Tagged leads or manually saved names.</p>
            <div className="mb-2">
              <button
                type="button"
                onClick={() => openTagSource(sourcesForFeature.featureId)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Tag lead or add manual name
              </button>
            </div>
            <ul className="space-y-1">
              {sourcesForFeature.sources.length === 0 ? (
                <li className="text-sm text-gray-500">None yet. Tag a saved lead or add a manual name above.</li>
              ) : (
                sourcesForFeature.sources.map((s) => (
                  <li key={s.occurrence_id} className="text-sm">
                    {s.lead_id != null ? (
                      <Link to={`/leads/${s.lead_id}`} className="text-blue-600 hover:underline">
                        {s.lead_name || `Lead #${s.lead_id}`}
                      </Link>
                    ) : (
                      <span className="text-gray-700">{s.source_label || '—'}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
            <button type="button" onClick={() => setSourcesForFeature(null)} className="mt-2 text-sm text-gray-500 hover:underline">Close</button>
          </div>
        )}
        {tagSourceOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !tagSubmitting && setTagSourceOpen(null)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Tag lead or add source for &quot;{tagSourceOpen.featureName}&quot;</h3>
              <form onSubmit={handleTagSource} className="flex flex-col gap-3">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Saved lead (optional)</span>
                  <select
                    value={tagLeadId}
                    onChange={(e) => setTagLeadId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">— Pick a lead —</option>
                    {savedLeads.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Or manual name (e.g. conference, prospect)</span>
                  <input
                    type="text"
                    value={tagManualName}
                    onChange={(e) => setTagManualName(e.target.value)}
                    placeholder="e.g. Dr. Smith - Mumbai conference"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setTagSourceOpen(null)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button
                    type="submit"
                    disabled={tagSubmitting || (tagLeadId === '' && !tagManualName.trim())}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {tagSubmitting ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {addOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !addSubmitting && setAddOpen(false)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Add feature</h3>
              <form onSubmit={handleAdd} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Canonical name"
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setAddOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button type="submit" disabled={addSubmitting || !addName.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {renameOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !renameSubmitting && setRenameOpen(null)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Rename feature</h3>
              <form onSubmit={handleRename} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="New name"
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setRenameOpen(null)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button type="submit" disabled={renameSubmitting || !renameValue.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {mergeOpen && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50" onClick={() => !mergeSubmitting && setMergeOpen(false)}>
            <div className="rounded-lg bg-white p-4 shadow-xl max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-gray-900 mb-2">Merge features</h3>
              <p className="text-xs text-gray-500 mb-3">Merge the first into the second. All occurrences will move; the first feature will be removed.</p>
              <form onSubmit={handleMerge} className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">From (will be removed)</label>
                <select
                  value={mergeFrom ?? ''}
                  onChange={(e) => setMergeFrom(e.target.value ? Number(e.target.value) : null)}
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>{f.canonical_name}</option>
                  ))}
                </select>
                <label className="text-sm font-medium text-gray-700">Into (keep this one)</label>
                <select
                  value={mergeInto ?? ''}
                  onChange={(e) => setMergeInto(e.target.value ? Number(e.target.value) : null)}
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Select…</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id} disabled={f.id === mergeFrom}>{f.canonical_name}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end mt-2">
                  <button type="button" onClick={() => setMergeOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
                  <button type="submit" disabled={mergeSubmitting || mergeFrom == null || mergeInto == null || mergeFrom === mergeInto} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Merge</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
