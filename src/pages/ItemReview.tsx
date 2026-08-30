// ItemReview.tsx — route /teacher/review (ref syn_p18.png).
// Teacher item-review queue: worked KaTeX solution, rubric rows, provenance
// strip, quality-checks drawer, approve/edit/reject cycling 3 prepared items.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  X,
  PenLine,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import SectionTag from '@/components/SectionTag'
import Tex from '@/components/Tex'
import { reviewPendingCount } from '@/data/mock'

// ── Prepared rotating items ───────────────────────────────────────────────
interface RubricRow {
  text: string
  tex?: string
}

interface QueueItem {
  id: string
  code: string
  marks: number
  question: string
  questionTex?: string
  answerTexLines: { prose?: string; tex?: string; boxed?: boolean }[]
  rubric: RubricRow[]
  source: string
  cluster: string
  template: string
  verifier: string
}

const ITEMS: QueueItem[] = [
  {
    id: 'ITEM_4F2A',
    code: '2.4',
    marks: 6,
    question: 'Evaluate integral x² sin x dx, showing each application of integration by parts.',
    answerTexLines: [
      { prose: 'Let u = x², dv = sin x dx so du = 2x dx, v = −cos x.' },
      { tex: '\\int x^2 \\sin x \\, dx \\;=\\; -x^2 \\cos x + \\int 2x \\cos x \\, dx' },
      { prose: 'Let u = 2x, dv = cos x dx so du = 2 dx, v = sin x.' },
      { tex: '\\int 2x \\cos x \\, dx \\;=\\; 2x \\sin x - \\int 2 \\sin x \\, dx \\;=\\; 2x \\sin x + 2 \\cos x' },
      { prose: 'Therefore,' },
      {
        tex: '\\int x^2 \\sin x \\, dx \\;=\\; -x^2 \\cos x + 2x \\sin x + 2 \\cos x + C',
        boxed: true,
      },
    ],
    rubric: [
      { text: 'First integration by parts setup', tex: '(u = x^2,\\; dv = \\sin x \\, dx)' },
      { text: 'First integration by parts result', tex: '-x^2 \\cos x + \\int 2x \\cos x \\, dx' },
      { text: 'Second integration by parts setup', tex: '(u = 2x,\\; dv = \\cos x \\, dx)' },
      { text: 'Second integration by parts result', tex: '2x \\sin x + 2 \\cos x' },
      { text: 'Combine all terms correctly' },
      { text: 'Constant of integration + C' },
    ],
    source: 'Lecture 6 p.8',
    cluster: 'cluster: sign_error_ibp_trig (11)',
    template: 'template: tmpl_b',
    verifier: 'verifier: solved',
  },
  {
    id: 'ITEM_7C19',
    code: '2.3',
    marks: 4,
    question: 'Use partial fractions to evaluate the integral of 1 over (x − 1)(x + 2).',
    answerTexLines: [
      { prose: 'Decompose into partial fractions:' },
      { tex: '\\frac{1}{(x-1)(x+2)} \\;=\\; \\frac{A}{x-1} + \\frac{B}{x+2}' },
      { prose: 'Solving 1 = A(x + 2) + B(x − 1) gives A = 1/3, B = −1/3.' },
      { tex: '\\int \\frac{dx}{(x-1)(x+2)} \\;=\\; \\frac{1}{3} \\ln|x-1| - \\frac{1}{3} \\ln|x+2| + C', boxed: true },
    ],
    rubric: [
      { text: 'Correct partial-fraction form' },
      { text: 'Solve for constants A and B' },
      { text: 'Integrate each term to logarithms' },
      { text: 'Constant of integration + C' },
    ],
    source: 'Lecture 5 p.11',
    cluster: 'cluster: numerator_degree_factor_count (6)',
    template: 'template: tmpl_a',
    verifier: 'verifier: solved',
  },
  {
    id: 'ITEM_91BD',
    code: '2.2',
    marks: 5,
    question: 'Evaluate the integral of 2x cos(x²) dx using a suitable substitution.',
    answerTexLines: [
      { prose: 'Let u = x², so du = 2x dx.' },
      { tex: '\\int 2x \\cos(x^2) \\, dx \\;=\\; \\int \\cos u \\, du' },
      { prose: 'Integrate and substitute back:' },
      { tex: '\\int \\cos u \\, du \\;=\\; \\sin u + C \\;=\\; \\sin(x^2) + C', boxed: true },
    ],
    rubric: [
      { text: 'Choose substitution u = x²' },
      { text: 'Rewrite the integral in u' },
      { text: 'Integrate cos u correctly' },
      { text: 'Substitute back to x' },
      { text: 'Constant of integration + C' },
    ],
    source: 'Lecture 4 p.6',
    cluster: 'cluster: u_by_position_not_liate (7)',
    template: 'template: tmpl_c',
    verifier: 'verifier: solved',
  },
]

const CHECKS: { title: string; body: string }[] = [
  { title: 'Mathematical Validity', body: 'The solution is mathematically correct.' },
  {
    title: 'Alignment',
    body: 'The item aligns with the learning objective and curriculum standards.',
  },
  {
    title: 'Clarity & Wording',
    body: 'The question is clear, unambiguous, and appropriately worded.',
  },
  { title: 'Item Quality', body: 'The item is well-constructed and suitable for assessment.' },
]

// ── Local toast ────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper font-mono text-[12px] px-4 py-2 rounded-control flex items-center gap-2">
      <Check size={14} className="text-board-tint" />
      {message}
    </div>
  )
}

function markdownToPreview(md: string) {
  // Very small live preview: headings, bold, italic, lines.
  return md.split('\n').map((line, i) => {
    if (line.startsWith('### '))
      return (
        <div key={i} className="text-[14px] font-medium text-ink mt-2">
          {line.slice(4)}
        </div>
      )
    if (line.startsWith('## '))
      return (
        <div key={i} className="text-[16px] font-medium text-ink mt-2">
          {line.slice(3)}
        </div>
      )
    if (line.startsWith('# '))
      return (
        <div key={i} className="font-serif text-[18px] text-ink mt-2">
          {line.slice(2)}
        </div>
      )
    if (line.startsWith('- '))
      return (
        <div key={i} className="text-[14px] text-ink pl-4">
          • {line.slice(2)}
        </div>
      )
    if (line.trim() === '') return <div key={i} className="h-2" />
    return (
      <div key={i} className="text-[14px] text-ink">
        {line}
      </div>
    )
  })
}

export default function ItemReview() {
  const [index, setIndex] = useState(0)
  const [pending, setPending] = useState(reviewPendingCount)
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const item = ITEMS[index % ITEMS.length]

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const advance = (action: 'approved' | 'rejected') => {
    setPending((p) => Math.max(0, p - 1))
    setIndex((i) => (i + 1) % ITEMS.length)
    setEditing(false)
    showToast(`Item ${item.id} ${action}. Loading next item.`)
  }

  const openEditor = () => {
    setDraft(
      `# ${item.id}\n\n## Question\n${item.question}\n\n## Answer\n${item.answerTexLines
        .map((l) => l.prose ?? (l.tex ? `- \\(${l.tex}\\)` : ''))
        .join('\n')}`,
    )
    setEditing(true)
  }

  return (
    <CourseShell
      role="teacher"
      active="review"
      right={
        <div className="px-5 py-6">
          <SectionTag className="mb-4">quality checks</SectionTag>
          <div className="flex flex-col gap-4">
            {CHECKS.map((c) => (
              <div key={c.title} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-board text-paper flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3} />
                </span>
                <div>
                  <div className="text-[14px] font-medium text-ink leading-tight">{c.title}</div>
                  <div className="text-[12px] text-ink-muted leading-snug mt-1">{c.body}</div>
                  <div className="text-[12px] text-board mt-1">Passed</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-rule flex items-center justify-between">
            <span className="text-[14px] font-medium text-ink">Overall Status:</span>
            <span className="font-mono text-[12px] bg-board-tint text-board px-2 py-1 rounded-chip">
              All Passed
            </span>
          </div>
        </div>
      }
    >
      <div className="px-8 py-8 max-w-[860px]">
        <h1 className="font-serif text-[32px] text-ink leading-tight">Review</h1>
        <p className="text-[14px] text-ink-muted mt-1">{pending} items pending</p>

        {/* Main item card */}
        <div className="mt-6 bg-surface border border-rule rounded-card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-rule">
            <span className="font-mono text-[12px] text-ink">{item.id}</span>
            <span className="font-mono text-[12px] text-ink-muted">
              {item.code} / {item.marks} marks
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 px-5 py-5">
            {/* Question + answer */}
            <div>
              <SectionTag className="mb-3">question</SectionTag>
              <p className="font-serif text-[18px] text-ink leading-snug">
                Evaluate{' '}
                <Tex>{item.code === '2.4' ? '\\int x^2 \\sin x \\, dx' : item.code === '2.3' ? '\\int \\frac{dx}{(x-1)(x+2)}' : '\\int 2x \\cos(x^2) \\, dx'}</Tex>
                {item.code === '2.4'
                  ? ', showing each application of integration by parts.'
                  : item.code === '2.3'
                    ? ' using partial fractions.'
                    : ' using a suitable substitution.'}
              </p>

              <SectionTag className="mt-5 mb-3">answer</SectionTag>
              <div className="flex flex-col gap-2.5">
                {item.answerTexLines.map((l, i) =>
                  l.tex ? (
                    <div
                      key={i}
                      className={
                        l.boxed ? 'border border-rule rounded-control px-3 py-2 bg-paper' : ''
                      }
                    >
                      <Tex display className="text-ink text-[14px]">
                        {l.tex}
                      </Tex>
                    </div>
                  ) : (
                    <p key={i} className="text-[14px] text-ink">
                      {l.prose}
                    </p>
                  ),
                )}
              </div>
            </div>

            {/* Rubric */}
            <div>
              <SectionTag className="mb-3">{`rubric (${item.marks} marks)`}</SectionTag>
              <div className="border-t border-rule">
                {item.rubric.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 py-2 border-b border-rule"
                  >
                    <div className="text-[12px] font-mono text-ink leading-snug">
                      {r.text}
                      {r.tex ? (
                        <div className="mt-0.5 text-ink-muted">
                          <Tex>{r.tex}</Tex>
                        </div>
                      ) : null}
                    </div>
                    <span className="font-mono text-[12px] text-ink-muted shrink-0">1 mark</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-b border-rule">
                  <span className="font-mono text-[12px] font-medium text-ink">TOTAL</span>
                  <span className="font-mono text-[12px] font-medium text-ink">
                    {item.marks} marks
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Provenance strip */}
          <div className="px-5 py-4 border-t border-rule">
            <SectionTag className="mb-2">provenance</SectionTag>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Source', value: item.source },
                { label: 'Cluster', value: item.cluster },
                { label: 'Template', value: item.template },
                { label: 'Verifier', value: item.verifier },
              ].map((p) => (
                <div key={p.label}>
                  <div className="text-[12px] text-ink-muted">{p.label}</div>
                  <div className="font-mono text-[12px] text-ink mt-0.5 break-words">{p.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-rule flex items-center gap-3">
            <button
              type="button"
              onClick={() => advance('approved')}
              className="flex items-center gap-2 bg-board text-paper text-[14px] px-4 py-2 rounded-control hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              <Check size={15} strokeWidth={3} /> Approve
            </button>
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEditor())}
              className="flex items-center gap-2 border border-rule bg-surface text-ink text-[14px] px-4 py-2 rounded-control hover:border-ink-muted transition-colors duration-[120ms] ease-out"
            >
              <PenLine size={15} /> {editing ? 'Close editor' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => advance('rejected')}
              className="flex items-center gap-2 bg-mark text-paper text-[14px] px-4 py-2 rounded-control hover:opacity-90 transition-colors duration-[120ms] ease-out"
            >
              <X size={15} strokeWidth={3} /> Reject
            </button>
          </div>

          {/* Inline markdown editor with live preview */}
          {editing ? (
            <div className="px-5 py-4 border-t border-rule">
              <SectionTag className="mb-3">edit item — markdown</SectionTag>
              <div className="grid grid-cols-2 gap-4">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={12}
                  className="w-full font-mono text-[12px] text-ink bg-paper border border-rule rounded-control px-3 py-2 resize-y focus:outline-none focus:border-board"
                />
                <div className="border border-rule rounded-control px-3 py-2 bg-surface overflow-y-auto">
                  {markdownToPreview(draft)}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    showToast(`Draft for ${item.id} saved.`)
                  }}
                  className="bg-board text-paper text-[14px] px-4 py-2 rounded-control hover:bg-board-deep transition-colors duration-[120ms] ease-out"
                >
                  Save changes
                </button>
                <span className="font-mono text-[12px] text-ink-muted">
                  preview updates as you type
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <SectionTag className="mt-8">item review queue</SectionTag>
      </div>
      {toast ? <Toast message={toast} /> : null}
    </CourseShell>
  )
}
