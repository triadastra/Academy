import { useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * Two-axis picker for a course's objectives.
 *
 * The horizontal track selects a unit and the vertical rail selects a section
 * within it. The leftmost cell is `*`, which is not a unit — it is the absence
 * of one: no selection, the whole course in scope. Sliding off it onto a unit
 * is a deliberate narrowing, and the caller is told so it can pass that focus
 * to the tutor.
 *
 * Only the chosen unit's sections are mounted, so scrubbing a forty-five
 * objective course renders a handful of rows rather than all of them.
 */

export interface ScrubberObjective {
  code: string
  name: string
  ref: string
}

/** The no-selection cell. Not a unit — the absence of a unit filter. */
const ALL = '*'

/** "4.2" -> "4". A code with no leading number belongs to no unit. */
function unitOf(code: string) {
  const match = /^\s*(\d+)/.exec(code)
  return match ? match[1] : null
}

/** Order codes numerically ("4.10" after "4.9", not before it). */
function rankOf(code: string) {
  const match = /^\s*(\d+)(?:\.(\d+))?/.exec(code)
  if (!match) return [Number.MAX_SAFE_INTEGER, 0] as const
  return [Number(match[1]), match[2] ? Number(match[2]) : 0] as const
}

function byCode(a: ScrubberObjective, b: ScrubberObjective) {
  const [au, as] = rankOf(a.code)
  const [bu, bs] = rankOf(b.code)
  return au - bu || as - bs
}

/** Index under the pointer, clamped to the track. */
function indexAt(client: number, start: number, extent: number, count: number) {
  if (extent <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.floor(((client - start) / extent) * count)))
}

export default function ObjectiveScrubber({
  objectives,
  onPick,
  onFocusChange,
  renderMastery,
}: {
  objectives: ScrubberObjective[]
  onPick: (objective: ScrubberObjective) => void
  /** Unit the student has narrowed to, or null while `*` is selected. */
  onFocusChange?: (unit: string | null) => void
  renderMastery?: (objective: ScrubberObjective) => ReactNode
}) {
  const units = useMemo(() => {
    const byUnit = new Map<string, ScrubberObjective[]>()
    for (const objective of objectives) {
      const unit = unitOf(objective.code)
      if (!unit) continue
      const bucket = byUnit.get(unit)
      if (bucket) bucket.push(objective)
      else byUnit.set(unit, [objective])
    }
    const numbered = [...byUnit.keys()]
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => ({ key, sections: byUnit.get(key)!.slice().sort(byCode) }))
    // `*` always leads, and always holds everything — including any objective
    // whose code carries no unit at all, which would otherwise be unreachable.
    return [{ key: ALL, sections: objectives.slice().sort(byCode) }, ...numbered]
  }, [objectives])

  const [unitIndex, setUnitIndex] = useState(0)
  const [sectionIndex, setSectionIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)

  const unit = units[Math.min(unitIndex, units.length - 1)]
  const sections = unit?.sections ?? []
  const active = Math.min(sectionIndex, Math.max(0, sections.length - 1))
  const focused = unit?.key !== ALL

  if (units.length === 0) return null

  const pickUnit = (next: number) => {
    if (next === unitIndex) return
    setUnitIndex(next)
    setSectionIndex(0)
    const key = units[next]?.key
    onFocusChange?.(key === ALL ? null : (key ?? null))
  }

  const dragTrack = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = trackRef.current?.getBoundingClientRect()
    if (box) pickUnit(indexAt(event.clientX, box.left, box.width, units.length))
  }

  const dragRail = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = railRef.current?.getBoundingClientRect()
    if (box) setSectionIndex(indexAt(event.clientY, box.top, box.height, sections.length))
  }

  const unitWidth = 100 / units.length
  const sectionHeight = sections.length > 0 ? 100 / sections.length : 100

  return (
    <div
      className="w-full"
      role="group"
      aria-label="Browse objectives by unit and section"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && unitIndex > 0) {
          event.preventDefault()
          pickUnit(unitIndex - 1)
        } else if (event.key === 'ArrowRight' && unitIndex < units.length - 1) {
          event.preventDefault()
          pickUnit(unitIndex + 1)
        } else if (event.key === 'ArrowUp' && active > 0) {
          event.preventDefault()
          setSectionIndex(active - 1)
        } else if (event.key === 'ArrowDown' && active < sections.length - 1) {
          event.preventDefault()
          setSectionIndex(active + 1)
        }
      }}
    >
      {/* unit track — * then 1..N, left to right */}
      <div
        ref={trackRef}
        tabIndex={0}
        role="slider"
        aria-label="Unit"
        aria-valuemin={0}
        aria-valuemax={units.length - 1}
        aria-valuenow={unitIndex}
        aria-valuetext={focused ? `Unit ${unit.key}` : 'All units'}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          dragTrack(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) dragTrack(event)
        }}
        className="relative h-9 rounded-control border border-rule bg-surface select-none touch-none cursor-ew-resize overflow-hidden focus:outline-none focus:ring-1 focus:ring-board"
      >
        <span
          aria-hidden
          className="absolute top-[3px] bottom-[3px] rounded-chip bg-board text-paper font-mono text-[12px] flex items-center justify-center transition-[left] duration-[120ms] ease-out pointer-events-none"
          style={{
            left: `calc(${unitIndex * unitWidth}% + 3px)`,
            width: `calc(${unitWidth}% - 6px)`,
          }}
        >
          {unit.key}
        </span>
        <div className="absolute inset-0 flex">
          {units.map((entry, i) => (
            <span
              key={entry.key}
              className={`flex-1 flex items-center justify-center font-mono text-[12px] ${
                i === unitIndex ? 'text-transparent' : 'text-ink-muted'
              }`}
            >
              {entry.key}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-3">
        {/* section rail — top to down within the selected unit */}
        <div
          ref={railRef}
          tabIndex={0}
          role="slider"
          aria-label="Section"
          aria-orientation="vertical"
          aria-valuemin={1}
          aria-valuemax={Math.max(1, sections.length)}
          aria-valuenow={active + 1}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRail(event)
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) dragRail(event)
          }}
          className="relative w-2 shrink-0 rounded-chip border border-rule bg-surface select-none touch-none cursor-ns-resize focus:outline-none focus:ring-1 focus:ring-board"
        >
          <span
            aria-hidden
            className="absolute left-[1px] right-[1px] rounded-chip bg-board transition-[top] duration-[120ms] ease-out"
            style={{ top: `${active * sectionHeight}%`, height: `${sectionHeight}%` }}
          />
        </div>

        <div className="flex-1 min-w-0 border border-rule rounded-[6px] bg-surface divide-y divide-rule max-h-[19rem] overflow-y-auto">
          {sections.map((objective, i) => (
            <button
              key={objective.code}
              type="button"
              onClick={() => onPick(objective)}
              onMouseEnter={() => setSectionIndex(i)}
              className={`w-full grid grid-cols-[40px_1fr_auto_auto_16px] items-center gap-4 px-4 py-2.5 text-left transition-colors duration-[120ms] ease-out ${
                i === active ? 'bg-board-tint' : 'hover:bg-paper'
              }`}
            >
              <span className="font-mono text-[12px] text-ink">{objective.code}</span>
              <span className="text-[14px] text-ink truncate">{objective.name}</span>
              {renderMastery ? renderMastery(objective) : <span />}
              <span className="font-mono text-[12px] text-ink-muted border border-rule rounded-chip px-1.5 py-0.5">
                {objective.ref}
              </span>
              <ChevronRight size={14} className="text-ink-muted" />
            </button>
          ))}
        </div>
      </div>

      <p className="text-center font-mono text-[12px] text-ink-muted mt-2">
        {focused
          ? `Unit ${unit.key} · focused teaching · ${sections.length} ${
              sections.length === 1 ? 'objective' : 'objectives'
            }`
          : `All units · ${objectives.length} objectives · slide right to focus one unit`}
      </p>
    </div>
  )
}
