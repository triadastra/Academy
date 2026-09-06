// Chat — route /course/chat — refs syn_p7.png (active) + syn_p8.png (empty).
// Active: thread with KaTeX working, expandable ToolChips, spec strip,
// inline check-question that fills a mastery segment on a correct answer,
// streaming course-grounded reply on send. A blank new session is the default.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  History,
  LoaderCircle,
  Plus,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageNotice } from '@/components/Page'
import ChatComposer from '@/components/ChatComposer'
import { Link } from 'react-router'
import MarkdownText from '@/components/MarkdownText'
import { GatewayError, GatewayUnavailable, type LlmMessage } from '@/lib/llm'
import { runAgent, type ToolActivity } from '@/lib/agent'
import { notesForCourse, searchNotes } from '@/database/notes-tools'
import { topicsForCourse } from '@/lib/course-content'
import ToolChip from '@/components/ToolChip'
import ObjectiveScrubber from '@/components/ObjectiveScrubber'
import Tex from '@/components/Tex'
import type { ChatMessage } from '@/data/mock'
import { getActiveCourse, setActiveCourse } from '@/lib/course-selection'
import { getChatThread, listNonEmptyChatThreads } from '@/database/chat-history'
import { uuid } from '@/lib/uuid'
import {
  appendChatMessage,
  consumePendingChatPrompt,
  getCurrentUser,
  subscribeDatabase,
  upsertChatMessage,
} from '@/database/client'

// ── numbered segment boxes (1..5), chat/know style ─────────────────────────
function NumberedSegments({
  filled,
  total = 5,
  color = '#2F5D50',
  animateIndex,
}: {
  filled: number
  total?: number
  color?: string
  animateIndex?: number // index that plays the 120ms fill animation
}) {
  return (
    <span className="inline-flex gap-1">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled
        return (
          <span
            key={i}
            className="w-7 h-7 inline-flex items-center justify-center rounded-chip border text-[12px] font-mono transition-colors duration-[120ms] ease-out"
            style={{
              background: isFilled ? color : '#FBFCFB',
              borderColor: isFilled ? color : '#D6DCD9',
              color: isFilled ? '#FBFCFB' : '#5A6461',
              transform: animateIndex === i ? 'scale(1.08)' : 'none',
              transitionProperty: 'background-color, transform',
            }}
          >
            {i + 1}
          </span>
        )
      })}
    </span>
  )
}

interface DisplayMessage extends ChatMessage {
  streamed?: boolean
  /** Tools this answer was built from, kept so the student can inspect them. */
  activity?: ToolActivity[]
  /** K3's reasoning trace, shown collapsed under the answer. */
  reasoning?: string
}

export default function Chat() {
  const navigate = useNavigate()
  const [activeCourse, setActiveCourseState] = useState(getActiveCourse)
  const [empty, setEmpty] = useState(true)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [draft, setDraft] = useState(consumePendingChatPrompt)
  const [streaming, setStreaming] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [checkAnswer, setCheckAnswer] = useState('')
  const [checkState, setCheckState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [masteryFilled, setMasteryFilled] = useState(3)
  const [filledAnim, setFilledAnim] = useState<number | undefined>(undefined)
  // Keep failures beside the composer so the student can retry their question.
  const [chatError, setChatError] = useState('')
  // True while the agent is reasoning or running tools, before the answer.
  const [thinking, setThinking] = useState(false)
  const [activity, setActivity] = useState<ToolActivity[]>([])
  // Web search bills several thousand tokens per call, so it is opt-in.
  const [webSearch, setWebSearch] = useState(false)
  // Unit the student has scrubbed to, or null for the whole course. A unit is
  // a request for focused teaching, so it reaches the tutor's system prompt.
  const [focusUnit, setFocusUnit] = useState<string | null>(null)
  // The signed-in account, not the seeded demo student: this avatar was the
  // literal string "YL", so every account watched Yun Lin ask its questions.
  const initials = getCurrentUser()?.initials || '··'
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const threadIdRef = useRef(`thread-${uuid()}`)
  // Latest streamed text and the last time it was written to the database, so
  // an abort or a gateway failure can still persist what had arrived.
  const partialRef = useRef('')
  const persistedAtRef = useRef(0)

  // The imported corpus is fetched after first paint, so the objective list
  // read an empty set on a cold load and the whole section stayed hidden.
  const [, setDbTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])

  // ── Resuming a saved thread ──────────────────────────────────────────────
  // /course/chat?thread=<id> is how the history pages hand a conversation back.
  // The URL is the source of truth rather than a state initialiser: this route
  // stays mounted while the history page navigates into it, so a second resume
  // has to be noticed by an effect or it would silently keep the first thread.
  const [searchParams, setSearchParams] = useSearchParams()
  const resumeId = searchParams.get('thread')
  useEffect(() => {
    if (!resumeId || resumeId === threadIdRef.current) return
    const saved = getChatThread(resumeId)
    if (!saved) return
    // A thread belongs to the course it was held in. Resuming one from another
    // course without switching would ground the tutor in the wrong notes and
    // file the new turns under the wrong subject.
    if (saved.courseId && saved.courseId !== activeCourse.id) {
      setActiveCourse(saved.courseId)
      setActiveCourseState(getActiveCourse())
    }
    abortRef.current?.abort()
    abortRef.current = null
    threadIdRef.current = saved.id
    setStreaming(false)
    setThinking(false)
    setActivity([])
    setMessages(
      saved.messages.map((message) => ({
        id: message.id,
        role: message.role,
        time: message.time,
        text: message.text,
        tools: message.tools,
        spec: message.spec,
        check: message.check,
        activity: message.activity,
        reasoning: message.reasoning,
      })),
    )
    setEmpty(saved.messages.length === 0)
  }, [resumeId, activeCourse.id])

  // scroll to bottom on new messages
  useEffect(() => {
    if (nearBottomRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function now() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /**
   * Grounds the tutor in this course's shared notes. Passages come from the
   * same tool the Notes agent uses, so the model answers from class material
   * rather than from whatever it happens to remember about the syllabus.
   */
  function systemPrompt(question: string) {
    const found = searchNotes(activeCourse.id, question, 4)
    // Narrowing to a unit is a request for focused teaching, so retrieval
    // narrows with it — but only when that unit actually has a matching
    // passage, otherwise the tutor would answer with no notes at all.
    const hits = found.ok ? found.hits : []
    const inUnit = focusUnit ? hits.filter((hit) => hit.code.split('.')[0] === focusUnit) : hits
    const usable = inUnit.length > 0 ? inUnit : hits
    const passages =
      usable.length > 0
        ? usable.map((hit) => `[${hit.code} · ${hit.sectionTitle}] ${hit.snippet}`).join('\n')
        : '(no matching passage in this course’s notes)'
    const focus = focusUnit
      ? [
          `The student has narrowed to Unit ${focusUnit} and is asking for focused`,
          'teaching on it. Stay inside that unit: take examples and explanations',
          'from its material. If the question belongs to another unit, answer it',
          'but say which unit it really belongs to.',
          '',
        ]
      : []
    return [
      `You are Syno, a tutor for ${activeCourse.code} — ${activeCourse.title} at SHSID.`,
      ...focus,
      'Teach the method; build understanding step by step rather than just stating answers.',
      'Prefer the course notes below over your own recollection. If they do not cover',
      'the question, say so plainly instead of inventing course-specific detail.',
      'Write mathematics as LaTeX between $ delimiters.',
      '',
      'You have tools. Search the notes before answering a subject question, and',
      'read the student’s memory (memory_read) before giving study advice, so it',
      'fits how this student actually learns.',
      '',
      'Course notes:',
      passages,
    ].join('\n')
  }

  async function send(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || streaming || abortRef.current || body.length > 2000) return
    setChatError('')
    nearBottomRef.current = true
    setActivity([])
    const sentThreadId = threadIdRef.current
    const sentCourseId = activeCourse.id
    if (empty) setEmpty(false)
    setDraft('')
    setStreaming(true)
    partialRef.current = ''
    persistedAtRef.current = 0
    const userMsg: DisplayMessage = { id: `u${Date.now()}`, role: 'user', time: now(), text: body }
    appendChatMessage(threadIdRef.current, activeCourse.id, { ...userMsg })
    const replyId = `a${Date.now()}`
    setMessages((m) => [...m, userMsg, { id: replyId, role: 'assistant', time: now(), text: '', streamed: true }])

    const history: LlmMessage[] = [
      { role: 'system', content: systemPrompt(body) },
      ...messages
        .filter((m) => m.text.trim())
        .slice(-8)
        .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.text })),
      { role: 'user', content: body },
    ]

    let partial = ''
    const abort = new AbortController()
    abortRef.current = abort

    try {
      setThinking(true)
      const { answer, activity, reasoning } = await runAgent({
        messages: history,
        webSearch,
        signal: abort.signal,
        onActivity: (entry) => { if (abortRef.current === abort) setActivity((current) => [...current, entry]) },
        onReasoning: (_delta, full) => {
          if (abortRef.current === abort) setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, reasoning: full } : msg)))
        },
        onToken: (_delta, full) => {
          if (abortRef.current !== abort) return
          setThinking(false)
          setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, text: full } : msg)))
          // Checkpoint the partial answer, but not once per token: every write
          // serialises the whole database, so it goes in on a timer and the
          // final write below always lands regardless.
          partial = full
          partialRef.current = full
          const at = Date.now()
          if (at - persistedAtRef.current > 500) {
            persistedAtRef.current = at
            upsertChatMessage(sentThreadId, sentCourseId, {
              id: replyId,
              role: 'assistant',
              time: now(),
              text: full,
              streaming: true,
            })
          }
        },
      })
      if (abortRef.current !== abort) return
      setThinking(false)
      setActivity([])
      // Keep the tool trail and the reasoning on the message, so a student can
      // see what the answer was actually built from.
      setMessages((m) =>
        m.map((msg) => (msg.id === replyId ? { ...msg, text: answer, activity, reasoning } : msg)),
      )
      setStreaming(false)
      upsertChatMessage(sentThreadId, sentCourseId, {
        id: replyId,
        role: 'assistant',
        time: now(),
        text: answer,
        activity,
        reasoning,
        streaming: false,
      })
      return
    } catch (error) {
      const stopped = (error as Error)?.name === 'AbortError'
      // Save to the originating conversation even when navigation stopped it.
      if (partial) {
        upsertChatMessage(sentThreadId, sentCourseId, { id: replyId, role: 'assistant', time: now(), text: partial, streaming: false, stopped: true })
      }
      if (abortRef.current !== abort) return
      if (!partial) setMessages((current) => current.filter((message) => message.id !== replyId))
      if (!stopped) {
        setChatError(error instanceof GatewayUnavailable
          ? 'Your tutor is currently offline. Your question is saved; you can retry when the AI service is connected or continue with your course notes.'
          : error instanceof GatewayError
            ? `The tutor could not finish this response.${error.retryAfterSeconds ? ` Try again in ${error.retryAfterSeconds} seconds.` : ' Please try again shortly.'}`
            : 'Something interrupted this response. Please try again.')
        setDraft(body)
      }
    } finally {
      if (abortRef.current === abort) {
        abortRef.current = null
        setStreaming(false)
        setThinking(false)
        setActivity([])
      }
    }
  }

  function startNewThread() {
    // Otherwise the effect above would hand the just-cleared thread straight
    // back on the next render, and "New thread" would do nothing.
    if (resumeId) setSearchParams({}, { replace: true })
    abortRef.current?.abort()
    abortRef.current = null
    setThinking(false)
    setActivity([])
    setChatError('')
    setEmpty(true)
    threadIdRef.current = `thread-${uuid()}`
    setMessages([])
    setDraft('')
    setStreaming(false)
    setHintShown(false)
    setCheckAnswer('')
    setCheckState('idle')
    setMasteryFilled(3)
    setFilledAnim(undefined)
  }

  function submitCheck() {
    const a = checkAnswer.replace(/\s/g, '').toLowerCase()
    // accept the correct antiderivative in any reasonable typed form
    const ok =
      a.includes('x^2') &&
      a.includes('e^x') &&
      (a.includes('2x') || a.includes('2*x')) &&
      (a.includes('+c') || a.includes('+ c'.replace(/\s/g, '')) || a.includes('2e^x') || a.includes('2*e^x'))
    if (ok) {
      setCheckState('correct')
      if (masteryFilled < 4) {
        setFilledAnim(masteryFilled)
        setMasteryFilled((v) => v + 1)
        setTimeout(() => setFilledAnim(undefined), 240)
      }
    } else {
      setCheckState('wrong')
    }
  }

  // ── EMPTY STATE ──────────────────────────────────────────────────────────
  if (empty) {
    // Built from THIS course's shared notes. It used to be a hardcoded IB Maths
    // list, so every course — Physics 10 included — was invited to explore
    // "AA HL 2.1 Definite integrals as area". A course with no notes published
    // yet simply shows no list rather than someone else's syllabus.
    // Mastery is looked up per rendered row rather than for every note here.
    // The scrubber mounts one unit at a time, so a forty-five objective course
    // costs a handful of lookups instead of forty-five.
    // Mastery comes from the same course-scoped source the progress page uses.
    // Reading the seeded table by bare code handed every course's 2.1 the demo
    // Maths mastery, so CHINESE 9 showed 陶渊明与《归园田居》 as 4 of 5.
    const mastery = new Map(
      topicsForCourse(activeCourse.id).map((topic) => [topic.code, topic.mastery]),
    )
    // Threads that hold at least one real turn: an abandoned empty one is not
    // something to offer to continue.
    const recent = listNonEmptyChatThreads(activeCourse.id)
    const explore = notesForCourse(activeCourse.id).map((note) => ({
      code: note.code,
      name: note.title,
      ref: `${activeCourse.code} ${note.code}`,
    }))
    return (
      <CourseShell role="student" active="chat">
        <Page>
          <PageBar context={`${activeCourse.code} · Course tutor`}>
            <PageAction onClick={() => navigate('/course/chat/history')}>
              <History size={14} /> History
            </PageAction>
            <PageAction onClick={startNewThread} disabled>
              <Plus size={14} /> New thread
            </PageAction>
          </PageBar>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-7">
            <div className="flex min-h-full flex-col items-center justify-center max-w-[820px] mx-auto w-full">
              <h2 className="font-serif text-[24px] text-ink text-center leading-tight">
                What would you like to understand?
              </h2>

            <p className="mt-2 max-w-md text-center text-[14px] leading-relaxed text-ink-muted">Work through a tricky idea, practise a skill, or turn your course notes into your next study session.</p>
            <div className="mt-6 w-full"><ChatComposer value={draft} onChange={setDraft} onSend={() => void send()} onStop={() => abortRef.current?.abort()} busy={streaming} webSearch={webSearch} onWebSearch={() => setWebSearch((on) => !on)} course={activeCourse.code} /></div>
            <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => setDraft('Help me understand a topic step by step: ')} className="rounded-lg border border-rule bg-surface p-4 text-left text-[13px] text-board hover:bg-board-tint">Explain a concept <span className="mt-1 block text-[12px] text-ink-muted">Build understanding, one step at a time</span></button>
              <Link to="/course/questions" className="rounded-lg border border-rule bg-surface p-4 text-[13px] text-board hover:bg-board-tint">Build your quiz bank <span className="mt-1 block text-[12px] text-ink-muted">Generate questions from your notes</span></Link>
              <Link to="/course/mock-tests" className="rounded-lg border border-rule bg-surface p-4 text-[13px] text-board hover:bg-board-tint">Create a practice test <span className="mt-1 block text-[12px] text-ink-muted">Put your knowledge to the test</span></Link>
            </div>

            {/* Where the student left off. A blank composer is the right
                default, but it should not be the only door: the last real
                conversation is one click away rather than a page away. */}
            {recent.length > 0 ? (
              <div className="w-full mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-ink-muted">
                <History size={13} className="shrink-0" />
                <button
                  type="button"
                  onClick={() => navigate(`/course/chat?thread=${encodeURIComponent(recent[0].id)}`)}
                  className="max-w-[420px] truncate text-board hover:underline"
                >
                  Continue “{recent[0].title}”
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => navigate('/course/chat/history')}
                  className="hover:text-ink hover:underline"
                >
                  {recent.length} saved {recent.length === 1 ? 'conversation' : 'conversations'} in{' '}
                  {activeCourse.code}
                </button>
              </div>
            ) : null}

            {/* explore objectives — omitted entirely when the course has no
                published notes, rather than showing an empty frame */}
            {explore.length > 0 ? (
            <div className="w-full mt-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="h-px flex-1 bg-rule" />
                <span className="text-[12px] text-ink-muted">Explore objectives in this unit</span>
                <span className="h-px flex-1 bg-rule" />
              </div>
              <ObjectiveScrubber
                objectives={explore}
                onPick={(o) => send(`Help me understand ${o.code} ${o.name}.`)}
                onFocusChange={setFocusUnit}
                renderMastery={(o) => <NumberedSegments filled={mastery.get(o.code) ?? 0} />}
              />

              {/* legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-[12px] text-ink-muted">
                {['Not started', 'Emerging', 'Developing', 'Secure', 'Mastered'].map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-chip border border-rule bg-surface inline-block" />
                    {l}
                  </span>
                ))}
              </div>
              <p className="text-center text-[12px] text-ink-muted mt-2">
                Mastery reflects your readiness to apply the objective in varied contexts.
              </p>
            </div>
            ) : null}
          </div>
        </div>
        </Page>
      </CourseShell>
    )
  }

  // ── ACTIVE STATE ─────────────────────────────────────────────────────────
  return (
    <CourseShell role="student" active="chat">
      <Page>
        <PageBar context={`${activeCourse.code} · Course tutor`}>
          <PageAction onClick={() => navigate('/course/chat/history')}>
            <History size={14} /> History
          </PageAction>
          <PageAction onClick={startNewThread}>
            <Plus size={14} /> New thread
          </PageAction>
        </PageBar>

        {/* messages */}
        <div ref={scrollRef} onScroll={(event) => { const el = event.currentTarget; nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100 }} className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:px-8 sm:py-7">
          <div className="max-w-[820px] mx-auto flex flex-col gap-5">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[70%] bg-board-tint rounded-[6px] px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-board text-paper font-mono text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                        {initials}
                      </span>
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap break-words text-[14px] text-ink">{m.text}</p>
                        <div className="text-right font-mono text-[12px] text-ink-muted mt-1">
                          {m.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-board text-paper font-serif text-[14px] flex items-center justify-center shrink-0 mt-0.5">
                    S
                  </span>
                  <div className="flex-1 min-w-0">
                    {!m.text && thinking ? (
                      <div className="flex flex-col gap-1.5">
                        <p className="flex items-center gap-2 text-[14px] text-ink-muted">
                          <LoaderCircle size={14} className="animate-spin" />
                          {activity.length > 0 ? activity[activity.length - 1].label : 'Thinking'}…
                        </p>
                        {activity.length > 1 ? (
                          <ul className="flex flex-col gap-0.5 pl-6">
                            {activity.slice(0, -1).map((entry, i) => (
                              <li key={i} className="font-mono text-[11px] text-ink-muted">
                                {entry.ok ? '·' : '×'} {entry.label}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {/* Live reasoning, tailed like a log so it doesn't
                            push the composer off-screen while it thinks. */}
                        {m.reasoning ? (
                          <p className="mt-1 max-h-[88px] overflow-hidden border-l-2 border-rule pl-3 text-[12px] leading-relaxed text-ink-muted">
                            {m.reasoning.slice(-320)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {/* Reasoning and tool work come BEFORE the answer:
                            that is the order they happened in, and it lets a
                            student trace how the answer was reached. */}
                        {m.reasoning ? (
                          <details className="mb-2.5">
                            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                              Thinking
                            </summary>
                            <p className="mt-1.5 whitespace-pre-wrap border-l-2 border-rule pl-3 text-[12px] leading-relaxed text-ink-muted">
                              {m.reasoning}
                            </p>
                          </details>
                        ) : null}
                        {m.activity?.length ? (
                          <details className="mb-3">
                            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                              {m.activity.length} tool {m.activity.length === 1 ? 'call' : 'calls'}
                            </summary>
                            <ul className="mt-1.5 flex flex-col gap-0.5">
                              {m.activity.map((entry, i) => (
                                <li key={i} className="font-mono text-[11px] text-ink-muted">
                                  {entry.ok ? '·' : '×'} {entry.name} — {entry.label}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        <MarkdownText>{m.text}</MarkdownText>
                      </>
                    )}

                    {/* seeded worked math (first assistant message only) */}
                    {m.id === 'm2' ? (
                      <div className="mt-3 text-[14px] text-ink leading-relaxed">
                        <p>
                          With <Tex>{'u = x'}</Tex>, we have <Tex>{'du = dx'}</Tex>, and the
                          integral <Tex>{'\\int x e^x\\,dx'}</Tex> becomes{' '}
                          <Tex>{'\\int u e^u\\,du'}</Tex>, which we can evaluate by integration by
                          parts:
                        </p>
                        <Tex display className="my-2">
                          {'\\int u e^u\\,du = u e^u - \\int e^u\\,du = u e^u - e^u + C = (u-1)e^u + C.'}
                        </Tex>
                        <p>
                          Substituting back <Tex>{'u = x'}</Tex> gives{' '}
                          <Tex>{'(x-1)e^x + C'}</Tex>.
                        </p>
                        <p className="mt-2">
                          If we try <Tex>{'u = e^x'}</Tex>, then <Tex>{'du = e^x\\,dx'}</Tex> and{' '}
                          <Tex>{'dx = \\tfrac{du}{u}'}</Tex>, so the integral becomes{' '}
                          <Tex>{'\\int x\\,u\\,\\tfrac{du}{u} = \\int x\\,du'}</Tex>, which still
                          contains <Tex>{'x'}</Tex>. We would then need to write{' '}
                          <Tex>{'x = \\ln u'}</Tex>, leading to <Tex>{'\\int u \\ln u\\,du'}</Tex>,
                          which is more complicated.
                        </p>
                      </div>
                    ) : null}

                    {/* tool chips */}
                    {m.tools ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.tools.map((t, i) => (
                          <ToolChip key={i} tool={t.tool} arg={t.arg} hits={t.hits} lines={t.lines} />
                        ))}
                      </div>
                    ) : null}

                    {/* spec strip */}
                    {m.spec ? (
                      <div className="mt-4 pt-3 border-t border-rule">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-mono text-[12px] text-ink">{m.spec.code}</span>
                          <span className="text-[14px] text-ink max-w-[300px]">
                            {m.spec.label}
                          </span>
                          <NumberedSegments
                            filled={m.id === 'm2' ? masteryFilled : m.spec.filled}
                            animateIndex={m.id === 'm2' ? filledAnim : undefined}
                          />
                          <span className="ml-auto font-mono text-[12px] text-ink-muted">
                            {m.spec.citation}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    {/* check your understanding */}
                    {m.check ? (
                      <div className="mt-4 border border-rule rounded-[6px] bg-surface px-4 py-3">
                        <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted mb-1">
                          Check your understanding
                        </div>
                        <p className="text-[14px] text-ink">
                          Evaluate <Tex>{'\\int x^2 e^x\\,dx'}</Tex> using integration by parts.
                        </p>
                        {hintShown ? (
                          <p className="text-[12px] text-ink-muted mt-2">
                            Hint: take <Tex>{'u = x^2'}</Tex> and integrate by parts twice; the
                            power of <Tex>{'x'}</Tex> drops by one each time.
                          </p>
                        ) : null}
                        {checkState === 'correct' ? (
                          <p className="text-[14px] text-board font-medium mt-2">
                            Correct — <Tex>{'e^x(x^2 - 2x + 2) + C'}</Tex>. Mastery for 2.4
                            increased by one segment.
                          </p>
                        ) : checkState === 'wrong' ? (
                          <p className="text-[14px] text-mark mt-2">
                            Not quite — apply integration by parts twice and watch the signs.
                          </p>
                        ) : null}
                        <div className="flex items-center gap-2 mt-3">
                          <input
                            value={checkAnswer}
                            onChange={(e) => {
                              setCheckAnswer(e.target.value)
                              setCheckState('idle')
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && submitCheck()}
                            placeholder="Your answer, e.g. e^x(x^2 − 2x + 2) + C"
                            className="flex-1 border border-rule rounded-control bg-paper px-2.5 py-1.5 text-[14px] text-ink placeholder:text-ink-muted outline-none focus:border-board"
                          />
                          <button
                            type="button"
                            onClick={submitCheck}
                            className="bg-board text-paper rounded-control px-3 py-1.5 text-[14px] hover:bg-board-deep transition-colors duration-[120ms] ease-out"
                          >
                            Check
                          </button>
                          <button
                            type="button"
                            onClick={() => setHintShown((v) => !v)}
                            className="border border-rule rounded-control px-3 py-1.5 text-[14px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
                          >
                            Show hint
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-rule bg-paper px-4 py-3 sm:px-8">
          <div className="mx-auto max-w-[820px]">
            {chatError ? <PageNotice className="mb-3">{chatError}</PageNotice> : null}
            <ChatComposer value={draft} onChange={setDraft} onSend={() => void send()} onStop={() => abortRef.current?.abort()} busy={streaming} webSearch={webSearch} onWebSearch={() => setWebSearch((on) => !on)} course={activeCourse.code} />
          </div>
        </div>
      </Page>
    </CourseShell>
  )
}

// re-export for other student pages
export { NumberedSegments }
