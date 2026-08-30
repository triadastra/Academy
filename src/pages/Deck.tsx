// Deck — /teacher/deck (ref syn_p22.png).
// Top bar with wordmark + teacher chip; large slide card with KaTeX content
// and a mandatory citation line; 28-segment progress bar with current-slide
// marker; prev/next cycling through 3 prepared slides; right panel with
// outline tree + source status card. Outline button toggles the panel.
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Pencil,
  MoreVertical,
  CheckCircle2,
  List,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Tex from '@/components/Tex'

// ── Slides (3 prepared, cycled by prev/next) ───────────────────────────────
interface Slide {
  eyebrow: string
  title: string
  body: ReactNode
  note: ReactNode
  citation: string
  slideNo: number
}

const SLIDES: Slide[] = [
  {
    eyebrow: '2.4',
    title: 'Integration by parts',
    body: (
      <Tex display className="text-[28px]">
        {'\\int u \\; dv \\; = \\; u v \\; - \\; \\int v \\; du'}
      </Tex>
    ),
    note: (
      <>
        Choose u by <span className="font-medium">LIATE</span>: logarithmic, inverse trig,
        algebraic, trigonometric, exponential.
      </>
    ),
    citation: 'Lecture 6 · p.7',
    slideNo: 12,
  },
  {
    eyebrow: '2.4',
    title: 'Worked example — ∫ x e^x dx',
    body: (
      <div className="flex flex-col items-center gap-3">
        <Tex display className="text-[22px]">
          {'u = x, \\quad dv = e^x \\, dx \\;\\;\\Rightarrow\\;\\; du = dx, \\quad v = e^x'}
        </Tex>
        <Tex display className="text-[22px]">
          {'\\int x e^x \\, dx \\; = \\; x e^x - \\int e^x \\, dx \\; = \\; x e^x - e^x + C'}
        </Tex>
      </div>
    ),
    note: (
      <>
        Differentiate the algebraic factor; integrate the exponential. Check by
        differentiating the answer.
      </>
    ),
    citation: 'Lecture 6 · p.8',
    slideNo: 13,
  },
  {
    eyebrow: '2.4',
    title: 'Choosing u — LIATE summary',
    body: (
      <div className="flex flex-col items-center gap-2 font-mono text-[14px] text-ink">
        <div>L — logarithmic &nbsp;(ln x)</div>
        <div>I — inverse trig &nbsp;(arctan x)</div>
        <div>A — algebraic &nbsp;(x²)</div>
        <div>T — trigonometric &nbsp;(sin x)</div>
        <div>E — exponential &nbsp;(e^x)</div>
      </div>
    ),
    note: (
      <>
        Pick u as the earliest type in LIATE present in the integrand. For{' '}
        <Tex>{'\\int x^2 \\sin x \\, dx'}</Tex>, apply integration by parts twice.
      </>
    ),
    citation: 'Lecture 6 · p.9',
    slideNo: 14,
  },
]

const TOTAL_SLIDES = 28

// ── Outline tree ───────────────────────────────────────────────────────────
interface OutlineNode {
  code: string
  title: string
  slides: number
  children?: OutlineNode[]
  highlighted?: boolean
}

const OUTLINE: OutlineNode[] = [
  { code: '1', title: 'Introduction', slides: 3 },
  {
    code: '2',
    title: 'Techniques of Integration',
    slides: 7,
    children: [
      { code: '2.1', title: 'Substitution', slides: 2 },
      { code: '2.2', title: 'Trigonometric Substitution', slides: 2 },
      { code: '2.3', title: 'Partial Fractions', slides: 2 },
      { code: '2.4', title: 'Integration by parts', slides: 1, highlighted: true },
      { code: '2.5', title: 'Integrals of Trigonometric Functions', slides: 0 },
    ],
  },
  { code: '3', title: 'Improper Integrals', slides: 5 },
  { code: '4', title: 'Applications of Integration', slides: 6 },
  { code: '5', title: 'Review and Summary', slides: 5 },
]

function OutlineRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: OutlineNode
  depth: number
  expanded: boolean
  onToggle: () => void
}) {
  const hasChildren = !!node.children?.length
  return (
    <div
      className={
        node.highlighted
          ? 'flex items-center gap-1.5 py-1.5 pr-2 bg-board-tint border-l-2 border-board'
          : 'flex items-center gap-1.5 py-1.5 pr-2'
      }
      style={{ paddingLeft: 8 + depth * 18 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="shrink-0 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      ) : (
        <GripVertical size={13} className="shrink-0 text-rule" />
      )}
      <span className="font-mono text-[12px] text-ink-muted shrink-0 w-7">{node.code}</span>
      <span
        className={
          node.highlighted
            ? 'text-[12px] text-board font-medium truncate'
            : 'text-[12px] text-ink truncate'
        }
      >
        {node.title}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[12px] text-ink-muted">
        {node.slides} slide{node.slides === 1 ? '' : 's'}
      </span>
    </div>
  )
}

export default function Deck() {
  const [idx, setIdx] = useState(0)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '2': true })
  const [toast, setToast] = useState<string | null>(null)

  const slide = SLIDES[idx]
  const filled = slide.slideNo

  const prev = () => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)
  const next = () => setIdx((i) => (i + 1) % SLIDES.length)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  return (
    <CourseShell role="teacher" active="deck">
      {/* Body */}
      <div className="flex-1 mx-auto w-full max-w-[1200px] px-8 py-6 flex gap-6">
        {/* Center column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Slide card */}
          <div className="border border-rule rounded-card bg-surface px-12 pt-10 pb-6 min-h-[460px] flex flex-col">
            <div className="font-mono text-[14px] text-board border-b border-board/40 self-start pb-1">
              {slide.eyebrow}
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-8 py-8">
              <h1 className="font-serif text-[32px] text-ink">{slide.title}</h1>
              <div>{slide.body}</div>
              <p className="text-[16px] text-ink max-w-[520px] leading-relaxed">{slide.note}</p>
            </div>
            {/* Citation footer — mandatory on every slide */}
            <div className="border-t border-rule pt-3 flex items-center justify-between">
              <span className="font-mono text-[12px] text-ink">{slide.citation}</span>
              <span className="font-mono text-[12px] text-ink">
                slide {slide.slideNo} / {TOTAL_SLIDES}
              </span>
            </div>
          </div>

          {/* Progress bar — 28 segments */}
          <div className="mt-5 flex items-center gap-[3px]" aria-label={`Slide ${slide.slideNo} of ${TOTAL_SLIDES}`}>
            {Array.from({ length: TOTAL_SLIDES }, (_, i) => {
              const n = i + 1
              const isCurrent = n === slide.slideNo
              const isFilled = n <= filled
              return (
                <span key={n} className="relative flex items-center">
                  {isCurrent ? (
                    <span className="w-[18px] h-[18px] rounded-full bg-board text-surface font-mono text-[10px] flex items-center justify-center transition-all duration-[120ms] ease-out">
                      {n}
                    </span>
                  ) : (
                    <span
                      className="h-[8px] w-[16px] rounded-chip transition-colors duration-[120ms] ease-out"
                      style={{ background: isFilled ? '#2F5D50' : '#D6DCD9' }}
                    />
                  )}
                </span>
              )
            })}
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              className="inline-flex items-center gap-2 border border-rule rounded-control bg-surface px-5 py-2 text-[14px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
            >
              ‹ Previous
            </button>
            <button
              type="button"
              onClick={() => setOutlineOpen((v) => !v)}
              aria-pressed={outlineOpen}
              className="inline-flex items-center gap-2 border border-rule rounded-control bg-surface px-5 py-2 text-[14px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
            >
              <List size={15} /> Outline
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-control bg-board px-6 py-2 text-[14px] font-medium text-surface hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              Next ›
            </button>
          </div>
        </div>

        {/* Right panel */}
        {outlineOpen ? (
          <aside className="w-[320px] shrink-0 flex flex-col gap-6">
            {/* Outline tree */}
            <div className="border border-rule rounded-card bg-surface">
              <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
                <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
                  Outline
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => flash('New outline section added')}
                    aria-label="Add section"
                    className="p-1 text-ink-muted hover:text-board border border-rule rounded-chip transition-colors duration-[120ms] ease-out"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => flash('Outline editing enabled')}
                    aria-label="Edit outline"
                    className="p-1 text-ink-muted hover:text-board border border-rule rounded-chip transition-colors duration-[120ms] ease-out"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => flash('More outline actions')}
                    aria-label="More actions"
                    className="p-1 text-ink-muted hover:text-board border border-rule rounded-chip transition-colors duration-[120ms] ease-out"
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              </div>
              <div className="py-2">
                {OUTLINE.map((node) => (
                  <div key={node.code}>
                    <OutlineRow
                      node={node}
                      depth={0}
                      expanded={!!expanded[node.code]}
                      onToggle={() =>
                        setExpanded((p) => ({ ...p, [node.code]: !p[node.code] }))
                      }
                    />
                    {node.children && expanded[node.code]
                      ? node.children.map((child) => (
                          <OutlineRow
                            key={child.code}
                            node={child}
                            depth={1}
                            expanded={false}
                            onToggle={() => undefined}
                          />
                        ))
                      : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Source status */}
            <div className="border border-rule rounded-card bg-surface p-4">
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
                Source status
              </span>
              <div className="mt-3 flex items-start gap-3">
                <CheckCircle2 size={28} className="text-board shrink-0" />
                <div>
                  <div className="text-[14px] font-medium text-ink">All slides cited</div>
                  <div className="text-[12px] text-ink-muted leading-relaxed">
                    Every slide has at least one mandatory citation.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => flash('Citations report opened')}
                className="mt-4 w-full border border-rule rounded-control bg-surface py-2 text-[14px] text-ink hover:border-board hover:text-board transition-colors duration-[120ms] ease-out"
              >
                View citations report
              </button>
            </div>
          </aside>
        ) : null}
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 border border-board bg-surface rounded-control px-4 py-2.5 font-mono text-[12px] text-board">
          <CheckCircle2 size={14} />
          {toast}
        </div>
      ) : null}
    </CourseShell>
  )
}
