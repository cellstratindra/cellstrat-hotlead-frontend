import { useState, useEffect } from 'react'
import type { HotLead } from '../types/leads'
import { X } from 'lucide-react'

export interface LeadDetailsUpdates {
  contact_email?: string
  director_name?: string
  note?: string
}

interface LeadDetailsDrawerProps {
  open: boolean
  onClose: () => void
  leads: HotLead[]
  onSave: (updates: LeadDetailsUpdates) => Promise<void>
  /** When true, show message that leads must be saved first (no ids) */
  requireSavedFirst?: boolean
  onSaveSelectedFirst?: () => Promise<void>
}

export function LeadDetailsDrawer({
  open,
  onClose,
  leads,
  onSave,
  requireSavedFirst = false,
  onSaveSelectedFirst,
}: LeadDetailsDrawerProps) {
  const [contactEmail, setContactEmail] = useState('')
  const [directorName, setDirectorName] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingFirst, setSavingFirst] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setContactEmail('')
    setDirectorName('')
    setNote('')
    setMessage(null)
    const withEmail = leads.find((l) => l.contact_email)
    const withDirector = leads.find((l) => l.director_name)
    if (withEmail?.contact_email) setContactEmail(withEmail.contact_email)
    if (withDirector?.director_name) setDirectorName(withDirector.director_name)
  }, [open, leads])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      await onSave({
        contact_email: contactEmail.trim() || undefined,
        director_name: directorName.trim() || undefined,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFirst() {
    if (!onSaveSelectedFirst) return
    setMessage(null)
    setSavingFirst(true)
    try {
      await onSaveSelectedFirst()
      onClose()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingFirst(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/40" aria-hidden onClick={onClose} />
      <aside
        className="fixed top-0 right-0 z-40 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-label="Add lead details"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Add details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {requireSavedFirst ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Selected leads are not saved yet. Save them to My Leads first, then you can add contact details from the My Leads page.
              </p>
              {message && <p className="text-sm text-red-600">{message}</p>}
              {onSaveSelectedFirst && (
                <button
                  type="button"
                  onClick={handleSaveFirst}
                  disabled={savingFirst}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingFirst ? 'Saving...' : 'Save selected to My Leads'}
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="drawer-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Contact email
                </label>
                <input
                  id="drawer-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="drawer-director" className="block text-sm font-medium text-slate-700 mb-1">
                  Director name
                </label>
                <input
                  id="drawer-director"
                  type="text"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Name"
                />
              </div>
              <div>
                <label htmlFor="drawer-note" className="block text-sm font-medium text-slate-700 mb-1">
                  Note
                </label>
                <textarea
                  id="drawer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Optional note (added to all selected leads)"
                />
              </div>
              {message && <p className="text-sm text-red-600">{message}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </aside>
    </>
  )
}
