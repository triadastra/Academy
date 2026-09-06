// ChatThread — route /course/chat/history/:threadId.
//
// One saved conversation, read as a document: the questions, the answers as
// they were rendered, the reasoning the model showed on the way, the tools each
// answer was built from, and the objective it was attributed to. A history that
// only replayed the text would lose the part that makes a tutor's answer
// checkable — where it came from.
//
// The right drawer is the thread's record: what it cost, what it touched, and
// an outline of every question in it, because the useful question of a long
// transcript is "where did I ask about X", and scrolling is not an answer.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  FileJson,
  Pencil,
  Pin,
  PinOff,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, PageNotice, Toast } from '@/components/Page'
import MarkdownText from '@/components/MarkdownText'
import ToolChip from '@/components/ToolChip'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser, subscribeDatabase } from '@/database/client'
import { getAvailableCourses } from '@/lib/course-selection'
import {
  chatThreadFileName,
  chatThreadToJson,
  chatThreadToMarkdown,
  deleteChatThread,
  downloadTextFile,
  formatDuration,
  formatStamp,
  getChatThread,
  plainText,
  relativeTime,
  renameChatThread,
  setChatThreadPinned,
  summarizeThread,
  truncate,
  type ChatThread as Thread,
  type ChatTranscriptMessage,
} from '@/database/chat-history'

/**
 * Copy that also works on the deployed build.
 *
 * Launchpad serves this app over plain http, which is not a secure context, so
 * `navigator.clipboard` is simply absent there. The textarea path is the only
 * one that runs in production.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path rather than reporting a failure the
    // user can do nothing about.
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  } catch {
    return false
  }
}

function DrawerRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-ink">{value}</span>
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-rule px-4 py-3 last:border-b-0">
      <h3 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">{title}</h3>
      {children}
    </section>
  )
}

/** The day a turn happened, printed once above the first turn of that day. */
function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-rule" />
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
        {new Date(iso).toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  )
}

function Turn({
  message,
  index,
  initials,
  matched,
  onCopy,
}: {
  message: ChatTranscriptMessage
  index: number
  initials: string
  /** This turn contains the text being searched for. */
  matched: boolean
  onCopy: (text: string) => void
}) {
  const stamp = message.at ? formatStamp(message.at) : message.time
  const words = plainText(message.text).split(' ').filter(Boolean).length

  // A search marks the turns it hit rather than the words inside them: both
  // halves of this page are rendered markdown with real mathematics in them,
  // and a <mark> cannot be painted over that without re-parsing the answer into
  // something other than what the model wrote. Marking the turn also treats a
  // question and an answer alike, which highlighting the plain-text half only
  // did not.
  if (message.role === 'user') {
    return (
      <div id={`turn-${message.id}`} className="flex scroll-mt-6 justify-end">
        <div
          className={`max-w-[90%] sm:max-w-[75%] rounded-card bg-board-tint px-4 py-2.5 ${
            matched ? 'ring-2 ring-board' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-board font-mono text-[12px] text-paper">
              {initials}
            </span>
            <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink">
              <MarkdownText>{message.text}</MarkdownText>
              <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[11px] text-ink-muted">
                <button
                  type="button"
                  onClick={() => onCopy(message.text)}
                  aria-label="Copy this question"
                  className="opacity-70 hover:opacity-100"
                >
                  <Copy size={12} />
                </button>
                <span title={stamp}>{message.time || stamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id={`turn-${message.id}`} className="flex scroll-mt-6 gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-board font-serif text-[14px] text-paper">
        S
      </span>
      <div className={`min-w-0 flex-1 ${matched ? 'border-l-2 border-board pl-3' : ''}`}>
        {/* Reasoning and tool work come before the answer: that is the order
            they happened in, and it is how the answer can be traced. */}
        {message.reasoning ? (
          <details className="mb-2.5">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              Thinking
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap border-l-2 border-rule pl-3 text-[12px] leading-relaxed text-ink-muted">
              {message.reasoning}
            </p>
          </details>
        ) : null}

        {message.activity?.length ? (
          <details className="mb-3">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              {message.activity.length} tool {message.activity.length === 1 ? 'call' : 'calls'}
            </summary>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {message.activity.map((entry, i) => (
                <li key={i} className="font-mono text-[11px] text-ink-muted">
                  <span className={entry.ok ? '' : 'text-mark'}>{entry.ok ? '·' : '×'}</span> {entry.name} —{' '}
                  {entry.label}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {message.text.trim() ? (
          <MarkdownText>{message.text}</MarkdownText>
        ) : (
          <p className="text-[13px] italic text-ink-muted">No reply was recorded for this turn.</p>
        )}

        {message.stopped ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-control border border-rule bg-paper px-2 py-1 font-mono text-[11px] text-ink-muted">
            <CircleAlert size={12} /> Stopped before it finished
          </p>
        ) : message.streaming ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-control border border-rule bg-paper px-2 py-1 font-mono text-[11px] text-ink-muted">
            <CircleAlert size={12} /> Saved while the answer was still arriving
          </p>
        ) : null}

        {message.tools?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.tools.map((tool, i) => (
              <ToolChip key={i} tool={tool.tool} arg={tool.arg} hits={tool.hits} lines={tool.lines} />
            ))}
          </div>
        ) : null}

        {message.spec ? (
          <div className="mt-4 border-t border-rule pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[12px] text-ink">{message.spec.code}</span>
              <span className="max-w-[360px] text-[13px] text-ink">{message.spec.label}</span>
              <span className="font-mono text-[11px] text-ink-muted">
                mastery {message.spec.filled}/5
              </span>
              <span className="ml-auto font-mono text-[11px] text-ink-muted">{message.spec.citation}</span>
            </div>
          </div>
        ) : null}

        {message.check ? (
          <div className="mt-3 rounded-card border border-rule bg-surface px-4 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              Check your understanding
            </div>
            <div className="mt-1 text-[13px] text-ink">
              <MarkdownText>{message.check}</MarkdownText>
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
              Answered in the live thread — continue it to try this again.
            </p>
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-ink-muted">
          <span title={stamp}>{message.time || stamp}</span>
          <span>·</span>
          <span>turn {index + 1}</span>
          {words > 0 ? (
            <>
              <span>·</span>
              <span>{words} words</span>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => onCopy(message.text)}
            aria-label="Copy this answer"
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <Copy size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChatThread() {
  const { threadId = '' } = useParams()
  const navigate = useNavigate()
  const { toast, notice, show, fail } = useToast()
  const [thread, setThread] = useState<Thread | null>(() => getChatThread(threadId))
  const [query, setQuery] = useState('')
  const [onlyMatches, setOnlyMatches] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Which thread the state above was loaded for. React keeps this component
  // mounted when the route moves from one transcript to the next, so the id it
  // is showing has to be reconciled with the id in the URL. Done during render
  // rather than in an effect: an effect would paint the previous transcript
  // under the new heading for a frame first.
  const [loadedId, setLoadedId] = useState(threadId)
  if (loadedId !== threadId) {
    setLoadedId(threadId)
    setThread(getChatThread(threadId))
    setQuery('')
    setOnlyMatches(false)
    setRenaming(false)
    setConfirmDelete(false)
  }

  useEffect(() => subscribeDatabase(() => setThread(getChatThread(threadId))), [threadId])

  const course = useMemo(
    () => getAvailableCourses().find((item) => item.id === thread?.courseId) ?? null,
    [thread?.courseId],
  )
  const summary = useMemo(() => (thread ? summarizeThread(thread) : null), [thread])
  const account = getCurrentUser()
  const initials = account?.initials || 'YL'

  const needle = query.trim().toLowerCase()
  const matchIds = useMemo(() => {
    if (!needle || !thread) return null
    return new Set(
      thread.messages
        .filter((message) => plainText(message.text).toLowerCase().includes(needle))
        .map((message) => message.id),
    )
  }, [needle, thread])

  const visible = useMemo(() => {
    if (!thread) return []
    if (!matchIds || !onlyMatches) return thread.messages
    return thread.messages.filter((message) => matchIds.has(message.id))
  }, [thread, matchIds, onlyMatches])

  // ── Thread missing ───────────────────────────────────────────────────────
  if (!thread) {
    return (
      <CourseShell role="student" active="chat">
        <Page>
          <PageBar context="Thread not found">
            <PageAction onClick={() => navigate('/course/chat/history')}>
              <ArrowLeft size={14} /> Back to history
            </PageAction>
          </PageBar>
          <PageBody measure="reading">
            <div className="rounded-card border border-rule bg-surface px-6 py-12 text-center">
              <h2 className="font-serif text-[20px] text-ink">This conversation is not here</h2>
              <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-relaxed text-ink-muted">
                It was deleted, it belongs to another account on this browser, or it was dropped
                when storage ran short. Transcripts live in this browser only, so one opened on
                another device will not be found here.
              </p>
              <PageAction variant="primary" className="mt-5" onClick={() => navigate('/course/chat/history')}>
                Back to history <ArrowRight size={14} />
              </PageAction>
            </div>
          </PageBody>
        </Page>
      </CourseShell>
    )
  }

  const stats = summary!

  async function copy(text: string) {
    const ok = await copyText(text)
    if (ok) show('Copied.')
    else fail('This browser would not allow copying. Select the text and copy it by hand.')
  }

  function commitRename() {
    const next = renameDraft.trim()
    setRenaming(false)
    if (!renameChatThread(thread!.id, next)) {
      fail('That thread could no longer be found.')
      return
    }
    setThread(getChatThread(thread!.id))
    show(next ? 'Thread renamed.' : 'Name cleared — titled by its first question again.')
  }

  function togglePinned() {
    setChatThreadPinned(thread!.id, !thread!.pinned)
    setThread(getChatThread(thread!.id))
    show(thread!.pinned ? 'Unpinned.' : 'Pinned — kept even when storage runs short.')
  }

  const courseLabel = course ? `${course.code} — ${course.title}` : thread.courseId || 'No course'

  function jumpTo(messageId: string) {
    const element = document.getElementById(`turn-${messageId}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const questions = thread.messages.filter((message) => message.role === 'user' && message.text.trim())

  const drawer = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-rule px-4 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">This thread</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DrawerSection title="Record">
          <DrawerRow label="Course" value={course?.code ?? thread.courseId ?? '—'} />
          <DrawerRow label="Started" value={formatStamp(thread.createdAt)} />
          <DrawerRow label="Last active" value={relativeTime(thread.updatedAt)} />
          <DrawerRow
            label="Span"
            value={stats.spanMs > 0 ? formatDuration(stats.spanMs) : 'single sitting'}
          />
          <DrawerRow label="Turns" value={thread.messages.length} />
          <DrawerRow label="Asked" value={stats.questions} />
          <DrawerRow label="Answered" value={stats.answers} />
          <DrawerRow label="Words" value={stats.words.toLocaleString()} />
          {stats.reasoningTurns > 0 ? (
            <DrawerRow label="With reasoning" value={stats.reasoningTurns} />
          ) : null}
          {stats.interrupted > 0 ? (
            <DrawerRow label="Stopped" value={<span className="text-mark">{stats.interrupted}</span>} />
          ) : null}
        </DrawerSection>

        {stats.toolUse.length > 0 ? (
          <DrawerSection title={`Tools · ${stats.toolCalls}`}>
            <ul className="flex flex-col gap-1">
              {stats.toolUse.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-[12px] text-ink">{entry.name}</span>
                  <span className="font-mono text-[12px] text-ink-muted">{entry.count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              What the tutor consulted before answering. Open a turn's tool list to see each call.
            </p>
          </DrawerSection>
        ) : null}

        {stats.objectives.length > 0 ? (
          <DrawerSection title="Objectives touched">
            <div className="flex flex-wrap gap-1.5">
              {stats.objectives.map((code) => (
                <span
                  key={code}
                  className="rounded-chip border border-rule bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink"
                >
                  {code}
                </span>
              ))}
            </div>
          </DrawerSection>
        ) : null}

        <DrawerSection title={`Questions · ${questions.length}`}>
          {questions.length === 0 ? (
            <p className="text-[12px] text-ink-muted">Nothing was asked in this thread.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {questions.map((message, index) => (
                <li key={message.id} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 font-mono text-[11px] text-ink-muted">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => jumpTo(message.id)}
                    className="min-w-0 text-left text-[12px] leading-snug text-ink-muted hover:text-board"
                  >
                    {truncate(plainText(message.text), 96)}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </DrawerSection>

        <DrawerSection title="Export">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                downloadTextFile(
                  chatThreadFileName(thread, 'md'),
                  chatThreadToMarkdown(thread, courseLabel),
                  'text/markdown',
                )
                show('Transcript downloaded.')
              }}
              className="inline-flex items-center gap-2 rounded-control border border-rule bg-paper px-2.5 py-1.5 text-[12px] text-ink hover:border-board"
            >
              <Download size={13} /> Markdown
            </button>
            <button
              type="button"
              onClick={() => {
                downloadTextFile(chatThreadFileName(thread, 'json'), chatThreadToJson(thread), 'application/json')
                show('Transcript downloaded.')
              }}
              className="inline-flex items-center gap-2 rounded-control border border-rule bg-paper px-2.5 py-1.5 text-[12px] text-ink hover:border-board"
            >
              <FileJson size={13} /> JSON
            </button>
            <button
              type="button"
              onClick={() => copy(chatThreadToMarkdown(thread, courseLabel))}
              className="inline-flex items-center gap-2 rounded-control border border-rule bg-paper px-2.5 py-1.5 text-[12px] text-ink hover:border-board"
            >
              <Copy size={13} /> Copy whole transcript
            </button>
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-muted">
            The Markdown carries the reasoning and the tool trail, not only the replies.
          </p>
        </DrawerSection>
      </div>
    </div>
  )

  return (
    <CourseShell role="student" active="chat" right={drawer}>
      <Page>
        <PageBar
          context={`${course?.code ?? thread.courseId} · ${thread.messages.length} message${thread.messages.length === 1 ? '' : 's'} · ${relativeTime(thread.updatedAt)}`}
        >
          <PageAction onClick={() => navigate('/course/chat/history')}>
            <ArrowLeft size={14} /> History
          </PageAction>
          <PageAction onClick={togglePinned} label={thread.pinned ? 'Unpin thread' : 'Pin thread'}>
            {thread.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {thread.pinned ? 'Unpin' : 'Pin'}
          </PageAction>
          <PageAction variant="danger" onClick={() => setConfirmDelete((open) => !open)}>
            <Trash2 size={14} /> Delete
          </PageAction>
          <PageAction
            variant="primary"
            onClick={() => navigate(`/course/chat?thread=${encodeURIComponent(thread.id)}`)}
          >
            Continue this thread <ArrowRight size={14} />
          </PageAction>
        </PageBar>

        <PageBody measure="reading">
          <div>
            {/* The thread's own name — the document's title, not the page's. */}
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename()
                    if (event.key === 'Escape') setRenaming(false)
                  }}
                  placeholder="Name this thread, or leave empty to use its first question"
                  className="min-w-0 flex-1 rounded-control border border-board bg-surface px-2.5 py-1.5 font-serif text-[20px] text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={commitRename}
                  aria-label="Save name"
                  className="rounded-control border border-rule p-1.5 text-ink-muted hover:text-ink"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  aria-label="Cancel rename"
                  className="rounded-control border border-rule p-1.5 text-ink-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {thread.pinned ? <Pin size={15} className="mt-1.5 shrink-0 text-board" /> : null}
                <h1 className="min-w-0 font-serif text-[24px] leading-tight text-ink">{thread.title}</h1>
                <button
                  type="button"
                  onClick={() => {
                    setRenameDraft(thread.customTitle ?? '')
                    setRenaming(true)
                  }}
                  aria-label="Rename thread"
                  title="Rename thread"
                  className="mt-1 shrink-0 text-ink-muted hover:text-ink"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
              {courseLabel} · started {formatStamp(thread.createdAt)}
              {stats.spanMs > 0 ? ` · ${formatDuration(stats.spanMs)} of conversation` : ''}
              {thread.customTitle ? ' · renamed by you' : ''}
            </p>

            {confirmDelete ? (
              <div className="mt-4 rounded-card border border-mark bg-mark-tint px-4 py-3">
                <p className="text-[13px] text-mark">
                  Delete this transcript? It is stored only in this browser and cannot be recovered.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = deleteChatThread(thread.id)
                      if (!ok) {
                        setConfirmDelete(false)
                        fail('That thread could no longer be found.')
                        return
                      }
                      navigate('/course/chat/history')
                    }}
                    className="rounded-control bg-mark px-3 py-1.5 text-[13px] font-medium text-paper"
                  >
                    Delete permanently
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[13px] text-ink-muted hover:text-ink"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : null}

            {notice ? <PageNotice className="mt-4">{notice}</PageNotice> : null}

            {/* Search within the transcript. A long thread is a document, and a
                document you cannot search is a document you re-read. */}
            {thread.messages.length > 3 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-control border border-rule bg-surface px-3 py-1.5 focus-within:border-board">
                  <Search size={14} className="shrink-0 text-ink-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find in this thread…"
                    aria-label="Find in this thread"
                    className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('')
                        setOnlyMatches(false)
                      }}
                      aria-label="Clear search"
                      className="shrink-0 text-ink-muted hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                {matchIds ? (
                  <>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {matchIds.size} turn{matchIds.size === 1 ? '' : 's'} match
                    </span>
                    <button
                      type="button"
                      onClick={() => setOnlyMatches((on) => !on)}
                      aria-pressed={onlyMatches}
                      className={`rounded-control border px-2.5 py-1.5 text-[12px] transition-colors duration-[120ms] ease-out ${
                        onlyMatches
                          ? 'border-board bg-board-tint text-board'
                          : 'border-rule bg-surface text-ink-muted hover:text-ink'
                      }`}
                    >
                      Matches only
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Transcript */}
            <div className="mt-6 flex flex-col gap-5 pb-6">
              {visible.length === 0 ? (
                <p className="rounded-card border border-rule bg-surface px-6 py-10 text-center text-[13px] text-ink-muted">
                  {query ? `Nothing in this thread matches “${query}”.` : 'This thread has no messages.'}
                </p>
              ) : (
                visible.map((message, index) => {
                  const previous = index > 0 ? visible[index - 1] : null
                  const showDay =
                    Boolean(message.at) &&
                    (!previous?.at || previous.at.slice(0, 10) !== message.at!.slice(0, 10))
                  return (
                    <div key={message.id} className="flex flex-col gap-5">
                      {showDay ? <DaySeparator iso={message.at!} /> : null}
                      <Turn
                        message={message}
                        index={thread.messages.indexOf(message)}
                        initials={initials}
                        matched={Boolean(matchIds?.has(message.id))}
                        onCopy={copy}
                      />
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
              <p className="font-mono text-[11px] text-ink-muted">
                Saved in this browser
              </p>
              <Link
                to={`/course/chat?thread=${encodeURIComponent(thread.id)}`}
                className="inline-flex items-center gap-1.5 text-[13px] text-board hover:underline"
              >
                Continue this thread <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </CourseShell>
  )
}
