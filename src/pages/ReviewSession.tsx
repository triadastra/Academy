// ReviewSession — route /course/review — ref syn_p10.png
// Paged review items with KaTeX prompt, math-toolbar answer textarea,
// check-answer feedback, and a "Review context" drawer.
import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eraser,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Tex from '@/components/Tex'
import { NumberedSegments } from '@/pages/Chat'

interface SessionItem {
  kind: string
  prompt: string
  tex: string
  answer: string
  accept: (a: string) => boolean
  objective: { code: string; title: string; mastery: number }
  source: string
  note?: string
}

const ITEMS: SessionItem[] = [
  {
    kind: 'Short response',
    prompt: 'Decompose the rational expression into partial fractions.',
    tex: '\\frac{3x+5}{(x+1)(x+2)}',
    answer: '\\dfrac{2}{x+1} + \\dfrac{1}{x+2}',
    accept: (a) => a.includes('x+1') && a.includes('x+2') && a.includes('2') && a.includes('1'),
    objective: { code: '2.3', title: 'Partial fractions', mastery: 2 },
    source: 'Problem set 4 p.2',
    note: 'This is your weakest objective and is required before 2.4.',
  },
  {
    kind: 'Short response',
    prompt: 'Evaluate the integral using integration by parts.',
    tex: '\\int x e^x\\,dx',
    answer: '(x-1)e^x + C',
    accept: (a) => a.includes('e^x') && (a.includes('x-1') || a.includes('xe^x-e^x')),
    objective: { code: '2.4', title: 'Integration by parts', mastery: 3 },
    source: 'Lecture 6 p.8',
  },
  {
    kind: 'Short response',
    prompt: 'Use substitution to evaluate the integral.',
    tex: '\\int 2x\\,(x^2+1)^3\\,dx',
    answer: '\\dfrac{(x^2+1)^4}{4} + C',
    accept: (a) => a.includes('x^2+1') && (a.includes('^4') || a.includes('4')),
    objective: { code: '2.2', title: 'Techniques of integration', mastery: 5 },
    source: 'Problem set 4 p.1',
  },
  {
    kind: 'Short response',
    prompt: 'Evaluate the integral showing each application of integration by parts.',
    tex: '\\int x^2 \\sin x\\,dx',
    answer: '-x^2 \\cos x + 2x \\sin x + 2 \\cos x + C',
    accept: (a) => a.includes('cos') && a.includes('sin') && a.includes('x^2'),
    objective: { code: '2.4', title: 'Integration by parts', mastery: 3 },
    source: 'Lecture 6 p.8',
  },
]

export default function ReviewSession() {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'idle' | 'correct' | 'incorrect'>('idle')

  const item = ITEMS[index]

  function go(next: number) {
    setIndex(Math.max(0, Math.min(ITEMS.length - 1, next)))
    setAnswer('')
    setResult('idle')
  }

  function check() {
    const a = answer.replace(/\s/g, '').toLowerCase()
    setResult(item.accept(a) ? 'correct' : 'incorrect')
  }

  function insert(symbol: string) {
    setAnswer((v) => v + symbol)
    setResult('idle')
  }

  const contextDrawer = (
    <>

        <h2 className="font-serif text-[24px] text-ink mb-4">Review context</h2>

        <div className="mb-5">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted mb-1">
            Objective
          </div>
          <div className="font-serif text-[24px] text-ink leading-tight">{item.objective.code}</div>
          <div className="text-[14px] text-ink-muted">{item.objective.title}</div>
        </div>

        <div className="mb-5">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted mb-2">
            Mastery
          </div>
          <NumberedSegments filled={item.objective.mastery} />
        </div>

        <div className="mb-5">
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted mb-1">
            Source
          </div>
          <div className="text-[14px] text-ink">{item.source}</div>
        </div>

        {item.note ? (
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted mb-2">
              Notes
            </div>
            <div className="flex items-start gap-2.5">
              <CircleAlert size={16} className="text-mark shrink-0 mt-0.5" />
              <p className="text-[14px] text-ink">
                This is your weakest objective and is required before{' '}
                <span className="text-mark">2.4</span>.
              </p>
            </div>
          </div>
        ) : null}
    </>
  )

  return (
    <CourseShell
      role="student"
      active="review"
      right={<div className="h-full px-5 py-5 overflow-y-auto">{contextDrawer}</div>}
    >
      <main className="flex-1 min-w-0 px-10 py-8">
        <div className="flex items-center justify-between mb-6 max-w-[760px]">
          <h1 className="font-serif text-[32px] text-ink">Review session</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous"
              className="w-8 h-8 border border-rule rounded-control bg-surface flex items-center justify-center text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-mono text-[12px] text-ink-muted">
              {index + 1} of {ITEMS.length}
            </span>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === ITEMS.length - 1}
              aria-label="Next"
              className="w-8 h-8 border border-rule rounded-control bg-surface flex items-center justify-center text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="max-w-[760px]">
          {/* prompt card */}
          <div className="border border-rule rounded-[6px] bg-surface px-6 py-5 mb-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-6 rounded-full bg-board text-paper font-mono text-[12px] flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-[14px] text-ink-muted">{item.kind}</span>
            </div>
            <p className="text-[16px] text-ink">{item.prompt}</p>
            <Tex display className="my-3 text-ink">
              {item.tex}
            </Tex>
          </div>

          {/* answer card */}
          <div className="border border-rule rounded-[6px] bg-surface px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[14px] text-ink-muted">
                Enter your answer and show your working
              </span>
              <span className="flex gap-1">
                {[
                  { label: 'x²', insert: '^2' },
                  { label: 'xₙ', insert: '_n' },
                  { label: '∫', insert: '∫' },
                  { label: 'π', insert: 'π' },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => insert(b.insert)}
                    className="w-8 h-7 border border-rule rounded-chip bg-surface text-[12px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
                  >
                    {b.label}
                  </button>
                ))}
              </span>
            </div>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value)
                setResult('idle')
              }}
              rows={6}
              aria-label="Your answer"
              className="w-full border border-rule rounded-control bg-paper px-3 py-2 text-[14px] font-mono text-ink outline-none focus:border-board resize-y"
            />

            {result !== 'idle' ? (
              <div
                className={`mt-3 rounded-control px-3 py-2 text-[14px] ${
                  result === 'correct'
                    ? 'bg-board-tint text-board'
                    : 'bg-mark-tint text-mark'
                }`}
              >
                {result === 'correct' ? (
                  <span>
                    Correct. Mark scheme: <Tex>{item.answer}</Tex>
                  </span>
                ) : (
                  <span>
                    Not quite. Expected form: <Tex>{item.answer}</Tex> — check your working and
                    try again.
                  </span>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => {
                  setAnswer('')
                  setResult('idle')
                }}
                className="inline-flex items-center gap-2 border border-rule rounded-control bg-surface px-4 py-2 text-[14px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
              >
                <Eraser size={14} /> Clear
              </button>
              {result === 'correct' && index < ITEMS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="bg-board text-paper rounded-control px-5 py-2 text-[14px] hover:bg-board-deep transition-colors duration-[120ms] ease-out"
                >
                  Next item
                </button>
              ) : (
                <button
                  type="button"
                  onClick={check}
                  className="bg-board text-paper rounded-control px-5 py-2 text-[14px] hover:bg-board-deep transition-colors duration-[120ms] ease-out"
                >
                  Check answer
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

    </CourseShell>
  )
}
