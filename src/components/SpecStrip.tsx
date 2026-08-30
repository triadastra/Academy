// SpecStrip.tsx — the signature spec strip (design.md §spec strip):
// mono objective code + n-segment mastery bar + optional label + citation.
// gap=true gives unfilled segments a 1px mark outline (cohort gap signal).
import SegmentBar from './SegmentBar'

export default function SpecStrip({
  code,
  filled,
  total = 5,
  label,
  citation,
  gap = false,
}: {
  code: string
  filled: number
  total?: number
  label?: string
  citation?: string
  gap?: boolean
}) {
  return (
    <div className="inline-flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] text-ink">{code}</span>
        <SegmentBar filled={filled} total={total} gap={gap} />
        {label ? <span className="text-[14px] text-ink">{label}</span> : null}
      </div>
      {citation ? (
        <span className="font-mono text-[12px] text-ink-muted pl-[calc(2ch+8px)]">
          {citation}
        </span>
      ) : null}
    </div>
  )
}
