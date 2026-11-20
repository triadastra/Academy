// AccessVideo.tsx — the IDX "How to access Synonance" walkthrough.
//
// Compulsory but skippable: a first-time visitor to /login is put in front of
// it before anything else (it cannot be dismissed with Escape or a backdrop
// click), but "Skip video" is always one click away. Watching to the end or
// skipping both count as seen; it can be replayed from the sign-in card.
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, SkipForward } from 'lucide-react'
import Crest from '@/components/Crest'

export const ACCESS_VIDEO_SRC = '/media/how-to-access-synonance.mp4'
const ACCESS_VIDEO_POSTER = '/media/how-to-access-synonance.jpg'

export default function AccessVideo({ onDone }: { onDone: (outcome: 'done' | 'skipped') => void }) {
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(false)
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (ended || failed) continueRef.current?.focus()
  }, [ended, failed])

  return (
    <div
      className="fixed inset-0 z-[90] bg-ink/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to access Synonance"
        className="w-full max-w-[960px] bg-surface border border-rule rounded-card shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-rule">
          <div className="flex items-center gap-2.5 min-w-0">
            <Crest size={24} tone="dark" />
            <div className="min-w-0">
              <div className="font-serif text-[20px] leading-none text-ink truncate">
                How to access Synonance
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Watch first · about 4 minutes
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDone('skipped')}
            className="shrink-0 flex items-center gap-1.5 border border-rule text-ink text-[13px] font-medium rounded-control px-3 py-2 hover:bg-paper transition-colors duration-[120ms] ease-out"
          >
            <SkipForward size={14} />
            Skip video
          </button>
        </div>

        <div className="bg-black">
          {failed ? (
            <div className="aspect-video flex items-center justify-center px-6 text-center text-[14px] text-paper/80">
              The video could not be loaded. Continue to the written guide instead.
            </div>
          ) : (
            <video
              className="block w-full aspect-video"
              src={ACCESS_VIDEO_SRC}
              poster={ACCESS_VIDEO_POSTER}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onEnded={() => setEnded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
          <p className="text-[12px] leading-relaxed text-ink-muted">
            {ended || failed
              ? 'Next: a short written checklist of the same steps.'
              : 'Covers your Launchpad account, verifying at school, and setting up your courses.'}
          </p>
          <button
            ref={continueRef}
            type="button"
            onClick={() => onDone('done')}
            disabled={!ended && !failed}
            className="shrink-0 flex items-center gap-2 bg-board text-surface text-[14px] font-medium rounded-control px-4 py-2.5 hover:bg-board-deep disabled:opacity-40 disabled:hover:bg-board transition-colors duration-[120ms] ease-out"
          >
            Continue
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
