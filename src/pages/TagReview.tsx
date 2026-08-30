// TagReview — route /teacher/tag-review (ref syn_p25.png).
// Document page with KaTeX extracted text + proposed-link card with mastery
// radios, Accept/Change/Reject with working keyboard shortcuts (A/C/R,
// arrow keys) and queue progress advancing.
import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, ChevronLeft, ChevronRight, ExternalLink, Keyboard,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Tex from '@/components/Tex'

const MASTERY_LABELS = ['Emerging', 'Developing', 'Proficient', 'Advanced', 'Exemplary']

interface Proposal {
  id: string
  doc: string
  page: number
  totalPages: number
  objectiveCode: string
  objectiveTitle: string
  objectiveDesc: string
  mastery: number
  citation: string
  confidence: string
  confidenceLabel: string
  rationale: string
}

const PROPOSALS: Proposal[] = [
  {
    id: 'prop-1',
    doc: 'Lecture 7',
    page: 12,
    totalPages: 22,
    objectiveCode: '2.5',
    objectiveTitle: 'Improper integrals',
    objectiveDesc: 'Define improper integrals with infinite limits of integration. Evaluate improper integrals using limits and determine convergence or divergence.',
    mastery: 3,
    citation: 'p. 12',
    confidence: '0.68',
    confidenceLabel: 'Medium',
    rationale: 'Page discusses definition of improper integrals with infinite limits, evaluation via limits, and convergence vs. divergence, with examples.',
  },
  {
    id: 'prop-2',
    doc: 'Lecture 7',
    page: 14,
    totalPages: 22,
    objectiveCode: '2.5',
    objectiveTitle: 'Improper integrals',
    objectiveDesc: 'Evaluate improper integrals over unbounded intervals using the p-test for convergence.',
    mastery: 2,
    citation: 'p. 14',
    confidence: '0.74',
    confidenceLabel: 'Medium',
    rationale: 'Page applies the p-test to determine convergence of integrals of 1/x^p on infinite intervals.',
  },
  {
    id: 'prop-3',
    doc: 'Lecture 7',
    page: 18,
    totalPages: 22,
    objectiveCode: '2.4',
    objectiveTitle: 'Integration by parts',
    objectiveDesc: 'Apply integration by parts within the evaluation of improper integrals.',
    mastery: 4,
    citation: 'p. 18',
    confidence: '0.51',
    confidenceLabel: 'Low',
    rationale: 'Page uses integration by parts inside a limit evaluation; link to 2.4 is plausible but secondary.',
  },
]

export default function TagReview() {
  const [queueIndex, setQueueIndex] = useState(0)
  const [mastery, setMastery] = useState(PROPOSALS[0].mastery)
  const [decided, setDecided] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const proposal = PROPOSALS[queueIndex % PROPOSALS.length]

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }, [])

  const advance = useCallback(
    (action: 'accept' | 'change' | 'reject') => {
      const msg =
        action === 'accept'
          ? `Proposal accepted — ${proposal.objectiveCode} linked at mastery ${mastery}.`
          : action === 'change'
            ? 'Marked for change — choose a different objective later.'
            : 'Proposal rejected — not a good link.'
      showToast(msg)
      setDecided((d) => d + 1)
      setQueueIndex((i) => {
        const next = i + 1
        setMastery(PROPOSALS[next % PROPOSALS.length].mastery)
        return next
      })
    },
    [proposal, mastery, showToast],
  )

  const stepPage = useCallback(
    (dir: 1 | -1) => {
      setQueueIndex((i) => {
        const next = (i + dir + PROPOSALS.length) % PROPOSALS.length
        setMastery(PROPOSALS[next].mastery)
        return next
      })
    },
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (k === 'a') { e.preventDefault(); advance('accept') }
      else if (k === 'c') { e.preventDefault(); advance('change') }
      else if (k === 'r') { e.preventDefault(); advance('reject') }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepPage(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPage(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, stepPage])

  const page = proposal.page

  return (
    <CourseShell role="teacher" active="library">
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-8 h-16 border-b border-rule bg-surface">
          <div>
            <h1 className="font-serif text-[24px] leading-tight">Objective tag review</h1>
            <div className="text-[12px] text-ink-muted">Review and confirm objective links for curriculum materials</div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-[13px]">
              <BookOpen size={16} className="text-board" />
              <div className="leading-tight">
                <div className="font-medium">Calculus BC</div>
                <div className="text-[11px] text-ink-muted">Semester 1</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-board text-paper font-mono text-[12px] flex items-center justify-center">TJ</span>
              <div className="leading-tight">
                <div className="text-[13px] font-medium">T. Jiang</div>
                <div className="text-[11px] text-ink-muted">Teacher</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-8 py-5 grid grid-cols-[1fr_360px] gap-6 items-start">
          {/* Document page card */}
          <section className="border border-rule rounded-card bg-surface">
            <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
              <div className="text-[14px] font-medium">{proposal.doc} / page {page}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showToast('Full page preview is not available in this demo.')}
                  className="flex items-center gap-1.5 border border-rule rounded-control px-2.5 py-1 text-[12px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
                >
                  View full page <ExternalLink size={12} />
                </button>
                <button type="button" onClick={() => stepPage(-1)} aria-label="Previous page" className="w-7 h-7 border border-rule rounded-control flex items-center justify-center hover:border-ink-muted transition-colors duration-[120ms] ease-out">
                  <ChevronLeft size={14} />
                </button>
                <button type="button" onClick={() => stepPage(1)} aria-label="Next page" className="w-7 h-7 border border-rule rounded-control flex items-center justify-center hover:border-ink-muted transition-colors duration-[120ms] ease-out">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="px-8 py-6 max-w-[560px] text-[14px] leading-relaxed font-serif">
              <p>
                We now extend the idea of the definite integral to certain{' '}
                <strong>infinite intervals</strong>.
              </p>
              <p className="mt-3">
                Consider the integral
                <Tex display className="my-2">{'\\int_1^{\\infty} \\frac{1}{x^2} \\, dx.'}</Tex>
              </p>
              <p className="mt-3">
                Since the interval of integration is unbounded, we cannot evaluate this integral
                directly. Instead, we consider the <strong>improper integral</strong>
                <Tex display className="my-2">{'\\int_1^{\\infty} \\frac{1}{x^2} \\, dx = \\lim_{b \\to \\infty} \\int_1^{b} \\frac{1}{x^2} \\, dx,'}</Tex>
                provided the limit on the right exists. Computing, we have
                <Tex display className="my-2">{'\\int_1^{b} \\frac{1}{x^2} \\, dx = \\left[ -\\frac{1}{x} \\right]_1^{b} = 1 - \\frac{1}{b}.'}</Tex>
              </p>
              <p className="mt-3">
                Taking the limit as <Tex>{'b \\to \\infty'}</Tex>, we obtain
                <Tex display className="my-2">{'\\lim_{b \\to \\infty} \\left( 1 - \\frac{1}{b} \\right) = 1.'}</Tex>
              </p>
              <p className="mt-3">
                Since the limit exists and is finite, we say that the improper integral{' '}
                <Tex>{'\\int_1^{\\infty} \\frac{1}{x^2} \\, dx'}</Tex> <strong>converges</strong>,
                and its value is 1.
              </p>
              <p className="mt-3">
                If the limit does not exist or is infinite, the improper integral{' '}
                <strong>diverges</strong>. For example, <Tex>{'\\int_1^{\\infty} \\frac{1}{x} \\, dx'}</Tex> diverges.
              </p>
            </div>

            <div className="flex items-center gap-6 px-5 py-3 border-t border-rule font-mono text-[12px] text-ink-muted">
              <span>Source: <span className="border border-rule rounded-chip px-1.5 py-0.5">Lecture 7 Notes</span></span>
              <span>Type: <span className="border border-rule rounded-chip px-1.5 py-0.5">Lecture note</span></span>
              <span>Last updated: May 8, 2024</span>
            </div>
          </section>

          {/* Proposed link card */}
          <aside className="border border-rule rounded-card bg-surface p-5">
            <div className="text-[15px] font-medium">Proposed link</div>
            <div className="mt-4 border border-rule rounded-card p-4">
              <div className="text-[12px] text-ink-muted">Objective</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-[15px]">{proposal.objectiveCode}</span>
                <span className="text-[15px] font-medium">{proposal.objectiveTitle}</span>
              </div>
              <p className="mt-1 text-[12px] text-ink-muted leading-snug">{proposal.objectiveDesc}</p>
            </div>

            <div className="mt-4">
              <div className="text-[12px] text-ink-muted">Mastery (proposed)</div>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {MASTERY_LABELS.map((label, i) => {
                  const val = i + 1
                  const selected = val === mastery
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setMastery(val)}
                      className={
                        selected
                          ? 'border border-board bg-board text-paper rounded-control px-1 py-2 text-center transition-colors duration-[120ms] ease-out'
                          : 'border border-rule bg-surface rounded-control px-1 py-2 text-center hover:border-ink-muted transition-colors duration-[120ms] ease-out'
                      }
                    >
                      <span className={`mx-auto block w-3.5 h-3.5 rounded-full border ${selected ? 'border-paper bg-paper' : 'border-ink-muted'}`} />
                      <span className={`block mt-1 font-mono text-[11px] ${selected ? '' : 'text-ink-muted'}`}>{val}</span>
                      <span className={`block text-[10px] leading-tight ${selected ? '' : 'text-ink-muted'}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] text-ink-muted">Citation (source)</div>
                <div className="mt-1 inline-block font-mono text-[13px] border border-rule rounded-chip px-2 py-1">{proposal.citation}</div>
              </div>
              <div>
                <div className="text-[12px] text-ink-muted">Model confidence</div>
                <div className="mt-1 font-mono text-[18px] text-mark leading-none">{proposal.confidence}</div>
                <div className="text-[11px] text-mark">{proposal.confidenceLabel}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[12px] text-ink-muted">Rationale (model)</div>
              <p className="mt-1 text-[12px] leading-snug">{proposal.rationale}</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => advance('accept')}
                className="bg-board text-paper rounded-control px-2 py-2 text-[13px] font-medium hover:bg-board-deep transition-colors duration-[120ms] ease-out"
              >
                <span className="font-mono border border-paper/60 rounded-chip px-1 mr-1.5 text-[11px]">A</span>Accept
                <span className="block text-[10px] font-normal text-paper/70 mt-0.5">Link objective</span>
              </button>
              <button
                type="button"
                onClick={() => advance('change')}
                className="border border-rule bg-surface rounded-control px-2 py-2 text-[13px] hover:border-ink-muted transition-colors duration-[120ms] ease-out"
              >
                <span className="font-mono border border-rule rounded-chip px-1 mr-1.5 text-[11px]">C</span>Change
                <span className="block text-[10px] text-ink-muted mt-0.5">Choose different</span>
              </button>
              <button
                type="button"
                onClick={() => advance('reject')}
                className="border border-mark text-mark rounded-control px-2 py-2 text-[13px] hover:bg-mark-tint transition-colors duration-[120ms] ease-out"
              >
                <span className="font-mono border border-mark/50 rounded-chip px-1 mr-1.5 text-[11px]">R</span>Reject
                <span className="block text-[10px] text-mark/70 mt-0.5">Not a good link</span>
              </button>
            </div>
          </aside>
        </div>

        {/* Keyboard help strip */}
        <footer className="px-8 py-2.5 border-t border-rule bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[12px] text-ink-muted">
            <Keyboard size={14} />
            <span>Keyboard help:</span>
            <span className="border border-rule rounded-chip px-1.5 py-0.5">A</span> accept /
            <span className="border border-rule rounded-chip px-1.5 py-0.5">C</span> change /
            <span className="border border-rule rounded-chip px-1.5 py-0.5">R</span> reject /
            <span className="border border-rule rounded-chip px-1.5 py-0.5">←</span>
            <span className="border border-rule rounded-chip px-1.5 py-0.5">→</span> arrows next
          </div>
          <div className="font-mono text-[12px] text-ink-muted">
            Queue progress: <span className="text-ink">{31 - decided} proposals</span> / <span className="text-mark">6 need attention</span>
          </div>
        </footer>

        {toast ? (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-ink text-paper text-[13px] px-4 py-2 rounded-control z-50">
            {toast}
          </div>
        ) : null}
      </main>
    </CourseShell>
  )
}
