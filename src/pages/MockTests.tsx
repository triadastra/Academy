import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  CheckCircle2,
  Download,
  FileCheck2,
  LoaderCircle,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, SidePanel } from '@/components/Page'
import PdfView from '@/components/PdfView'
import GenerateSheet from '@/components/GenerateSheet'
import OriginTag from '@/components/OriginTag'
import SynthesizedPaper from '@/components/SynthesizedPaper'
import {
  discardPaper,
  papersForSession,
  questionsForPaper,
  resolveSession,
} from '@/database/question-bank'
import {
  getCurrentUserId,
  getGradedPapers,
  recordGradedPaper,
  subscribeDatabase,
} from '@/database/client'
import type { GradedPaper } from '@/database/types'

/**
 * Papers belong to a SESSION, not to a course.
 *
 * The shipped rows are generated per course by scripts/generate_mock_pdfs.py
 * alongside the PDFs they point at — regenerate there, never edit the table by
 * hand. They carry no level and so appear at every level, which is right for
 * material written before levels existed. An assembled paper always carries
 * one, because it is built out of one session's questions and would be a paper
 * on texts the other levels were never set.
 */
export default function MockTests() {
  const [dbTick, setDbTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])

  // `dbTick` is the dependency that matters: the database is module state, so
  // nothing else can tell these memos it has changed. See the same note in
  // QuestionBase.
  const { session, papers } = useMemo(
    () => {
      const current = resolveSession()
      const all = papersForSession(current)
      return {
        session: current,
        // Newest assembled papers first, then the shipped set — a paper you
        // just made is the one you came here for.
        papers: [
          ...all.filter((paper) => paper.origin === 'synthesized'),
          ...all.filter((paper) => paper.origin !== 'synthesized'),
        ],
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbTick],
  )

  const [selectedId, setSelectedId] = useState('')
  const selected = papers.find((paper) => paper.id === selectedId) ?? papers[0]
  const paperQuestions = useMemo(
    () => (selected?.origin === 'synthesized' ? questionsForPaper(selected) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, dbTick],
  )
  const [generateOpen, setGenerateOpen] = useState(false)
  const [gradeOpen, setGradeOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [grading, setGrading] = useState(false)
  const [gradedPaper, setGradedPaper] = useState<GradedPaper | null>(null)
  const [history, setHistory] = useState<GradedPaper[]>(() => getGradedPapers(session.courseId))
  const gradingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (gradingTimer.current) clearTimeout(gradingTimer.current)
    },
    [],
  )

  function acceptFile(nextFile?: File) {
    if (!nextFile) return
    const isAccepted = nextFile.type === 'application/pdf' || nextFile.type.startsWith('image/')
    if (!isAccepted) return
    setFile(nextFile)
    setGradedPaper(null)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    acceptFile(event.dataTransfer.files[0])
  }

  function startGrading() {
    if (!file || grading || !selected) return
    const paper = selected
    setGrading(true)
    gradingTimer.current = setTimeout(() => {
      const result: GradedPaper = {
        id: `graded-${Date.now()}`,
        userId: getCurrentUserId(),
        courseId: session.courseId,
        mockTestId: paper.id,
        fileName: file.name,
        testName: `${paper.name} · ${paper.title}`,
        // Placeholder: real marking arrives with the grading model.
        score: Math.round(paper.totalMarks * 0.78),
        total: paper.totalMarks,
        gradedAt: new Date().toISOString(),
        annotatedPdfUrl: paper.annotatedPdfUrl,
      }
      setGradedPaper(result)
      setHistory((current) => {
        const next = [result, ...current]
        recordGradedPaper(result)
        return next
      })
      setGrading(false)
      gradingTimer.current = null
    }, 1500)
  }

  function closeGrader() {
    if (gradingTimer.current) {
      clearTimeout(gradingTimer.current)
      gradingTimer.current = null
    }
    setGradeOpen(false)
    setFile(null)
    setGrading(false)
    setGradedPaper(null)
  }

  return (
    <CourseShell role="student" active="mock-tests">
      <Page>
        <PageBar context={`${session.label} · ${papers.length} paper${papers.length === 1 ? '' : 's'}`}>
          <PageAction variant="primary" onClick={() => setGenerateOpen(true)}>
            <Sparkles size={15} /> Assemble a paper
          </PageAction>
        </PageBar>
        <div className="practice-workspace flex flex-1 min-h-0 overflow-hidden">
          <SidePanel title={`${session.label} papers`} width="index">
            <ul>
              {papers.map((paper) => {
                const isSelected = paper.id === selected?.id
                const sat = history.find((graded) => graded.mockTestId === paper.id)
                return (
                  <li key={paper.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(paper.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full border-b border-rule px-4 py-3.5 text-left transition-colors duration-[120ms] ease-out ${
                        isSelected ? 'bg-board-tint' : 'hover:bg-paper'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[11px] text-ink-muted">{paper.name}</span>
                        {sat ? (
                          <span className="font-mono text-[11px] font-medium text-board">
                            {sat.score}/{sat.total}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[14px] font-medium leading-snug text-ink">
                        {paper.title}
                      </span>
                      <span className="mt-1 block text-[11px] text-ink-muted">
                        {paper.timeMinutes} min · {paper.totalMarks} marks · {paper.questionCount} questions
                      </span>
                      {paper.origin === 'synthesized' ? (
                        <span className="mt-2 block">
                          <OriginTag origin={paper.origin} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
            {papers.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] leading-relaxed text-ink-muted">
                No papers for {session.label} yet. Assemble one from this class’s question bank.
              </p>
            ) : null}
          </SidePanel>

          <div className="flex min-w-0 flex-1 min-h-0 flex-col overflow-hidden bg-[#E6E9E7]">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-rule bg-surface px-8 py-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">
                  {selected ? `${selected.name} · ${selected.title}` : 'No paper selected'}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  {selected ? selected.subtitle : `${session.label} has no papers yet`}
                </div>
              </div>
              {selected ? (
                <div className="flex shrink-0 items-center gap-2">
                  {/* An assembled paper has no PDF to export and no annotated
                      PDF for the grader to hand back, so it offers what it can
                      actually do — print, and discard — rather than two buttons
                      that would open an empty file. */}
                  {selected.origin === 'synthesized' ? (
                    <PageAction
                      variant="danger"
                      onClick={() => {
                        discardPaper(selected.id)
                        setSelectedId('')
                      }}
                    >
                      <Trash2 size={14} /> Discard paper
                    </PageAction>
                  ) : (
                    <>
                      <PageAction href={selected.pdfUrl} download={selected.downloadName}>
                        <Download size={14} /> Export PDF
                      </PageAction>
                      <PageAction variant="primary" onClick={() => setGradeOpen(true)}>
                        <UploadCloud size={14} /> Grade Paper
                      </PageAction>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex-1 min-h-0 p-5">
              {selected?.origin === 'synthesized' ? (
                <div className="h-full w-full overflow-hidden rounded-card border border-rule bg-surface shadow-sm">
                  <SynthesizedPaper key={selected.id} paper={selected} questions={paperQuestions} />
                </div>
              ) : selected ? (
                <PdfView
                  key={selected.id}
                  src={selected.pdfUrl}
                  label={`${selected.name} · ${selected.title}`}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-[13px] leading-relaxed text-ink-muted">
                  Nothing to show yet. Assemble a paper from {session.label}’s question bank, or
                  generate questions first if the bank is thin.
                </div>
              )}
            </div>
          </div>
        </div>
      </Page>

      {generateOpen ? (
        <GenerateSheet
          mode="paper"
          session={session}
          onClose={() => setGenerateOpen(false)}
          onAssembled={setSelectedId}
        />
      ) : null}

      {gradeOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 p-6">
          <section className="flex max-h-[86dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-card border border-rule bg-surface shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-6 py-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">
                  Agent paper grader
                </div>
                <h2 className="mt-1 font-serif text-[24px] text-ink">Grade your completed paper</h2>
                <p className="mt-1 text-[12px] text-ink-muted">
                  Upload a PDF or clear photos. The agent will mark and annotate each page.
                </p>
              </div>
              <button
                type="button"
                onClick={closeGrader}
                aria-label="Close paper grader"
                className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-paper hover:text-ink"
              >
                <X size={17} />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto p-6">
              {!gradedPaper ? (
                <>
                  <div
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setDragActive(true)
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
                      dragActive ? 'border-board bg-board-tint/60' : 'border-rule bg-paper'
                    }`}
                  >
                    {file ? (
                      <>
                        <FileCheck2 size={30} className="mx-auto text-board" />
                        <p className="mt-3 text-[14px] font-medium text-ink">{file.name}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to grade
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={30} className="mx-auto text-board" />
                        <p className="mt-3 text-[14px] font-medium text-ink">Drag and drop your paper here</p>
                        <p className="mt-1 text-[11px] text-ink-muted">PDF, PNG, or JPEG · up to 25 MB</p>
                      </>
                    )}
                    <label className="mt-4 inline-flex cursor-pointer items-center rounded-control border border-rule bg-surface px-3.5 py-2 text-[12px] text-ink hover:border-board">
                      {file ? 'Choose another file' : 'Choose a file'}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        className="sr-only"
                        onChange={(event) => acceptFile(event.target.files?.[0])}
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted">
                    <div className="rounded-control border border-rule px-2 py-3">Read every response</div>
                    <div className="rounded-control border border-rule px-2 py-3">Apply the mark scheme</div>
                    <div className="rounded-control border border-rule px-2 py-3">Annotate the PDF</div>
                  </div>

                  <button
                    type="button"
                    onClick={startGrading}
                    disabled={!file || grading}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-control bg-board py-3 text-[13px] font-medium text-paper hover:bg-board-deep disabled:opacity-40"
                  >
                    {grading ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" /> Grading and annotating…
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> Grade with Syno
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div>
                  <div className="rounded-card border border-board/30 bg-board-tint/60 p-5 text-center">
                    <CheckCircle2 size={30} className="mx-auto text-board" />
                    <div className="mt-3 font-serif text-[38px] leading-none text-ink">
                      {gradedPaper.score}/{gradedPaper.total}
                    </div>
                    <div className="mt-2 text-[13px] font-medium text-board">78% · Secure</div>
                    <p className="mt-2 text-[12px] text-ink-muted">
                      Your score has been saved to your course progress record.
                    </p>
                  </div>

                  <div className="mt-4 rounded-card border border-rule p-4">
                    <h3 className="text-[14px] font-medium text-ink">Agent feedback</h3>
                    <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-muted">
                      <li>Strong derivative rules and clear algebraic working.</li>
                      <li>Two marks lost by omitting endpoint checks in an optimisation question.</li>
                      <li>Review accumulation functions before the next mock test.</li>
                    </ul>
                  </div>

                  <a
                    href={gradedPaper.annotatedPdfUrl}
                    download={`${gradedPaper.testName.replace(/[^a-zA-Z0-9]+/g, '-')}-annotated.pdf`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-control bg-board py-3 text-[13px] font-medium text-paper hover:bg-board-deep"
                  >
                    <Download size={15} /> Download annotated paper
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </CourseShell>
  )
}
