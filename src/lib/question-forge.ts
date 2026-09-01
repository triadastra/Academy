// question-forge.ts — writing questions from a session's own notes.
//
// The pipeline, and why each stage is there:
//
//   1. SCOPE     One session, resolved before anything else runs. A course is
//                not a scope: G9 English S+ and G9 English H are different
//                classes reading different texts (question-bank.ts).
//   2. PLAN      Coverage of the session's notes decides what to ask for. The
//                button does not mean "write some questions", it means "note
//                3.2 is taught, is examinable, and has nothing to practise on".
//   3. WRITE     One gateway call per note, grounded in that note's markdown
//                and told which prompts already exist so it does not restate
//                them. Small calls beat one large one: the model writes about
//                the last thing it read, and a failure costs one note.
//   4. VALIDATE  Every draft is marked with the SAME marker the student will
//                meet (lib/marking.ts). A question whose own stated answer
//                fails its own accept rule is not a hard question, it is a
//                broken one, and it is discarded here rather than in front of
//                a student who typed the right thing and was told they were
//                wrong. Everything discarded is counted and reported.
//   5. STAGE     What survives lands as a BLOCK of drafts against the session
//                — reviewable and reversible as one act, never silently merged
//                into the practice bank.
//
// Papers are assembled, not written. The model never authors a paper: it
// selects from questions that have already passed stage 4, spread across the
// session's notes and ramped by difficulty, weighted towards what this student
// has actually been getting wrong. A generated paper therefore inherits the
// validation of its questions instead of being a fresh chance to hallucinate.
import { chat, GatewayUnavailable, LLM_MODEL } from './llm'
import { markAnswer, parseNumeric } from './marking'
import { getCurrentUserDatabase, getCurrentUserId } from '@/database/client'
import { pushSystemNotification } from '@/database/notifications'
import {
  SYNTHESIS,
  agentRunAllowed,
  autoSynthesisEnabled,
  beginGeneration,
  endGeneration,
  isGenerating,
  markAgentRun,
  noteCodeFor,
  noteExcerpt,
  papersForSession,
  planForSession,
  questionsForSession,
  recordBatch,
  recordPaper,
  sessionNotes,
  sessionQuota,
  sessionReady,
  type CourseSession,
  type Difficulty,
  type PlannedNote,
} from '@/database/question-bank'
import { uuid } from '@/lib/uuid'
import type {
  AnswerRule,
  IndexedQuestion,
  MockTest,
  QuestionOption,
  SynthesisBatch,
  UnitNote,
} from '@/database/types'

const TYPES = ['Short response', 'Extended response', 'Multiple choice'] as const
const DIFFICULTIES: Difficulty[] = ['Foundation', 'Standard', 'Challenge']

/** Marks a question of each difficulty is worth. Outside this it is clamped. */
const MARK_BAND: Record<Difficulty, [number, number]> = {
  Foundation: [2, 4],
  Standard: [3, 6],
  Challenge: [5, 9],
}

/**
 * How similar two prompts may be before the newer one is a duplicate.
 *
 * Measured as Jaccard overlap of content words. 0.7 catches the real failure
 * mode — the model restating an existing question with different numbers or a
 * different verb — without rejecting two genuinely different questions that
 * happen to share a topic's vocabulary.
 */
const DUPLICATE_THRESHOLD = 0.7

/** Requests in flight at once. See `mapWithLimit`. */
const NOTE_CONCURRENCY = 3

/**
 * Questions asked for in a single call.
 *
 * Small on purpose. Reasoning scales with how much is being asked: measured on
 * a dense literature note, a request for three questions spent ~5,000 tokens
 * thinking before writing a word, which both starved the output budget and
 * made the run feel hung. Two at a time keeps each call short, and because
 * requests run concurrently, splitting a note into two calls costs almost
 * nothing in wall-clock.
 */
const QUESTIONS_PER_CALL = 2

/**
 * What one note is doing right now.
 *
 * Reported per note rather than as a single line because notes run
 * concurrently — a single "currently doing X" line would flicker between three
 * of them and tell the truth about none.
 *
 * `thinking` is the reasoning token count, and it is here for one reason: Kimi
 * K3 reasons for the better part of a minute before it emits a single answer
 * token. Measured on this prompt: 48 seconds and ~1,900 reasoning chunks
 * before the first character of JSON. A spinner alone over that gap is
 * indistinguishable from a hang, and the first live run of this pipeline
 * looked exactly like one. A number that climbs is proof of life.
 */
export interface NoteProgress {
  code: string
  title: string
  phase: 'queued' | 'thinking' | 'writing' | 'done' | 'failed'
  /** Questions kept from this note so far. */
  written: number
  /** Questions asked for. */
  wanted: number
  /** Approximate reasoning tokens seen so far. */
  thinking: number
}

export interface ForgeProgress {
  phase: 'planning' | 'running' | 'saving' | 'done' | 'failed'
  /** Notes finished, out of how many this run will touch. */
  done: number
  total: number
  /** Human sentence for the progress line. */
  message: string
  /** One row per note in the run, in plan order. */
  notes: NoteProgress[]
  /** Accepted so far, so the sheet can fill in as it goes. */
  questions: IndexedQuestion[]
}

export interface RejectedDraft {
  prompt: string
  reason: string
}

export interface ForgeResult {
  batch: SynthesisBatch | null
  questions: IndexedQuestion[]
  rejected: RejectedDraft[]
  noteCodes: string[]
  /** Set when the run could not start or produced nothing usable. */
  error?: string
}

// ── stage 3: the prompt ────────────────────────────────────────────────────

function difficultyBrief(wanted: Difficulty[]): string {
  const counts = new Map<Difficulty, number>()
  for (const difficulty of wanted) counts.set(difficulty, (counts.get(difficulty) ?? 0) + 1)
  return [...counts.entries()]
    .map(([difficulty, count]) => `${count} × ${difficulty}`)
    .join(', ')
}

function systemPrompt(session: CourseSession): string {
  const levelLine = session.level
    ? `This is the ${session.level} class. At SHSID a level is not a difficulty dial — the ${session.level} class is taught its own texts, examples and definitions. Write only about what the note below actually contains, and never import material from another level of the same course.`
    : 'Write only about what the note below actually contains.'
  return [
    `You write examination questions for ${session.courseCode} — ${session.courseTitle} at SHSID.`,
    levelLine,
    '',
    'Rules, all of them binding:',
    '· Every question must be answerable from the note alone, by a student who has read it and nothing else.',
    '· Never refer to "the note", "the passage above", "the text provided" or the source in any way. The student sees the question, not the note.',
    '· Give the complete correct answer, and 2–5 teaching steps that build the method rather than restating the answer.',
    '· "accept" lists short exact fragments a correct answer must contain. Keep them minimal: a number, a term, a name — never a whole sentence.',
    '· Use mode "numeric" when the answer is a number, "choice" for multiple choice, "equalsAny" for one short exact term, "includesAll" only when several terms must all appear.',
    '· Multiple choice needs 4 options with ids A, B, C, D, exactly one correct, and distractors that encode a real mistake a student makes — never filler.',
    '· Write mathematics as LaTeX in "tex", with no surrounding $ delimiters. Leave "tex" out when there is none.',
    '· Do not restate a question that already exists. You are given the existing prompts.',
    '',
    'Decide quickly and write. Long deliberation costs the budget the questions themselves need.',
    'Reply with JSON only — no prose, no code fence, no commentary. Shape:',
    '{"questions":[{"topic":"","prompt":"","tex":"","type":"Short response|Extended response|Multiple choice","difficulty":"Foundation|Standard|Challenge","marks":4,"options":[{"id":"A","text":"","why":""}],"correctOption":"A","answer":"","accept":{"mode":"numeric","values":[""],"tolerance":0.005},"steps":[""],"misconception":"","tags":[""]}]}',
  ].join('\n')
}

function userPrompt(
  planned: PlannedNote,
  existingPrompts: string[],
  feedback: string[] = [],
): string {
  const existing = existingPrompts.slice(0, 20)
  return [
    `Note ${planned.note.code} — ${planned.note.title}`,
    '',
    noteExcerpt(planned.note),
    '',
    '---',
    `Write exactly ${planned.wanted.length} question(s): ${difficultyBrief(planned.wanted)}.`,
    `Marks: Foundation ${MARK_BAND.Foundation.join('–')}, Standard ${MARK_BAND.Standard.join('–')}, Challenge ${MARK_BAND.Challenge.join('–')}.`,
    existing.length
      ? `Questions that already exist for this topic — write about something else:\n${existing.map((prompt) => `· ${prompt}`).join('\n')}`
      : 'Nothing exists for this topic yet.',
    // On a retry the model is told exactly why its last drafts were thrown
    // away, so it fixes the fault instead of repeating it. See writeNote.
    ...(feedback.length
      ? [
          '',
          `Your previous attempt at this note was rejected. Fix these faults and do not repeat them:\n${feedback.map((reason) => `· ${reason}`).join('\n')}`,
        ]
      : []),
  ].join('\n')
}

// ── stage 4: parsing and validation ────────────────────────────────────────

/**
 * Pull one JSON object out of a model reply.
 *
 * Reasoning models wrap JSON in a fence, prefix it with a sentence, or both,
 * however firmly they are told not to. Slicing between the first `{` and the
 * last `}` survives all of that; the trailing-comma repair survives the one
 * malformation that otherwise costs a whole note's worth of output.
 */
export function parseModelJson(reply: string): unknown | null {
  const withoutFence = reply.replace(/```(?:json)?/gi, '')
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  const body = withoutFence.slice(start, end + 1)
  try {
    return JSON.parse(body)
  } catch {
    try {
      return JSON.parse(body.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return null
    }
  }
}

/**
 * Where the question array's contents begin in a partial reply.
 *
 * Returns the index just past the `[` so the scanner below can treat every
 * brace it then meets as a question rather than as the document wrapper.
 * Falls back to the first bracket for a model that answered with a bare array.
 */
function questionArrayStart(buffer: string): number {
  const keyed = /"questions"\s*:\s*\[/.exec(buffer)
  if (keyed) return keyed.index + keyed[0].length
  const bracket = buffer.indexOf('[')
  return bracket === -1 ? -1 : bracket + 1
}

/**
 * Pull whole question objects out of a reply that is still arriving.
 *
 * This is what makes a truncated generation salvageable. Kimi K3 spends most
 * of its budget on reasoning before it writes anything, so a run that asks for
 * four questions can hit the token ceiling three questions in — and a
 * whole-document `JSON.parse` of that returns nothing at all, which is how the
 * first live run of this pipeline produced "the model did not return usable
 * JSON" after two minutes of work. Scanning for balanced braces keeps every
 * question that finished, and only loses the one that was mid-sentence.
 *
 * It is also what lets the sheet show items as they are written instead of
 * spinning until the whole call lands.
 *
 * `from` is the cursor to resume at, so a growing buffer is scanned once
 * overall rather than once per chunk.
 */
export function scanCompleteObjects(
  buffer: string,
  from: number,
): { objects: string[]; next: number } {
  const objects: string[] = []
  const begin = from > 0 ? from : questionArrayStart(buffer)
  if (begin === -1) return { objects, next: 0 }

  let cursor = begin
  let index = begin
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  while (index < buffer.length) {
    const char = buffer[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
    } else if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth <= 0) {
        if (start !== -1) {
          objects.push(buffer.slice(start, index + 1))
          cursor = index + 1
        }
        depth = 0
        start = -1
      }
    }
    index += 1
  }
  return { objects, next: cursor }
}

/** Parse one scanned object, repairing the one malformation worth repairing. */
function parseScanned(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    try {
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return null
    }
  }
}

/**
 * Run `task` over `items` with a bounded number in flight.
 *
 * Notes are independent — each is its own call about its own material — so
 * running them one after another made a four-note run take four times as long
 * as it needed to for no benefit. Three at a time keeps well inside the
 * proxy's 60-requests-a-minute budget while making the run as long as its
 * slowest note rather than the sum of all of them.
 */
async function mapWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0
  const worker = async () => {
    for (;;) {
      const index = next++
      if (index >= items.length) return
      await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2),
  )
}

/** Jaccard overlap of content words — see DUPLICATE_THRESHOLD. */
export function promptSimilarity(a: string, b: string): number {
  const left = words(a)
  const right = words(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const word of left) if (right.has(word)) shared += 1
  return shared / (left.size + right.size - shared)
}

function clamp(value: number, [low, high]: [number, number]): number {
  return Math.min(high, Math.max(low, value))
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : []
}

/** Phrases that mean the model wrote about its own context, not the subject. */
const LEAKED_CONTEXT =
  /\b(the note|the passage above|the text (above|provided|below)|the excerpt|according to the (note|guide)|as an ai)\b/i

/** Multiple-choice options a student can eliminate without knowing anything. */
const FILLER_OPTION = /^(all|none|both|neither|all of these|none of these)( of the above)?[.!]?$/

/** Loosest tolerance a numeric accept rule may carry: five per cent. */
const MAX_NUMERIC_TOLERANCE = 0.05

interface DraftValidation {
  ok: boolean
  reason?: string
  question?: IndexedQuestion
}

/**
 * Turn one model draft into a bank question, or say why it cannot be one.
 *
 * The order matters: cheap structural checks first, the self-mark check last,
 * because it is the one that catches the failure a student would actually
 * suffer and it is worth reporting precisely.
 */
export function validateDraft(
  raw: unknown,
  context: {
    session: CourseSession
    note: UnitNote
    wanted: Difficulty
    index: number
    existingPrompts: string[]
  },
): DraftValidation {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'not an object' }
  const draft = raw as Record<string, unknown>

  const prompt = text(draft.prompt)
  if (prompt.length < 12) return { ok: false, reason: 'prompt missing or too short' }
  if (prompt.length > 700) return { ok: false, reason: 'prompt too long to be one question' }
  if (LEAKED_CONTEXT.test(prompt)) {
    return { ok: false, reason: 'refers to the source note, which the student never sees' }
  }

  const duplicate = context.existingPrompts.find(
    (existing) => promptSimilarity(existing, prompt) >= DUPLICATE_THRESHOLD,
  )
  if (duplicate) return { ok: false, reason: 'duplicates a question already in the bank' }

  const type = (TYPES as readonly string[]).includes(text(draft.type))
    ? (text(draft.type) as IndexedQuestion['type'])
    : 'Short response'
  const difficulty = DIFFICULTIES.includes(text(draft.difficulty) as Difficulty)
    ? (text(draft.difficulty) as Difficulty)
    : context.wanted

  const steps = stringList(draft.steps).filter((step) => step.length <= 500)
  if (steps.length < 2) return { ok: false, reason: 'fewer than two teaching steps' }

  let answer = text(draft.answer)
  let options: QuestionOption[] | undefined
  let answerRule: AnswerRule

  if (type === 'Multiple choice') {
    const parsed = Array.isArray(draft.options) ? draft.options : []
    options = parsed
      .map((option) => {
        const entry = (option ?? {}) as Record<string, unknown>
        return { id: text(entry.id).toUpperCase(), text: text(entry.text), why: text(entry.why) }
      })
      .filter((option) => option.id && option.text)
      .map((option) => (option.why ? option : { id: option.id, text: option.text }))
    const ids = new Set(options.map((option) => option.id))
    if (options.length < 3 || ids.size !== options.length) {
      return { ok: false, reason: 'needs at least three distinctly labelled options' }
    }
    // The labels being distinct is not enough: two options with the same TEXT
    // ("2" and "2.0", or the same phrase re-cased) make the question
    // unanswerable even when the key is unambiguous.
    const texts = options.map((option) =>
      option.text.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.,;:!?]$/, ''),
    )
    if (new Set(texts).size !== texts.length) {
      return { ok: false, reason: 'two options say the same thing' }
    }
    // Filler options are eliminable without knowing anything, so they mark
    // the test taker's elimination skill rather than the course material.
    if (texts.some((optionText) => FILLER_OPTION.test(optionText))) {
      return { ok: false, reason: 'has a filler option ("all/none of the above")' }
    }
    const correct = text(draft.correctOption).toUpperCase()
    if (!ids.has(correct)) return { ok: false, reason: 'correct option is not one of the options' }
    answerRule = { mode: 'choice', values: [correct] }
    const chosen = options.find((option) => option.id === correct)!
    // `answer` is DISPLAY text — what a student is shown when they get it
    // wrong — and is deliberately overwritten rather than kept. The model
    // tends to answer a multiple-choice item in prose ("Cosmological"), and
    // the earlier version kept that string and then self-checked it against a
    // `choice` rule holding the option id. It never matched, so every good
    // multiple-choice question this pipeline wrote was thrown away as broken.
    // The marking key is the option id; the sentence is for the reader.
    answer = `${correct} — ${chosen.text}`
  } else {
    const accept = (draft.accept ?? {}) as Record<string, unknown>
    const mode = text(accept.mode)
    const values = stringList(accept.values)
    if (!answer) return { ok: false, reason: 'no answer given' }
    if (values.length === 0) return { ok: false, reason: 'no accept terms, so it cannot be marked' }
    if (values.some((value) => value.length > 60)) {
      return { ok: false, reason: 'accept terms are whole sentences rather than key fragments' }
    }
    const tolerance = typeof accept.tolerance === 'number' ? accept.tolerance : undefined
    const acceptMode =
      mode === 'numeric' || mode === 'equalsAny' || mode === 'includesAll'
        ? (mode as AnswerRule['mode'])
        : 'includesAll'
    if (acceptMode === 'numeric') {
      // A numeric rule whose values are not numbers can never match: the
      // marker parses both sides and falls back to exact string equality,
      // which a student typing the right number in a different form then
      // fails. (Fractions like "2/3" DO parse — see marking.parseNumeric.)
      if (!values.some((value) => parseNumeric(value) !== null)) {
        return { ok: false, reason: 'numeric accept rule has no numeric value' }
      }
      // A wide tolerance marks wrong answers right; near-zero expected values
      // already get absolute tolerance from the marker, so there is no
      // legitimate reason to loosen beyond five per cent.
      if (tolerance !== undefined && tolerance > MAX_NUMERIC_TOLERANCE) {
        return { ok: false, reason: 'numeric tolerance wider than 5% marks wrong answers right' }
      }
    }
    answerRule = {
      mode: acceptMode,
      values,
      ...(tolerance !== undefined && tolerance >= 0 ? { tolerance } : {}),
    }
  }

  // The check that matters. A question whose own answer does not pass its own
  // accept rule will mark a correct student incorrect, every time, forever.
  //
  // What is marked is what a student would actually submit: the option id for
  // a multiple-choice item, the written answer for everything else.
  const selfSubmission = answerRule.mode === 'choice' ? answerRule.values[0] : answer
  if (!markAnswer({ answerRule }, selfSubmission)) {
    return { ok: false, reason: 'its own stated answer fails its own accept rule' }
  }

  const marks = clamp(
    Number.isFinite(draft.marks) ? Math.round(draft.marks as number) : MARK_BAND[difficulty][0],
    MARK_BAND[difficulty],
  )

  const code = `${context.note.code}-S${String(context.index).padStart(2, '0')}`
  const question: IndexedQuestion = {
    id: `syn-${context.session.courseId}-${uuid().slice(0, 8)}`,
    courseId: context.session.courseId,
    subject: context.session.subject,
    ...(context.session.level ? { level: context.session.level } : {}),
    code,
    // A note is the unit here: it is the thing that was taught, and grouping
    // the bank by it lines the question list up with the notes list.
    unit: context.note.title,
    topic: text(draft.topic) || context.note.title,
    prompt,
    ...(text(draft.tex) ? { tex: text(draft.tex).replace(/^\$+|\$+$/g, '') } : {}),
    type,
    difficulty,
    marks,
    source: `Synthesized from ${context.note.code} ${context.note.title}, revision ${context.note.revision}`,
    sourceType: 'Synthesized from notes',
    answer,
    answerRule,
    steps: steps.slice(0, 6),
    origin: 'synthesized',
    ...(options ? { options } : {}),
    ...(text(draft.misconception) ? { misconception: text(draft.misconception) } : {}),
    ...(stringList(draft.tags).length ? { tags: stringList(draft.tags).slice(0, 5) } : {}),
    provenance: {
      noteCodes: [context.note.code],
      citations: [`${context.note.code} ${context.note.title} · rev ${context.note.revision}`],
      noteRevisions: { [context.note.code]: context.note.revision },
      model: LLM_MODEL,
      generatedAt: new Date().toISOString(),
      trigger: 'manual',
      requestedBy: getCurrentUserId(),
    },
  }
  return { ok: true, question }
}

// ── the run ────────────────────────────────────────────────────────────────

export interface ForgeOptions {
  session: CourseSession
  /** Omit to plan from coverage, which is the normal path. */
  plan?: PlannedNote[]
  trigger?: 'manual' | 'agent'
  /** 'draft' stages for review; 'published' is only for a caller that reviewed. */
  status?: 'draft' | 'published'
  signal?: AbortSignal
  onProgress?: (progress: ForgeProgress) => void
}

/**
 * Run the pipeline for one session.
 *
 * Never throws for an ordinary failure — a missing gateway, a session with no
 * notes, a model that answered with prose. Those come back as `error` on the
 * result, because every caller (a button, a tool, a background hook) has to
 * handle them and none of them wants a stack trace.
 */
export async function synthesizeQuestions(options: ForgeOptions): Promise<ForgeResult> {
  const { session, trigger = 'manual', status = 'draft', signal, onProgress } = options
  const empty: ForgeResult = { batch: null, questions: [], rejected: [], noteCodes: [] }

  // A gateway that goes unavailable mid-run is a signal every other note's
  // request should stop too, not just the one that noticed — otherwise the
  // sibling requests keep streaming (and keep billing) against a run whose
  // result is already being thrown away. `controller` is the run's own signal,
  // aborted the moment any request sees GatewayUnavailable; it also mirrors
  // whatever signal the caller passed in, so either source stops every request.
  const controller = new AbortController()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const ready = sessionReady(session)
  if (!ready.ok) return { ...empty, error: ready.reason }

  const quota = sessionQuota(session)
  if (quota.remaining <= 0) {
    return {
      ...empty,
      error: `This session already holds its full ${quota.cap} generated questions. Discard a block before generating more.`,
    }
  }

  const agentRun = trigger === 'agent'
  const budget = Math.min(
    quota.remaining,
    agentRun ? SYNTHESIS.agentMaxPerRun : SYNTHESIS.maxPerRun,
  )
  const plan =
    options.plan ??
    planForSession(session, {
      maxNotes: agentRun ? SYNTHESIS.agentMaxNotesPerRun : SYNTHESIS.maxNotesPerRun,
      maxQuestions: budget,
    })

  if (plan.length === 0) {
    return {
      ...empty,
      error: 'Every note in this session already has the practice it needs. Nothing to generate.',
    }
  }
  if (!beginGeneration(session)) {
    return { ...empty, error: 'A generation run is already in progress for this session.' }
  }

  const accepted: IndexedQuestion[] = []
  const rejected: RejectedDraft[] = []
  const noteCodes: string[] = []
  // Read the session's bank ONCE. Two things are built from it: the prompts
  // the model must not restate, and the per-note count that numbers new codes.
  // Both were originally recomputed inside the loop, which re-read and
  // re-filtered the whole database for every draft of every note.
  const bank = questionsForSession(session, { status: 'any' })
  const promptsByNote = new Map<string, string[]>()
  const countByNote = new Map<string, number>()
  for (const question of bank) {
    const code = noteCodeFor(question)
    const bucket = promptsByNote.get(code)
    if (bucket) bucket.push(question.prompt)
    else promptsByNote.set(code, [question.prompt])
    countByNote.set(code, (countByNote.get(code) ?? 0) + 1)
  }
  // Seeded with everything already in the session so the model cannot restate
  // an existing question, then grown with this run's own output so it cannot
  // restate itself either — the commoner of the two failures.
  const seen = bank.map((question) => question.prompt)

  // Each note is asked for its questions a couple at a time — see
  // QUESTIONS_PER_CALL — so one planned note can become several requests.
  const requests: PlannedNote[] = plan.flatMap((planned) => {
    const chunks: PlannedNote[] = []
    for (let at = 0; at < planned.wanted.length; at += QUESTIONS_PER_CALL) {
      chunks.push({ ...planned, wanted: planned.wanted.slice(at, at + QUESTIONS_PER_CALL) })
    }
    return chunks.length > 0 ? chunks : [planned]
  })

  let finished = 0
  // One row per NOTE, not per request: the split into small calls is an
  // implementation detail and showing 1.1 twice would just look like a bug.
  const noteState: NoteProgress[] = plan.map((planned) => ({
    code: planned.note.code,
    title: planned.note.title,
    phase: 'queued',
    written: 0,
    wanted: planned.wanted.length,
    thinking: 0,
  }))
  const slotFor = new Map(noteState.map((slot) => [slot.code, slot]))
  // How many requests a note is still waiting on, so its row turns green when
  // the last of them lands rather than when the first does.
  const outstanding = new Map<string, number>()
  for (const request of requests) {
    outstanding.set(request.note.code, (outstanding.get(request.note.code) ?? 0) + 1)
  }

  const report = (phase: ForgeProgress['phase'], message: string) =>
    onProgress?.({
      phase,
      done: finished,
      total: plan.length,
      message,
      notes: noteState.map((entry) => ({ ...entry })),
      questions: [...accepted],
    })

  report(
    'planning',
    `Reading ${plan.length} note${plan.length === 1 ? '' : 's'} from ${session.label}`,
  )


  /**
   * One note: stream the reply, validate each question the moment it is
   * complete, and stop early once the run's budget is full.
   *
   * Validation happens INSIDE the stream rather than after it, which is what
   * makes a truncated reply useful — see `scanCompleteObjects`. It also means
   * the sheet fills in question by question instead of jumping from a spinner
   * to a finished list.
   *
   * A note whose drafts fail validation gets ONE retry, with the rejection
   * reasons handed back to the model. Without it the failure mode was a note
   * silently producing nothing: every draft discarded, the batch smaller than
   * planned, and nobody told why. Most rejections are systematic (the model
   * wrote sentence-long accept terms, or mislabelled its own correct option),
   * so the same fault repeated across every draft of the note — and a model
   * told what it did wrong usually stops doing it.
   */
  const writeNote = async (planned: PlannedNote, slot: NoteProgress) => {
    let written = 0
    // Rejection reasons from this note, fed back to the model on a retry.
    const noteRejections: string[] = []
    // Prompts this note's requests have already ruled on, kept so the
    // whole-document sweep after a stream — and the retry pass — does not
    // re-judge, and re-report, a draft already decided. Without it every
    // rejection was listed twice.
    const decided = new Set<string>()

    const takeDraft = (draft: unknown) => {
      if (accepted.length >= budget) return
      const promptText = text((draft as Record<string, unknown>)?.prompt)
      if (promptText && decided.has(promptText)) return
      if (promptText) decided.add(promptText)

      const result = validateDraft(draft, {
        session,
        note: planned.note,
        wanted: planned.wanted[written] ?? planned.wanted[0] ?? 'Standard',
        // Numbered off the note's running total rather than this request's,
        // so two concurrent requests on the same note cannot both mint
        // "1.1-S01". Incremented synchronously below, which is enough.
        index: (countByNote.get(planned.note.code) ?? 0) + slot.written + 1,
        existingPrompts: seen,
      })
      if (!result.ok || !result.question) {
        const reason = result.reason ?? 'failed validation'
        rejected.push({ prompt: promptText || planned.note.code, reason })
        noteRejections.push(reason)
        return
      }
      if (trigger === 'agent') result.question.provenance!.trigger = 'agent'
      accepted.push(result.question)
      seen.push(result.question.prompt)
      written += 1
      slot.written += 1
      slot.phase = 'writing'
      report('running', `${planned.note.code} — ${slot.written} of ${slot.wanted} written`)
    }

    /**
     * One call against this note: stream, validate as objects land, then
     * sweep whatever the scanner could not walk. `asking` is how many
     * questions this call is for — the full plan on the first attempt, only
     * what is still missing on a retry.
     */
    const attempt = async (asking: PlannedNote, feedback: string[]): Promise<'ok' | 'aborted'> => {
      slot.phase = 'thinking'
      report(
        'running',
        feedback.length
          ? `Retrying ${planned.note.code} — told the model what it got wrong`
          : `Reading ${planned.note.code} ${planned.note.title} — ${planned.reason}`,
      )

      let reply = ''
      let cursor = 0
      const seenObjects = new Set<string>()
      // The reasoning stream arrives in ~1,900 chunks. Reporting each one would
      // re-render the sheet 1,900 times to move a counter; a quarter-second is
      // often enough to read as live and cheap enough to ignore.
      let lastTick = 0
      try {
        reply = await chat({
          messages: [
            { role: 'system', content: systemPrompt(session) },
            {
              // Only the prompts already written on THIS note are worth
              // spending context on: the model is being asked what else there
              // is to ask about this note, not about the whole course.
              role: 'user',
              content: userPrompt(asking, promptsByNote.get(planned.note.code) ?? [], feedback),
            },
          ],
          // Reasoning is billed as output and dominates on this model: the
          // first live run of this pipeline spent a 4,200-token budget almost
          // entirely on thinking and returned a JSON array cut off mid-question.
          // Measured since, this model spends 3,000–5,000 tokens thinking before
          // it writes anything, so the budget has to cover that AND the
          // questions — and the streaming scanner below means exceeding it
          // costs the question being written rather than all of them.
          maxTokens: 12000,
          signal: controller.signal,
          onReasoning: (_delta, full) => {
            // Four characters to the token is the usual rough conversion; this
            // is a liveness indicator, not a billing figure.
            slot.thinking = Math.round(full.length / 4)
            const now = Date.now()
            if (now - lastTick < 250) return
            lastTick = now
            report('running', `Reading ${planned.note.code} ${planned.note.title}`)
          },
          onToken: (_delta, full) => {
            if (slot.phase === 'thinking') slot.phase = 'writing'
            const { objects, next } = scanCompleteObjects(full, cursor)
            cursor = next
            for (const object of objects) {
              if (seenObjects.has(object)) continue
              seenObjects.add(object)
              const parsed = parseScanned(object)
              if (parsed) takeDraft(parsed)
            }
          },
        })
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return 'aborted'
        if (error instanceof GatewayUnavailable) {
          // Stop every other in-flight and not-yet-started request in this run:
          // the gateway is down for all of them, not just this note.
          controller.abort()
          throw error
        }
        rejected.push({ prompt: planned.note.code, reason: (error as Error).message })
        noteRejections.push((error as Error).message)
        return 'ok'
      }

      // Whatever the stream missed — a model that answered in one chunk, or an
      // object the scanner could not balance — is caught by a whole-document
      // parse. Objects already taken are skipped by identity of their prompt.
      const parsed = parseModelJson(reply) as { questions?: unknown[] } | null
      const drafts = Array.isArray(parsed?.questions) ? parsed!.questions! : []
      // `takeDraft` skips anything already decided, so this is a safety net for
      // a reply the scanner could not walk — not a second pass over the same
      // drafts.
      for (const draft of drafts) takeDraft(draft)

      if (drafts.length === 0 && seenObjects.size === 0) {
        const reason = 'the model did not return usable JSON'
        rejected.push({ prompt: planned.note.code, reason })
        noteRejections.push(reason)
      }
      return 'ok'
    }

    if ((await attempt(planned, [])) === 'aborted') return

    // One retry, asking only for what is still missing, with the reasons the
    // first attempt failed. More than one retry would double the cost of a
    // note the model clearly cannot handle; one recovers the systematic
    // faults, which are most of them.
    const missing = planned.wanted.length - written
    if (
      missing > 0 &&
      noteRejections.length > 0 &&
      accepted.length < budget &&
      !controller.signal.aborted
    ) {
      const feedback = [...new Set(noteRejections)].slice(0, 5)
      await attempt({ ...planned, wanted: planned.wanted.slice(written) }, feedback)
    }

    if (written > 0 && !noteCodes.includes(planned.note.code)) noteCodes.push(planned.note.code)
  }

  /** Close a note's row once every request against it has come back. */
  const settle = (code: string, slot: NoteProgress) => {
    const left = (outstanding.get(code) ?? 1) - 1
    outstanding.set(code, left)
    if (left > 0) return
    slot.phase = slot.written > 0 ? 'done' : 'failed'
    finished += 1
    report('running', `${code} finished — ${accepted.length} kept so far`)
  }

  try {
    await mapWithLimit(requests, NOTE_CONCURRENCY, async (request) => {
      const slot = slotFor.get(request.note.code)!
      if (controller.signal.aborted || accepted.length >= budget) {
        settle(request.note.code, slot)
        return
      }
      try {
        await writeNote(request, slot)
      } finally {
        settle(request.note.code, slot)
      }
    })
  } catch (error) {
    endGeneration(session)
    if (error instanceof GatewayUnavailable) {
      return {
        ...empty,
        error:
          'No model gateway on this origin. Question generation needs Synonance to be served through Launchpad; it is unavailable on the dev server.',
      }
    }
    return { ...empty, rejected, error: (error as Error).message }
  }
  endGeneration(session)

  if (accepted.length === 0) {
    return {
      ...empty,
      rejected,
      error:
        rejected.length > 0
          ? `Nothing survived checking: ${rejected[0].reason}.`
          : 'The model returned nothing usable.',
    }
  }

  report('saving', 'Saving the block')
  const batch = recordBatch({
    session,
    questions: accepted,
    noteCodes,
    model: LLM_MODEL,
    trigger,
    rejected: rejected.length,
    rejectionReasons: [...new Set(rejected.map((entry) => entry.reason))].slice(0, 6),
    status,
  })

  report(
    'done',
    `${accepted.length} question${accepted.length === 1 ? '' : 's'} written from ${noteCodes.join(', ')}`,
  )
  return { batch, questions: accepted, rejected, noteCodes }
}

// ── papers ─────────────────────────────────────────────────────────────────

export interface PaperOptions {
  session: CourseSession
  /** Target length. Marks and page count are derived from what is selected. */
  timeMinutes?: number
  questionCount?: number
  /** Restrict to these note codes; omit to draw from the whole session. */
  noteCodes?: string[]
  /** Weight selection towards notes this student gets wrong. Default true. */
  targetWeakness?: boolean
}

export interface PaperResult {
  paper: MockTest | null
  questions: IndexedQuestion[]
  error?: string
}

/** Notes this student has been getting wrong, worst first. */
function weakNoteCodes(session: CourseSession): Map<string, number> {
  const attempts = getCurrentUserDatabase().questionAttempts.filter(
    (attempt) => attempt.courseId === session.courseId,
  )
  const pool = questionsForSession(session, { status: 'any' })
  const byId = new Map(pool.map((question) => [question.id, question]))
  const wrong = new Map<string, number>()
  for (const attempt of attempts) {
    if (attempt.result !== 'incorrect') continue
    const question = byId.get(attempt.questionId)
    if (!question) continue
    const code = noteCodeFor(question)
    wrong.set(code, (wrong.get(code) ?? 0) + 1)
  }
  return wrong
}

/**
 * Assemble a paper out of questions that already exist.
 *
 * Deterministic on purpose. Every item has already passed validation, so the
 * paper cannot contain a question the model invented on the spot — the only
 * decision left is which of the session's real questions to set, in what order.
 * That decision is made here: one pass per note so no single topic dominates,
 * ramped Foundation → Standard → Challenge so the paper opens gently, and
 * biased towards the notes this student has been getting wrong.
 */
export function assemblePaper(options: PaperOptions): PaperResult {
  const { session, timeMinutes = 60, questionCount = 8, targetWeakness = true } = options
  const ready = sessionReady(session)
  if (!ready.ok) return { paper: null, questions: [], error: ready.reason }

  const wanted = options.noteCodes?.length ? new Set(options.noteCodes) : null
  const pool = questionsForSession(session, { status: 'published' }).filter(
    (question) => !wanted || wanted.has(noteCodeFor(question)),
  )
  if (pool.length < 3) {
    return {
      paper: null,
      questions: [],
      error: `${session.label} has ${pool.length} question${pool.length === 1 ? '' : 's'} to draw on. Generate questions first — a paper is assembled from the bank, never invented.`,
    }
  }

  const weakness = targetWeakness ? weakNoteCodes(session) : new Map<string, number>()
  const byNote = new Map<string, IndexedQuestion[]>()
  for (const question of pool) {
    const code = noteCodeFor(question)
    const bucket = byNote.get(code)
    if (bucket) bucket.push(question)
    else byNote.set(code, [question])
  }
  // Weakest notes first, then by code so a paper is stable between presses
  // when nothing about the student's record has changed.
  const noteOrder = [...byNote.keys()].sort(
    (a, b) => (weakness.get(b) ?? 0) - (weakness.get(a) ?? 0) || a.localeCompare(b),
  )
  for (const code of noteOrder) {
    byNote.get(code)!.sort(
      (a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty),
    )
  }

  // Round-robin across notes so the paper covers the session rather than one
  // topic, taking each note's easiest unused question on every pass.
  const selected: IndexedQuestion[] = []
  const cursor = new Map<string, number>()
  let exhausted = false
  while (selected.length < questionCount && !exhausted) {
    exhausted = true
    for (const code of noteOrder) {
      if (selected.length >= questionCount) break
      const bucket = byNote.get(code)!
      const at = cursor.get(code) ?? 0
      if (at >= bucket.length) continue
      selected.push(bucket[at])
      cursor.set(code, at + 1)
      exhausted = false
    }
  }

  // Sit it in ramp order, not in the order it happened to be picked.
  selected.sort(
    (a, b) =>
      DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty) ||
      a.code.localeCompare(b.code),
  )

  const totalMarks = selected.reduce((sum, question) => sum + question.marks, 0)
  const notesCovered = [...new Set(selected.map(noteCodeFor))].sort()
  const noteTitles = new Map(sessionNotes(session).map((note) => [note.code, note.title]))
  // Numbered within the session, so two levels of the same course do not both
  // call their first paper "Paper 01" and then disagree about which is which.
  const paperNumber = papersForSession(session).filter(
    (existing) => existing.origin === 'synthesized',
  ).length + 1

  const title =
    notesCovered.length === 1
      ? (noteTitles.get(notesCovered[0]) ?? 'Mixed practice')
      : `Mixed practice · ${notesCovered[0]}–${notesCovered[notesCovered.length - 1]}`
  const paper: MockTest = {
    id: `paper-syn-${uuid()}`,
    subject: session.subject,
    courseId: session.courseId,
    ...(session.level ? { level: session.level } : {}),
    origin: 'synthesized',
    name: `Synthesized Paper ${String(paperNumber).padStart(2, '0')}`,
    title,
    subtitle: `${notesCovered.length} topic${notesCovered.length === 1 ? '' : 's'} · ${session.label}`,
    timeMinutes,
    totalMarks,
    questionCount: selected.length,
    // Roughly four questions to a printed side, which is what the print
    // stylesheet actually produces.
    pageCount: Math.max(1, Math.ceil(selected.length / 4)),
    // Synthesized papers have no PDF: they are rendered in the app and printed
    // from there. The viewer branches on `origin`, so these stay empty rather
    // than pointing at a file that was never generated.
    pdfUrl: '',
    annotatedPdfUrl: '',
    downloadName: '',
    sources: [
      `${selected.length} questions from ${session.label}`,
      `${selected.filter((question) => question.origin === 'synthesized').length} synthesized, ${selected.filter((question) => question.origin !== 'synthesized').length} indexed`,
      `Notes ${notesCovered.join(', ')}`,
    ],
    questionIds: selected.map((question) => question.id),
    instructions: `Answer every question. Show your working. ${totalMarks} marks are available and you have ${timeMinutes} minutes.`,
    createdAt: new Date().toISOString(),
  }

  recordPaper(paper, session, selected.length)
  return { paper, questions: selected }
}

// ── the unprompted path ────────────────────────────────────────────────────

/**
 * Draft questions off the back of notes Syno has just read.
 *
 * Called after the tutor answers, with the note codes its tools actually
 * touched. Everything about it is deliberately timid: it is off if the student
 * turned it off, it runs at most once per session per cooldown, it only ever
 * touches notes that the conversation just used AND that the coverage pass
 * says are thin, it writes at most `agentMaxPerRun` questions, and what it
 * writes lands as drafts in the review queue rather than in the practice bank.
 *
 * Fire-and-forget. It never rejects, because the caller is a chat turn that
 * has already finished and there is nothing useful it could do with a failure.
 */
export function maybeAutoSynthesize(session: CourseSession, touchedNoteCodes: string[]): void {
  if (touchedNoteCodes.length === 0) return
  if (!autoSynthesisEnabled()) return
  if (isGenerating(session) || !agentRunAllowed(session)) return
  if (!sessionReady(session).ok) return
  if (sessionQuota(session).remaining <= 0) return

  const touched = new Set(touchedNoteCodes)
  const plan = planForSession(session, {
    maxNotes: SYNTHESIS.agentMaxNotesPerRun,
    maxQuestions: SYNTHESIS.agentMaxPerRun,
  }).filter((planned) => touched.has(planned.note.code))
  if (plan.length === 0) return

  markAgentRun(session)
  void synthesizeQuestions({ session, plan, trigger: 'agent', status: 'draft' })
    .then((result) => {
      if (result.questions.length === 0) return
      // Work that appears without being asked for has to announce itself.
      // Drafts that only show up as a badge on a page the student was not
      // going to open are, from their point of view, work that never happened.
      pushSystemNotification({
        recipientId: getCurrentUserId(),
        title: `${result.questions.length} question${result.questions.length === 1 ? '' : 's'} drafted for ${session.label}`,
        body: `Syno wrote ${result.questions.length} practice question${result.questions.length === 1 ? '' : 's'} from ${result.noteCodes.join(', ')} while working through your notes. They are tagged Synthesized and are waiting in the Question Base review queue — nothing has been added to your practice bank yet.`,
      })
    })
    .catch(() => {
      // A background draft that fails is a background draft that did not happen.
    })
}
