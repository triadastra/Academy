// StorageNotice.tsx — the one place the app admits it could not save.
//
// Browser storage is finite and the previous implementation had no answer for
// running out: `localStorage.setItem` threw out of a click handler, React
// logged it to a console nobody had open, and the user carried on working in a
// session whose writes were all failing. They found out when they reloaded.
//
// A failed or compacted write now reaches this banner. It sits above
// everything, does not dismiss itself on a hard failure, and says what was
// lost rather than "an error occurred".
import { useEffect, useState } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { STORAGE_EVENT, type StorageStatusDetail, type WriteOutcome } from '@/database/storage'

export default function StorageNotice() {
  const [outcome, setOutcome] = useState<WriteOutcome | null>(null)

  useEffect(() => {
    const onStatus = (event: Event) => {
      const detail = (event as CustomEvent<StorageStatusDetail>).detail
      if (detail?.outcome) setOutcome(detail.outcome)
    }
    window.addEventListener(STORAGE_EVENT, onStatus)
    return () => window.removeEventListener(STORAGE_EVENT, onStatus)
  }, [])

  // A compaction is informational — the save succeeded — so it clears itself.
  // A failure means work is not being saved and must stay until acknowledged.
  useEffect(() => {
    if (outcome?.status !== 'compacted') return
    const timer = window.setTimeout(() => setOutcome(null), 12_000)
    return () => window.clearTimeout(timer)
  }, [outcome])

  if (!outcome || outcome.status === 'ok') return null

  const failed = outcome.status === 'failed'

  return (
    <div
      role="alert"
      className={`fixed top-0 inset-x-0 z-[100] flex items-start gap-3 px-4 py-3 text-[13px] leading-snug border-b ${
        failed
          ? 'bg-mark text-paper border-mark'
          : 'bg-surface text-ink border-rule'
      }`}
    >
      {failed ? (
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      ) : (
        <Info size={16} className="shrink-0 mt-0.5 text-ink-muted" />
      )}
      <div className="min-w-0 flex-1">
        {failed ? (
          <>
            <strong className="font-medium">Changes are not being saved.</strong>{' '}
            {outcome.message} Export your data from your profile before closing this tab.
          </>
        ) : (
          <>
            <strong className="font-medium">Storage was running out, so older history was
            removed to keep saving.</strong>{' '}
            Dropped: {outcome.dropped.join('; ')}.
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setOutcome(null)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-[120ms] ease-out"
      >
        <X size={16} />
      </button>
    </div>
  )
}
