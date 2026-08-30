// agent.ts — the tutor's tools, and the loop that runs them.
//
// Two kinds of tool live here:
//
//   · Local tools execute in the browser against the course database. They are
//     the reason the tutor can answer about THIS course rather than from
//     recollection: search the shared notes, grep the indexed questions, read a
//     student's own progress, cite a passage, propose an edit.
//
//   · `$web_search` is Moonshot's builtin. The model returns a
//     `builtin_function` call whose arguments we echo straight back; their
//     servers resolve the search. It is NOT free — one search billed ~6,900
//     tokens in testing — so it is opt-in per call, not always on.
//
// SAFETY: no tool writes to shared class material directly. Edits go through
// notes-tools' propose/review queue, so a model (or a student steering one)
// cannot silently rewrite what the whole class reads. Read tools are unrestricted;
// write tools only ever queue. Generated questions follow the same rule: they
// land as drafts in the session's review queue, never in the practice bank.
//
// THE UNPROMPTED PATH. `runAgent` records which notes its tools actually
// touched, and hands them to `maybeAutoSynthesize` once the answer is done. So
// the ordinary act of reading and comparing this session's notes to answer a
// question is also what keeps its question bank current — without a second
// round trip, and without the student having asked for questions. Every guard
// on that is in question-forge.ts: it is off if the student turned it off, it
// is rate-limited per session, it only touches notes the conversation used AND
// that coverage says are thin, and its output is drafts.
import { streamComplete, type LlmMessage, type LlmToolSpec } from './llm'
import { getActiveCourse } from './course-selection'
import { assemblePaper, maybeAutoSynthesize, synthesizeQuestions } from './question-forge'
import {
  SYNTHESIS,
  coverageForSession,
  draftsForSession,
  planForSession,
  questionsForSession,
  resolveSession,
  sessionQuota,
  sessionReady,
} from '@/database/question-bank'
import {
  getCurrentUserDatabase,
  getDatabase,
  getUserMemory,
  updateUserMemory,
} from '@/database/client'
import {
  citePassage,
  listNotes,
  listRevisions,
  noteMarkdown,
  notesForCourse,
  proposeCallout,
  proposePassageEdit,
  proposeRevision,
  readNote,
  readSection,
  searchNotes,
} from '@/database/notes-tools'

type ToolArgs = Record<string, never> & Record<string, unknown>

interface LocalTool {
  spec: LlmToolSpec
  /** Short present-tense label for the UI while it runs. */
  label: (args: ToolArgs) => string
  /**
   * May return a promise. The generation tools call the gateway, and a tool
   * that returned an unawaited promise used to be serialised into the thread
   * as `{}` — the model was told its own tool had returned nothing.
   */
  run: (args: ToolArgs, courseId: string) => unknown | Promise<unknown>
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  label: LocalTool['label'],
  run: LocalTool['run'],
): [string, LocalTool] {
  return [name, { spec: { type: 'function', function: { name, description, parameters } }, label, run }]
}

function obj(properties: Record<string, unknown>, required: string[] = []) {
  return { type: 'object', properties, required }
}

const S = { type: 'string' } as const
const N = { type: 'number' } as const

export const LOCAL_TOOLS = new Map<string, LocalTool>([
  // ── read: notes ─────────────────────────────────────────────────────────
  tool(
    'notes_search',
    'Search this course’s shared notes. Use this FIRST for any subject question, so the answer comes from class material rather than memory.',
    obj({ query: S, limit: N }, ['query']),
    (a) => `Searching notes for “${str(a.query).slice(0, 32)}”`,
    (a, courseId) => searchNotes(courseId, str(a.query), num(a.limit, 6)),
  ),
  tool(
    'notes_list',
    'List every shared note in this course with its revision number.',
    obj({}),
    () => 'Listing course notes',
    (_a, courseId) => listNotes(courseId),
  ),
  tool(
    'notes_read',
    'Read one note in full as markdown, by its code (e.g. "2.3").',
    obj({ code: S }, ['code']),
    (a) => `Reading note ${str(a.code)}`,
    (a, courseId) => readNote(courseId, str(a.code)),
  ),
  tool(
    'notes_read_section',
    'Read a single section of a note by its slug.',
    obj({ code: S, sectionId: S }, ['code', 'sectionId']),
    (a) => `Reading ${str(a.code)} · ${str(a.sectionId)}`,
    (a, courseId) => readSection(courseId, str(a.code), str(a.sectionId)),
  ),
  tool(
    'notes_cite',
    'Get a citation string and deep link for a note section. Attach one whenever you state something the notes cover.',
    obj({ code: S, sectionId: S }, ['code', 'sectionId']),
    (a) => `Citing ${str(a.code)}`,
    (a, courseId) => citePassage(courseId, str(a.code), str(a.sectionId)),
  ),

  // ── read: the rest of the course database ───────────────────────────────
  tool(
    'questions_search',
    'Search this session’s question bank by topic, code, or prompt text. Results say whether each question is indexed course material or synthesized from the notes — tell the student which they are practising.',
    obj({ query: S, limit: N }, ['query']),
    (a) => `Searching questions for “${str(a.query).slice(0, 32)}”`,
    (a) => {
      const needle = str(a.query).toLowerCase()
      // Session-scoped, not course-scoped. Searching the whole course served
      // an S+ student questions written for the H class, about texts they had
      // never been set — and included generated drafts nobody had accepted.
      const hits = questionsForSession(resolveSession())
        .filter((q) => `${q.code} ${q.unit} ${q.topic} ${q.prompt}`.toLowerCase().includes(needle))
        .slice(0, num(a.limit, 6))
        .map((q) => ({
          code: q.code,
          unit: q.unit,
          topic: q.topic,
          prompt: q.prompt,
          marks: q.marks,
          difficulty: q.difficulty,
          answer: q.answer,
          origin: q.origin ?? 'indexed',
        }))
      return { ok: true, count: hits.length, questions: hits }
    },
  ),
  tool(
    'database_grep',
    'Free-text search across every shared course table (notes, questions, mock papers) when you are unsure which holds the answer. Returns table name, a matching field, and a snippet.',
    obj({ query: S, limit: N }, ['query']),
    (a) => `Grepping course data for “${str(a.query).slice(0, 28)}”`,
    (a, courseId) => {
      const needle = str(a.query).toLowerCase()
      if (!needle) return { ok: false, error: 'query is empty' }
      const limit = num(a.limit, 10)
      const hits: Array<{ table: string; ref: string; snippet: string }> = []

      const push = (table: string, ref: string, text: string) => {
        const at = text.toLowerCase().indexOf(needle)
        if (at === -1 || hits.length >= limit) return
        hits.push({
          table,
          ref,
          snippet: text.slice(Math.max(0, at - 50), at + needle.length + 90).trim(),
        })
      }

      for (const note of notesForCourse(courseId)) {
        push('notes', `${note.code} ${note.title}`, noteMarkdown(note))
      }
      for (const q of questionsForSession(resolveSession())) {
        push('questions', q.code, `${q.unit} ${q.topic} ${q.prompt} ${q.answer}`)
      }
      for (const paper of getDatabase().mockTests) {
        push('mockTests', paper.name, `${paper.subject} ${paper.title} ${paper.subtitle}`)
      }
      return { ok: true, count: hits.length, hits }
    },
  ),
  tool(
    'progress_get',
    'Read this student’s own mastery across the course topics, so advice can target what they are actually weak on.',
    obj({}),
    () => 'Checking your progress',
    () => {
      const database = getDatabase()
      const user = getCurrentUserDatabase()
      return {
        ok: true,
        topics: database.progressTopics.default.map((t) => ({
          code: t.code,
          title: t.title,
          mastery: t.mastery,
          status: t.status,
        })),
        recentAttempts: user.questionAttempts.slice(-8).map((attempt) => ({
          questionId: attempt.questionId,
          result: attempt.result,
        })),
      }
    },
  ),
  tool(
    'mock_tests_list',
    'List the mock papers available for this course’s subject.',
    obj({}),
    () => 'Listing mock papers',
    () => {
      const subject = getActiveCourse().subject
      return {
        ok: true,
        papers: getDatabase()
          .mockTests.filter((paper) => paper.subject === subject)
          .map((p) => ({ name: p.name, title: p.title, marks: p.totalMarks, minutes: p.timeMinutes })),
      }
    },
  ),

  // ── the question forge ──────────────────────────────────────────────────
  // Scoped to the student's own SESSION — (course, level) — not to the course.
  // G9 English S+ and G9 English H are different classes reading different
  // texts, so a tool that generated "for the course" would write S+ questions
  // into an H student's bank. `resolveSession` takes no arguments for the same
  // reason `memory_read` takes none: a prompt must not be able to steer it at
  // somebody else's class.
  tool(
    'question_bank_coverage',
    'Compare this session’s question bank against its own notes and report where practice is missing. Read this BEFORE offering to write questions, so the offer names the gap instead of guessing.',
    obj({}),
    () => 'Checking question coverage',
    () => {
      const session = resolveSession()
      const ready = sessionReady(session)
      if (!ready.ok) return { ok: false, error: ready.reason }
      const coverage = coverageForSession(session)
      const thin = coverage.filter((entry) => entry.gap > 0)
      const quota = sessionQuota(session)
      return {
        ok: true,
        session: session.label,
        notes: coverage.length,
        questions: questionsForSession(session).length,
        drafts: draftsForSession(session).length,
        generatedUsed: quota.used,
        generatedRemaining: quota.remaining,
        uncovered: thin.slice(0, 12).map((entry) => ({
          code: entry.code,
          title: entry.title,
          have: entry.have,
          missing: entry.want,
          staleAfterNoteEdit: entry.stale,
        })),
      }
    },
  ),
  tool(
    'questions_synthesize',
    'Write new practice questions from this session’s notes. They are DRAFTS: they land in the review queue tagged “Synthesized”, and nothing reaches the practice bank until a person accepts them. Offer this when coverage is thin, or when the student asks for practice the bank does not have. Say what you are about to do first.',
    obj({ noteCodes: { type: 'array', items: S }, count: N }, []),
    (a) => {
      const codes = Array.isArray(a.noteCodes) ? (a.noteCodes as string[]) : []
      return codes.length ? `Writing questions on ${codes.join(', ')}` : 'Writing questions from the notes'
    },
    async (a) => {
      const session = resolveSession()
      const ready = sessionReady(session)
      if (!ready.ok) return { ok: false, error: ready.reason }
      const requested = new Set(
        (Array.isArray(a.noteCodes) ? (a.noteCodes as unknown[]) : []).map((code) => str(code)),
      )
      const count = Math.min(num(a.count, SYNTHESIS.maxPerRun), SYNTHESIS.maxPerRun)
      const full = planForSession(session, { maxQuestions: count })
      const plan = requested.size
        ? full.filter((planned) => requested.has(planned.note.code))
        : full
      if (plan.length === 0) {
        return {
          ok: false,
          error: requested.size
            ? 'Those notes already have the practice they need, or are not part of this session.'
            : 'Every note in this session already has enough practice.',
        }
      }
      const result = await synthesizeQuestions({ session, plan, trigger: 'agent', status: 'draft' })
      if (result.error) return { ok: false, error: result.error }
      return {
        ok: true,
        session: session.label,
        batchId: result.batch?.id,
        // Say plainly what happened, so the answer to the student can too.
        drafted: result.questions.length,
        discardedByValidation: result.rejected.length,
        fromNotes: result.noteCodes,
        awaitingReview: true,
        questions: result.questions.map((question) => ({
          code: question.code,
          topic: question.topic,
          difficulty: question.difficulty,
          marks: question.marks,
          prompt: question.prompt,
        })),
      }
    },
  ),
  tool(
    'questions_list_drafts',
    'List synthesized questions in this session that are still waiting to be reviewed.',
    obj({}),
    () => 'Checking drafted questions',
    () => {
      const session = resolveSession()
      const drafts = draftsForSession(session)
      return {
        ok: true,
        session: session.label,
        count: drafts.length,
        drafts: drafts.slice(0, 20).map((question) => ({
          code: question.code,
          topic: question.topic,
          difficulty: question.difficulty,
          prompt: question.prompt,
          fromNotes: question.provenance?.noteCodes ?? [],
        })),
      }
    },
  ),
  tool(
    'mock_test_assemble',
    'Assemble a mock paper for this session out of questions that are already in its bank. It selects and orders existing questions — it never writes new ones, so every item on the paper has already been checked. If the bank is too thin, run questions_synthesize first.',
    obj({ minutes: N, questionCount: N, noteCodes: { type: 'array', items: S } }, []),
    () => 'Assembling a mock paper',
    (a) => {
      const session = resolveSession()
      const noteCodes = (Array.isArray(a.noteCodes) ? (a.noteCodes as unknown[]) : []).map((code) =>
        str(code),
      )
      const result = assemblePaper({
        session,
        timeMinutes: Math.min(180, Math.max(15, num(a.minutes, 60))),
        questionCount: Math.min(20, Math.max(3, num(a.questionCount, 8))),
        ...(noteCodes.length ? { noteCodes } : {}),
      })
      if (result.error || !result.paper) return { ok: false, error: result.error }
      return {
        ok: true,
        session: session.label,
        paper: {
          name: result.paper.name,
          title: result.paper.title,
          minutes: result.paper.timeMinutes,
          marks: result.paper.totalMarks,
          questions: result.paper.questionCount,
        },
        openAt: '/course/mock-tests',
      }
    },
  ),

  // ── read/write: the student's own private memory ────────────────────────
  // Scoped to the caller's own record by the client — there is no course id or
  // user id parameter here, so a prompt cannot steer it at someone else.
  tool(
    'memory_read',
    'Read this student’s own memory: userpersona.md (who they are and how they learn) and userstudy.md (what they are studying now, goals, deadlines). Read it before giving study advice so the answer fits this student.',
    obj({}),
    () => 'Reading your memory',
    () => {
      const memory = getUserMemory()
      return {
        ok: true,
        'userpersona.md': memory.persona || '(empty)',
        'userstudy.md': memory.study || '(empty)',
        updatedAt: memory.updatedAt || null,
      }
    },
  ),
  tool(
    'memory_update',
    'Update the student’s memory when they tell you something durable about how they learn or what they are working towards — a deadline, a goal, a preference. Pass the FULL new markdown for the document you are changing; it replaces the old one. Never store anything the student has not told you.',
    obj({ document: { type: 'string', enum: ['userpersona.md', 'userstudy.md'] }, markdown: S }, [
      'document',
      'markdown',
    ]),
    (a) => `Updating ${str(a.document)}`,
    (a) => {
      const document = str(a.document)
      const markdown = str(a.markdown)
      if (!markdown.trim()) return { ok: false, error: 'markdown is empty' }
      if (document === 'userpersona.md') return { ok: true, memory: updateUserMemory({ persona: markdown }) }
      if (document === 'userstudy.md') return { ok: true, memory: updateUserMemory({ study: markdown }) }
      return { ok: false, error: `unknown document: ${document}` }
    },
  ),

  // ── write: always queued for review, never applied ───────────────────────
  tool(
    'notes_propose_passage_edit',
    'Queue a correction to one exact passage of a shared note. Quote the existing text EXACTLY; the tool refuses if it is missing or ambiguous. Queued for teacher review — it does not change what the class reads.',
    obj({ code: S, find: S, replace: S, rationale: S }, ['code', 'find', 'replace', 'rationale']),
    (a) => `Proposing an edit to ${str(a.code)}`,
    (a, courseId) =>
      proposePassageEdit({
        courseId,
        code: str(a.code),
        find: str(a.find),
        replace: str(a.replace),
        rationale: str(a.rationale),
        authorRole: 'agent',
      }),
  ),
  tool(
    'notes_propose_callout',
    'Queue a teaching aside appended to a note section — useful when a class question reveals a gap. Queued for review.',
    obj({ code: S, sectionId: S, text: S, rationale: S }, ['code', 'sectionId', 'text', 'rationale']),
    (a) => `Proposing a note for ${str(a.code)}`,
    (a, courseId) =>
      proposeCallout({
        courseId,
        code: str(a.code),
        sectionId: str(a.sectionId),
        text: str(a.text),
        rationale: str(a.rationale),
        authorRole: 'agent',
      }),
  ),
  tool(
    'notes_propose_revision',
    'Queue a full rewrite of a note. Prefer a passage edit or callout — only rewrite when the whole document is wrong. Queued for review.',
    obj({ code: S, markdown: S, rationale: S }, ['code', 'markdown', 'rationale']),
    (a) => `Proposing a revision of ${str(a.code)}`,
    (a, courseId) =>
      proposeRevision({
        courseId,
        code: str(a.code),
        markdown: str(a.markdown),
        rationale: str(a.rationale),
        authorRole: 'agent',
      }),
  ),
  tool(
    'notes_list_revisions',
    'List proposed, applied and rejected revisions for this course.',
    obj({ code: S }),
    () => 'Checking pending revisions',
    (a, courseId) => listRevisions(courseId, str(a.code) || undefined),
  ),
])

/** Moonshot resolves this one server-side; we only relay its arguments back. */
export const WEB_SEARCH_TOOL: LlmToolSpec = {
  type: 'builtin_function',
  function: { name: '$web_search' },
}

export interface ToolActivity {
  name: string
  label: string
  ok: boolean
}

/**
 * Record which of the session's notes a tool call actually used.
 *
 * Read from the call rather than from the model's prose: a note the tutor
 * merely mentioned is not a note it read, and only what it read is evidence
 * about what the student is working on. `notes_search` contributes the codes
 * of the passages it matched, which is the case that matters — a student
 * asking "explain xenia" never names a note code, and the search is what turns
 * the question into one.
 */
function noteCodesTouched(
  name: string,
  args: ToolArgs,
  result: unknown,
  into: Set<string>,
) {
  if (name === 'notes_read' || name === 'notes_read_section' || name === 'notes_cite') {
    const code = str(args.code)
    if (code) into.add(code)
    return
  }
  if (name === 'notes_search') {
    for (const hit of (result as { hits?: Array<{ code?: string }> })?.hits ?? []) {
      if (hit?.code) into.add(hit.code)
    }
    return
  }
  if (name === 'database_grep') {
    for (const hit of (result as { hits?: Array<{ table?: string; ref?: string }> })?.hits ?? []) {
      // "1.4 Calculus foundations" — the code is the first token of the ref.
      if (hit?.table === 'notes' && hit.ref) into.add(hit.ref.split(' ')[0])
    }
  }
}

/**
 * Runs the model until it stops asking for tools, then returns its answer.
 *
 * Tool rounds are non-streamed because the loop needs structured `tool_calls`;
 * `onActivity` reports each call so the UI can show what is happening instead
 * of a silent pause.
 */
export async function runAgent({
  messages,
  webSearch = false,
  maxRounds = 6,
  signal,
  onActivity,
  onToken,
  onReasoning,
}: {
  messages: LlmMessage[]
  /** Opt-in: a search bills several thousand tokens. */
  webSearch?: boolean
  maxRounds?: number
  signal?: AbortSignal
  onActivity?: (activity: ToolActivity) => void
  /** Answer tokens, as they arrive. */
  onToken?: (delta: string, full: string) => void
  /** K3's reasoning, as it arrives — shown to the student, not just counted. */
  onReasoning?: (delta: string, full: string) => void
}): Promise<{ answer: string; activity: ToolActivity[]; reasoning: string }> {
  const courseId = getActiveCourse().id
  const specs = [...LOCAL_TOOLS.values()].map((entry) => entry.spec)
  if (webSearch) specs.push(WEB_SEARCH_TOOL)

  const thread = [...messages]
  const activity: ToolActivity[] = []
  const touchedNotes = new Set<string>()
  let reasoning = ''

  /**
   * Every exit from the loop goes through here, so the unprompted draft pass
   * cannot be skipped by whichever return path the conversation happens to
   * take. It is deliberately not awaited: the student's answer is ready, and
   * making them wait on a background draft would be paying for the feature
   * twice.
   */
  const finish = (answer: string) => {
    if (touchedNotes.size > 0) {
      try {
        maybeAutoSynthesize(resolveSession(), [...touchedNotes])
      } catch {
        // Drafting is a side benefit of answering. It never costs the answer.
      }
    }
    return { answer, activity, reasoning }
  }

  for (let round = 0; round < maxRounds; round += 1) {
    // Every round streams, so tokens and reasoning appear even on the rounds
    // where the model turns out to want a tool.
    const { message, finishReason } = await streamComplete({
      messages: thread,
      tools: specs,
      signal,
      onToken,
      onReasoning: (delta, full) => {
        reasoning = full
        onReasoning?.(delta, full)
      },
    })
    thread.push(message)

    if (finishReason !== 'tool_calls' || !message.tool_calls?.length) {
      return finish(message.content)
    }

    for (const call of message.tool_calls) {
      // Moonshot's builtin: hand the arguments straight back and it resolves.
      if (call.type === 'builtin_function') {
        const entry: ToolActivity = { name: call.function.name, label: 'Searching the web', ok: true }
        activity.push(entry)
        onActivity?.(entry)
        thread.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: call.function.arguments,
        })
        continue
      }

      const local = LOCAL_TOOLS.get(call.function.name)
      let args: ToolArgs = {} as ToolArgs
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        // Fall through with empty args; the tool reports its own failure.
      }

      if (!local) {
        const entry: ToolActivity = { name: call.function.name, label: 'Unknown tool', ok: false }
        activity.push(entry)
        onActivity?.(entry)
        thread.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify({ ok: false, error: `no such tool: ${call.function.name}` }),
        })
        continue
      }

      let result: unknown
      let ok = true
      try {
        result = await local.run(args, courseId)
        ok = (result as { ok?: boolean })?.ok !== false
      } catch (error) {
        ok = false
        result = { ok: false, error: (error as Error).message }
      }
      if (ok) noteCodesTouched(call.function.name, args, result, touchedNotes)

      const entry: ToolActivity = { name: call.function.name, label: local.label(args), ok }
      activity.push(entry)
      onActivity?.(entry)
      thread.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result).slice(0, 8000),
      })
    }
  }

  // Ran out of rounds — ask for a final answer with no tools available.
  const { message } = await streamComplete({ messages: thread, signal, onToken, onReasoning })
  return finish(message.content)
}
