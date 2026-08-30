// SegmentBar.tsx — generic n-segment mastery bar (design.md §spec strip).
// Filled segments = `color` (default board). Unfilled = surface with 1px rule
// outline, or 1px mark outline when `gap` is set. 5 (objective), 10 (course
// row), 30 (class coverage) segments.
import type { CSSProperties } from 'react'

export default function SegmentBar({
  filled,
  total = 5,
  color = '#2F5D50',
  gap = false,
  size = 10,
  segmentGap = 2,
}: {
  filled: number
  total?: number
  color?: string
  gap?: boolean
  size?: number
  segmentGap?: number
}) {
  return (
    <span
      role="img"
      aria-label={`${filled} of ${total}`}
      style={{ display: 'inline-flex', gap: segmentGap }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled
        const style: CSSProperties = {
          width: size,
          height: size,
          borderRadius: 2,
          background: isFilled ? color : '#FBFCFB',
          outline: isFilled
            ? 'none'
            : `1px solid ${gap ? '#A63D40' : '#D6DCD9'}`,
          outlineOffset: -1,
        }
        return <span key={i} style={style} />
      })}
    </span>
  )
}
