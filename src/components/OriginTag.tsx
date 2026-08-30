// OriginTag.tsx — the one place a question says where it came from.
//
// A synthesized question is not a course question. It was written by a model
// from the session's notes, it has been validated but not taught, and a
// student practising one is entitled to know that — which means the tag has to
// travel with the item to every surface it appears on, not sit in a settings
// page nobody opens. One component, so it cannot say "Synthesized" in the list
// and "AI" on the paper.
import { Sparkles } from 'lucide-react'
import type { IndexedQuestion } from '@/database/types'

const CHIP = 'inline-flex items-center gap-1 rounded-chip px-2 py-1 text-[10px]'

/** Curated sources keep the existing muted treatment; synthesized is marked. */
function sourceChipClass(sourceType: IndexedQuestion['sourceType']) {
  if (sourceType === 'Synthesized from notes') return 'bg-board text-paper'
  if (sourceType === 'Student paper') return 'bg-[#EEE8D8] text-[#765F25]'
  if (sourceType === 'Course paper') return 'bg-board-tint text-board-deep'
  return 'bg-paper text-ink-muted'
}

/**
 * Where a curated question came from — a problem set, a past paper, a student
 * script. A component rather than an exported class string, so this file
 * exports components only and survives fast refresh.
 */
export function SourceChip({ type }: { type: IndexedQuestion['sourceType'] }) {
  return <span className={`${CHIP} ${sourceChipClass(type)}`}>{type}</span>
}

/**
 * The tag itself. `title` carries the long form for a pointer, because the
 * chip has room for one word and the distinction deserves a sentence.
 */
export default function OriginTag({
  origin,
  className,
}: {
  origin?: IndexedQuestion['origin']
  className?: string
}) {
  if (origin !== 'synthesized') return null
  return (
    <span
      className={`${CHIP} bg-board text-paper ${className ?? ''}`}
      title="Written by Syno from this session’s notes, then checked against its own mark scheme. Not a question set by the course."
    >
      <Sparkles size={10} aria-hidden="true" />
      Synthesized
    </span>
  )
}

/** Draft state, shown beside the origin tag while an item awaits review. */
export function DraftTag({ className }: { className?: string }) {
  return (
    <span
      className={`${CHIP} border border-board/40 bg-board-tint text-board-deep ${className ?? ''}`}
      title="Drafted but not yet accepted into the practice bank."
    >
      Draft
    </span>
  )
}
