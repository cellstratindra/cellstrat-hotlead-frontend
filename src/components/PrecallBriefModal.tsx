import { X } from 'lucide-react'

interface PrecallBriefModalProps {
  open: boolean
  onClose: () => void
  leadName: string
  painPoints: string[]
  praise: string[]
  hook: string
}

export function PrecallBriefModal({
  open,
  onClose,
  leadName,
  painPoints,
  praise,
  hook,
}: PrecallBriefModalProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Pre-call brief"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Pre-call brief</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium text-slate-700">{leadName}</p>

          {painPoints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-1">Pain points</h3>
              <ul className="list-disc list-inside text-sm text-slate-800 space-y-0.5">
                {painPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {praise.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-1">Praise</h3>
              <ul className="list-disc list-inside text-sm text-slate-800 space-y-0.5">
                {praise.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {hook && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Winning hook</h3>
              <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border-l-4 border-blue-500">
                {hook}
              </p>
            </div>
          )}

          {painPoints.length === 0 && praise.length === 0 && !hook && (
            <p className="text-sm text-slate-500">Run &quot;Enrich with AI&quot; or &quot;Get insights&quot; on this lead to populate pain points, praise, and hook.</p>
          )}
        </div>
      </div>
    </>
  )
}
