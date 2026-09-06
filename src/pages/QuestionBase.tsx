import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Database,
  FileStack,
  Flag,
  Inbox,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, SidePanel } from '@/components/Page'
import GenerateSheet, { type SheetMode } from '@/components/GenerateSheet'
import OriginTag, { SourceChip } from '@/components/OriginTag'
import Tex from '@/components/Tex'
import {
  draftsForSession,
  questionsForSession,
  resolveSession,
  retireQuestion,
  sessionReady,
} from '@/database/question-bank'
import {
  checkQuestionAnswer,
  isAutoCheckable,
  getCurrentUserId,
  recordQuestionAttempt,
  subscribeDatabase,
} from '@/database/client'

/**
 * Questions belong to a SESSION — one course taught at one level — not to a
 * course. This page first read getQuestions('*'), so every course was served
 * the same five calculus questions; scoping it to the course fixed that but
 * still handed a G9 English S+ student the questions written for the H class,
 * about texts their class was never set. `questionsForSession` is the whole
 * rule, and it lives in question-bank.ts so the agent, the paper assembler and
 * this page cannot disagree about who a question is for.
 */

/*
  {
    id: 'q-001',
    code: '3.1-Q04',
    unit: 'Applications of derivatives',
    topic: 'Optimisation',
    prompt: 'A rectangle has perimeter 40 cm. Find the dimensions that maximise its area.',
    type: 'Extended response',
    difficulty: 'Standard',
    marks: 6,
    source: 'Course problem set 3, indexed revision 8',
    sourceType: 'Course material',
    answer: '10 cm by 10 cm, with maximum area 100 cm².',
    accept: (answer) => answer.includes('10') && answer.includes('100'),
    steps: [
      'Let the side lengths be x and y. From 2x + 2y = 40, write y = 20 - x.',
      'Express the area using one variable: A(x) = x(20 - x) = 20x - x².',
      'Differentiate: A′(x) = 20 - 2x, then solve A′(x) = 0 to get x = 10.',
      'Then y = 10. Since A″(x) = -2 < 0, this critical point is a maximum.',
      'The maximum-area rectangle is 10 cm by 10 cm, with area 100 cm².',
    ],
  },
  {
    id: 'q-002',
    code: '2.1-Q12',
    unit: 'Differentiation',
    topic: 'Chain rule',
    prompt: 'Differentiate the function below with respect to x.',
    tex: 'y=(3x^2+1)^5',
    type: 'Short response',
    difficulty: 'Foundation',
    marks: 3,
    source: 'Student-contributed worksheet, de-identified and indexed',
    sourceType: 'Student paper',
    answer: '30x(3x² + 1)⁴',
    accept: (answer) => answer.includes('30x') && answer.includes('3x^2+1') && answer.includes('4'),
    steps: [
      'Identify the outer function u⁵ and the inner function u = 3x² + 1.',
      'Differentiate the outer function to get 5u⁴.',
      'Differentiate the inner function to get 6x.',
      'Multiply the derivatives and substitute back: 5(3x² + 1)⁴ · 6x.',
      'Simplify to 30x(3x² + 1)⁴.',
    ],
  },
  {
    id: 'q-003',
    code: '4.1-Q07',
    unit: 'Integration and accumulation',
    topic: 'Definite integrals',
    prompt: 'Evaluate the definite integral.',
    tex: '\\int_0^2 (3x^2-4x+1)\\,dx',
    type: 'Short response',
    difficulty: 'Standard',
    marks: 4,
    source: '2025 course examination, Paper A',
    sourceType: 'Course paper',
    answer: '2',
    accept: (answer) => answer === '2' || answer.endsWith('=2'),
    steps: [
      'Find an antiderivative: x³ - 2x² + x.',
      'Evaluate it at the upper bound: 2³ - 2(2²) + 2 = 2.',
      'Evaluate it at the lower bound: 0.',
      'Subtract lower from upper to obtain 2.',
    ],
  },
  {
    id: 'q-004',
    code: '1.1-Q09',
    unit: 'Limits and continuity',
    topic: 'Removable discontinuities',
    prompt: 'Find the limit as x approaches 3.',
    tex: '\\lim_{x\\to3}\\frac{x^2-9}{x-3}',
    type: 'Short response',
    difficulty: 'Foundation',
    marks: 2,
    source: 'Shared course notes, revision 14',
    sourceType: 'Course material',
    answer: '6',
    accept: (answer) => answer === '6' || answer.endsWith('=6'),
    steps: [
      'Factor the numerator: x² - 9 = (x - 3)(x + 3).',
      'For x ≠ 3, cancel the common factor x - 3.',
      'Evaluate x + 3 as x approaches 3 to obtain 6.',
    ],
  },
  {
    id: 'q-005',
    code: '5.1-Q03',
    unit: 'Differential equations',
    topic: 'Separation of variables',
    prompt: 'Solve the differential equation, given y(0) = 2.',
    tex: '\\frac{dy}{dx}=3y',
    type: 'Extended response',
    difficulty: 'Challenge',
    marks: 6,
    source: 'Student mock paper, de-identified and indexed',
    sourceType: 'Student paper',
    answer: 'y = 2e^(3x)',
    accept: (answer) => answer.includes('2e') && answer.includes('3x'),
    steps: [
      'Separate the variables: (1/y) dy = 3 dx.',
      'Integrate both sides: ln|y| = 3x + C.',
      'Exponentiate to write y = Ae^(3x).',
      'Use y(0) = 2 to obtain A = 2.',
      'Therefore y = 2e^(3x).',
    ],
  },
*/

/** Which origins the list is showing. 'All' is both, and is the default. */
const ORIGIN_TABS = ['All', 'Course', 'Synthesized'] as const
type OriginTab = (typeof ORIGIN_TABS)[number]

export default function QuestionBase() {
  const navigate = useNavigate()
  // Bumped on every database write, so a question accepted in the generate
  // sheet appears in the list behind it without a reload.
  const [dbTick, setDbTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])

  // One memo for the whole read, because it is one read: the database is
  // module state rather than React state, so `dbTick` is the only thing that
  // can tell this it has changed. The exhaustive-deps rule cannot see that and
  // calls the dependency unnecessary — removing it would pin the page to
  // whatever the bank held when it mounted.
  const { session, QUESTIONS, drafts, ready } = useMemo(
    () => {
      const current = resolveSession()
      return {
        session: current,
        QUESTIONS: questionsForSession(current),
        drafts: draftsForSession(current),
        ready: sessionReady(current),
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dbTick],
  )
  const synthesizedCount = QUESTIONS.filter((question) => question.origin === 'synthesized').length

  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [unitFilter, setUnitFilter] = useState('All units')
  const [originTab, setOriginTab] = useState<OriginTab>('All')
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [teachingOpen, setTeachingOpen] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState(1)
  const [sheet, setSheet] = useState<SheetMode | null>(null)
  const [retired, setRetired] = useState('')

  const units = ['All units', ...Array.from(new Set(QUESTIONS.map((question) => question.unit)))]
  const filteredQuestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return QUESTIONS.filter((question) => {
      const matchesUnit = unitFilter === 'All units' || question.unit === unitFilter
      const matchesOrigin =
        originTab === 'All' ||
        (originTab === 'Synthesized'
          ? question.origin === 'synthesized'
          : question.origin !== 'synthesized')
      const matchesQuery =
        !normalized ||
        `${question.code} ${question.unit} ${question.topic} ${question.prompt}`
          .toLowerCase()
          .includes(normalized)
      return matchesUnit && matchesOrigin && matchesQuery
    })
  }, [QUESTIONS, query, unitFilter, originTab])
  // Prefer the filtered list, so narrowing to "Synthesized" moves the reading
  // pane to something the list is actually showing rather than leaving a
  // course question open beside a list that no longer contains it.
  const selected =
    QUESTIONS.find((question) => question.id === selectedId) ??
    filteredQuestions[0] ??
    QUESTIONS[0]

  // An empty bank is now a starting point rather than a dead end: this session
  // has notes, and questions are written from notes, so the page offers to
  // write them. It only offers when there is something to write from —
  // `sessionReady` is the difference between "pick your level" (fixable in two
  // clicks) and "this class has no notes" (not fixable by the student at all),
  // and a Generate button that is going to fail is worse than no button.
  if (!selected) {
    return (
      <CourseShell role="student" active="questions">
        <Page>
          <PageBody measure="reading">
            <div className="rounded-card border border-dashed border-rule bg-surface px-8 py-16 text-center">
              <Database size={24} className="mx-auto text-ink-muted" />
              <h2 className="mt-4 font-serif text-[24px] text-ink">
                No questions for {session.label} yet
              </h2>
              <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-ink-muted">
                {ready.ok
                  ? `Questions here are indexed from course material, past papers and de-identified student work — and this class has none yet. Syno can write a first set from the ${ready.notes.length} notes ${session.label} is taught, tagged Synthesized so they are never mistaken for the course's own.`
                  : ready.reason}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {ready.ok ? (
                  <PageAction variant="primary" onClick={() => setSheet('questions')}>
                    <Sparkles size={15} /> Generate questions
                  </PageAction>
                ) : null}
                {ready.ok === false && ready.fix === 'level' ? (
                  <PageAction variant="primary" onClick={() => navigate('/setup')}>
                    Choose your level
                  </PageAction>
                ) : null}
                <PageAction onClick={() => navigate('/course/mock-tests')}>
                  <FileStack size={15} /> Open Mock Tests
                </PageAction>
              </div>
            </div>
          </PageBody>
        </Page>
        {sheet ? (
          <GenerateSheet mode={sheet} session={session} onClose={() => setSheet(null)} />
        ) : null}
      </CourseShell>
    )
  }

  function selectQuestion(questionId: string) {
    setSelectedId(questionId)
    setAnswer('')
    setResult('idle')
    setTeachingOpen(false)
    setVisibleSteps(1)
  }

  function checkAnswer() {
    const nextResult = checkQuestionAnswer(selected, answer) ? 'correct' : 'incorrect'
    setResult(nextResult)
    recordQuestionAttempt({
      userId: getCurrentUserId(),
      courseId: session.courseId,
      questionId: selected.id,
      answer,
      result: nextResult,
    })
  }

  /**
   * A synthesized item the student judges wrong is retired on the spot.
   *
   * The alternative — "report it and wait" — asks a student to keep practising
   * against a question they have already decided is broken. Retiring keeps the
   * row for the audit trail and takes it out of practice immediately, which is
   * the right trade for material nobody taught.
   */
  function reportQuestion() {
    retireQuestion(selected.id, 'Reported as wrong by the student practising it')
    setRetired(selected.code)
    setSelectedId('')
  }

  return (
    <CourseShell role="student" active="questions">
      <Page>
        <PageBar
          context={`${session.label} · ${QUESTIONS.length} questions${
            synthesizedCount > 0 ? ` · ${synthesizedCount} synthesized` : ''
          }`}
        >
          {drafts.length > 0 ? (
            <PageAction onClick={() => setSheet('review')}>
              <Inbox size={15} /> Review {drafts.length} draft{drafts.length === 1 ? '' : 's'}
            </PageAction>
          ) : null}
          <PageAction onClick={() => navigate('/course/mock-tests')}>
            <FileStack size={15} /> Open Mock Tests
          </PageAction>
          <PageAction variant="primary" onClick={() => setSheet('questions')} disabled={!ready.ok}>
            <Sparkles size={15} /> Generate
          </PageAction>
        </PageBar>

        <div className="practice-workspace flex flex-1 min-h-0 overflow-hidden">
          <SidePanel
            title={`${filteredQuestions.length} questions`}
            width="list"
            sticky={
              <div className="space-y-2">
                <label className="flex items-center gap-2 rounded-control border border-rule bg-paper px-3 py-2 focus-within:border-board">
                  <Search size={14} className="text-ink-muted" />
                  <span className="sr-only">Search questions</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search questions…"
                    className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-muted"
                  />
                </label>
                <select
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                  className="w-full rounded-control border border-rule bg-paper px-3 py-2 text-[12px] text-ink outline-none focus:border-board"
                >
                  {units.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
                {/* Origin is a filter, not a setting: a student revising for a
                    real test wants the course's own questions, and one who has
                    exhausted them wants the rest. Only shown once there is
                    something to separate. */}
                {synthesizedCount > 0 ? (
                  <div className="flex rounded-control border border-rule bg-paper p-0.5">
                    {ORIGIN_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setOriginTab(tab)}
                        aria-pressed={originTab === tab}
                        className={`flex-1 rounded-control px-2 py-1 text-[11px] transition-colors duration-[120ms] ease-out ${
                          originTab === tab
                            ? 'bg-board text-paper'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            }
          >
            <div>
              {filteredQuestions.map((question) => {
                const isSelected = selected.id === question.id
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => selectQuestion(question.id)}
                    className={`w-full border-b border-rule px-4 py-4 text-left transition-colors ${
                      isSelected ? 'bg-board-tint' : 'hover:bg-paper'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] text-ink-muted">{question.code}</span>
                      <span className="text-[11px] text-ink-muted">{question.marks} marks</span>
                    </span>
                    <span className="mt-1 block text-[14px] font-medium leading-snug text-ink">
                      {question.topic}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-ink-muted">
                      {question.prompt}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-2">
                      {question.origin === 'synthesized' ? (
                        <OriginTag origin={question.origin} />
                      ) : (
                        <SourceChip type={question.sourceType} />
                      )}
                      <ChevronRight size={13} className={isSelected ? 'text-board' : 'text-ink-muted'} />
                    </span>
                  </button>
                )
              })}
              {filteredQuestions.length === 0 ? (
                <div className="px-5 py-12 text-center text-[12px] text-ink-muted">
                  {originTab === 'Synthesized'
                    ? 'Nothing synthesized matches this search.'
                    : 'No questions match this search.'}
                </div>
              ) : null}
            </div>
          </SidePanel>

          <PageBody measure="reading">
            {/* A filter that empties the list has to empty the pane with it.
                Falling back to the first unfiltered question left "Course"
                showing a question tagged Synthesized beside a list saying
                nothing matched. */}
            {filteredQuestions.length === 0 ? (
              <div className="rounded-card border border-dashed border-rule bg-surface px-8 py-16 text-center">
                <Search size={20} className="mx-auto text-ink-muted" />
                <p className="mt-3 text-[14px] font-medium text-ink">Nothing matches this filter</p>
                <p className="mx-auto mt-1 max-w-[42ch] text-[12px] leading-relaxed text-ink-muted">
                  {originTab === 'Course'
                    ? `${session.label} has no questions from course material yet — everything in this bank was synthesized from its notes.`
                    : 'Widen the search, or clear the unit and origin filters.'}
                </p>
              </div>
            ) : (
            <div>
              {retired ? (
                <div className="mb-4 rounded-control border border-rule bg-paper px-3 py-2 text-[12px] text-ink-muted">
                  {retired} was retired and will not come up again. Its record is kept in the audit
                  log.
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-ink-muted">{selected.code}</span>
                <span className="rounded-chip bg-paper px-2 py-1 text-[10px] text-ink-muted">
                  {selected.type}
                </span>
                <span className="rounded-chip bg-paper px-2 py-1 text-[10px] text-ink-muted">
                  {selected.difficulty}
                </span>
                <OriginTag origin={selected.origin} />
                <span className="ml-auto text-[12px] text-ink-muted">{selected.marks} marks</span>
              </div>

              <section className="mt-4 rounded-card border border-rule bg-surface p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {selected.unit} · {selected.topic}
                </div>
                <h2 className="mt-3 text-[19px] font-medium leading-relaxed text-ink">
                  {selected.prompt}
                </h2>
                {selected.tex ? (
                  <Tex display className="my-5 text-[20px] text-ink">
                    {selected.tex}
                  </Tex>
                ) : null}
                {/* Options are the question, not a hint: a multiple-choice
                    item with its options hidden is a different, harder
                    question. Selecting one fills the answer box, because
                    `choice` marking compares the option id. */}
                {selected.options?.length ? (
                  <ul className="mt-5 space-y-2">
                    {selected.options.map((option) => {
                      const chosen = answer.trim().toUpperCase() === option.id
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setAnswer(option.id)
                              setResult('idle')
                            }}
                            aria-pressed={chosen}
                            className={`flex w-full items-start gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-[120ms] ease-out ${
                              chosen ? 'border-board bg-board-tint' : 'border-rule hover:border-board'
                            }`}
                          >
                            <span className="font-mono text-[12px] text-ink-muted">{option.id}</span>
                            <span className="text-[13px] leading-relaxed text-ink">{option.text}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}

                <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-rule pt-4 text-[11px] text-ink-muted">
                  <span className="flex min-w-0 items-start gap-2">
                    <Database size={13} className="mt-0.5 shrink-0" />
                    <span>
                      {selected.source}
                      {/* The receipt. A synthesized question is a claim about
                          the syllabus made by a model; naming the note, the
                          revision it read and the model that wrote it is what
                          turns that claim into something checkable. */}
                      {selected.provenance ? (
                        <>
                          {' · '}
                          <Link
                            to={`/course/notes?note=${selected.provenance.noteCodes[0]}`}
                            className="text-board underline-offset-2 hover:underline"
                          >
                            open note {selected.provenance.noteCodes.join(', ')}
                          </Link>
                          {` · written by ${selected.provenance.model}`}
                        </>
                      ) : null}
                    </span>
                  </span>
                  {selected.origin === 'synthesized' ? (
                    <button
                      type="button"
                      onClick={reportQuestion}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-rule px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors duration-[120ms] ease-out hover:border-mark hover:text-mark"
                    >
                      <Flag size={12} /> This question is wrong
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="mt-4 rounded-card border border-rule bg-surface p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[16px] font-medium text-ink">Self-check your answer</h3>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      Enter your final answer or show your working.
                    </p>
                  </div>
                  <Sparkles size={18} className="text-board" />
                </div>
                <textarea
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value)
                    setResult('idle')
                  }}
                  rows={4}
                  placeholder="Write your answer here…"
                  className="mt-4 w-full resize-y rounded-control border border-rule bg-paper px-3 py-2.5 text-[13px] text-ink outline-none focus:border-board"
                />
                {result !== 'idle' ? (
                  <div
                    className={`mt-3 flex items-start gap-2 rounded-control px-3 py-2.5 text-[13px] ${
                      result === 'correct' ? 'bg-board-tint text-board-deep' : 'bg-mark-tint text-mark'
                    }`}
                  >
                    {result === 'correct' ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <CircleAlert size={16} className="mt-0.5 shrink-0" />
                    )}
                    <span>
                      {result === 'correct'
                        ? 'Correct. This attempt has been added to your progress.'
                        : `Not quite. The expected result is ${selected.answer}. Open the teaching steps to see why.`}
                      {result === 'incorrect' && selected.misconception ? (
                        <span className="mt-1 block text-[12px] leading-relaxed">
                          This one catches: {selected.misconception}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <PageAction
                    onClick={() => {
                      setTeachingOpen(true)
                      setVisibleSteps(1)
                    }}
                  >
                    <Lightbulb size={15} /> Teach me step by step
                  </PageAction>
                  {isAutoCheckable(selected) ? (
                    <PageAction variant="primary" onClick={checkAnswer} disabled={!answer.trim()}>
                      Check answer
                    </PageAction>
                  ) : (
                    <span className="text-[12px] text-ink-muted">
                      Marked against a scheme — open the steps to compare
                    </span>
                  )}
                </div>
              </section>

              {teachingOpen ? (
                <section className="mt-4 rounded-card border border-board/25 bg-board-tint/45 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">
                        Guided solution
                      </div>
                      <h3 className="mt-1 text-[16px] font-medium text-ink">Build the method one step at a time</h3>
                    </div>
                    <span className="text-[11px] text-ink-muted">
                      {Math.min(visibleSteps, selected.steps.length)} of {selected.steps.length}
                    </span>
                  </div>
                  <ol className="mt-4 space-y-3">
                    {selected.steps.slice(0, visibleSteps).map((step, index) => (
                      <li key={step} className="flex gap-3 rounded-control bg-surface px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-board font-mono text-[11px] text-paper">
                          {index + 1}
                        </span>
                        <p className="pt-0.5 text-[13px] leading-relaxed text-ink">{step}</p>
                      </li>
                    ))}
                  </ol>
                  {visibleSteps < selected.steps.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleSteps((current) => current + 1)}
                      className="mt-4 inline-flex items-center gap-2 rounded-control bg-board px-3.5 py-2 text-[13px] text-paper hover:bg-board-deep"
                    >
                      Show next step <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-board">
                      <CheckCircle2 size={16} /> Complete solution shown
                    </div>
                  )}
                </section>
              ) : null}
            </div>
            )}
          </PageBody>
        </div>
      </Page>
      {sheet ? (
        <GenerateSheet mode={sheet} session={session} onClose={() => setSheet(null)} />
      ) : null}
    </CourseShell>
  )
}
