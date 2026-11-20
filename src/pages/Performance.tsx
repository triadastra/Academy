// Performance — route /course/performance.
//
// The student's own grade book across every course they take: current and
// projected grades, weighted and unweighted GPA, the score they need on what
// is left, and a knowledge-over-time chart per course with two futures drawn
// on it — keep to your study plan, or stop practising and forget. Syno (the
// Moonshot model, through lib/performance-coach.ts) reads the same numbers
// and writes a prioritised week.
//
// All arithmetic is in lib/performance-model.ts; this file only gathers
// inputs, lays them out and writes edits back through database/performance.ts.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BookOpenCheck,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock3,
  GraduationCap,
  LoaderCircle,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, PageNotice, Toast } from '@/components/Page'
import MarkdownText from '@/components/MarkdownText'
import { getActiveCourse, getAvailableCourses, setActiveCourse, type ActiveCourse } from '@/lib/course-selection'
import { getSettings, subscribeDatabase, updateSettings } from '@/database/client'
import { findCatalogCourses } from '@/data/course-catalog'
import { getPersonalWorkspace, isPersonalCourseId, RIGOR_BOOST } from '@/database/personal'
import {
  activityFor,
  courseSettings,
  deleteAssessment,
  deleteFluency,
  deleteStudySession,
  fluencyBand,
  fluencyFor,
  recordFluency,
  getPerformance,
  loadSampleTerm,
  logStudySession,
  saveAssessment,
  saveCoachReview,
  updateCourseSettings,
} from '@/database/performance'
import type { PerformanceAssessment, PerformanceCourseSettings } from '@/database/types'
import {
  computeGpa,
  dateOf,
  dayIndex,
  knowledgeOn,
  letterFor,
  localDate,
  percent,
  projectKnowledge,
  recentMinutesPerWeek,
  summariseGrade,
  type GradeSummary,
  type Projection,
} from '@/lib/performance-model'
import { coachErrorMessage, reviewPerformance, type CoachInput } from '@/lib/performance-coach'
import { useToast } from '@/hooks/use-toast'

// Categorical slots, in fixed order (validated set: see the dataviz palette).
// A course keeps its colour by its position in the course list, so filtering
// the chart never repaints the survivors.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const STOP_COLOR = '#8A918E'
const GRID = '#E4E8E6'
const HORIZON = 60
const HISTORY = 90
const CATEGORIES = ['Test', 'Quiz', 'Exam', 'Homework', 'Project', 'Lab', 'Essay', 'Other']

const fmtPct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${value.toFixed(digits)}%`
const fmtGpa = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toFixed(2)
const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

function defaultBoost(course: ActiveCourse): number {
  if (isPersonalCourseId(course.id)) {
    const personal = getPersonalWorkspace().courses.find((item) => item.id === course.id)
    return personal ? RIGOR_BOOST[personal.rigor] : 0
  }
  const catalog = findCatalogCourses([course.id])[0]
  if (catalog && catalog.pathway !== 'HS') return 1
  const level = getSettings().courseLevels?.[course.id]
  return level === 'H' || level === 'H+' ? 0.5 : 0
}

interface CourseView {
  course: ActiveCourse
  color: string
  settings: PerformanceCourseSettings
  assessments: PerformanceAssessment[]
  projection: Projection
  grade: GradeSummary
  recentPace: number
  plannedPace: number
  activity: ReturnType<typeof activityFor>
}

function buildViews(courses: ActiveCourse[], today: string): CourseView[] {
  const record = getPerformance()
  return courses.map((course, index) => {
    const boost = defaultBoost(course)
    const settings = courseSettings(course.id, boost)
    const activity = activityFor(course.id)
    const recentPace = recentMinutesPerWeek(activity.events, today)
    const plannedPace = settings.plannedMinutesPerWeek ?? Math.round(recentPace / 15) * 15
    const projection = projectKnowledge(activity.events, today, {
      minutesPerWeek: plannedPace,
      horizonDays: HORIZON,
      historyDays: HISTORY,
    })
    const assessments = record.assessments
      .filter((item) => item.courseId === course.id)
      .sort((a, b) => a.date.localeCompare(b.date))
    const grade = summariseGrade(assessments, settings.target, (date) => {
      const knowledge = knowledgeOn(projection, date)
      if (knowledge === null) return null
      // Knowledge alone overstates a strong student's drop and understates a
      // weak one's; anchoring half on the grade so far keeps it honest.
      const graded = assessments.filter((item) => item.score !== null && item.weight > 0)
      if (graded.length === 0) return knowledge
      const soFar =
        graded.reduce((sum, item) => sum + item.weight * percent(item.score!, item.total), 0) /
        graded.reduce((sum, item) => sum + item.weight, 0)
      return 0.5 * soFar + 0.5 * knowledge
    })
    return {
      course,
      color: SERIES[index] ?? STOP_COLOR,
      settings,
      assessments,
      projection,
      grade,
      recentPace,
      plannedPace,
      activity,
    }
  })
}

export default function Performance() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setTick((value) => value + 1)), [])
  const today = localDate()
  const courses = useMemo(() => getAvailableCourses().filter((course) => course.id), [tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const views = useMemo(() => buildViews(courses, today), [courses, today, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  const [focusId, setFocusId] = useState<string>(() => getActiveCourse().id || 'all')
  const focus = views.find((view) => view.course.id === focusId) ?? null
  const { toast, notice, show, fail } = useToast()

  const gpaNow = computeGpa(views.map((view) => ({ pct: view.grade.current, credits: view.settings.credits, boost: view.settings.gpaBoost })))
  const gpaProjected = computeGpa(views.map((view) => ({ pct: view.grade.projected, credits: view.settings.credits, boost: view.settings.gpaBoost })))
  const record = getPerformance()
  const weekStart = dayIndex(today) - 6
  const minutesThisWeek =
    record.sessions.filter((session) => dayIndex(session.date) >= weekStart).reduce((sum, session) => sum + session.minutes, 0) +
    views.reduce(
      (sum, view) => sum + view.activity.practice.filter((day) => dayIndex(day.date) >= weekStart).reduce((total, day) => total + day.answered * 3, 0),
      0,
    )
  const practice30 = views.flatMap((view) => view.activity.practice.filter((day) => dayIndex(day.date) > dayIndex(today) - 30))
  const answered30 = practice30.reduce((sum, day) => sum + day.answered, 0)
  const correct30 = practice30.reduce((sum, day) => sum + day.correct, 0)
  const empty = record.assessments.length === 0 && record.sessions.length === 0 && views.every((view) => view.activity.events.length === 0)

  if (courses.length === 0) {
    return (
      <CourseShell role="student" active="performance">
        <Page>
          <PageBody measure="reading">
            <div className="rounded-card border border-rule bg-surface p-8 text-center">
              <h2 className="font-serif text-[22px] text-ink">No courses to track yet</h2>
              <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">
                Performance follows the courses you take. Add one first, then come back to log scores and study time.
              </p>
              <PageAction variant="primary" className="mt-5" onClick={() => navigate('/courses')}>
                <Plus size={15} /> Add a course
              </PageAction>
            </div>
          </PageBody>
        </Page>
      </CourseShell>
    )
  }

  return (
    <CourseShell role="student" active="performance">
      <Page>
        <PageBar
          context={`${views.length} course${views.length === 1 ? '' : 's'} · ${record.assessments.filter((item) => item.score !== null).length} graded · ${record.sessions.length} study sessions`}
        >
          {empty ? (
            <PageAction
              onClick={() => {
                loadSampleTerm(views.map((view) => view.course.id), today)
                show('Sample term loaded — edit or delete any of it.')
              }}
            >
              Load a sample term
            </PageAction>
          ) : null}
        </PageBar>
        <PageBody measure="wide">
          {notice ? <PageNotice className="mb-4">{notice}</PageNotice> : null}

          <section aria-label="Summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="GPA (weighted)"
              icon={<GraduationCap size={17} className="text-board" />}
              value={fmtGpa(gpaNow.weighted)}
              sub={`Unweighted ${fmtGpa(gpaNow.unweighted)} · ${gpaNow.credits} credit${gpaNow.credits === 1 ? '' : 's'}`}
            />
            <StatTile
              label="Projected end of term"
              icon={<TrendingUp size={17} className="text-board" />}
              value={fmtGpa(gpaProjected.weighted)}
              sub={
                gpaProjected.weighted !== null && gpaNow.weighted !== null
                  ? `${gpaProjected.weighted >= gpaNow.weighted ? '+' : '−'}${Math.abs(gpaProjected.weighted - gpaNow.weighted).toFixed(2)} if you keep your plan`
                  : 'Add upcoming assessments to project'
              }
            />
            <StatTile
              label="Studied, last 7 days"
              icon={<Clock3 size={17} className="text-board" />}
              value={`${(minutesThisWeek / 60).toFixed(1)} h`}
              sub={`${Math.round(minutesThisWeek)} min logged or practised`}
            />
            <StatTile
              label="Practice accuracy, 30 days"
              icon={<BookOpenCheck size={17} className="text-board" />}
              value={answered30 ? `${Math.round((correct30 / answered30) * 100)}%` : '—'}
              sub={answered30 ? `${correct30} of ${answered30} questions correct` : 'Answer questions in the Question Base'}
            />
          </section>

          <KnowledgeChart views={views} focusId={focusId} onFocus={setFocusId} today={today} />

          <GradeTable views={views} focusId={focusId} onFocus={setFocusId} />

          {focus ? (
            <CourseDetail key={focus.course.id} view={focus} today={today} onSaved={show} onError={fail} />
          ) : (
            <p className="mt-4 text-[13px] text-ink-muted">Choose a course above to edit its assessments, study log and plan.</p>
          )}

          <CoachPanel views={views} gpaNow={gpaNow} gpaProjected={gpaProjected.weighted} today={today} saved={record.coach} />

          <HowItWorks />
        </PageBody>
        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </CourseShell>
  )
}

function StatTile({ label, icon, value, sub }: { label: string; icon: ReactNode; value: string; sub: string }) {
  return (
    <div className="rounded-card border border-rule bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink-muted">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-serif text-[34px] leading-none text-ink tabular-nums">{value}</div>
      <p className="mt-3 text-[12px] text-ink-muted">{sub}</p>
    </div>
  )
}

// ── Chart ──────────────────────────────────────────────────────────────────

type Row = Record<string, number | undefined> & { t: number }

function KnowledgeChart({
  views,
  focusId,
  onFocus,
  today,
}: {
  views: CourseView[]
  focusId: string
  onFocus: (id: string) => void
  today: string
}) {
  const todayT = dayIndex(today)
  const single = views.find((view) => view.course.id === focusId) ?? null
  const shown = single ? [single] : views.slice(0, SERIES.length)
  const withData = shown.filter((view) => view.projection.history.length > 0)

  const rows = useMemo(() => {
    const byT = new Map<number, Row>()
    const at = (date: string) => {
      const t = dayIndex(date)
      let row = byT.get(t)
      if (!row) {
        row = { t }
        byT.set(t, row)
      }
      return row
    }
    for (const view of withData) {
      const id = view.course.id
      for (const point of view.projection.history) at(point.date)[`h:${id}`] = point.value
      // Start both futures on today's estimate so the lines join.
      if (view.projection.now !== null) {
        at(today)[`p:${id}`] = view.projection.now
        if (single) at(today)[`s:${id}`] = view.projection.now
      }
      for (const point of view.projection.plan) at(point.date)[`p:${id}`] = point.value
      if (single) {
        for (const point of view.projection.stop) at(point.date)[`s:${id}`] = point.value
        for (const item of view.assessments) {
          if (item.score === null || item.total <= 0 || dayIndex(item.date) < todayT - HISTORY) continue
          at(item.date)[`sc:${id}`] = percent(item.score, item.total)
        }
        for (const paper of view.activity.mockPapers) {
          if (dayIndex(paper.date) >= todayT - HISTORY) at(paper.date)[`sc:${id}`] = paper.pct
        }
      }
    }
    return [...byT.values()].sort((a, b) => a.t - b.t)
  }, [withData, single, today, todayT])

  const from = todayT - HISTORY
  const to = todayT + HORIZON
  const ticks: number[] = []
  for (let t = from; t <= to; t++) if (dateOf(t).endsWith('-01')) ticks.push(t)

  const labels: Record<string, string> = {}
  for (const view of withData) {
    const name = view.course.displayName
    labels[`h:${view.course.id}`] = single ? 'Knowledge (estimated)' : name
    labels[`p:${view.course.id}`] = single ? `With ${view.plannedPace} min/week` : `${name} · plan`
    labels[`s:${view.course.id}`] = 'If you stop'
    labels[`sc:${view.course.id}`] = 'Score'
  }

  const horizonPlan = single?.projection.plan.at(-1)?.value
  const horizonStop = single?.projection.stop.at(-1)?.value

  return (
    <section className="mt-6 rounded-card border border-rule bg-surface p-5" aria-label="Knowledge over time">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-[22px] text-ink">Knowledge over time</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Estimated from your scores and study, with {HORIZON} days projected forward.
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Course shown">
          {[{ id: 'all', name: 'All courses' }, ...views.map((view) => ({ id: view.course.id, name: view.course.code || view.course.displayName }))].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={focusId === option.id}
              onClick={() => onFocus(option.id)}
              className={
                focusId === option.id
                  ? 'rounded-control bg-board px-3 py-1.5 text-[12px] text-paper'
                  : 'rounded-control px-3 py-1.5 text-[12px] text-ink-muted hover:bg-paper hover:text-ink'
              }
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>

      {/* Legend: always present for 2+ series, so identity is never colour alone. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-muted">
        {single ? (
          <>
            <LegendItem color={single.color}>Estimated so far</LegendItem>
            <LegendItem color={single.color} dashed>
              If you study {single.plannedPace} min/week
            </LegendItem>
            <LegendItem color={STOP_COLOR} dashed>
              If you stop practising
            </LegendItem>
            <LegendItem color={single.color} dot>
              Scores
            </LegendItem>
          </>
        ) : (
          <>
            {withData.map((view) => (
              <LegendItem key={view.course.id} color={view.color}>
                {view.course.displayName}
              </LegendItem>
            ))}
            {withData.length ? <li className="text-ink-muted">Solid: so far · dashed: on your plan</li> : null}
          </>
        )}
      </ul>

      {withData.length === 0 ? (
        <div className="mt-4 flex h-[260px] items-center justify-center rounded-control border border-dashed border-rule text-center text-[13px] text-ink-muted">
          <p className="max-w-[42ch]">
            Nothing to plot yet. Log a score or a study session{single ? ` for ${single.course.displayName}` : ''} below and the curve starts from there.
          </p>
        </div>
      ) : (
        <div className="mt-3 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={[from, to]}
                ticks={ticks}
                tickFormatter={(t: number) => new Date(t * 86_400_000).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}
                tick={{ fontSize: 11, fill: '#5A6461' }}
                axisLine={{ stroke: '#D6DCD9' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: '#5A6461' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <ReferenceLine
                x={todayT}
                stroke="#5A6461"
                strokeWidth={1}
                label={{ value: 'Today', position: 'insideTopLeft', fill: '#5A6461', fontSize: 11 }}
              />
              <Tooltip
                content={<ChartTooltip labels={labels} colors={Object.fromEntries(withData.map((view) => [view.course.id, view.color]))} />}
                cursor={{ stroke: '#5A6461', strokeWidth: 1 }}
                isAnimationActive={false}
              />
              {withData.map((view) => (
                <Line
                  key={`h:${view.course.id}`}
                  dataKey={`h:${view.course.id}`}
                  stroke={view.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#FBFCFB', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                  type="monotone"
                />
              ))}
              {withData.map((view) => (
                <Line
                  key={`p:${view.course.id}`}
                  dataKey={`p:${view.course.id}`}
                  stroke={view.color}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#FBFCFB', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                  type="monotone"
                />
              ))}
              {single ? (
                <Line
                  dataKey={`s:${single.course.id}`}
                  stroke={STOP_COLOR}
                  strokeWidth={2}
                  strokeDasharray="2 4"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#FBFCFB', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                  type="monotone"
                />
              ) : null}
              {single ? (
                <Scatter
                  dataKey={`sc:${single.course.id}`}
                  fill={single.color}
                  stroke="#FBFCFB"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {single && single.projection.now !== null && horizonPlan !== undefined && horizonStop !== undefined ? (
        <p className="mt-3 text-[13px] text-ink">
          Now <strong className="font-medium tabular-nums">{single.projection.now.toFixed(0)}</strong>. In {HORIZON} days:{' '}
          <strong className="font-medium tabular-nums">{horizonPlan.toFixed(0)}</strong> on your plan,{' '}
          <strong className="font-medium tabular-nums">{horizonStop.toFixed(0)}</strong> if you stop
          {single.projection.daysSinceReview !== null && single.projection.daysSinceReview > 6
            ? ` — and it has already been ${single.projection.daysSinceReview} days since you last touched it.`
            : '.'}
        </p>
      ) : null}
    </section>
  )
}

function LegendItem({ color, dashed, dot, children }: { color: string; dashed?: boolean; dot?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {dot ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      ) : (
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dashed ? (color === STOP_COLOR ? '2 3' : '5 3') : undefined} />
        </svg>
      )}
      <span className="text-ink">{children}</span>
    </li>
  )
}

function ChartTooltip({
  active,
  payload,
  labels,
  colors,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number; payload?: Row }>
  labels: Record<string, string>
  colors: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  const t = payload[0]?.payload?.t
  const entries = payload.filter((entry) => typeof entry.value === 'number' && typeof entry.dataKey === 'string')
  // A course's "plan" value on today duplicates its history value; show one.
  const seen = new Set<string>()
  return (
    <div className="rounded-control border border-rule bg-surface px-3 py-2 text-[12px] shadow-sm">
      {t !== undefined ? <div className="mb-1 font-mono text-[11px] text-ink-muted">{shortDate(dateOf(t))}</div> : null}
      {entries.map((entry) => {
        const key = String(entry.dataKey)
        const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
        const dedupe = `${id}:${entry.value?.toFixed(1)}`
        if ((kind === 'p' || kind === 's') && seen.has(dedupe)) return null
        seen.add(dedupe)
        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: kind === 's' ? STOP_COLOR : colors[id] }} />
              {labels[key] ?? key}
            </span>
            <span className="tabular-nums text-ink">{entry.value!.toFixed(0)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Grade table ────────────────────────────────────────────────────────────

function GradeTable({ views, focusId, onFocus }: { views: CourseView[]; focusId: string; onFocus: (id: string) => void }) {
  return (
    <section className="mt-6 overflow-hidden rounded-card border border-rule bg-surface" aria-label="Grades by course">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="border-b border-rule bg-paper/60 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-normal">Course</th>
              <th className="px-3 py-2.5 font-normal text-right">Credits</th>
              <th className="px-3 py-2.5 font-normal text-right">Current</th>
              <th className="px-3 py-2.5 font-normal">Grade</th>
              <th className="px-3 py-2.5 font-normal text-right">Projected</th>
              <th className="px-3 py-2.5 font-normal text-right">Target</th>
              <th className="px-3 py-2.5 font-normal text-right">Need on rest</th>
              <th className="px-3 py-2.5 font-normal text-right">Knowledge</th>
              <th className="px-4 py-2.5 font-normal text-right">Last studied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {views.map((view) => {
              const { grade, settings, projection } = view
              const needed = grade.needed
              const selected = view.course.id === focusId
              return (
                <tr
                  key={view.course.id}
                  onClick={() => onFocus(view.course.id)}
                  className={`cursor-pointer ${selected ? 'bg-board-tint/50' : 'hover:bg-paper/60'}`}
                  aria-selected={selected}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: view.color }} aria-hidden="true" />
                      <span className="font-medium text-ink">{view.course.displayName}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{settings.credits}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPct(grade.current)}</td>
                  <td className="px-3 py-3">{grade.current !== null ? letterFor(grade.current).letter : '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fmtPct(grade.projected)}
                    {grade.projected !== null ? <span className="ml-1 text-ink-muted">{letterFor(grade.projected).letter}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{settings.target}%</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${needed !== null && needed > 100 ? 'text-mark' : ''}`}>
                    {needed === null ? '—' : needed > 100 ? `${needed.toFixed(0)}% ✕` : needed <= 0 ? 'Secured ✓' : `${needed.toFixed(0)}%`}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{projection.now === null ? '—' : projection.now.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-ink-muted">
                    {projection.daysSinceReview === null ? '—' : projection.daysSinceReview === 0 ? 'Today' : `${projection.daysSinceReview} d ago`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Course detail ──────────────────────────────────────────────────────────

const input =
  'w-full rounded-control border border-rule bg-surface px-2.5 py-1.5 text-[13px] text-ink focus:border-board focus:outline-none'

function CourseDetail({
  view,
  today,
  onSaved,
  onError,
}: {
  view: CourseView
  today: string
  onSaved: (message: string) => void
  onError: (message: string) => void
}) {
  const { course, settings } = view
  const boost = settings.gpaBoost
  const sessions = getPerformance()
    .sessions.filter((session) => session.courseId === course.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const practice30 = view.activity.practice.filter((day) => dayIndex(day.date) > dayIndex(today) - 30)

  const [draft, setDraft] = useState({ title: '', category: 'Test', date: today, weight: '10', score: '', total: '100' })
  const [study, setStudy] = useState({ date: today, minutes: '45', note: '' })

  function addAssessment() {
    const weight = Number(draft.weight)
    const total = Number(draft.total)
    const score = draft.score.trim() === '' ? null : Number(draft.score)
    if (!draft.title.trim()) return onError('Give the assessment a name.')
    if (!(weight >= 0 && weight <= 100)) return onError('Weight is a share of the final grade, 0–100%.')
    if (!(total > 0)) return onError('Out of must be more than zero.')
    if (score !== null && !(score >= 0)) return onError('Score cannot be negative.')
    saveAssessment({ courseId: course.id, title: draft.title.trim(), category: draft.category, date: draft.date, weight, score, total })
    setDraft({ ...draft, title: '', score: '' })
    onSaved(score === null ? 'Upcoming assessment added.' : 'Score saved.')
  }

  function addStudy() {
    const minutes = Number(study.minutes)
    if (!(minutes > 0 && minutes <= 720)) return onError('Minutes should be between 1 and 720.')
    logStudySession({ courseId: course.id, date: study.date, minutes, note: study.note.trim() || undefined })
    setStudy({ ...study, note: '' })
    onSaved('Study session logged.')
  }

  return (
    <section className="mt-6 rounded-card border border-rule bg-surface" aria-label={`${course.displayName} details`}>
      <div className="flex flex-col gap-1 border-b border-rule px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-[22px] text-ink">{course.displayName}</h2>
        <p className="text-[12px] text-ink-muted">
          {Math.round(view.grade.completed * 100)}% of the grade is in · {view.grade.remainingWeight}% still to come
        </p>
      </div>

      <div className="grid gap-4 border-b border-rule px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberSetting
          label="Credits"
          value={settings.credits}
          min={0}
          max={10}
          step={0.5}
          onCommit={(value) => updateCourseSettings(course.id, { credits: value }, boost)}
        />
        <label className="grid gap-1 text-[12px] text-ink-muted">
          GPA boost
          <select
            className={input}
            value={String(settings.gpaBoost)}
            onChange={(event) => updateCourseSettings(course.id, { gpaBoost: Number(event.target.value) }, boost)}
          >
            <option value="0">None (regular)</option>
            <option value="0.5">+0.5 (honors)</option>
            <option value="1">+1.0 (AP / IB)</option>
          </select>
        </label>
        <NumberSetting
          label="Target grade (%)"
          value={settings.target}
          min={0}
          max={100}
          step={1}
          onCommit={(value) => updateCourseSettings(course.id, { target: value }, boost)}
        />
        <label className="grid gap-1 text-[12px] text-ink-muted">
          <span>
            Study plan: <span className="text-ink tabular-nums">{view.plannedPace} min/week</span>
            <span className="ml-1">(now ~{Math.round(view.recentPace)})</span>
          </span>
          <input
            type="range"
            min={0}
            max={600}
            step={15}
            value={view.plannedPace}
            onChange={(event) => updateCourseSettings(course.id, { plannedMinutesPerWeek: Number(event.target.value) }, boost)}
            className="accent-[#2F5D50]"
            aria-label="Planned study minutes per week"
          />
        </label>
      </div>

      <FluencyPanel courseId={course.id} onError={onError} />

      {/* Assessments */}
      <div className="border-t border-rule px-5 py-4">
        <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <Target size={15} className="text-board" /> Assessments
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <tr>
                <th className="py-1.5 pr-3 font-normal">Date</th>
                <th className="py-1.5 pr-3 font-normal">Name</th>
                <th className="py-1.5 pr-3 font-normal">Type</th>
                <th className="py-1.5 pr-3 font-normal text-right">Weight</th>
                <th className="py-1.5 pr-3 font-normal text-right">Score</th>
                <th className="py-1.5 pr-3 font-normal text-right">%</th>
                <th className="py-1.5 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {view.assessments.map((item) => (
                <AssessmentRow key={item.id} item={item} />
              ))}
              {view.activity.mockPapers.map((paper) => (
                <tr key={paper.id} className="text-ink-muted">
                  <td className="py-2 pr-3 tabular-nums">{shortDate(paper.date)}</td>
                  <td className="py-2 pr-3">{paper.title}</td>
                  <td className="py-2 pr-3">Mock test</td>
                  <td className="py-2 pr-3 text-right">not graded</td>
                  <td className="py-2 pr-3 text-right">from app</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{paper.pct.toFixed(0)}%</td>
                  <td />
                </tr>
              ))}
              {view.assessments.length === 0 && view.activity.mockPapers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-ink-muted">
                    No assessments yet. Add past results and anything still coming up.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-2 rounded-control border border-dashed border-rule p-3 sm:grid-cols-[1.6fr_1fr_1fr_0.7fr_0.7fr_0.7fr_auto] sm:items-end">
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Name
            <input className={input} value={draft.title} placeholder="Unit test 4" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Type
            <select className={input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Date
            <input type="date" className={input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Weight %
            <input inputMode="decimal" className={input} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Score
            <input inputMode="decimal" className={input} value={draft.score} placeholder="upcoming" onChange={(e) => setDraft({ ...draft, score: e.target.value })} />
          </label>
          <label className="grid gap-1 text-[11px] text-ink-muted">
            Out of
            <input inputMode="decimal" className={input} value={draft.total} onChange={(e) => setDraft({ ...draft, total: e.target.value })} />
          </label>
          <PageAction variant="primary" onClick={addAssessment}>
            <Plus size={14} /> Add
          </PageAction>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Leave the score blank for something still to come — it is filled with a projected score until you enter the real one.
        </p>
      </div>

      {/* Study */}
      <div className="grid gap-6 border-t border-rule px-5 py-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <Clock3 size={15} className="text-board" /> Study log
          </h3>
          <div className="mt-3 grid grid-cols-[1fr_0.6fr_1.4fr_auto] items-end gap-2">
            <label className="grid gap-1 text-[11px] text-ink-muted">
              Date
              <input type="date" className={input} value={study.date} onChange={(e) => setStudy({ ...study, date: e.target.value })} />
            </label>
            <label className="grid gap-1 text-[11px] text-ink-muted">
              Minutes
              <input inputMode="numeric" className={input} value={study.minutes} onChange={(e) => setStudy({ ...study, minutes: e.target.value })} />
            </label>
            <label className="grid gap-1 text-[11px] text-ink-muted">
              What you did
              <input className={input} value={study.note} placeholder="optional" onChange={(e) => setStudy({ ...study, note: e.target.value })} />
            </label>
            <PageAction variant="primary" onClick={addStudy}>
              Log
            </PageAction>
          </div>
          <ul className="mt-3 divide-y divide-rule text-[13px]">
            {sessions.slice(0, 8).map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="tabular-nums text-ink-muted">{shortDate(session.date)}</span>
                <span className="flex-1 truncate text-ink">{session.note ?? 'Study'}</span>
                <span className="tabular-nums text-ink">{session.minutes} min</span>
                <button
                  type="button"
                  aria-label="Delete study session"
                  onClick={() => deleteStudySession(session.id)}
                  className="text-ink-muted hover:text-mark"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {sessions.length === 0 ? <li className="py-2 text-ink-muted">No study logged yet.</li> : null}
            {sessions.length > 8 ? <li className="py-1.5 text-[12px] text-ink-muted">and {sessions.length - 8} earlier</li> : null}
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <BookOpenCheck size={15} className="text-board" /> Practice in the app
          </h3>
          {practice30.length ? (
            <p className="mt-3 text-[13px] text-ink">
              {practice30.reduce((sum, day) => sum + day.answered, 0)} questions over {practice30.length} day
              {practice30.length === 1 ? '' : 's'} in the last 30 days,{' '}
              {Math.round(
                (practice30.reduce((sum, day) => sum + day.correct, 0) / practice30.reduce((sum, day) => sum + day.answered, 0)) * 100,
              )}
              % correct. Counted as study (about 3 minutes each) and as light evidence of what you know.
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-ink-muted">
              Questions you answer in this course are picked up here automatically, along with graded mock papers.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function NumberSetting({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <label className="grid gap-1 text-[12px] text-ink-muted">
      {label}
      <input
        type="number"
        className={input}
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = Number(text)
          if (Number.isFinite(next) && next >= min && next <= max) onCommit(next)
          else setText(String(value))
        }}
      />
    </label>
  )
}

function AssessmentRow({ item }: { item: PerformanceAssessment }) {
  const [score, setScore] = useState(item.score === null ? '' : String(item.score))
  const [weight, setWeight] = useState(String(item.weight))
  useEffect(() => setScore(item.score === null ? '' : String(item.score)), [item.score])
  useEffect(() => setWeight(String(item.weight)), [item.weight])
  const commit = () => {
    const nextScore = score.trim() === '' ? null : Number(score)
    const nextWeight = Number(weight)
    if ((nextScore !== null && !(nextScore >= 0)) || !(nextWeight >= 0 && nextWeight <= 100)) {
      setScore(item.score === null ? '' : String(item.score))
      setWeight(String(item.weight))
      return
    }
    if (nextScore !== item.score || nextWeight !== item.weight) saveAssessment({ ...item, score: nextScore, weight: nextWeight })
  }
  const upcoming = item.score === null
  return (
    <tr>
      <td className="py-1.5 pr-3 tabular-nums text-ink-muted">{shortDate(item.date)}</td>
      <td className="py-1.5 pr-3 text-ink">
        {item.title}
        {upcoming ? <span className="ml-2 rounded-chip bg-board-tint px-1.5 py-0.5 text-[10px] text-board-deep">upcoming</span> : null}
      </td>
      <td className="py-1.5 pr-3 text-ink-muted">{item.category}</td>
      <td className="py-1.5 pr-3 text-right">
        <input
          aria-label={`Weight of ${item.title}`}
          inputMode="decimal"
          className="w-14 rounded-control border border-transparent bg-transparent px-1 py-0.5 text-right tabular-nums hover:border-rule focus:border-board focus:outline-none"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={commit}
        />
        %
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">
        <input
          aria-label={`Score for ${item.title}`}
          inputMode="decimal"
          placeholder="—"
          className="w-14 rounded-control border border-transparent bg-transparent px-1 py-0.5 text-right tabular-nums hover:border-rule focus:border-board focus:outline-none"
          value={score}
          onChange={(event) => setScore(event.target.value)}
          onBlur={commit}
        />
        <span className="text-ink-muted"> / {item.total}</span>
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{upcoming ? '—' : `${percent(item.score!, item.total).toFixed(0)}%`}</td>
      <td className="py-1.5 text-right">
        <button type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteAssessment(item.id)} className="text-ink-muted hover:text-mark">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ── Fluency ────────────────────────────────────────────────────────────────

const BAND_STYLE = {
  Strong: { icon: <CircleCheck size={13} />, chip: 'bg-board-tint text-board-deep', bar: 'bg-board' },
  Developing: { icon: <CircleDot size={13} />, chip: 'bg-[#EEE8D8] text-[#765F25]', bar: 'bg-[#B08A2E]' },
  Weak: { icon: <CircleAlert size={13} />, chip: 'bg-mark-tint text-mark', bar: 'bg-mark' },
} as const

function FluencyPanel({ courseId, onError }: { courseId: string; onError: (message: string) => void }) {
  const navigate = useNavigate()
  const ratings = fluencyFor(courseId)
  const [topic, setTopic] = useState('')
  const [score, setScore] = useState('70')

  function askSyno() {
    setActiveCourse(courseId)
    updateSettings({
      pendingChatPrompt:
        'Look at my performance in this course and what I have shown you. What am I mastering, and what am I weak at? Update my fluency on the dashboard.',
    })
    navigate('/course/chat')
  }

  function addManual() {
    const value = Number(score)
    if (!topic.trim()) return onError('Name the topic you are rating.')
    if (!(value >= 0 && value <= 100)) return onError('Fluency is 0–100.')
    recordFluency(courseId, [{ topic, score: value, evidence: 'Self-assessed' }], 'manual')
    setTopic('')
  }

  return (
    <div className="px-5 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <Sparkles size={15} className="text-board" /> Fluency by topic
        </h3>
        <PageAction onClick={askSyno}>
          <MessageSquare size={14} /> Ask Syno what I’m good at
        </PageAction>
      </div>
      {ratings.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          No ratings yet. Chat with Syno about this course — when it checks your understanding or you ask what you are
          good at, it records fluency per topic here, and those ratings nudge your knowledge curve.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {ratings.map((rating) => {
            const band = fluencyBand(rating.score)
            const style = BAND_STYLE[band]
            return (
              <li key={rating.id} className="rounded-control border border-rule p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {rating.noteCode ? <span className="mr-1.5 font-mono text-[11px] text-ink-muted">{rating.noteCode}</span> : null}
                      {rating.topic}
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">
                      {rating.source === 'chat' ? 'From chat with Syno' : 'Set by you'} ·{' '}
                      {new Date(rating.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-[11px] ${style.chip}`}>
                      {style.icon} {band}
                    </span>
                    <span className="w-7 text-right text-[13px] tabular-nums text-ink">{rating.score}</span>
                    <button
                      type="button"
                      aria-label={`Remove rating for ${rating.topic}`}
                      onClick={() => deleteFluency(rating.id)}
                      className="text-ink-muted hover:text-mark"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-chip bg-rule">
                  <div className={`h-full ${style.bar}`} style={{ width: `${rating.score}%` }} />
                </div>
                {rating.evidence ? <p className="mt-2 text-[12px] leading-snug text-ink-muted">{rating.evidence}</p> : null}
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="grid min-w-[200px] flex-1 gap-1 text-[11px] text-ink-muted">
          Rate a topic yourself
          <input className={input} value={topic} placeholder="e.g. Integration by parts" onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className="grid w-20 gap-1 text-[11px] text-ink-muted">
          0–100
          <input inputMode="numeric" className={input} value={score} onChange={(e) => setScore(e.target.value)} />
        </label>
        <PageAction onClick={addManual}>Save</PageAction>
      </div>
    </div>
  )
}

// ── Coach ──────────────────────────────────────────────────────────────────

function CoachPanel({
  views,
  gpaNow,
  gpaProjected,
  today,
  saved,
}: {
  views: CourseView[]
  gpaNow: { weighted: number | null; unweighted: number | null }
  gpaProjected: number | null
  today: string
  saved?: { at: string; text: string }
}) {
  const [text, setText] = useState(saved?.text ?? '')
  const [state, setState] = useState<'idle' | 'thinking' | 'writing'>('idle')
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  async function run() {
    setError('')
    setState('thinking')
    setText('')
    abort.current = new AbortController()
    const in30 = dateOf(dayIndex(today) + 30)
    const payload: CoachInput = {
      today,
      gpa: { weighted: round(gpaNow.weighted, 2), unweighted: round(gpaNow.unweighted, 2), projectedWeighted: round(gpaProjected, 2) },
      courses: views.map((view) => ({
        name: view.course.displayName,
        currentPct: round(view.grade.current),
        projectedPct: round(view.grade.projected),
        targetPct: view.settings.target,
        neededOnRemainingPct: round(view.grade.needed),
        remainingWeightPct: view.grade.remainingWeight,
        knowledgeNow: round(view.projection.now),
        knowledgeIn30DaysIfPlan: round(view.projection.plan.find((point) => point.date === in30)?.value ?? null),
        knowledgeIn30DaysIfStop: round(view.projection.stop.find((point) => point.date === in30)?.value ?? null),
        daysSinceLastReview: view.projection.daysSinceReview,
        recentMinutesPerWeek: Math.round(view.recentPace),
        plannedMinutesPerWeek: view.plannedPace,
        upcoming: view.assessments
          .filter((item) => item.score === null)
          .map((item) => ({ title: item.title, date: item.date, weightPct: item.weight })),
        recentScores: view.assessments
          .filter((item) => item.score !== null)
          .slice(-5)
          .map((item) => ({ title: item.title, date: item.date, pct: Math.round(percent(item.score!, item.total)) })),
      })),
    }
    try {
      const full = await reviewPerformance(payload, {
        signal: abort.current.signal,
        onThinking: () => setState('thinking'),
        onToken: (partial) => {
          setState('writing')
          setText(partial)
        },
      })
      if (full.trim()) saveCoachReview(full)
      setText(full)
    } catch (caught) {
      if ((caught as Error)?.name !== 'AbortError') setError(coachErrorMessage(caught))
      setText(saved?.text ?? '')
    } finally {
      setState('idle')
    }
  }

  return (
    <section className="mt-6 rounded-card border border-board/25 bg-board-tint/40 p-5" aria-label="Syno's review">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-board text-paper">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-[17px] font-medium text-ink">Syno's read on your term</h2>
            <p className="text-[12px] text-ink-muted">
              {saved && state === 'idle' && !error
                ? `Last written ${new Date(saved.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                : 'Priorities and a 7-day plan from the numbers above.'}
            </p>
          </div>
        </div>
        <PageAction variant="primary" onClick={run} disabled={state !== 'idle'}>
          {state === 'idle' ? <Sparkles size={14} /> : <LoaderCircle size={14} className="animate-spin" />}
          {state === 'thinking' ? 'Thinking…' : state === 'writing' ? 'Writing…' : saved ? 'Refresh review' : 'Ask Syno'}
        </PageAction>
      </div>
      {error ? <PageNotice className="mt-4">{error}</PageNotice> : null}
      {text ? (
        <div className="mt-4 rounded-control border border-rule bg-surface p-4 text-[14px] leading-relaxed text-ink">
          <MarkdownText>{text}</MarkdownText>
        </div>
      ) : null}
    </section>
  )
}

function round(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function HowItWorks() {
  return (
    <details className="mt-6 mb-4 rounded-card border border-rule bg-surface px-5 py-4 text-[13px] leading-relaxed text-ink-muted">
      <summary className="cursor-pointer text-ink">How these numbers are worked out</summary>
      <div className="mt-3 grid gap-2">
        <p>
          <strong className="font-medium text-ink">Grades.</strong> Each assessment counts for its weight, as a share of
          the course grade. Current = weighted average of what is graded. Projected fills each upcoming item with a
          predicted score — half your grade so far, half your projected knowledge on its date. "Need on rest" is the
          average you need on everything still to come to land on your target.
        </p>
        <p>
          <strong className="font-medium text-ink">GPA.</strong> A 4.0 scale (A 93+, A− 90, B+ 87 … D− 60) weighted by
          credits. Weighted GPA adds each course's boost to any passing grade.
        </p>
        <p>
          <strong className="font-medium text-ink">Knowledge.</strong> A 0–100 estimate. Study lifts it (with
          diminishing returns inside one sitting), each score pulls it towards what you actually got, and between them it
          fades along a forgetting curve, R = 1 / (1 + t / 9S). Every review grows the stability S — most when you
          revisit something you had started to forget — so spaced practice decays slower. It is a model for comparing
          futures, not a measurement.
        </p>
      </div>
    </details>
  )
}
