// SynthesizedPaper.tsx — the viewer for a paper that has no PDF behind it.
//
// The shipped papers are rendered ahead of time by scripts/generate_mock_pdfs.py
// and shown in a PDF pane. An assembled paper cannot be: it is put together in
// the browser out of whatever this session's bank holds at that moment, and a
// PDF would have to be produced by a server that is not there. So it is
// rendered as a paper instead — one column, question numbers, marks in the
// margin, ruled answer space — and printed from the browser, which is how a
// student gets a physical copy either way.
//
// PRINTING. The app is a full-height flex shell with its own scrollers, and
// printing that produces one clipped page of chrome. The rule below hides
// everything and un-hides this subtree, which is the only approach that
// survives the shell without the paper needing to be rendered into a second
// window.
import { useState } from 'react'
import { Eye, EyeOff, Printer } from 'lucide-react'
import { PageAction } from '@/components/Page'
import OriginTag from '@/components/OriginTag'
import Tex from '@/components/Tex'
import type { IndexedQuestion, MockTest } from '@/database/types'

const PRINT_ROOT = 'synonance-paper-print-root'

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #${PRINT_ROOT}, #${PRINT_ROOT} * { visibility: visible !important; }
  #${PRINT_ROOT} {
    position: absolute !important;
    inset: 0 !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
    background: #fff !important;
    padding: 0 !important;
  }
  #${PRINT_ROOT} .paper-sheet {
    box-shadow: none !important;
    border: 0 !important;
    margin: 0 !important;
    max-width: none !important;
  }
  #${PRINT_ROOT} .no-print { display: none !important; }
  #${PRINT_ROOT} .paper-question { break-inside: avoid; page-break-inside: avoid; }
}
`

/** Ruled space, sized to the marks — the paper's own answer to "how long?" */
function AnswerSpace({ marks }: { marks: number }) {
  const lines = Math.min(12, Math.max(2, Math.round(marks * 1.5)))
  return (
    <div aria-hidden="true" className="mt-3 space-y-4">
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="h-px bg-rule" />
      ))}
    </div>
  )
}

export default function SynthesizedPaper({
  paper,
  questions,
}: {
  paper: MockTest
  questions: IndexedQuestion[]
}) {
  const [markScheme, setMarkScheme] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-[13px] text-ink-muted">
        The questions this paper was assembled from are no longer in the bank — the block they came
        from was discarded. Assemble a new paper.
      </div>
    )
  }

  return (
    <div id={PRINT_ROOT} className="h-full overflow-y-auto">
      <style>{PRINT_CSS}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-surface px-5 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
          {questions.length} questions · {paper.totalMarks} marks · {paper.timeMinutes} min
        </span>
        <div className="flex items-center gap-2">
          <PageAction onClick={() => setMarkScheme((current) => !current)}>
            {markScheme ? <EyeOff size={14} /> : <Eye size={14} />}
            {markScheme ? 'Hide mark scheme' : 'Show mark scheme'}
          </PageAction>
          <PageAction onClick={() => window.print()}>
            <Printer size={14} /> Print or save as PDF
          </PageAction>
        </div>
      </div>

      <div className="px-5 py-6">
        <article className="paper-sheet mx-auto max-w-[820px] rounded-card border border-rule bg-surface px-10 py-9 shadow-sm">
          <header className="border-b-2 border-ink pb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                SHSID · {paper.subject}
                {paper.level ? ` · ${paper.level}` : ''}
              </div>
              <div className="font-mono text-[11px] text-ink-muted">{paper.name}</div>
            </div>
            <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">{paper.title}</h1>
            <p className="mt-1 text-[13px] text-ink-muted">{paper.subtitle}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-ink">{paper.instructions}</p>
            {/* On the page as well as in the list: a printed copy leaves the
                app, and the tag has to leave with it. */}
            <p className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
              <OriginTag origin="synthesized" />
              Assembled from this class’s question bank. Not an examination set by the course.
            </p>
          </header>

          <div className="mt-2 divide-y divide-rule">
            {questions.map((question, index) => (
              <section key={question.id} className="paper-question py-6">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 font-mono text-[13px] text-ink-muted">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-relaxed text-ink">{question.prompt}</p>
                    {question.tex ? (
                      <Tex display className="my-4 text-[18px] text-ink">
                        {question.tex}
                      </Tex>
                    ) : null}
                    {question.options?.length ? (
                      <ul className="mt-3 space-y-1.5">
                        {question.options.map((option) => (
                          <li key={option.id} className="flex gap-3 text-[13px] leading-relaxed text-ink">
                            <span className="font-mono text-[12px] text-ink-muted">{option.id}</span>
                            <span>{option.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <AnswerSpace marks={question.marks} />
                    )}
                    {markScheme ? (
                      <div className="mt-4 rounded-control border border-board/30 bg-board-tint/40 px-4 py-3">
                        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">
                          Mark scheme
                        </div>
                        <p className="mt-1.5 text-[13px] text-ink">{question.answer}</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-ink-muted">
                          {question.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        {question.rubric?.length ? (
                          <ul className="mt-2 space-y-1 text-[12px] text-ink-muted">
                            {question.rubric.map((line) => (
                              <li key={line.criterion}>
                                [{line.marks}] {line.criterion}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-2 text-[11px] text-ink-muted">{question.source}</p>
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-mono text-[12px] text-ink-muted">
                    [{question.marks}]
                  </span>
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-6 border-t border-rule pt-4 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            End of paper · {paper.totalMarks} marks
          </footer>
        </article>
      </div>
    </div>
  )
}
