// chat-history.ts — everything the chat function's history needs that is not
// the live conversation itself: reading past threads, naming them, pinning
// them, searching them, exporting them and throwing them away.
//
// The threads themselves are written by /course/chat through
// `appendChatMessage` / `upsertChatMessage` in client.ts, into
// `userDatabase.chatThreads`. That store is deliberately untyped
// (`Record<string, unknown>`) because the chat page has changed the shape of a
// message several times — a thread saved last month has no `activity`, a
// thread saved before that has no `at`. Everything read here is therefore
// normalised defensively: a missing field is a default, never a crash, and a
// thread written by an older build still opens.
//
// Titles are DERIVED, not stored, unless the student renames the thread. A
// stored title would have to be written on every first message and would go
// stale the moment the opening question was edited; deriving it means a thread
// is named the instant it exists, and `title` on the record means exactly one
// thing: "the student chose this name".
import type { ChatMessage, ChatToolCall } from '@/data/mock'
import type { ToolActivity } from '@/lib/agent'
import type { SynonanceDatabase } from '@/database/types'
import { getCurrentUserDatabase, updateDatabase } from '@/database/client'

/**
 * A stored turn. `ChatMessage` is what the chat page renders; the rest is what
 * the agent produced on the way there and what the store knows about the write.
 */
export interface ChatTranscriptMessage extends ChatMessage {
  /**
   * ISO instant, or null for a turn saved before instants were recorded.
   * `time` is a display string ("14:03"): it cannot date a thread, order two
   * messages a day apart, or survive a change of timezone.
   */
  at: string | null
  /** The model's reasoning trace, when it emitted one. */
  reasoning?: string
  /** Tools this answer was built from. */
  activity?: ToolActivity[]
  /** A checkpoint of a reply that was still arriving when it was written. */
  streaming?: boolean
  /** The student pressed stop, or the tab closed, mid-answer. */
  stopped?: boolean
}

export interface ChatThread {
  id: string
  courseId: string
  createdAt: string
  updatedAt: string
  /** The name to show: the student's own, or the opening question. */
  title: string
  /** Non-null only when the student renamed it. */
  customTitle: string | null
  pinned: boolean
  messages: ChatTranscriptMessage[]
}

// ── Reading ────────────────────────────────────────────────────────────────

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>) : []
}

/** "14:03" for an instant, so an old message and a new one look the same. */
function clockOf(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

function normalizeToolCalls(value: unknown): ChatToolCall[] | undefined {
  const raw = asRecords(value)
  if (raw.length === 0) return undefined
  return raw.map((call) => ({
    tool: asString(call.tool, 'tool'),
    arg: typeof call.arg === 'string' ? call.arg : undefined,
    hits: typeof call.hits === 'number' ? call.hits : undefined,
    lines: Array.isArray(call.lines) ? call.lines.map((line) => asString(line)) : [],
  }))
}

function normalizeActivity(value: unknown): ToolActivity[] | undefined {
  const raw = asRecords(value)
  if (raw.length === 0) return undefined
  return raw.map((entry) => ({
    name: asString(entry.name, 'tool'),
    label: asString(entry.label),
    // Only an explicit false is a failure: a trail written before `ok` existed
    // should not paint every call red.
    ok: entry.ok !== false,
  }))
}

function normalizeSpec(value: unknown): ChatMessage['spec'] {
  if (!value || typeof value !== 'object') return undefined
  const spec = value as Record<string, unknown>
  return {
    code: asString(spec.code),
    filled: typeof spec.filled === 'number' ? spec.filled : 0,
    label: asString(spec.label),
    citation: asString(spec.citation),
  }
}

function normalizeMessage(raw: Record<string, unknown>, index: number): ChatTranscriptMessage {
  const at = asString(raw.at) || null
  return {
    id: asString(raw.id) || `message-${index}`,
    role: raw.role === 'user' ? 'user' : 'assistant',
    text: asString(raw.text),
    time: asString(raw.time) || (at ? clockOf(at) : ''),
    at,
    tools: normalizeToolCalls(raw.tools),
    spec: normalizeSpec(raw.spec),
    check: typeof raw.check === 'string' ? raw.check : undefined,
    reasoning: typeof raw.reasoning === 'string' && raw.reasoning.trim() ? raw.reasoning : undefined,
    activity: normalizeActivity(raw.activity),
    streaming: raw.streaming === true,
    stopped: raw.stopped === true,
  }
}

const TITLE_LIMIT = 72

/**
 * Markdown and LaTeX out, so a thread whose first line is
 * `**Evaluate** $\int x e^x\,dx$` is listed as "Evaluate int x e^x dx" rather
 * than as its source.
 */
export function plainText(text: string): string {
  return (
    text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[([^\]\n]*)\]\([^)\s]*\)/g, '$1')
      // Display math is a formula on its own line — there is no prose left in
      // it to preview, and its innards flattened to one line are unreadable.
      .replace(/\$\$[^$]*\$\$/g, ' ')
      // Inline math is usually one symbol inside a sentence ("choose $u$"),
      // which is worth keeping; its control sequences and scripts are not.
      .replace(/\$([^$\n]*)\$/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/\\[^a-zA-Z]/g, ' ')
      .replace(/[*_~#>|{}^&]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/** Cut at a word boundary, so a title never ends mid-word. */
export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const space = cut.lastIndexOf(' ')
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

function deriveTitle(messages: ChatTranscriptMessage[]): string {
  const opening = messages.find((message) => message.role === 'user' && message.text.trim())
  if (opening) return truncate(plainText(opening.text), TITLE_LIMIT)
  const answer = messages.find((message) => message.text.trim())
  if (answer) return truncate(plainText(answer.text), TITLE_LIMIT)
  return 'Empty thread'
}

function normalizeThread(raw: Record<string, unknown>): ChatThread {
  const messages = asRecords(raw.messages).map(normalizeMessage)
  const customTitle = asString(raw.title).trim() || null
  // A thread written before `createdAt` existed still has to sit somewhere on
  // a timeline: the first message it holds is the closest true answer.
  const createdAt =
    asString(raw.createdAt) || messages.find((message) => message.at)?.at || asString(raw.updatedAt)
  return {
    id: asString(raw.id) || `thread-${createdAt}`,
    courseId: asString(raw.courseId),
    createdAt,
    updatedAt: asString(raw.updatedAt) || createdAt,
    title: customTitle ?? deriveTitle(messages),
    customTitle,
    pinned: raw.pinned === true,
    messages,
  }
}

function storedThreads(): Array<Record<string, unknown>> {
  try {
    return getCurrentUserDatabase().chatThreads ?? []
  } catch {
    return []
  }
}

/**
 * Every thread belonging to the signed-in student, most recently active first.
 * `courseId` narrows to one course; omit it for the whole history.
 */
export function listChatThreads(courseId?: string): ChatThread[] {
  const threads = storedThreads().map(normalizeThread)
  const scoped = courseId ? threads.filter((thread) => thread.courseId === courseId) : threads
  return scoped.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export function getChatThread(threadId: string): ChatThread | null {
  const raw = storedThreads().find((thread) => asString(thread.id) === threadId)
  return raw ? normalizeThread(raw) : null
}

/** Threads that hold at least one real turn — an abandoned empty one is noise. */
export function listNonEmptyChatThreads(courseId?: string): ChatThread[] {
  return listChatThreads(courseId).filter((thread) => thread.messages.some((m) => m.text.trim()))
}

// ── Writing ────────────────────────────────────────────────────────────────

function threadsOf(database: SynonanceDatabase): Array<Record<string, unknown>> {
  const user = database.userDatabases[database.appSettings.currentUserId]
  return user?.chatThreads ?? []
}

function mutateThread(threadId: string, mutate: (thread: Record<string, unknown>) => void): boolean {
  let touched = false
  updateDatabase((database) => {
    const thread = threadsOf(database).find((item) => asString(item.id) === threadId)
    if (!thread) return
    mutate(thread)
    touched = true
  })
  return touched
}

/**
 * Give a thread the student's own name. An empty name is not an empty title —
 * it hands the thread back to the derived one.
 */
export function renameChatThread(threadId: string, title: string): boolean {
  const trimmed = truncate(title.trim().replace(/\s+/g, ' '), 120)
  return mutateThread(threadId, (thread) => {
    if (trimmed) thread.title = trimmed
    else delete thread.title
  })
}

/**
 * Pinning is the student saying "keep this one". Storage compaction honours it
 * (see `compactStep` in storage.ts): a pinned thread is not dropped for age.
 */
export function setChatThreadPinned(threadId: string, pinned: boolean): boolean {
  return mutateThread(threadId, (thread) => {
    if (pinned) thread.pinned = true
    else delete thread.pinned
  })
}

export function deleteChatThreads(threadIds: string[]): number {
  const doomed = new Set(threadIds)
  if (doomed.size === 0) return 0
  let removed = 0
  updateDatabase((database) => {
    const user = database.userDatabases[database.appSettings.currentUserId]
    if (!user) return
    const before = user.chatThreads.length
    user.chatThreads = user.chatThreads.filter((thread) => !doomed.has(asString(thread.id)))
    removed = before - user.chatThreads.length
  })
  return removed
}

export function deleteChatThread(threadId: string): boolean {
  return deleteChatThreads([threadId]) > 0
}

/**
 * Delete a whole history. `courseId` limits it to one course; `keepPinned`
 * spares the threads the student marked, because "clear my history" and "throw
 * away the work I asked you to keep" are not the same instruction.
 */
export function clearChatThreads(options: { courseId?: string; keepPinned?: boolean } = {}): number {
  const { courseId, keepPinned = true } = options
  const doomed = listChatThreads(courseId)
    .filter((thread) => !(keepPinned && thread.pinned))
    .map((thread) => thread.id)
  return deleteChatThreads(doomed)
}

// ── Measuring ──────────────────────────────────────────────────────────────

export interface ThreadSummary {
  questions: number
  answers: number
  toolCalls: number
  /** Tool name → how many times this thread called it, most used first. */
  toolUse: Array<{ name: string; count: number }>
  reasoningTurns: number
  interrupted: number
  words: number
  /** Objective codes the answers were attributed to. */
  objectives: string[]
  /** First to last message, in ms. Zero for a thread of one turn. */
  spanMs: number
  /** The last thing said, flattened for a list row. */
  preview: string
}

function countWords(text: string): number {
  const plain = plainText(text)
  return plain ? plain.split(' ').length : 0
}

export function summarizeThread(thread: ChatThread): ThreadSummary {
  const counts = new Map<string, number>()
  const objectives = new Set<string>()
  let questions = 0
  let answers = 0
  let toolCalls = 0
  let reasoningTurns = 0
  let interrupted = 0
  let words = 0

  for (const message of thread.messages) {
    if (message.role === 'user') questions += 1
    else if (message.text.trim()) answers += 1
    if (message.reasoning) reasoningTurns += 1
    if (message.stopped) interrupted += 1
    words += countWords(message.text)
    if (message.spec?.code) objectives.add(message.spec.code)
    for (const entry of message.activity ?? []) {
      toolCalls += 1
      counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
    }
    for (const call of message.tools ?? []) {
      toolCalls += 1
      counts.set(call.tool, (counts.get(call.tool) ?? 0) + 1)
    }
  }

  const stamps = thread.messages.map((message) => message.at).filter((at): at is string => Boolean(at))
  const times = stamps.map((at) => new Date(at).getTime()).filter((ms) => !Number.isNaN(ms))
  const last = [...thread.messages].reverse().find((message) => message.text.trim())

  return {
    questions,
    answers,
    toolCalls,
    toolUse: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    reasoningTurns,
    interrupted,
    words,
    objectives: [...objectives].sort(),
    spanMs: times.length > 1 ? Math.max(...times) - Math.min(...times) : 0,
    preview: last ? truncate(plainText(last.text), 180) : '',
  }
}

export interface HistoryStats {
  threads: number
  messages: number
  questions: number
  answers: number
  toolCalls: number
  words: number
  pinned: number
  courses: number
  /** Distinct calendar days on which the student chatted. */
  activeDays: number
  firstAt: string | null
  lastAt: string | null
  longest: { title: string; id: string; messages: number } | null
}

function localDay(iso: string): string {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? iso.slice(0, 10) : at.toDateString()
}

export function summarizeHistory(threads: ChatThread[]): HistoryStats {
  const courses = new Set<string>()
  const days = new Set<string>()
  let messages = 0
  let questions = 0
  let answers = 0
  let toolCalls = 0
  let words = 0
  let pinned = 0
  let first: string | null = null
  let last: string | null = null
  let longest: HistoryStats['longest'] = null

  for (const thread of threads) {
    const summary = summarizeThread(thread)
    messages += thread.messages.length
    questions += summary.questions
    answers += summary.answers
    toolCalls += summary.toolCalls
    words += summary.words
    if (thread.pinned) pinned += 1
    if (thread.courseId) courses.add(thread.courseId)
    // Local calendar days, not the ISO string's UTC date: a student in
    // Shanghai working at 00:30 would otherwise have that evening counted as
    // the previous day, and two sittings counted as one.
    for (const message of thread.messages) {
      if (message.at) days.add(localDay(message.at))
    }
    if (thread.createdAt) days.add(localDay(thread.createdAt))
    if (thread.createdAt && (!first || thread.createdAt < first)) first = thread.createdAt
    if (thread.updatedAt && (!last || thread.updatedAt > last)) last = thread.updatedAt
    if (!longest || thread.messages.length > longest.messages) {
      longest = { title: thread.title, id: thread.id, messages: thread.messages.length }
    }
  }

  return {
    threads: threads.length,
    messages,
    questions,
    answers,
    toolCalls,
    words,
    pinned,
    courses: courses.size,
    activeDays: days.size,
    firstAt: first,
    lastAt: last,
    longest,
  }
}

// ── Searching ──────────────────────────────────────────────────────────────

export interface ThreadMatch {
  thread: ChatThread
  /** How many messages matched. */
  matches: number
  /** Whether the query hit the thread's name rather than its contents. */
  titleMatch: boolean
  snippets: Array<{ messageId: string; role: 'user' | 'assistant'; text: string }>
}

const SNIPPET_PAD = 70

function snippetAround(text: string, index: number, length: number): string {
  // Snapped out to the nearest word break, so a snippet opens on a word rather
  // than on "…stance." — the cut is meant to save room, not to be read.
  let from = Math.max(0, index - SNIPPET_PAD)
  let to = Math.min(text.length, index + length + SNIPPET_PAD)
  if (from > 0) {
    const space = text.lastIndexOf(' ', from)
    from = space >= 0 ? space + 1 : from
  }
  if (to < text.length) {
    const space = text.indexOf(' ', to)
    to = space >= 0 ? space : to
  }
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`
}

/**
 * Substring search over titles and message text, case-insensitive. Deliberately
 * not fuzzy: a student looking for "LIATE" in three months of transcripts wants
 * the messages that say LIATE, and a ranked approximate match would bury them
 * under near-misses.
 */
export function searchChatThreads(threads: ChatThread[], query: string): ThreadMatch[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return threads.map((thread) => ({ thread, matches: 0, titleMatch: false, snippets: [] }))
  }
  const results: ThreadMatch[] = []
  for (const thread of threads) {
    const titleMatch = thread.title.toLowerCase().includes(needle)
    const snippets: ThreadMatch['snippets'] = []
    let matches = 0
    for (const message of thread.messages) {
      const flat = plainText(message.text)
      const at = flat.toLowerCase().indexOf(needle)
      if (at < 0) continue
      matches += 1
      if (snippets.length < 3) {
        snippets.push({ messageId: message.id, role: message.role, text: snippetAround(flat, at, needle.length) })
      }
    }
    if (matches > 0 || titleMatch) results.push({ thread, matches, titleMatch, snippets })
  }
  return results
}

// ── Time ───────────────────────────────────────────────────────────────────

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole days between two instants, by calendar day rather than by 24h blocks. */
function daysAgo(iso: string): number {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return Number.NaN
  return Math.round((startOfDay(new Date()) - startOfDay(then)) / DAY)
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'unknown'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const elapsed = Date.now() - then
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return `${minutes} min ago`
  }
  const days = daysAgo(iso)
  if (days === 0) {
    const hours = Math.floor(elapsed / HOUR)
    return `${hours} h ago`
  }
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** The heading a thread sits under in the history list. */
export function dayGroup(iso: string | null): string {
  if (!iso) return 'Undated'
  const days = daysAgo(iso)
  if (Number.isNaN(days)) return 'Undated'
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'Earlier this week'
  if (days < 30) return 'Earlier this month'
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function formatStamp(iso: string | null): string {
  if (!iso) return 'Unknown'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return 'Unknown'
  return at.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  if (!ms || ms < MINUTE) return 'under a minute'
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min`
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR)
    const minutes = Math.round((ms % HOUR) / MINUTE)
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`
  }
  const days = Math.round(ms / DAY)
  return `${days} day${days === 1 ? '' : 's'}`
}

// ── Export ─────────────────────────────────────────────────────────────────

function slug(text: string): string {
  return (
    plainText(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'thread'
  )
}

export function chatThreadFileName(thread: ChatThread, extension: string): string {
  const stamp = (thread.updatedAt || thread.createdAt || '').slice(0, 10) || 'undated'
  return `synonance-chat-${slug(thread.title)}-${stamp}.${extension}`
}

/**
 * A thread as Markdown: readable in any editor, and — because the reasoning and
 * the tool trail come with it — enough to reconstruct how an answer was reached
 * rather than only what it said.
 */
export function chatThreadToMarkdown(thread: ChatThread, courseLabel?: string): string {
  const summary = summarizeThread(thread)
  const lines: string[] = [
    `# ${thread.title}`,
    '',
    `- Course: ${courseLabel || thread.courseId || 'unknown'}`,
    `- Started: ${formatStamp(thread.createdAt)}`,
    `- Last active: ${formatStamp(thread.updatedAt)}`,
    `- Turns: ${thread.messages.length} (${summary.questions} asked, ${summary.answers} answered)`,
    summary.toolCalls > 0 ? `- Tool calls: ${summary.toolCalls}` : null,
    summary.objectives.length > 0 ? `- Objectives: ${summary.objectives.join(', ')}` : null,
    '',
    '---',
    '',
  ].filter((line): line is string => line !== null)

  for (const message of thread.messages) {
    const stamp = message.at ? formatStamp(message.at) : message.time
    lines.push(`## ${message.role === 'user' ? 'You' : 'Syno'}${stamp ? ` · ${stamp}` : ''}`)
    lines.push('')
    if (message.reasoning) {
      lines.push('<details><summary>Thinking</summary>', '', message.reasoning.trim(), '', '</details>', '')
    }
    const trail = [
      ...(message.activity ?? []).map((entry) => `${entry.ok ? '·' : '×'} ${entry.name} — ${entry.label}`),
      ...(message.tools ?? []).map(
        (call) => `· ${call.tool}${call.arg ? ` "${call.arg}"` : ''}${typeof call.hits === 'number' ? ` — ${call.hits} hits` : ''}`,
      ),
    ]
    if (trail.length > 0) lines.push('```', ...trail, '```', '')
    lines.push(message.text.trim() || '_(no reply was recorded for this turn)_', '')
    if (message.stopped) lines.push('> This answer was stopped before it finished.', '')
    if (message.spec) {
      lines.push(
        `> Objective ${message.spec.code} — ${message.spec.label} (${message.spec.filled}/5, ${message.spec.citation})`,
        '',
      )
    }
    if (message.check) lines.push(`> Check your understanding: ${message.check}`, '')
  }

  lines.push('---', '', `Exported from Synonance on ${formatStamp(new Date().toISOString())}.`, '')
  return lines.join('\n')
}

export function chatHistoryToMarkdown(threads: ChatThread[], label: (thread: ChatThread) => string): string {
  const head = [
    '# Synonance chat history',
    '',
    `${threads.length} thread${threads.length === 1 ? '' : 's'}, exported ${formatStamp(new Date().toISOString())}.`,
    '',
  ]
  return head.concat(threads.map((thread) => chatThreadToMarkdown(thread, label(thread)))).join('\n')
}

/** The thread exactly as it is stored, for anyone who wants to process it. */
export function chatThreadToJson(thread: ChatThread): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), thread }, null, 2)
}

export function downloadTextFile(fileName: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the navigation to have been taken.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
