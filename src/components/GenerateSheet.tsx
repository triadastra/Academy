// GenerateSheet.tsx — the one surface for making and reviewing generated work.
//
// THE UX ARGUMENT. A "generate" button that writes straight into the bank is
// the wrong shape for this: the student finds out what the model wrote by
// meeting it mid-practice, and the only way to undo a bad item is to delete it
// one at a time. So the button opens a sheet with three acts —
//
//   PLAN     what will be written, and why. Notes with no practice on them,
//            named, with the gap spelled out. The student can narrow it.
//   WRITE    live, item by item, with what was discarded and for what reason.
//            A run that throws half its output away should look like one.
//   REVIEW   every draft, keep or drop, before anything joins the bank.
//
// — and nothing reaches practice until the last act. That is also what makes
// the unprompted agent path safe: Syno drafting questions while it reads notes
// puts work into THIS queue, where the same three acts apply, rather than into
// the bank behind the student's back.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileStack,
  LoaderCircle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { PageAction, PageNotice } from '@/components/Page'
import OriginTag from '@/components/OriginTag'
import Tex from '@/components/Tex'
import {
  SYNTHESIS,
  acceptBatch,
  batchesForSession,
  coverageForSession,
  discardBatch,
  planForSession,
  questionsForSession,
  sessionQuota,
  sessionReady,
  type CourseSession,
  type NoteCoverage,
  type PlannedNote,
} from '@/database/question-bank'
import {
  assemblePaper,
  synthesizeQuestions,
  type ForgeProgress,
  type NoteProgress,
  type RejectedDraft,
} from '@/lib/question-forge'
import type { IndexedQuestion, SynthesisBatch } from '@/database/types'

export type SheetMode = 'questions' | 'paper' | 'review'

const QUESTION_COUNTS = [4, 8, SYNTHESIS.maxPerRun] as const
const PAPER_MINUTES = [30, 45, 60, 90] as const
const PAPER_LENGTHS = [5, 8, 12] as const

function Shell({
  eyebrow,
  title,
  blurb,
  onClose,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  blurb: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/35 p-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[88dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-card border border-rule bg-surface shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-6 py-4">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">
              {eyebrow}
            </div>
            <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink">{title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{blurb}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-paper hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-rule bg-paper px-6 py-3">{footer}</div>
        ) : null}
      </section>
    </div>
  )
}

/** One question, as it is shown in the plan preview and the review list. */
function DraftCard({
  question,
  kept,
  onToggle,
}: {
  question: IndexedQuestion
  kept?: boolean
  onToggle?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li
      className={`rounded-card border px-4 py-3 transition-colors duration-[120ms] ease-out ${
        kept === false ? 'border-rule bg-paper opacity-55' : 'border-rule bg-surface'
      }`}
    >
      <div className="flex items-start gap-3">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={kept !== false}
            aria-label={kept === false ? `Keep ${question.code}` : `Discard ${question.code}`}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control border transition-colors duration-[120ms] ease-out ${
              kept === false
                ? 'border-rule bg-surface text-transparent hover:border-board'
                : 'border-board bg-board text-paper'
            }`}
          >
            <Check size={13} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-ink-muted">{question.code}</span>
            <span className="rounded-chip bg-paper px-2 py-1 text-[10px] text-ink-muted">
              {question.difficulty}
            </span>
            <span className="rounded-chip bg-paper px-2 py-1 text-[10px] text-ink-muted">
              {question.type}
            </span>
            <OriginTag origin={question.origin} />
            <span className="ml-auto text-[11px] text-ink-muted">{question.marks} marks</span>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-ink">{question.prompt}</p>
          {question.tex ? (
            <Tex display className="my-3 text-[17px] text-ink">
              {question.tex}
            </Tex>
          ) : null}
          {question.options?.length ? (
            <ul className="mt-2 space-y-1">
              {question.options.map((option) => (
                <li key={option.id} className="text-[12px] leading-relaxed text-ink-muted">
                  <span className="font-mono text-[11px] text-ink">{option.id}</span> · {option.text}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-board hover:text-board-deep"
          >
            <ChevronRight
              size={13}
              className={`transition-transform duration-[120ms] ${open ? 'rotate-90' : ''}`}
            />
            {open ? 'Hide' : 'Answer, method and source'}
          </button>
          {open ? (
            <div className="mt-2 space-y-2 rounded-control bg-paper px-3 py-2.5">
              <p className="text-[12px] text-ink">
                <span className="text-ink-muted">Answer · </span>
                {question.answer}
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-ink-muted">
                {question.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {question.misconception ? (
                <p className="text-[12px] leading-relaxed text-mark">
                  <span className="text-ink-muted">Catches · </span>
                  {question.misconception}
                </p>
              ) : null}
              <p className="text-[11px] text-ink-muted">{question.source}</p>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/**
 * One line per note in the run.
 *
 * The thinking count is the important part. This model spends the better part
 * of a minute reasoning before it writes anything, and a bare spinner over
 * that gap reads as a hang — which is exactly how the first live run of this
 * looked. A climbing number says the call is alive and working.
 */
function NoteRow({ note }: { note: NoteProgress }) {
  const state =
    note.phase === 'queued'
      ? 'waiting'
      : note.phase === 'thinking'
        ? `thinking · ${note.thinking.toLocaleString()} tokens`
        : note.phase === 'writing'
          ? `writing · ${note.written} of ${note.wanted}`
          : note.phase === 'done'
            ? `${note.written} kept`
            : 'nothing usable'
  return (
    <li className="flex items-center gap-3 border-b border-rule px-4 py-2.5 last:border-b-0">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {note.phase === 'thinking' || note.phase === 'writing' ? (
          <LoaderCircle size={13} className="animate-spin text-board" />
        ) : note.phase === 'done' ? (
          <Check size={13} className="text-board" />
        ) : note.phase === 'failed' ? (
          <AlertTriangle size={12} className="text-ink-muted" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-rule" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
        <span className="font-mono text-[11px] text-ink-muted">{note.code}</span> {note.title}
      </span>
      <span className="shrink-0 font-mono text-[11px] text-ink-muted">{state}</span>
    </li>
  )
}

function RejectedList({ rejected }: { rejected: RejectedDraft[] }) {
  if (rejected.length === 0) return null
  const byReason = new Map<string, number>()
  for (const entry of rejected) byReason.set(entry.reason, (byReason.get(entry.reason) ?? 0) + 1)
  return (
    <div className="mt-4 rounded-card border border-rule bg-paper px-4 py-3">
      <div className="flex items-center gap-2 text-[12px] font-medium text-ink">
        <AlertTriangle size={13} className="text-ink-muted" />
        {rejected.length} draft{rejected.length === 1 ? '' : 's'} discarded by checking
      </div>
      <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-muted">
        {[...byReason.entries()].map(([reason, count]) => (
          <li key={reason}>
            {count} × {reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── questions ──────────────────────────────────────────────────────────────

function CoverageRow({
  entry,
  checked,
  onToggle,
}: {
  entry: NoteCoverage
  checked: boolean
  onToggle: () => void
}) {
  const missing = (['Foundation', 'Standard', 'Challenge'] as const).filter(
    (difficulty) => entry.want[difficulty] > 0,
  )
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className={`flex w-full items-start gap-3 border-b border-rule px-4 py-3 text-left transition-colors duration-[120ms] ease-out ${
          checked ? 'bg-board-tint' : 'hover:bg-paper'
        }`}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control border ${
            checked ? 'border-board bg-board text-paper' : 'border-rule bg-surface text-transparent'
          }`}
        >
          <Check size={13} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-ink-muted">{entry.code}</span>
            <span className="truncate text-[13px] font-medium text-ink">{entry.title}</span>
          </span>
          <span className="mt-0.5 block text-[11px] text-ink-muted">
            {entry.have.Foundation + entry.have.Standard + entry.have.Challenge === 0
              ? 'nothing to practise on'
              : `missing ${missing.join(', ').toLowerCase()}`}
            {entry.stale > 0 ? ` · ${entry.stale} written before the note was edited` : ''}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-board">+{entry.gap}</span>
      </button>
    </li>
  )
}

function QuestionsFlow({ session, onClose }: { session: CourseSession; onClose: () => void }) {
  const ready = sessionReady(session)
  const coverage = useMemo(
    () => (ready.ok ? coverageForSession(session).filter((entry) => entry.gap > 0) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.key, ready.ok],
  )
  const quota = sessionQuota(session)

  const [count, setCount] = useState<number>(QUESTION_COUNTS[1])
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(coverage.slice(0, SYNTHESIS.maxNotesPerRun).map((entry) => entry.code)),
  )
  const [stage, setStage] = useState<'plan' | 'running' | 'review'>('plan')
  const [progress, setProgress] = useState<ForgeProgress | null>(null)
  const [batch, setBatch] = useState<SynthesisBatch | null>(null)
  const [written, setWritten] = useState<IndexedQuestion[]>([])
  const [rejected, setRejected] = useState<RejectedDraft[]>([])
  const [dropped, setDropped] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const plan: PlannedNote[] = useMemo(
    () =>
      planForSession(session, { maxNotes: coverage.length || 1, maxQuestions: count }).filter(
        (planned) => selected.has(planned.note.code),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.key, count, selected, coverage.length],
  )
  const willWrite = plan.reduce((total, planned) => total + planned.wanted.length, 0)

  async function run() {
    setStage('running')
    setError('')
    const abort = new AbortController()
    abortRef.current = abort
    const result = await synthesizeQuestions({
      session,
      plan,
      trigger: 'manual',
      status: 'draft',
      signal: abort.signal,
      onProgress: setProgress,
    })
    abortRef.current = null
    if (result.error && result.questions.length === 0) {
      setError(result.error)
      setStage('plan')
      setRejected(result.rejected)
      return
    }
    setBatch(result.batch)
    setWritten(result.questions)
    setRejected(result.rejected)
    setStage('review')
  }

  function accept() {
    if (!batch) return
    acceptBatch(
      batch.id,
      written.filter((question) => !dropped.has(question.id)).map((question) => question.id),
    )
    onClose()
  }

  function discard() {
    if (batch) discardBatch(batch.id)
    onClose()
  }

  if (!ready.ok) {
    return (
      <Shell
        eyebrow={session.label}
        title="Nothing to generate from"
        blurb="Questions are written from the notes of one class, and this one has none to read."
        onClose={onClose}
      >
        <PageNotice>{ready.reason}</PageNotice>
      </Shell>
    )
  }

  if (stage === 'running') {
    return (
      <Shell
        eyebrow={session.label}
        title="Writing questions"
        blurb="Notes are read at the same time, not one after another. Each one is thought through before a word is written, which takes about a minute — questions appear here as they are finished and checked."
        onClose={() => abortRef.current?.abort()}
      >
        <div className="flex items-center gap-3 rounded-card border border-board/25 bg-board-tint/50 px-4 py-3">
          <LoaderCircle size={16} className="shrink-0 animate-spin text-board" />
          <div className="min-w-0">
            <div className="text-[13px] text-ink">{progress?.message ?? 'Planning the run'}</div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
              {progress?.done ?? 0} of {progress?.total ?? plan.length} notes ·{' '}
              {progress?.questions.length ?? 0} kept
            </div>
          </div>
        </div>

        {progress?.notes.length ? (
          <ul className="mt-4 overflow-hidden rounded-card border border-rule bg-surface">
            {progress.notes.map((note) => (
              <NoteRow key={note.code} note={note} />
            ))}
          </ul>
        ) : null}

        {progress?.questions.length ? (
          <ul className="mt-4 space-y-2">
            {progress.questions.map((question) => (
              <DraftCard key={question.id} question={question} />
            ))}
          </ul>
        ) : null}
      </Shell>
    )
  }

  if (stage === 'review') {
    const keeping = written.filter((question) => !dropped.has(question.id)).length
    return (
      <Shell
        eyebrow={session.label}
        title={`${written.length} question${written.length === 1 ? '' : 's'} drafted`}
        blurb="Nothing here is in your question base yet. Keep what is right for your class and drop the rest."
        onClose={discard}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-ink-muted">
              {keeping} of {written.length} kept
            </span>
            <div className="flex items-center gap-2">
              <PageAction variant="danger" onClick={discard}>
                <Trash2 size={14} /> Discard all
              </PageAction>
              <PageAction variant="primary" onClick={accept} disabled={keeping === 0}>
                <Check size={14} /> Add {keeping} to question base
              </PageAction>
            </div>
          </div>
        }
      >
        <ul className="space-y-2">
          {written.map((question) => (
            <DraftCard
              key={question.id}
              question={question}
              kept={!dropped.has(question.id)}
              onToggle={() =>
                setDropped((current) => {
                  const next = new Set(current)
                  if (next.has(question.id)) next.delete(question.id)
                  else next.add(question.id)
                  return next
                })
              }
            />
          ))}
        </ul>
        <RejectedList rejected={rejected} />
      </Shell>
    )
  }

  return (
    <Shell
      eyebrow={session.label}
      title="Generate questions"
      blurb={`Written from this class’s own notes — not the course’s other levels. ${quota.remaining} of ${quota.cap} generated questions left for this session.`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              Up to
            </span>
            {QUESTION_COUNTS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCount(option)}
                aria-pressed={count === option}
                className={`rounded-control border px-2.5 py-1.5 text-[12px] transition-colors duration-[120ms] ease-out ${
                  count === option
                    ? 'border-board bg-board text-paper'
                    : 'border-rule bg-surface text-ink hover:border-board'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <PageAction variant="primary" onClick={run} disabled={willWrite === 0}>
            <Sparkles size={14} /> Write {willWrite} question{willWrite === 1 ? '' : 's'}
          </PageAction>
        </div>
      }
    >
      {error ? <PageNotice className="mb-4">{error}</PageNotice> : null}
      {coverage.length === 0 ? (
        <div className="rounded-card border border-dashed border-rule bg-paper px-6 py-10 text-center">
          <Check size={22} className="mx-auto text-board" />
          <p className="mt-3 text-[14px] font-medium text-ink">Every note already has practice</p>
          <p className="mx-auto mt-1 max-w-[44ch] text-[12px] leading-relaxed text-ink-muted">
            {session.label} has a question at each difficulty for every note it teaches. There is
            nothing here worth generating — assemble a mock paper instead.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[12px] leading-relaxed text-ink-muted">
            These notes are taught in {session.label} and have no practice against them. Deselect
            any you would rather leave alone.
          </p>
          <ul className="overflow-hidden rounded-card border border-rule bg-surface">
            {coverage.map((entry) => (
              <CoverageRow
                key={entry.code}
                entry={entry}
                checked={selected.has(entry.code)}
                onToggle={() =>
                  setSelected((current) => {
                    const next = new Set(current)
                    if (next.has(entry.code)) next.delete(entry.code)
                    else next.add(entry.code)
                    return next
                  })
                }
              />
            ))}
          </ul>
          <RejectedList rejected={rejected} />
        </>
      )}
    </Shell>
  )
}

// ── papers ─────────────────────────────────────────────────────────────────

function PaperFlow({
  session,
  onClose,
  onAssembled,
}: {
  session: CourseSession
  onClose: () => void
  onAssembled: (paperId: string) => void
}) {
  const pool = questionsForSession(session)
  const [minutes, setMinutes] = useState<number>(60)
  const [length, setLength] = useState<number>(PAPER_LENGTHS[1])
  const [error, setError] = useState('')

  function assemble() {
    const result = assemblePaper({ session, timeMinutes: minutes, questionCount: length })
    if (result.error || !result.paper) {
      setError(result.error ?? 'Could not assemble a paper.')
      return
    }
    onAssembled(result.paper.id)
  }

  const synthesizedInPool = pool.filter((question) => question.origin === 'synthesized').length

  return (
    <Shell
      eyebrow={session.label}
      title="Assemble a mock paper"
      blurb="Built from questions that are already in this session’s bank, so every item on it has been checked. Nothing new is invented for a paper."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-muted">
            {pool.length} question{pool.length === 1 ? '' : 's'} to draw on
            {synthesizedInPool > 0 ? ` · ${synthesizedInPool} synthesized` : ''}
          </span>
          <PageAction variant="primary" onClick={assemble} disabled={pool.length < 3}>
            <FileStack size={14} /> Assemble paper
          </PageAction>
        </div>
      }
    >
      {error ? <PageNotice className="mb-4">{error}</PageNotice> : null}
      <div className="space-y-5">
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Time allowed
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PAPER_MINUTES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMinutes(option)}
                aria-pressed={minutes === option}
                className={`rounded-control border px-3 py-1.5 text-[12px] transition-colors duration-[120ms] ease-out ${
                  minutes === option
                    ? 'border-board bg-board text-paper'
                    : 'border-rule bg-surface text-ink hover:border-board'
                }`}
              >
                {option} min
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Questions
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PAPER_LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLength(option)}
                aria-pressed={length === option}
                disabled={option > pool.length}
                className={`rounded-control border px-3 py-1.5 text-[12px] transition-colors duration-[120ms] ease-out disabled:opacity-40 ${
                  length === option
                    ? 'border-board bg-board text-paper'
                    : 'border-rule bg-surface text-ink hover:border-board'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="rounded-card border border-rule bg-paper px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          Questions are spread across the notes this class was taught, ordered from Foundation to
          Challenge, and weighted towards the topics you have been getting wrong.
          {pool.length < 3
            ? ' There are too few questions in this session to make a paper — generate some first.'
            : ''}
        </div>
      </div>
    </Shell>
  )
}

// ── the review queue ───────────────────────────────────────────────────────

function ReviewFlow({ session, onClose }: { session: CourseSession; onClose: () => void }) {
  const [tick, setTick] = useState(0)
  const batches = useMemo(
    () => batchesForSession(session).filter((batch) => batch.status === 'draft'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.key, tick],
  )
  const drafts = useMemo(
    () => questionsForSession(session, { status: 'draft', origin: 'synthesized' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.key, tick],
  )

  return (
    <Shell
      eyebrow={session.label}
      title="Drafts awaiting review"
      blurb="Syno wrote these while reading this class’s notes. They are not in your question base until you accept them."
      onClose={onClose}
    >
      {batches.length === 0 ? (
        <div className="rounded-card border border-dashed border-rule bg-paper px-6 py-10 text-center text-[13px] text-ink-muted">
          Nothing is waiting for review.
        </div>
      ) : (
        <div className="space-y-5">
          {batches.map((batch) => {
            const questions = drafts.filter((question) => question.batchId === batch.id)
            if (questions.length === 0) return null
            return (
              <section key={batch.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                      {batch.trigger === 'agent' ? 'Drafted while reading notes' : 'Generated'} ·{' '}
                      {new Date(batch.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[13px] text-ink">
                      {questions.length} question{questions.length === 1 ? '' : 's'} from{' '}
                      {batch.noteCodes.join(', ')}
                      {batch.rejected > 0 ? ` · ${batch.rejected} discarded by checking` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PageAction
                      variant="danger"
                      onClick={() => {
                        discardBatch(batch.id)
                        setTick((current) => current + 1)
                      }}
                    >
                      <Trash2 size={14} /> Discard
                    </PageAction>
                    <PageAction
                      variant="primary"
                      onClick={() => {
                        acceptBatch(batch.id)
                        setTick((current) => current + 1)
                      }}
                    >
                      <Check size={14} /> Accept all
                    </PageAction>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {questions.map((question) => (
                    <DraftCard key={question.id} question={question} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

export default function GenerateSheet({
  mode,
  session,
  onClose,
  onAssembled,
}: {
  mode: SheetMode
  session: CourseSession
  onClose: () => void
  /** Papers only: the id of the paper that was just assembled. */
  onAssembled?: (paperId: string) => void
}) {
  if (mode === 'paper') {
    return (
      <PaperFlow
        session={session}
        onClose={onClose}
        onAssembled={(paperId) => {
          onAssembled?.(paperId)
          onClose()
        }}
      />
    )
  }
  if (mode === 'review') return <ReviewFlow session={session} onClose={onClose} />
  return <QuestionsFlow session={session} onClose={onClose} />
}
