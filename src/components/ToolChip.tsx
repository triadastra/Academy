// ToolChip.tsx — collapsed mono chip like `⟨ grep_corpus "u = " ⟩ 4 hits`,
// ink-muted; expands on click to show raw result lines.
import { useState } from 'react'

export default function ToolChip({
  tool,
  arg,
  hits,
  lines,
}: {
  tool: string
  arg?: string
  hits?: number
  lines: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="inline-block align-top">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-mono text-[12px] text-ink-muted border border-rule rounded-chip bg-surface px-2 py-1 transition-colors duration-[120ms] ease-out hover:border-ink-muted"
      >
        ⟨ {tool}
        {arg ? ` "${arg}"` : ''} ⟩{typeof hits === 'number' ? ` ${hits} hits` : ''}
      </button>
      {open ? (
        <div className="mt-1 border border-rule rounded-chip bg-surface px-2 py-1.5">
          {lines.map((line, i) => (
            <div key={i} className="font-mono text-[12px] text-ink-muted whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
