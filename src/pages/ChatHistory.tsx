// ChatHistory — route /course/chat/history.
//
// Every conversation the student has had with Syno, which the chat page has
// been writing to the database all along and nothing has ever shown them. A
// thread that cannot be found again is a thread that was never saved: the
// answer to "what did it tell me about integration by parts last week" was to
// ask it again and hope for the same reply.
//
// This page is the index; /course/chat/history/:threadId is one transcript.
// The two are deliberately separate pages rather than a list with a preview
// pane — a transcript is a document, it is read at reading width, and it is
// worth its own URL so it can be linked, bookmarked and reopened.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, {
  FilterSelect,
  PageAction,
  PageBar,
  PageBody,
  PageNotice,
  Toast,
} from '@/components/Page'
import { useToast } from '@/hooks/use-toast'
import { subscribeDatabase } from '@/database/client'
import { COMPACT_THREAD_LIMIT } from '@/database/storage'
import { getActiveCourse, getAvailableCourses } from '@/lib/course-selection'
import {
  chatHistoryToMarkdown,
  chatThreadFileName,
  chatThreadToMarkdown,
  dayGroup,
  deleteChatThreads,
  downloadTextFile,
  formatStamp,
  listChatThreads,
  relativeTime,
  renameChatThread,
  searchChatThreads,
  setChatThreadPinned,
  summarizeHistory,
  summarizeThread,
  type ChatThread,
} from '@/database/chat-history'

const ALL_COURSES = 'All courses'
const SORTS = ['Recently active', 'Oldest first', 'Longest first'] as const
type Sort = (typeof SORTS)[number]

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Marks the searched-for run inside a title or snippet. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'ig'))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={index} className="rounded-chip bg-board-tint px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-3">
      <div className="font-serif text-[22px] leading-none text-ink">{value}</div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{label}</div>
    </div>
  )
}

/** A small square button for a row action, so eight of them fit on one line. */
function RowAction({
  label,
  onClick,
  danger,
  active,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  const tone = danger
    ? 'text-mark hover:bg-mark-tint'
    : active
      ? 'bg-board-tint text-board'
      : 'text-ink-muted hover:bg-paper hover:text-ink'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-control transition-colors duration-[120ms] ease-out ${tone}`}
    >
      {children}
    </button>
  )
}

export default function ChatHistory() {
  const navigate = useNavigate()
  const { toast, notice, show, fail } = useToast()
  const [activeCourse] = useState(getActiveCourse)
  const [threads, setThreads] = useState<ChatThread[]>(() => listChatThreads())
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('Recently active')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  // Two-step deletes. A transcript is not recoverable once it is gone — there
  // is no server copy — so the second click has to be a different click.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  // Another tab, or the chat page in this one, can add to the history while it
  // is on screen.
  useEffect(() => subscribeDatabase(() => setThreads(listChatThreads())), [])

  const courses = useMemo(() => {
    const byId = new Map<string, { code: string; title: string }>()
    for (const course of getAvailableCourses()) byId.set(course.id, { code: course.code, title: course.title })
    return byId
  }, [])

  /** A dropped course still has threads; its id is better than "unknown". */
  const courseCode = (courseId: string) => courses.get(courseId)?.code ?? courseId ?? 'No course'

  const presentCourses = useMemo(
    () => [...new Set(threads.map((thread) => courseCode(thread.courseId)))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, courses],
  )

  const [scope, setScope] = useState<string>(() => {
    const active = getActiveCourse()
    const has = listChatThreads(active.id).length > 0
    return has ? active.code : ALL_COURSES
  })

  // A course whose last thread was just deleted must not leave the filter
  // pointing at a course that is no longer in the list — the page would look
  // empty for a history that is not.
  useEffect(() => {
    if (scope !== ALL_COURSES && !presentCourses.includes(scope)) setScope(ALL_COURSES)
  }, [presentCourses, scope])

  const scoped = useMemo(
    () =>
      threads.filter((thread) => {
        if (pinnedOnly && !thread.pinned) return false
        if (scope === ALL_COURSES) return true
        return courseCode(thread.courseId) === scope
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, scope, pinnedOnly, courses],
  )

  const matches = useMemo(() => searchChatThreads(scoped, query), [scoped, query])

  const ordered = useMemo(() => {
    const list = [...matches]
    list.sort((a, b) => {
      // Pinned threads lead every ordering: pinning is a request to keep
      // something to hand, and an ordering that buries it ignores the request.
      if (a.thread.pinned !== b.thread.pinned) return a.thread.pinned ? -1 : 1
      if (sort === 'Oldest first') return (a.thread.createdAt || '').localeCompare(b.thread.createdAt || '')
      if (sort === 'Longest first') return b.thread.messages.length - a.thread.messages.length
      return (b.thread.updatedAt || '').localeCompare(a.thread.updatedAt || '')
    })
    return list
  }, [matches, sort])

  const stats = useMemo(() => summarizeHistory(scoped), [scoped])
  const shownIds = useMemo(() => ordered.map((match) => match.thread.id), [ordered])
  const selectedShown = shownIds.filter((id) => selected.has(id))

  // Date headings only make sense when the list is in date order. Sorted by
  // length, "Today" and "Earlier this month" would interleave down the page.
  const grouped = useMemo(() => {
    if (sort === 'Longest first') return [{ label: '', items: ordered }]
    const groups: Array<{ label: string; items: typeof ordered }> = []
    for (const match of ordered) {
      const label = match.thread.pinned ? 'Pinned' : dayGroup(match.thread.updatedAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(match)
      else groups.push({ label, items: [match] })
    }
    return groups
  }, [ordered, sort])

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function commitRename(thread: ChatThread) {
    const next = renameDraft.trim()
    setRenaming(null)
    if (next === thread.title) return
    if (renameChatThread(thread.id, next)) {
      setThreads(listChatThreads())
      show(next ? 'Thread renamed.' : 'Name cleared — the thread is titled by its first question again.')
    } else {
      fail('That thread could no longer be found.')
    }
  }

  function togglePinned(thread: ChatThread) {
    if (setChatThreadPinned(thread.id, !thread.pinned)) {
      setThreads(listChatThreads())
      show(thread.pinned ? 'Unpinned.' : 'Pinned — kept even when storage runs short.')
    }
  }

  function courseLabel(courseId: string) {
    const title = courses.get(courseId)?.title
    return title ? `${courseCode(courseId)} — ${title}` : courseCode(courseId)
  }

  function exportOne(thread: ChatThread) {
    downloadTextFile(
      chatThreadFileName(thread, 'md'),
      chatThreadToMarkdown(thread, courseLabel(thread.courseId)),
      'text/markdown',
    )
    show('Transcript downloaded.')
  }

  function exportMany(list: ChatThread[], name: string) {
    if (list.length === 0) {
      fail('There is nothing to export.')
      return
    }
    downloadTextFile(name, chatHistoryToMarkdown(list, (thread) => courseLabel(thread.courseId)), 'text/markdown')
    show(`Exported ${list.length} thread${list.length === 1 ? '' : 's'}.`)
  }

  function removeThreads(ids: string[]) {
    const removed = deleteChatThreads(ids)
    setConfirmDelete(null)
    setSelected(new Set())
    setThreads(listChatThreads())
    if (removed === 0) {
      fail('Nothing was deleted — those threads were already gone.')
      return
    }
    show(`Deleted ${removed} thread${removed === 1 ? '' : 's'}.`)
  }

  const hasHistory = threads.length > 0
  const scopeLabel = scope === ALL_COURSES ? 'all courses' : scope

  return (
    <CourseShell role="student" active="chat">
      <Page>
        <PageBar
          context={
            hasHistory
              ? `${ordered.length} of ${threads.length} thread${threads.length === 1 ? '' : 's'} · ${stats.messages} message${stats.messages === 1 ? '' : 's'} · ${scopeLabel}`
              : 'No conversations saved yet'
          }
        >
          <PageAction onClick={() => navigate('/course/chat')}>
            <ArrowLeft size={14} /> Back to chat
          </PageAction>
          <PageAction variant="primary" onClick={() => navigate('/course/chat')}>
            <Plus size={14} /> New thread
          </PageAction>
        </PageBar>

        <PageBody measure="wide">
          {!hasHistory ? (
            <div className="flex flex-col items-center justify-center rounded-card border border-rule bg-surface px-8 py-16 text-center">
              <MessageSquare size={28} className="text-ink-muted" />
              <h2 className="mt-4 font-serif text-[20px] text-ink">Nothing here yet</h2>
              <p className="mt-2 max-w-[420px] text-[13px] leading-relaxed text-ink-muted">
                Every conversation you have with Syno is saved to this browser as you go — the
                questions, the answers, the reasoning behind them and the notes each answer was
                built from. They will appear here, newest first.
              </p>
              <PageAction variant="primary" className="mt-5" onClick={() => navigate('/course/chat')}>
                Ask {activeCourse.code} something <ArrowRight size={14} />
              </PageAction>
            </div>
          ) : (
            <>
              {/* What the history amounts to. Counts follow the filters, so
                  narrowing to one course answers "how much have I actually
                  asked about this subject" rather than about everything. */}
              <div className="grid grid-cols-2 divide-x divide-rule overflow-hidden rounded-card border border-rule bg-surface sm:grid-cols-3 lg:grid-cols-5">
                <Stat value={String(stats.threads)} label="Threads" />
                <Stat value={String(stats.questions)} label="Questions asked" />
                <Stat value={String(stats.answers)} label="Answers" />
                <Stat value={String(stats.toolCalls)} label="Tool calls" />
                <Stat value={String(stats.activeDays)} label="Days active" />
              </div>
              {stats.firstAt ? (
                <p className="mt-2 font-mono text-[11px] text-ink-muted">
                  First conversation {formatStamp(stats.firstAt)} · last {relativeTime(stats.lastAt)}
                  {stats.pinned > 0 ? ` · ${stats.pinned} pinned` : ''}
                </p>
              ) : null}

              {/* Controls */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-control border border-rule bg-surface px-3 py-1.5 focus-within:border-board">
                  <Search size={14} className="shrink-0 text-ink-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search every question and answer…"
                    aria-label="Search chat history"
                    className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="shrink-0 text-ink-muted hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                <FilterSelect
                  label="Course"
                  value={scope}
                  options={[ALL_COURSES, ...presentCourses]}
                  onChange={setScope}
                />
                <FilterSelect
                  label="Sort"
                  value={sort}
                  options={SORTS}
                  onChange={(value) => setSort(value as Sort)}
                />
                <button
                  type="button"
                  onClick={() => setPinnedOnly((on) => !on)}
                  aria-pressed={pinnedOnly}
                  className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-[13px] transition-colors duration-[120ms] ease-out ${
                    pinnedOnly
                      ? 'border-board bg-board-tint text-board'
                      : 'border-rule bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  <Pin size={13} /> Pinned
                </button>
              </div>

              {notice ? <PageNotice className="mt-4">{notice}</PageNotice> : null}

              {/* Selection bar — only present once something is selected, so
                  the page is not carrying an empty toolbar the rest of the time. */}
              {selectedShown.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card border border-board bg-board-tint px-4 py-2.5">
                  <span className="text-[13px] text-board">
                    {selectedShown.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      exportMany(
                        ordered.filter((match) => selected.has(match.thread.id)).map((match) => match.thread),
                        `synonance-chat-history-${new Date().toISOString().slice(0, 10)}.md`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-[13px] text-board hover:underline"
                  >
                    <Download size={13} /> Export
                  </button>
                  <button
                    type="button"
                    onClick={() => removeThreads(selectedShown)}
                    className="inline-flex items-center gap-1.5 text-[13px] text-mark hover:underline"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="ml-auto text-[13px] text-ink-muted hover:text-ink"
                  >
                    Clear selection
                  </button>
                </div>
              ) : null}

              {/* Results */}
              {ordered.length === 0 ? (
                <div className="mt-4 rounded-card border border-rule bg-surface px-6 py-12 text-center">
                  <p className="text-[13px] text-ink-muted">
                    {query
                      ? `Nothing in ${scopeLabel} matches “${query}”.`
                      : `No threads in ${scopeLabel}${pinnedOnly ? ' are pinned' : ''}.`}
                  </p>
                  {query || pinnedOnly || scope !== ALL_COURSES ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('')
                        setPinnedOnly(false)
                        setScope(ALL_COURSES)
                      }}
                      className="mt-3 text-[13px] text-board hover:underline"
                    >
                      Show everything
                    </button>
                  ) : null}
                </div>
              ) : (
                grouped.map((group) => (
                  <section key={group.label || 'all'} className="mt-5">
                    {group.label ? (
                      <div className="mb-2 flex items-center gap-3">
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                          {group.label}
                        </span>
                        <span className="h-px flex-1 bg-rule" />
                        <span className="font-mono text-[11px] text-ink-muted">{group.items.length}</span>
                      </div>
                    ) : null}

                    <ul className="flex flex-col gap-2">
                      {group.items.map(({ thread, matches: hits, snippets }) => {
                        const summary = summarizeThread(thread)
                        const isRenaming = renaming === thread.id
                        return (
                          <li
                            key={thread.id}
                            className="rounded-card border border-rule bg-surface transition-colors duration-[120ms] ease-out hover:border-board/50"
                          >
                            <div className="flex items-start gap-3 px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(thread.id)}
                                onChange={() => toggleSelected(thread.id)}
                                aria-label={`Select ${thread.title}`}
                                className="mt-1.5 h-3.5 w-3.5 shrink-0 accent-[#2F5D50]"
                              />

                              <div className="min-w-0 flex-1">
                                {isRenaming ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      autoFocus
                                      value={renameDraft}
                                      onChange={(event) => setRenameDraft(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') commitRename(thread)
                                        if (event.key === 'Escape') setRenaming(null)
                                      }}
                                      placeholder="Name this thread, or leave empty to use its first question"
                                      className="min-w-0 flex-1 rounded-control border border-board bg-paper px-2 py-1 text-[14px] text-ink outline-none"
                                    />
                                    <RowAction label="Save name" onClick={() => commitRename(thread)}>
                                      <Check size={14} />
                                    </RowAction>
                                    <RowAction label="Cancel" onClick={() => setRenaming(null)}>
                                      <X size={14} />
                                    </RowAction>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    {thread.pinned ? (
                                      <Pin size={13} className="mt-1 shrink-0 text-board" />
                                    ) : null}
                                    <Link
                                      to={`/course/chat/history/${encodeURIComponent(thread.id)}`}
                                      className="min-w-0 text-[14px] font-medium leading-snug text-ink hover:text-board"
                                    >
                                      <Highlight text={thread.title} query={query} />
                                    </Link>
                                  </div>
                                )}

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-muted">
                                  <span className="rounded-chip border border-rule px-1.5 py-0.5 text-ink">
                                    {courseCode(thread.courseId)}
                                  </span>
                                  <span title={formatStamp(thread.updatedAt)}>
                                    {relativeTime(thread.updatedAt)}
                                  </span>
                                  <span>
                                    {thread.messages.length} message{thread.messages.length === 1 ? '' : 's'}
                                  </span>
                                  {summary.toolCalls > 0 ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Wrench size={11} /> {summary.toolCalls}
                                    </span>
                                  ) : null}
                                  {summary.objectives.length > 0 ? (
                                    <span>{summary.objectives.join(' · ')}</span>
                                  ) : null}
                                  {summary.interrupted > 0 ? (
                                    <span className="text-mark">
                                      {summary.interrupted} stopped
                                    </span>
                                  ) : null}
                                  {hits > 0 ? (
                                    <span className="text-board">
                                      {hits} match{hits === 1 ? '' : 'es'}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Searching shows what matched; otherwise the
                                    last thing said, which is what a student
                                    scanning for "where was I" is looking for. */}
                                {snippets.length > 0 ? (
                                  <ul className="mt-2 flex flex-col gap-1">
                                    {snippets.map((snippet, index) => (
                                      <li
                                        key={`${snippet.messageId}-${index}`}
                                        className="border-l-2 border-rule pl-2.5 text-[12px] leading-relaxed text-ink-muted"
                                      >
                                        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                                          {snippet.role === 'user' ? 'You' : 'Syno'}
                                        </span>{' '}
                                        <Highlight text={snippet.text} query={query} />
                                      </li>
                                    ))}
                                  </ul>
                                ) : summary.preview ? (
                                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                                    {summary.preview}
                                  </p>
                                ) : null}

                                {confirmDelete === thread.id ? (
                                  <div className="mt-2.5 flex flex-wrap items-center gap-3 rounded-control border border-mark bg-mark-tint px-3 py-2">
                                    <span className="text-[12px] text-mark">
                                      Delete this transcript? It is stored only in this browser and
                                      cannot be recovered.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeThreads([thread.id])}
                                      className="rounded-control bg-mark px-2.5 py-1 text-[12px] font-medium text-paper"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDelete(null)}
                                      className="text-[12px] text-ink-muted hover:text-ink"
                                    >
                                      Keep
                                    </button>
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <RowAction
                                  label={thread.pinned ? 'Unpin thread' : 'Pin thread'}
                                  active={thread.pinned}
                                  onClick={() => togglePinned(thread)}
                                >
                                  {thread.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                </RowAction>
                                <RowAction
                                  label="Rename thread"
                                  onClick={() => {
                                    setRenaming(thread.id)
                                    setRenameDraft(thread.customTitle ?? '')
                                  }}
                                >
                                  <span className="font-mono text-[12px] leading-none">Aa</span>
                                </RowAction>
                                <RowAction label="Download as Markdown" onClick={() => exportOne(thread)}>
                                  <Download size={14} />
                                </RowAction>
                                <RowAction
                                  label="Delete thread"
                                  danger
                                  onClick={() => setConfirmDelete(thread.id)}
                                >
                                  <Trash2 size={14} />
                                </RowAction>
                                <Link
                                  to={`/course/chat?thread=${encodeURIComponent(thread.id)}`}
                                  className="ml-1 inline-flex items-center gap-1.5 rounded-control border border-rule px-2.5 py-1.5 text-[12px] text-ink transition-colors duration-[120ms] ease-out hover:border-board"
                                >
                                  Continue <ArrowRight size={12} />
                                </Link>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))
              )}

              {/* Whole-history actions live at the bottom: they are rare, and
                  one of them is destructive. */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                <p className="max-w-[560px] font-mono text-[11px] leading-relaxed text-ink-muted">
                  Transcripts are held in this browser only — they are not on a server and do not
                  follow you to another device. When storage fills, the oldest beyond{' '}
                  {COMPACT_THREAD_LIMIT} threads are dropped first; pinned threads are kept.
                </p>
                <div className="flex items-center gap-2">
                  <PageAction
                    onClick={() =>
                      exportMany(
                        ordered.map((match) => match.thread),
                        `synonance-chat-history-${new Date().toISOString().slice(0, 10)}.md`,
                      )
                    }
                  >
                    <Download size={14} /> Export {scope === ALL_COURSES ? 'all' : scope}
                  </PageAction>
                  <PageAction variant="danger" onClick={() => setConfirmClear((open) => !open)}>
                    <Trash2 size={14} /> Clear history
                  </PageAction>
                </div>
              </div>

              {confirmClear ? (
                <div className="mt-3 rounded-card border border-mark bg-mark-tint px-4 py-3">
                  <p className="text-[13px] text-mark">
                    Delete every thread in {scopeLabel}? Pinned threads are kept. This cannot be
                    undone.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const doomed = scoped.filter((thread) => !thread.pinned).map((thread) => thread.id)
                        setConfirmClear(false)
                        if (doomed.length === 0) {
                          fail('There is nothing to clear — every thread here is pinned.')
                          return
                        }
                        removeThreads(doomed)
                      }}
                      className="rounded-control bg-mark px-3 py-1.5 text-[13px] font-medium text-paper"
                    >
                      Delete {scoped.filter((thread) => !thread.pinned).length} thread
                      {scoped.filter((thread) => !thread.pinned).length === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="text-[13px] text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </CourseShell>
  )
}
