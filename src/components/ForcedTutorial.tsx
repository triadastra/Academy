// ForcedTutorial.tsx — the one stepper both first-run tutorials use.
//
// Escape and clicks on the backdrop do nothing, so it cannot be dismissed by
// accident. The ways out are the last step's button and, when the caller passes
// `onSkip`, an explicit "Skip tutorial" button on every step. Either ending is
// remembered by the caller (recordTutorial in client.ts), in a browser cookie
// and on the account, so it does not come back.
//
// A step may name a `target` — the `data-tour` key of something on the page
// (the course rail marks its nav items this way). When that element is on
// screen it is ringed, so "Chat lives here" points at the real Chat link
// rather than describing where it might be.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react'
import Crest from '@/components/Crest'

export interface TutorialStep {
  /** Short label above the title ("Step 2"), defaults to the step counter. */
  eyebrow?: string
  title: string
  body: ReactNode
  icon?: ReactNode
  /** `data-tour` key of an element to highlight while this step is showing. */
  target?: string
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function targetRect(target: string | undefined): Rect | null {
  if (!target) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  // Collapsed off-canvas (mobile rail) or display:none — nothing to point at.
  if (r.width === 0 || r.height === 0 || r.right <= 0 || r.left >= window.innerWidth) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export default function ForcedTutorial({
  label,
  steps,
  finishLabel,
  onFinish,
  onSkip,
}: {
  /** Accessible name for the dialog. */
  label: string
  steps: TutorialStep[]
  finishLabel: string
  onFinish: () => void
  /** Shows "Skip tutorial" on every step. */
  onSkip?: () => void
}) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const last = index === steps.length - 1
  const [ring, setRing] = useState<Rect | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const measure = useCallback(() => setRing(targetRect(step.target)), [step.target])

  useLayoutEffect(() => {
    // Next frame rather than inline: the target is read from the laid-out DOM.
    const frame = window.requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // The rail can still be laying out (lazy route chunk, collapse animation)
    // when the step first renders; one late re-measure catches that.
    const late = window.setTimeout(measure, 250)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearTimeout(late)
    }
  }, [measure])

  // Keep keyboard focus inside the card, on the primary action.
  useEffect(() => {
    nextRef.current?.focus()
  }, [index])

  // Lock the page behind while the tutorial is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      // Deliberately swallowed: the tutorial is not dismissable.
      event.preventDefault()
      event.stopPropagation()
    } else if (event.key === 'ArrowRight' && !last) {
      setIndex((i) => i + 1)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      setIndex((i) => i - 1)
    } else if (event.key === 'Tab') {
      // Minimal focus trap: cycle between the card's own buttons.
      const card = event.currentTarget as HTMLElement
      const focusable = Array.from(card.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const final = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        final.focus()
      } else if (!event.shiftKey && document.activeElement === final) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[80]" onKeyDown={onKeyDown}>
      {/* Backdrop. With a target, the ring's huge box-shadow *is* the
          backdrop, leaving a clear hole over the highlighted element. */}
      {ring ? (
        <div
          aria-hidden="true"
          className="fixed rounded-control ring-2 ring-paper pointer-events-none transition-all duration-200 ease-out"
          style={{
            top: ring.top - 4,
            left: ring.left - 4,
            width: ring.width + 8,
            height: ring.height + 8,
            boxShadow: '0 0 0 9999px rgba(22, 25, 26, 0.62)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-ink/60" />
      )}

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="relative w-full max-w-[460px] bg-surface border border-rule rounded-card shadow-xl p-6 sm:p-7"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crest size={26} tone="dark" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                {step.eyebrow ?? `Step ${index + 1} of ${steps.length}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-ink-muted">
                {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
              </span>
              {onSkip && !last ? (
                <button
                  type="button"
                  onClick={onSkip}
                  className="flex items-center gap-1 rounded-control px-2 py-1 text-[12px] text-ink-muted hover:bg-paper hover:text-ink transition-colors duration-[120ms] ease-out"
                >
                  <SkipForward size={13} />
                  Skip tutorial
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3.5">
            {step.icon ? (
              <span className="mt-0.5 w-10 h-10 rounded-card bg-board-tint text-board flex items-center justify-center shrink-0">
                {step.icon}
              </span>
            ) : null}
            <h2 className="font-serif text-[28px] leading-[1.1] text-ink">{step.title}</h2>
          </div>

          <div className="mt-4 text-[14px] leading-relaxed text-ink-muted [&_strong]:text-ink [&_strong]:font-medium [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p+p]:mt-2.5 [&_a]:text-board [&_a]:underline [&_a]:underline-offset-2">
            {step.body}
          </div>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-200 ${
                  i === index ? 'w-6 bg-board' : i < index ? 'w-3 bg-board/50' : 'w-3 bg-rule'
                }`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink disabled:opacity-0 disabled:pointer-events-none transition-colors duration-[120ms] ease-out px-1 py-2"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? onFinish() : setIndex((i) => i + 1))}
              className="flex items-center gap-2 bg-board text-surface text-[14px] font-medium rounded-control px-5 py-2.5 hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              {last ? finishLabel : 'Next'}
              {last ? <Check size={15} /> : <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
