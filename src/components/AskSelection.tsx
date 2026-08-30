// AskSelection.tsx — "highlight to ask" floating chatbot for the notes document.
//
// Wraps the note content and watches for text selections inside it. A fresh
// selection pops a compact prompt near the highlight; submitting expands it in
// place into a small multi-turn chat panel whose replies are grounded in the
// highlighted passage. All state is in memory — nothing persists, and a new
// selection starts a fresh conversation.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Loader2, SendHorizonal, Sparkles, X } from 'lucide-react'
import { chat, GatewayError, GatewayUnavailable } from '@/lib/llm'
import type { LlmMessage } from '@/lib/llm'

interface UnitInfo {
  code: string
  title: string
  summary: string
}

interface SelectionInfo {
  text: string
  /** Viewport-relative rect of the selection, for fixed-position anchoring. */
  rect: { top: number; bottom: number; left: number; width: number }
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
  /** Set on the assistant turn when the gateway failed — rendered inline. */
  error?: boolean
}

const QUOTE_LIMIT = 160
const PANEL_WIDTH = 340

function truncate(text: string, limit: number) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  return collapsed.length > limit ? `${collapsed.slice(0, limit).trimEnd()}…` : collapsed
}

/** Clamp the popup horizontally inside the viewport with a small margin. */
function anchor(rect: SelectionInfo['rect'], panelHeightGuess: number) {
  const margin = 8
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
    window.innerWidth - PANEL_WIDTH - margin,
  )
  const below = rect.bottom + panelHeightGuess + margin < window.innerHeight
  const top = below
    ? rect.bottom + margin
    : Math.max(margin, rect.top - panelHeightGuess - margin)
  return { left, top }
}

export default function AskSelection({
  unit,
  children,
}: {
  unit: UnitInfo
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [selection, setSelection] = useState<SelectionInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [thinking, setThinking] = useState(false)
  const [streaming, setStreaming] = useState(false)

  const busy = thinking || streaming

  const close = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setOpen(false)
    setSelection(null)
    setDraft('')
    setTurns([])
    setThinking(false)
    setStreaming(false)
    // The popup hides, so the highlight it answered should go too — otherwise
    // re-releasing the mouse over the same selection would not reopen.
    window.getSelection()?.removeAllRanges()
  }, [])

  // Detect a finished selection inside the notes container. The popup itself
  // sits outside the container, so interacting with it never triggers this.
  useEffect(() => {
    const detect = () => {
      if (open) return
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const node = range.commonAncestorContainer
      if (!containerRef.current?.contains(node)) return
      const text = sel.toString().trim()
      if (!text) return
      const box = range.getBoundingClientRect()
      setSelection({
        text,
        rect: { top: box.top, bottom: box.bottom, left: box.left, width: box.width },
      })
    }
    document.addEventListener('mouseup', detect)
    document.addEventListener('keyup', detect)
    return () => {
      document.removeEventListener('mouseup', detect)
      document.removeEventListener('keyup', detect)
    }
  }, [open])

  // A click anywhere outside the collapsed prompt dismisses it; the expanded
  // chat panel stays until X or Esc so an accidental click loses no thread.
  useEffect(() => {
    if (!selection || open) return
    const dismiss = (event: MouseEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) setSelection(null)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [selection, open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  // Keep the latest streamed token in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, thinking])

  const ask = async (question: string) => {
    if (!selection || busy) return
    const history: Turn[] = [...turns, { role: 'user', content: question }]
    setTurns(history)
    setDraft('')
    setOpen(true)
    setThinking(true)

    const system: LlmMessage = {
      role: 'system',
      content:
        `You are a tutor for the course unit '${unit.code} ${unit.title}'. ` +
        `Unit summary: ${unit.summary}. ` +
        `The student highlighted this passage from the notes: """${selection.text}""". ` +
        `Answer questions about it concisely, grounded in the passage and the unit.`,
    }
    const messages: LlmMessage[] = [
      system,
      ...history.map((turn) => ({ role: turn.role, content: turn.content }) as LlmMessage),
    ]

    const controller = new AbortController()
    abortRef.current = controller
    // The assistant turn is appended once and mutated as tokens stream in.
    setTurns([...history, { role: 'assistant', content: '' }])
    try {
      await chat({
        messages,
        signal: controller.signal,
        onReasoning: () => setThinking(true),
        onToken: (_delta, full) => {
          setThinking(false)
          setStreaming(true)
          setTurns([...history, { role: 'assistant', content: full }])
        },
      })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      const content =
        error instanceof GatewayUnavailable
          ? "Chat isn't available right now — try again later."
          : error instanceof GatewayError
            ? error.message
            : 'Something went wrong while asking. Try again.'
      setTurns([...history, { role: 'assistant', content, error: true }])
    } finally {
      setThinking(false)
      setStreaming(false)
      abortRef.current = null
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const question = draft.trim()
    if (question) void ask(question)
  }

  const quote = selection ? truncate(selection.text, QUOTE_LIMIT) : ''
  const position = selection ? anchor(selection.rect, open ? 420 : 120) : null

  return (
    <div ref={containerRef}>
      {children}

      {selection && position ? (
        <div
          ref={popupRef}
          style={{ left: position.left, top: position.top, width: PANEL_WIDTH }}
          className="fixed z-50 rounded-card border border-rule bg-surface shadow-lg"
        >
          {!open ? (
            <form onSubmit={submit} className="p-3">
              <blockquote className="border-l-2 border-board/40 pl-2 text-[12px] leading-snug text-ink-muted">
                {quote}
              </blockquote>
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about this…"
                  className="w-full rounded-control border border-rule bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-board"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="shrink-0 rounded-control bg-board p-1.5 text-paper hover:bg-board-deep disabled:opacity-40"
                  aria-label="Ask"
                >
                  <Sparkles size={14} />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex max-h-[420px] flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-rule px-3.5 py-2.5">
                <blockquote className="border-l-2 border-board/40 pl-2 text-[12px] leading-snug text-ink-muted">
                  {quote}
                </blockquote>
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 rounded-control p-1 text-ink-muted hover:bg-board-tint hover:text-ink"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3">
                <div className="flex flex-col gap-2.5">
                  {turns.map((turn, index) =>
                    turn.role === 'user' ? (
                      <div
                        key={index}
                        className="self-end rounded-card bg-board px-3 py-2 text-[13px] leading-relaxed text-paper"
                      >
                        {turn.content}
                      </div>
                    ) : (
                      <div
                        key={index}
                        className={
                          turn.error
                            ? 'self-start rounded-card border border-dashed border-rule px-3 py-2 text-[13px] leading-relaxed text-ink-muted'
                            : 'self-start rounded-card bg-board-tint px-3 py-2 text-[13px] leading-relaxed text-ink'
                        }
                      >
                        {turn.content}
                      </div>
                    ),
                  )}
                  {thinking ? (
                    <div className="flex items-center gap-2 self-start px-1 text-[12px] text-ink-muted">
                      <Loader2 size={13} className="animate-spin" /> Thinking…
                    </div>
                  ) : null}
                </div>
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 border-t border-rule px-3.5 py-2.5">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask a follow-up…"
                  className="w-full rounded-control border border-rule bg-paper px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-board"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="shrink-0 rounded-control bg-board p-1.5 text-paper hover:bg-board-deep disabled:opacity-40"
                  aria-label="Send"
                >
                  <SendHorizonal size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
