// question-bank.ts — what a question belongs to, and who is allowed to see it.
//
// THE SESSION IS THE UNIT. SHSID does not teach one G9 English course at four
// difficulties; it teaches four different classes that share a course code.
// G9 English S+ reads texts the H class is never set, so a question written
// for S+ is not an easier H question — it is a question about something the H
// class did not study. Notes have understood this since they were level-scoped
// (`notesForCourse`); questions and papers did not, which is why generating
// from notes had to start here rather than at the model.
//
// A session is therefore (course, level), and everything below is scoped by it:
//
//   · which questions a student practises          `questionsForSession`
//   · which notes are eligible to generate from    `sessionNotes`
//   · where the bank is thin                       `coverageForSession`
//   · what one generation run produced             a SynthesisBatch, "a block"
//   · how much may be generated at all             `SYNTHESIS` + `sessionQuota`
//
// PROVENANCE IS NOT DECORATION. Every generated item carries `origin:
// 'synthesized'`, the note codes it came from, the note revisions at the time,
// the model and the trigger. The UI shows the tag wherever the item appears.
// A student practising a model's reading of the notes is entitled to know that
// is what they are doing, and a teacher who finds a bad item is entitled to
// know which run and which note produced it.
//
// WRITES GO THROUGH HERE, NOT THROUGH THE PAGES. Generated rows live in
// `synthesizedQuestions` / `synthesizedPapers` / `synthesisBatches` — separate
// from the seeded tables so the storage delta stays small (see types.ts).
import {
  getCurrentUserDatabase,
  getCurrentUserId,
  getDatabase,
  recordAudit,
  updateDatabase,
} from './client'
import { getCourseLevel, noteMarkdown, notesForCourse } from './notes-tools'
import { getActiveCourse, type ActiveCourse } from '@/lib/course-selection'
import { uuid } from '@/lib/uuid'
import type {
  CourseLevel,
  IndexedQuestion,
  MockTest,
  QuestionStatus,
  SynthesisBatch,
  UnitNote,
} from './types'

/** Level slot in a session key for a course whose notes carry no level. */
export const SESSION_WILDCARD = '*'

/**
 * Bounds on generation.
 *
 * These are not tuning knobs, they are the safety rails. Everything generated
 * is written to localStorage, which is ~5 MB for the whole origin and already
 * holds the student's chat history and attempt record; an unbounded "generate"
 * button is a quota failure with extra steps. The per-run caps also keep one
 * press to a handful of gateway calls, which is what the proxy's 60/min budget
 * and the site owner's bill can absorb.
 */
export const SYNTHESIS = {
  /** Questions one manual run may add. */
  maxPerRun: 12,
  /** Notes one manual run may draw from — one gateway call each. */
  maxNotesPerRun: 4,
  /** Questions one unprompted agent run may add. Deliberately small. */
  agentMaxPerRun: 4,
  /** Notes one agent run may draw from. */
  agentMaxNotesPerRun: 2,
  /** Ceiling on stored synthesized questions for a single session. */
  sessionCap: 240,
  /** Quiet period between unprompted agent runs for the same session. */
  agentCooldownMs: 10 * 60 * 1000,
  /** Questions per note a healthy bank has, by difficulty. */
  targetMix: { Foundation: 1, Standard: 2, Challenge: 1 },
} as const

export type Difficulty = IndexedQuestion['difficulty']

const DIFFICULTIES: Difficulty[] = ['Foundation', 'Standard', 'Challenge']

/**
 * One class, taught at one level.
 *
 * `level` is null only when the course's notes carry no level at all (the
 * seeded demo courses, and the IB/AP/A-Level pathways, which are not streamed).
 * A null level is a real session; a level the student has simply not chosen yet
 * is not, and `sessionReady` tells them apart.
 */
export interface CourseSession {
  courseId: string
  courseCode: string
  courseTitle: string
  subject: string
  level: CourseLevel | null
  /** `${courseId}::${level ?? '*'}` — stable, storable, comparable. */
  key: string
  /** "HS ENGLISH 9 · S+" — what this class is called out loud. */
  label: string
}

export function sessionKeyFor(courseId: string, level: CourseLevel | null | undefined): string {
  return `${courseId}::${level ?? SESSION_WILDCARD}`
}

/** The session the signed-in student is currently working in. */
export function resolveSession(course: ActiveCourse = getActiveCourse()): CourseSession {
  const level = getCourseLevel(course.id) ?? null
  return {
    courseId: course.id,
    courseCode: course.code,
    courseTitle: course.title,
    subject: course.subject,
    level,
    key: sessionKeyFor(course.id, level),
    label: level ? `${course.code} · ${level}` : course.code,
  }
}

/** Notes belonging to this session — the only material generation may read. */
export function sessionNotes(session: CourseSession): UnitNote[] {
  return notesForCourse(session.courseId, session.level ?? undefined)
}

/**
 * Whether this session can be generated for, and why not when it cannot.
 *
 * The refusals are separate because they need different answers from the
 * student. "Pick a level" is a two-click fix in Setup; "this course has no
 * notes at your level" is not something they can fix at all, and offering a
 * Generate button that fails is worse than not offering one.
 */
export function sessionReady(
  session: CourseSession,
): { ok: true; notes: UnitNote[] } | { ok: false; reason: string; fix?: 'level' } {
  const levelled = getDatabase().notes.some(
    (note) => note.courseId === session.courseId && Boolean(note.level),
  )
  if (levelled && !session.level) {
    return {
      ok: false,
      reason: `${session.courseCode} is taught at several levels and each is a different class. Choose yours before generating, so questions match the material you were actually taught.`,
      fix: 'level',
    }
  }
  const notes = sessionNotes(session)
  if (notes.length === 0) {
    return {
      ok: false,
      reason: `No shared notes exist for ${session.label}, and questions are written from notes. Nothing can be generated until this session has material.`,
    }
  }
  return { ok: true, notes }
}

// ── reading the bank ───────────────────────────────────────────────────────

export function questionOrigin(question: IndexedQuestion) {
  return question.origin ?? 'indexed'
}

export function isSynthesized(question: IndexedQuestion): boolean {
  return questionOrigin(question) === 'synthesized'
}

export function questionStatus(question: IndexedQuestion): QuestionStatus {
  return question.status ?? 'published'
}

/**
 * The note a question belongs to.
 *
 * Synthesized items say so outright. Curated ones encode it in their code —
 * `1.4-Q01` is the first question on note 1.4 — which is how coverage can be
 * measured across a bank that predates provenance.
 */
export function noteCodeFor(question: IndexedQuestion): string {
  const declared = question.provenance?.noteCodes?.[0]
  if (declared) return declared
  return question.code.split('-')[0]
}

function matchesSession(question: IndexedQuestion, session: CourseSession): boolean {
  // Course. The `*` wildcard predates course scoping and is narrowed by
  // subject, so a stray untagged row cannot leak into an unrelated course.
  if (question.courseId !== session.courseId) {
    if (question.courseId !== '*') return false
    if (question.subject && question.subject !== session.subject) return false
  }
  // Level. Same rule as notes: no level means it predates session scoping and
  // belongs to every level; a level means it belongs to that session alone.
  if (!question.level) return true
  return question.level === session.level
}

export interface SessionQuestionFilter {
  /** Default 'published' — drafts are for the review queue, not for practice. */
  status?: QuestionStatus | 'any'
  origin?: 'indexed' | 'synthesized' | 'any'
}

/** Every question this session may practise, curated and synthesized together. */
export function questionsForSession(
  session: CourseSession,
  filter: SessionQuestionFilter = {},
): IndexedQuestion[] {
  const wantStatus = filter.status ?? 'published'
  const wantOrigin = filter.origin ?? 'any'
  const database = getDatabase()
  const all = [...database.questions, ...(database.synthesizedQuestions ?? [])]
  return all.filter((question) => {
    if (!matchesSession(question, session)) return false
    if (wantStatus !== 'any' && questionStatus(question) !== wantStatus) return false
    if (wantOrigin !== 'any' && questionOrigin(question) !== wantOrigin) return false
    return true
  })
}

/** Drafts awaiting a decision in this session, newest block first. */
export function draftsForSession(session: CourseSession): IndexedQuestion[] {
  return questionsForSession(session, { status: 'draft', origin: 'synthesized' })
}

/** Papers for this session: the shipped PDFs plus anything synthesized. */
export function papersForSession(session: CourseSession): MockTest[] {
  const database = getDatabase()
  const all = [...database.mockTests, ...(database.synthesizedPapers ?? [])]
  return all.filter((paper) => {
    if (paper.courseId !== session.courseId) return false
    if (!paper.level) return true
    return paper.level === session.level
  })
}

export function batchesForSession(session: CourseSession): SynthesisBatch[] {
  return (getDatabase().synthesisBatches ?? [])
    .filter((batch) => batch.sessionKey === session.key && batch.status !== 'discarded')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function findBatch(batchId: string): SynthesisBatch | undefined {
  return (getDatabase().synthesisBatches ?? []).find((batch) => batch.id === batchId)
}

/** How much of this session's synthesis allowance is left. */
export function sessionQuota(session: CourseSession) {
  const used = questionsForSession(session, { status: 'any', origin: 'synthesized' }).length
  return { used, cap: SYNTHESIS.sessionCap, remaining: Math.max(0, SYNTHESIS.sessionCap - used) }
}

// ── coverage: where the bank is thin ───────────────────────────────────────

export interface NoteCoverage {
  code: string
  title: string
  /** Published questions attributed to this note, by difficulty. */
  have: Record<Difficulty, number>
  /** How many short of `SYNTHESIS.targetMix` it is, by difficulty. */
  want: Record<Difficulty, number>
  /** Total shortfall — what the plan sorts on. */
  gap: number
  /** Synthesized items on this note whose note has been revised since. */
  stale: number
}

function emptyMix(): Record<Difficulty, number> {
  return { Foundation: 0, Standard: 0, Challenge: 0 }
}

/**
 * What this session's bank looks like against its own notes.
 *
 * This is the whole reason generation is worth having: not "write me some
 * questions", but "note 3.2 has been taught, is examinable, and has nothing to
 * practise on". The plan that comes out of it is targeted, so a run produces
 * items about the material that is actually uncovered rather than four more
 * questions on the topic that already had six.
 */
export function coverageForSession(session: CourseSession): NoteCoverage[] {
  const notes = sessionNotes(session)
  const published = questionsForSession(session, { status: 'published' })
  const synthesized = questionsForSession(session, { status: 'any', origin: 'synthesized' })

  const byNote = new Map<string, IndexedQuestion[]>()
  for (const question of published) {
    const code = noteCodeFor(question)
    const bucket = byNote.get(code)
    if (bucket) bucket.push(question)
    else byNote.set(code, [question])
  }

  return notes.map((note) => {
    const have = emptyMix()
    for (const question of byNote.get(note.code) ?? []) have[question.difficulty] += 1
    const want = emptyMix()
    let gap = 0
    for (const difficulty of DIFFICULTIES) {
      const short = Math.max(0, SYNTHESIS.targetMix[difficulty] - have[difficulty])
      want[difficulty] = short
      gap += short
    }
    const stale = synthesized.filter((question) => {
      if (noteCodeFor(question) !== note.code) return false
      const at = question.provenance?.noteRevisions?.[note.code]
      return typeof at === 'number' && note.revision > at
    }).length
    return { code: note.code, title: note.title, have, want, gap, stale }
  })
}

export interface PlannedNote {
  note: UnitNote
  /** Difficulties to ask for, in the order they should be written. */
  wanted: Difficulty[]
  reason: string
}

/**
 * Turn coverage into a run: which notes, and what to ask each one for.
 *
 * Thinnest first, so a press of the button spends its budget where the bank is
 * emptiest. A session whose every note already meets the target returns an
 * empty plan, and the UI says so rather than generating duplicates of what is
 * already there.
 */
export function planForSession(
  session: CourseSession,
  {
    maxNotes = SYNTHESIS.maxNotesPerRun,
    maxQuestions = SYNTHESIS.maxPerRun,
    noteCodes,
  }: { maxNotes?: number; maxQuestions?: number; noteCodes?: string[] } = {},
): PlannedNote[] {
  const notes = new Map(sessionNotes(session).map((note) => [note.code, note]))
  const ranked = coverageForSession(session)
    .filter((entry) => entry.gap > 0 && (!noteCodes || noteCodes.includes(entry.code)))
    .sort((a, b) => b.gap - a.gap || a.code.localeCompare(b.code))
    .slice(0, maxNotes)

  const candidates = ranked.flatMap((entry) => {
    const note = notes.get(entry.code)
    if (!note) return []
    const missing = DIFFICULTIES.filter((difficulty) => entry.want[difficulty] > 0)
    return [{
      note,
      wanted: [] as Difficulty[],
      pending: DIFFICULTIES.flatMap((difficulty) => Array<Difficulty>(entry.want[difficulty]).fill(difficulty)),
      reason: entry.have.Foundation + entry.have.Standard + entry.have.Challenge === 0
        ? 'nothing to practise on yet'
        : `no ${missing.join(' or ').toLowerCase()} question yet`,
    }]
  })
  // Share the budget across selected topics before adding a second question
  // to any one topic. Selection should determine coverage, not just priority.
  let budget = Math.max(0, Math.floor(maxQuestions))
  while (budget > 0) {
    let allocated = false
    for (const candidate of candidates) {
      if (budget <= 0) break
      const difficulty = candidate.pending.shift()
      if (!difficulty) continue
      candidate.wanted.push(difficulty)
      budget -= 1
      allocated = true
    }
    if (!allocated) break
  }
  const plan: PlannedNote[] = candidates
    .filter((candidate) => candidate.wanted.length > 0)
    .map(({ note, wanted, reason }) => ({ note, wanted, reason }))
  return plan
}

// ── writing: blocks in, blocks out ─────────────────────────────────────────

/**
 * One generation run may be in flight per session at a time.
 *
 * Module state rather than stored state: a lock that survives a reload is a
 * lock that can be left held by a tab that has closed, and the worst outcome
 * of losing it on reload is one duplicate run the validator would dedupe
 * anyway.
 */
const inFlight = new Set<string>()

export function isGenerating(session: CourseSession): boolean {
  return inFlight.has(session.key)
}

export function beginGeneration(session: CourseSession): boolean {
  if (inFlight.has(session.key)) return false
  inFlight.add(session.key)
  return true
}

export function endGeneration(session: CourseSession) {
  inFlight.delete(session.key)
}

/** When this session last had an unprompted agent run, for the cooldown. */
const lastAgentRun = new Map<string, number>()

export function agentRunAllowed(session: CourseSession): boolean {
  const at = lastAgentRun.get(session.key)
  return at === undefined || Date.now() - at >= SYNTHESIS.agentCooldownMs
}

export function markAgentRun(session: CourseSession) {
  lastAgentRun.set(session.key, Date.now())
}

/** Whether Syno may draft questions unprompted. Absent reads as on. */
export function autoSynthesisEnabled(): boolean {
  return getCurrentUserDatabase().settings.autoSynthesis !== false
}

export interface RecordBatchInput {
  session: CourseSession
  questions: IndexedQuestion[]
  noteCodes: string[]
  model: string
  trigger: 'manual' | 'agent'
  rejected: number
  rejectionReasons?: string[]
  /** 'draft' for anything to be reviewed; 'published' when already accepted. */
  status: QuestionStatus
}

/**
 * Commit one run's output as a block.
 *
 * The questions and the batch row are written in the SAME `updateDatabase`
 * call. Two calls would mean two persists, and an interruption between them
 * would leave either orphaned questions with no block to review them in, or a
 * block claiming questions that are not there.
 */
export function recordBatch(input: RecordBatchInput): SynthesisBatch {
  const { session } = input
  const batch: SynthesisBatch = {
    id: `batch-${uuid()}`,
    courseId: session.courseId,
    level: session.level,
    sessionKey: session.key,
    kind: 'questions',
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUserId(),
    trigger: input.trigger,
    model: input.model,
    noteCodes: input.noteCodes,
    questionIds: input.questions.map((question) => question.id),
    status: input.status === 'published' ? 'accepted' : 'draft',
    rejected: input.rejected,
    ...(input.rejectionReasons?.length ? { rejectionReasons: input.rejectionReasons } : {}),
  }

  const rows = input.questions.map((question) => ({
    ...question,
    batchId: batch.id,
    status: input.status,
  }))

  updateDatabase((database) => {
    database.synthesizedQuestions ??= []
    database.synthesisBatches ??= []
    database.synthesizedQuestions.push(...rows)
    database.synthesisBatches.push(batch)
  })

  recordAudit({
    action: 'questions.synthesized',
    subjectId: batch.id,
    subjectName: session.label,
    purpose: `${rows.length} question${rows.length === 1 ? '' : 's'} written from ${input.noteCodes.join(', ') || 'course notes'} by ${input.model}${input.trigger === 'agent' ? ' (unprompted)' : ''}`,
    rows: rows.length,
    result: 'success',
    ...(input.rejected ? { detail: `${input.rejected} draft(s) failed validation` } : {}),
  })

  return batch
}

/** Accept a block, or a subset of it, into the practice bank. */
export function acceptBatch(batchId: string, keepIds?: string[]) {
  const keep = keepIds ? new Set(keepIds) : null
  let accepted = 0
  let dropped = 0
  updateDatabase((database) => {
    const rows = database.synthesizedQuestions ?? []
    database.synthesizedQuestions = rows.filter((question) => {
      if (question.batchId !== batchId) return true
      if (keep && !keep.has(question.id)) {
        dropped += 1
        return false
      }
      question.status = 'published'
      accepted += 1
      return true
    })
    const batch = database.synthesisBatches?.find((entry) => entry.id === batchId)
    if (batch) {
      batch.status = accepted > 0 ? 'accepted' : 'discarded'
      batch.questionIds = batch.questionIds.filter((id) => !keep || keep.has(id))
    }
  })
  recordAudit({
    action: 'questions.accepted',
    subjectId: batchId,
    purpose: `${accepted} synthesized question(s) accepted into the practice bank${dropped ? `, ${dropped} discarded` : ''}`,
    rows: accepted,
    result: 'success',
  })
  return { accepted, dropped }
}

/** Discard a whole block. The row stays as the record that it happened. */
export function discardBatch(batchId: string) {
  let removed = 0
  updateDatabase((database) => {
    const rows = database.synthesizedQuestions ?? []
    database.synthesizedQuestions = rows.filter((question) => {
      if (question.batchId !== batchId) return true
      removed += 1
      return false
    })
    const batch = database.synthesisBatches?.find((entry) => entry.id === batchId)
    if (batch) {
      batch.status = 'discarded'
      batch.questionIds = []
    }
    // A paper assembled from a discarded block would point at questions that
    // are gone, and would render as a page of blanks.
    database.synthesizedPapers = (database.synthesizedPapers ?? []).filter(
      (paper) => paper.batchId !== batchId,
    )
  })
  recordAudit({
    action: 'questions.discarded',
    subjectId: batchId,
    purpose: `Synthesis block discarded; ${removed} question(s) removed`,
    rows: removed,
    result: 'success',
  })
  return removed
}

/** Retire one question without touching the rest of its block. */
export function retireQuestion(questionId: string, reason: string) {
  updateDatabase((database) => {
    const question = database.synthesizedQuestions?.find((entry) => entry.id === questionId)
    if (question) question.status = 'retired'
  })
  recordAudit({
    action: 'questions.discarded',
    subjectId: questionId,
    purpose: `Synthesized question retired: ${reason}`,
    rows: 1,
    result: 'success',
  })
}

// ── papers ─────────────────────────────────────────────────────────────────

export function recordPaper(paper: MockTest, session: CourseSession, questionCount: number) {
  updateDatabase((database) => {
    database.synthesizedPapers ??= []
    database.synthesizedPapers.unshift(paper)
  })
  recordAudit({
    action: 'paper.synthesized',
    subjectId: paper.id,
    subjectName: session.label,
    purpose: `Mock paper assembled from ${questionCount} of this session's questions`,
    rows: questionCount,
    result: 'success',
  })
  return paper
}

export function discardPaper(paperId: string) {
  updateDatabase((database) => {
    database.synthesizedPapers = (database.synthesizedPapers ?? []).filter(
      (paper) => paper.id !== paperId,
    )
  })
}

/** Resolve a synthesized paper's question ids back to questions, in order. */
export function questionsForPaper(paper: MockTest): IndexedQuestion[] {
  if (!paper.questionIds?.length) return []
  const database = getDatabase()
  const index = new Map<string, IndexedQuestion>()
  for (const question of [...database.questions, ...(database.synthesizedQuestions ?? [])]) {
    index.set(question.id, question)
  }
  return paper.questionIds
    .map((id) => index.get(id))
    .filter((question): question is IndexedQuestion => Boolean(question))
}

// ── material for the generator ─────────────────────────────────────────────

/**
 * The note text a run is grounded in, trimmed to something a prompt can hold.
 *
 * Study-guide notes run to thousands of words. Sending one whole is both
 * expensive and counter-productive — the model writes about the last thing it
 * read. The head of the document carries the definitions and the worked method,
 * which is what questions are made of.
 */
export function noteExcerpt(note: UnitNote, limit = 6000): string {
  const markdown = noteMarkdown(note)
  if (markdown.length <= limit) return markdown
  return `${markdown.slice(0, limit)}\n\n…(note continues)`
}
