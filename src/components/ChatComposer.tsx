import { Globe, Send, Square } from 'lucide-react'

export default function ChatComposer({ value, onChange, onSend, onStop, busy, webSearch, onWebSearch, course }: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  busy: boolean
  webSearch: boolean
  onWebSearch: () => void
  course: string
}) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!busy && value.trim()) onSend() }} className="w-full rounded-xl border border-rule bg-surface p-3 shadow-sm transition-shadow focus-within:border-board focus-within:ring-2 focus-within:ring-board/10">
      <textarea
        aria-label={`Message your ${course} tutor`}
        value={value}
        maxLength={2000}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (!busy && value.trim()) onSend()
          }
        }}
        placeholder={`Ask about ${course}, paste a question, or tell me where you’re stuck…`}
        className="max-h-48 min-h-20 w-full resize-y bg-transparent px-1 py-1 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"
      />
      <div className="mt-2 flex items-center gap-2 border-t border-rule/60 pt-2">
        <button type="button" onClick={onWebSearch} aria-pressed={webSearch} className={`inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[12px] ${webSearch ? 'bg-board-tint text-board' : 'text-ink-muted hover:bg-paper'}`}>
          <Globe size={14} /> Web {webSearch ? 'on' : 'off'}
        </button>
        <span className="ml-auto text-[11px] text-ink-muted">{value.length}/2000</span>
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Stop response" className="flex h-9 items-center gap-2 rounded-control bg-board px-3 text-[12px] text-paper"><Square size={13} /> Stop</button>
        ) : (
          <button type="submit" disabled={!value.trim()} aria-label="Send message" className="flex h-9 w-9 items-center justify-center rounded-control bg-board text-paper hover:bg-board-deep disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /></button>
        )}
      </div>
      <p className="mt-2 px-1 text-[11px] text-ink-muted">Enter to send · Shift + Enter for a new line · Check important answers against your notes.</p>
    </form>
  )
}
