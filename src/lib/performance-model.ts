// performance-model.ts — the arithmetic behind /course/performance.
//
// Pure functions only: no storage, no React, no dates read from the clock
// except where a caller passes `today`. That keeps every number on the page
// reproducible from its inputs, and lets scripts/test-performance.mjs check
// them without a browser.
//
// Three models live here.
//
//   1. GRADES. Each assessment is a share of the final grade (`weight`, in
//      percent). Graded ones give the current grade; upcoming ones are filled
//      with a predicted score to give the projected grade; and the score you
//      would need on the upcoming ones to reach a target is solved for.
//
//   2. GPA. A US 4.0 scale with plus/minus steps. Weighted GPA adds the
//      course's boost (Honors 0.5, AP/IB 1.0) to any passing grade.
//
//   3. KNOWLEDGE OVER TIME. A per-course "knowledge" index, 0–100, that rises
//      with study and with good results and decays between them along a
//      forgetting curve. Decay uses the power-law form from FSRS,
//          R(t) = (1 + t / (9·S))⁻¹,
//      where S is the memory's stability in days (R(S) = 0.9). Every review
//      raises S — more so when it comes after real forgetting — so a subject
//      practised steadily decays more slowly over time, which is the point of
//      spacing. It is a model, not a measurement: it is anchored to the scores
//      it is given and should be read as a direction, not a prediction to the
//      decimal.

export interface GradedItem {
  weight: number
  score: number | null
  total: number
  date: string
}

export interface GradeSummary {
  /** Weighted average of graded work, 0–100, or null with nothing graded. */
  current: number | null
  /** Current work plus predicted scores on what is still to come. */
  projected: number | null
  /** Score needed on every remaining item to land on `target`, or null. */
  needed: number | null
  /** Share of the course's total weight already graded, 0–1. */
  completed: number
  gradedWeight: number
  remainingWeight: number
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

export function percent(score: number, total: number) {
  return total > 0 ? (score / total) * 100 : 0
}

/**
 * @param predict score (0–100) expected on an upcoming item, by date.
 */
export function summariseGrade(
  items: GradedItem[],
  target: number,
  predict: (date: string) => number | null,
): GradeSummary {
  const weighted = items.filter((item) => item.weight > 0 && item.total > 0)
  const graded = weighted.filter((item) => item.score !== null)
  const upcoming = weighted.filter((item) => item.score === null)
  const gradedWeight = graded.reduce((sum, item) => sum + item.weight, 0)
  const remainingWeight = upcoming.reduce((sum, item) => sum + item.weight, 0)
  const earned = graded.reduce((sum, item) => sum + item.weight * percent(item.score!, item.total), 0)
  const current = gradedWeight > 0 ? earned / gradedWeight : null

  let projected: number | null = current
  if (remainingWeight > 0) {
    let expected = 0
    for (const item of upcoming) {
      const guess = predict(item.date) ?? current
      if (guess === null) {
        expected = NaN
        break
      }
      expected += item.weight * clamp(guess, 0, 100)
    }
    projected = Number.isNaN(expected) ? current : (earned + expected) / (gradedWeight + remainingWeight)
  }

  const needed =
    remainingWeight > 0 ? (target * (gradedWeight + remainingWeight) - earned) / remainingWeight : null

  return {
    current,
    projected,
    needed,
    completed: gradedWeight + remainingWeight > 0 ? gradedWeight / (gradedWeight + remainingWeight) : 0,
    gradedWeight,
    remainingWeight,
  }
}

// ── GPA ────────────────────────────────────────────────────────────────────

export const GRADE_SCALE: ReadonlyArray<{ min: number; letter: string; points: number }> = [
  { min: 93, letter: 'A', points: 4.0 },
  { min: 90, letter: 'A−', points: 3.7 },
  { min: 87, letter: 'B+', points: 3.3 },
  { min: 83, letter: 'B', points: 3.0 },
  { min: 80, letter: 'B−', points: 2.7 },
  { min: 77, letter: 'C+', points: 2.3 },
  { min: 73, letter: 'C', points: 2.0 },
  { min: 70, letter: 'C−', points: 1.7 },
  { min: 67, letter: 'D+', points: 1.3 },
  { min: 63, letter: 'D', points: 1.0 },
  { min: 60, letter: 'D−', points: 0.7 },
  { min: 0, letter: 'F', points: 0 },
]

export function letterFor(pct: number) {
  return GRADE_SCALE.find((step) => pct >= step.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]
}

export interface GpaInput {
  pct: number | null
  credits: number
  boost: number
}

export interface Gpa {
  unweighted: number | null
  weighted: number | null
  credits: number
}

export function computeGpa(courses: GpaInput[]): Gpa {
  const counted = courses.filter((course) => course.pct !== null && course.credits > 0)
  const credits = counted.reduce((sum, course) => sum + course.credits, 0)
  if (credits === 0) return { unweighted: null, weighted: null, credits: 0 }
  let unweighted = 0
  let weighted = 0
  for (const course of counted) {
    const points = letterFor(course.pct!).points
    unweighted += points * course.credits
    weighted += (points > 0 ? points + course.boost : 0) * course.credits
  }
  return { unweighted: unweighted / credits, weighted: weighted / credits, credits }
}

// ── Knowledge over time ────────────────────────────────────────────────────

export type KnowledgeEvent =
  | { kind: 'study'; date: string; minutes: number }
  | { kind: 'score'; date: string; pct: number; strength?: number }

export interface KnowledgePoint {
  date: string
  value: number
}

export interface Projection {
  history: KnowledgePoint[]
  /** Following `plannedMinutesPerWeek` from tomorrow. */
  plan: KnowledgePoint[]
  /** No further study at all. */
  stop: KnowledgePoint[]
  /** Today's estimate, or null when there is nothing to estimate from. */
  now: number | null
  /** Stability in days at the moment of the last review. */
  stability: number
  daysSinceReview: number | null
}

const DAY = 86_400_000
const INITIAL_STABILITY = 3
const MAX_STABILITY = 365

export function dayIndex(date: string) {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / DAY)
}

export function dateOf(index: number) {
  return new Date(index * DAY).toISOString().slice(0, 10)
}

/** FSRS-style retrievability after `elapsed` days at stability `stability`. */
export function retention(elapsed: number, stability: number) {
  return 1 / (1 + Math.max(0, elapsed) / (9 * stability))
}

interface MemoryState {
  /** Knowledge at the moment of the last review. */
  anchor: number
  anchorDay: number
  stability: number
}

/** Knowledge decays towards a floor: some of what you learned stays. */
function floorFor(anchor: number) {
  return Math.min(20, anchor * 0.25)
}

function valueAt(state: MemoryState, day: number) {
  const floor = floorFor(state.anchor)
  return floor + (state.anchor - floor) * retention(day - state.anchorDay, state.stability)
}

function applyEvent(state: MemoryState | null, event: KnowledgeEvent, day: number): MemoryState {
  if (!state) {
    // The first observation sets the starting level; a first study session
    // with nothing measured starts from a modest baseline.
    const start = event.kind === 'score' ? clamp(event.pct, 0, 100) : 35
    const fresh = { anchor: start, anchorDay: day, stability: INITIAL_STABILITY }
    return event.kind === 'study' ? applyEvent(fresh, event, day) : fresh
  }
  const now = valueAt(state, day)
  const recall = retention(day - state.anchorDay, state.stability)
  if (event.kind === 'study') {
    const minutes = Math.max(0, event.minutes)
    // Diminishing returns within a sitting: the first hour does most of it.
    const gain = 0.28 * (1 - Math.exp(-minutes / 60))
    const effort = Math.min(1, minutes / 30)
    const stability = clamp(
      state.stability * (1 + effort * (0.15 + 1.4 * (1 - recall))),
      INITIAL_STABILITY,
      MAX_STABILITY,
    )
    return { anchor: clamp(now + (100 - now) * gain, 0, 100), anchorDay: day, stability }
  }
  // A result is evidence: pull the estimate most of the way towards it.
  const strength = clamp(event.strength ?? 0.6, 0, 1)
  const anchor = now * (1 - strength) + clamp(event.pct, 0, 100) * strength
  const stability = clamp(
    state.stability * (1 + strength * (0.2 + 1.6 * (1 - recall))),
    INITIAL_STABILITY,
    MAX_STABILITY,
  )
  return { anchor, anchorDay: day, stability }
}

function simulate(events: KnowledgeEvent[], fromDay: number, toDay: number, start: MemoryState | null) {
  const byDay = new Map<number, KnowledgeEvent[]>()
  for (const event of events) {
    const day = dayIndex(event.date)
    const bucket = byDay.get(day)
    if (bucket) bucket.push(event)
    else byDay.set(day, [event])
  }
  let state = start
  const points: KnowledgePoint[] = []
  for (let day = fromDay; day <= toDay; day++) {
    // Study first, then results: a test taken after revising that day reflects
    // the revision.
    const today = (byDay.get(day) ?? []).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'study' ? -1 : 1))
    for (const event of today) state = applyEvent(state, event, day)
    if (state) points.push({ date: dateOf(day), value: valueAt(state, day) })
  }
  return { points, state }
}

/**
 * Evenly spread `minutesPerWeek` over the coming days, in sittings of about
 * 45 minutes (never fewer than one a week).
 */
export function planSessions(fromDay: number, horizon: number, minutesPerWeek: number): KnowledgeEvent[] {
  if (minutesPerWeek <= 0) return []
  const perWeek = clamp(Math.round(minutesPerWeek / 45), 1, 7)
  const gap = 7 / perWeek
  const minutes = minutesPerWeek / perWeek
  const events: KnowledgeEvent[] = []
  for (let offset = gap; offset <= horizon; offset += gap) {
    events.push({ kind: 'study', date: dateOf(fromDay + Math.round(offset)), minutes })
  }
  return events
}

export function projectKnowledge(
  events: KnowledgeEvent[],
  today: string,
  options: { minutesPerWeek: number; horizonDays?: number; historyDays?: number },
): Projection {
  const horizon = options.horizonDays ?? 60
  const todayIndex = dayIndex(today)
  const past = events.filter((event) => dayIndex(event.date) <= todayIndex)
  if (past.length === 0) {
    return { history: [], plan: [], stop: [], now: null, stability: INITIAL_STABILITY, daysSinceReview: null }
  }
  const first = Math.min(...past.map((event) => dayIndex(event.date)))
  const { points, state } = simulate(past, first, todayIndex, null)
  const historyFrom = todayIndex - (options.historyDays ?? 120)
  const history = points.filter((point) => dayIndex(point.date) >= historyFrom)
  const plan = simulate(planSessions(todayIndex, horizon, options.minutesPerWeek), todayIndex + 1, todayIndex + horizon, state).points
  const stop = simulate([], todayIndex + 1, todayIndex + horizon, state).points
  return {
    history,
    plan,
    stop,
    now: state ? valueAt(state, todayIndex) : null,
    stability: state?.stability ?? INITIAL_STABILITY,
    daysSinceReview: state ? todayIndex - state.anchorDay : null,
  }
}

/** Average weekly study minutes over the last `days` days. */
export function recentMinutesPerWeek(events: KnowledgeEvent[], today: string, days = 28) {
  const to = dayIndex(today)
  const minutes = events
    .filter((event): event is Extract<KnowledgeEvent, { kind: 'study' }> => event.kind === 'study')
    .filter((event) => {
      const day = dayIndex(event.date)
      return day > to - days && day <= to
    })
    .reduce((sum, event) => sum + event.minutes, 0)
  return (minutes / days) * 7
}

/** Projected knowledge on a future date, for filling in upcoming scores. */
export function knowledgeOn(projection: Projection, date: string): number | null {
  const hit = [...projection.history, ...projection.plan].find((point) => point.date === date)
  if (hit) return hit.value
  const last = projection.plan.at(-1) ?? projection.history.at(-1)
  return last ? last.value : null
}

/** Local `YYYY-MM-DD` for a Date, not its UTC day. */
export function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
