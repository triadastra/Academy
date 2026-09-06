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
import * as Dialog from '@radix-ui/react-dialog'
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
  noteCodeFor,
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
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-ink/35 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[96] flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-rule bg-surface shadow-2xl outline-none">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">{eyebrow}</div>
              <Dialog.Title className="mt-1 font-serif text-[28px] leading-tight text-ink">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-[13px] leading-relaxed text-ink-muted">{blurb}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-paper"><X size={17} /></Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? <div className="shrink-0 border-t border-rule bg-paper px-5 py-4 sm:px-6 [&>div]:flex-wrap">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

function GenerationSteps({ current }: { current: 'plan' | 'running' | 'review' }) {
  const active = ['plan', 'running', 'review'].indexOf(current)
  return <ol aria-label="Generation progress" className="mb-5 grid grid-cols-3 gap-2">
    {['Choose topics', 'Generate', 'Review & save'].map((label, index) => <li key={label} aria-current={index === active ? 'step' : undefined} className={`flex items-center gap-2 rounded-control px-2 py-2 text-[11px] ${index === active ? 'bg-board-tint text-board' : 'bg-paper text-ink-muted'}`}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current">{index < active ? <Check size={12} /> : index + 1}</span>{label}</li>)}
  </ol>
}

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
      planForSession(session, { maxNotes: selected.size, maxQuestions: Math.min(count, quota.remaining), noteCodes: [...selected] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.key, count, selected, quota.remaining],
  )
  const willWrite = plan.reduce((total, planned) => total + planned.wanted.length, 0)

  async function run() {
    setStage('running')
    setError('')
    const abort = new AbortController()
    abortRef.current = abort
    try {
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Generation failed. Please try again.')
      setStage('plan')
    } finally {
      abortRef.current = null
    }
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
        blurb="Drafts appear as they are written and checked against your notes. You can stop at any time and review the questions already completed."
        footer={<PageAction onClick={() => abortRef.current?.abort()}>Stop and review drafts</PageAction>}
        onClose={() => abortRef.current?.abort()}
      >
        <GenerationSteps current="running" />
        <div role="status" className="flex items-center gap-3 rounded-card border border-board/25 bg-board-tint/50 px-4 py-3">
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
        blurb="Review the answers and sources before adding questions to practice. Closing this window keeps the drafts in your review queue."
        onClose={onClose}
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
        <GenerationSteps current="review" />
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
      blurb={`Choose topics, generate a draft, then review before adding to your bank. ${quota.remaining} of ${quota.cap} generated questions available.`}
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
      <GenerationSteps current="plan" />
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
            Select the topics you want to practise. The run fills gaps in their question coverage, up to your chosen question count.
          </p>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-muted">
            <span>{selected.size} topics selected · {willWrite} questions planned</span>
            <button type="button" onClick={() => setSelected(selected.size ? new Set() : new Set(coverage.slice(0, SYNTHESIS.maxNotesPerRun).map((entry) => entry.code)))} className="text-board hover:underline">{selected.size ? 'Clear selection' : 'Select suggested topics'}</button>
          </div>
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
  const [length, setLength] = useState<number>(Math.min(PAPER_LENGTHS[1], pool.length))
  const [targetWeakness, setTargetWeakness] = useState(true)
  const [topic, setTopic] = useState('all')
  const topics = [...new Set(pool.map(noteCodeFor))].sort()
  const scoped = pool.filter((question) => topic === 'all' || noteCodeFor(question) === topic)
  const actualLength = Math.min(length, scoped.length)
  const lengths = [...new Set([Math.min(3, scoped.length), ...PAPER_LENGTHS, scoped.length])].filter((n) => n >= 3 && n <= scoped.length).sort((a, b) => a - b)
  const [error, setError] = useState('')

  function assemble() {
    const result = assemblePaper({ session, timeMinutes: minutes, questionCount: actualLength, targetWeakness, ...(topic !== 'all' ? { noteCodes: [topic] } : {}) })
    if (result.error || !result.paper) {
      setError(result.error ?? 'Could not assemble a paper.')
      return
    }
    onAssembled(result.paper.id)
  }

  const synthesizedInPool = scoped.filter((question) => question.origin === 'synthesized').length

  return (
    <Shell
      eyebrow={session.label}
      title="Create a practice test"
      blurb="Choose your coverage, length and time. Your test uses published questions from this course’s bank."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-muted">
            {scoped.length} question{scoped.length === 1 ? '' : 's'} to draw on
            {synthesizedInPool > 0 ? ` · ${synthesizedInPool} synthesized` : ''}
          </span>
          <PageAction variant="primary" onClick={assemble} disabled={scoped.length < 3}>
            <FileStack size={14} /> Create {actualLength}-question test
          </PageAction>
        </div>
      }
    >
      {error ? <PageNotice className="mb-4">{error}</PageNotice> : null}
      <div className="space-y-5">
        <label className="block text-[13px] text-ink">
          Topic coverage
          <select value={topic} onChange={(event) => { setTopic(event.target.value); setError('') }} className="mt-2 block w-full rounded-control border border-rule bg-paper px-3 py-2.5">
            <option value="all">All topics · balanced coverage</option>
            {topics.map((code) => <option key={code} value={code}>{code} · {pool.find((question) => noteCodeFor(question) === code)?.topic}</option>)}
          </select>
        </label>
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
            {scoped.length < 3 ? <p className="text-[12px] text-ink-muted">Select more topics or add questions to create a test.</p> : null}
            {lengths.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLength(option)}
                aria-pressed={actualLength === option}
                disabled={option > pool.length}
                className={`rounded-control border px-3 py-1.5 text-[12px] transition-colors duration-[120ms] ease-out disabled:opacity-40 ${
                  actualLength === option
                    ? 'border-board bg-board text-paper'
                    : 'border-rule bg-surface text-ink hover:border-board'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 rounded-card border border-rule p-4 text-[13px]">
          <input type="checkbox" checked={targetWeakness} onChange={(event) => setTargetWeakness(event.target.checked)} className="mt-1 accent-[#2F5D50]" />
          <span>Focus on areas to improve<span className="mt-1 block text-[12px] text-ink-muted">Prioritize topics from your incorrect answers.</span></span>
        </label>
        <div className="rounded-card border border-rule bg-paper px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          {actualLength} question{actualLength === 1 ? '' : 's'} · {minutes} minutes · {scoped.length} available in your selection. Questions are spread across the notes this class was taught, ordered from Foundation to
          Challenge.
          {scoped.length < 3
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
  const [dropped, setDropped] = useState<Set<string>>(new Set())
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
      blurb="Review each answer and source, then select the questions to add to practice. Unselected questions are discarded when you accept a batch."
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
            const kept = questions.filter((question) => !dropped.has(question.id))
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
                      disabled={kept.length === 0}
                      onClick={() => {
                        acceptBatch(batch.id, kept.map((question) => question.id))
                        setTick((current) => current + 1)
                      }}
                    >
                      <Check size={14} /> Accept {kept.length}
                    </PageAction>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {questions.map((question) => (
                    <DraftCard key={question.id} question={question} kept={!dropped.has(question.id)} onToggle={() => setDropped((current) => { const next = new Set(current); if (next.has(question.id)) next.delete(question.id); else next.add(question.id); return next })} />
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
