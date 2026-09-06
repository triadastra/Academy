// StudyPlan — route /course/plan — ref syn_p11.png
// Top bar "Synonance for SHSID", unit-tree rail, and a vertical timeline of
// day cards with 4-dot mastery mini-bars and board-green Open buttons.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBody, SidePanel } from '@/components/Page'
import { getActiveCourse } from '@/lib/course-selection'
import { subscribeDatabase } from '@/database/client'
import { topicsForCourse, type CourseTopic } from '@/lib/course-content'

interface Unit {
  n: string
  title: string
  subs?: { code: string; title: string; active?: boolean }[]
}

/**
 * The unit tree and the schedule below used to be a fixed IB Maths syllabus, so
 * CHINESE 9 was shown "Techniques of Integration" and told to revise partial
 * fractions. Both are built from the course's own notes now: a note is a topic,
 * its code's leading number is its unit.
 */
function unitsFor(topics: CourseTopic[], focusCode?: string): Unit[] {
  const byUnit = new Map<string, CourseTopic[]>()
  for (const topic of topics) {
    const n = /^\s*(\d+)/.exec(topic.code)?.[1] ?? '—'
    const bucket = byUnit.get(n)
    if (bucket) bucket.push(topic)
    else byUnit.set(n, [topic])
  }
  return [...byUnit.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([n, sections]) => ({
      n,
      // A whole-chapter lesson (code "4", no section part) names its unit;
      // otherwise the unit is known only by its number.
      title: sections.find((s) => s.code.trim() === n)?.title ?? `Unit ${n}`,
      subs: sections
        .filter((s) => s.code.trim() !== n)
        .map((s) => ({ code: s.code, title: s.title, active: s.code === focusCode })),
    }))
    .map((unit) => (unit.subs.length > 0 ? unit : { n: unit.n, title: unit.title }))
}

/** Weakest topics first — the plan exists to repair them. */
function planFor(topics: CourseTopic[]): DayCard[] {
  const weakest = topics
    .filter((topic) => topic.mastery < 4)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4)
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return weakest.map((topic, i) => {
    // Spaced out over the coming days rather than stacked on one date.
    const when = new Date()
    when.setDate(when.getDate() + 1 + i * 2)
    return {
      day: day[when.getDay()],
      date: String(when.getDate()),
      month: month[when.getMonth()],
      title: topic.mastery === 0 ? `Start ${topic.title}` : `Repair ${topic.title}`,
      chips: [topic.code],
      minutes: topic.mastery === 0 ? 35 : 25,
      mastery: Math.min(4, topic.mastery),
    }
  })
}

interface DayCard {
  day: string
  date: string
  month: string
  title: string
  chips: string[]
  minutes: number
  mastery: number // 0-4
}

function MasteryMini({ filled }: { filled: number }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="w-7 h-7 inline-flex items-center justify-center rounded-chip border text-[12px] font-mono"
          style={{
            background: n <= filled ? '#2F5D50' : '#FBFCFB',
            borderColor: n <= filled ? '#2F5D50' : '#D6DCD9',
            color: n <= filled ? '#FBFCFB' : '#5A6461',
          }}
        >
          {n}
        </span>
      ))}
    </span>
  )
}

export default function StudyPlan() {
  const navigate = useNavigate()
  const [activeCourse] = useState(getActiveCourse)
  // The imported corpus arrives after first paint; without this the unit tree
  // renders empty on a cold load and never fills.
  const [, setDbTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])
  const topics = topicsForCourse(activeCourse.id)
  const focus = topics.find((topic) => topic.mastery < 4) ?? topics[0]
  const UNITS = unitsFor(topics, focus?.code)
  const DAYS = planFor(topics)
  // The unit holding the focus topic opens by default.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const n = focus ? /^\s*(\d+)/.exec(focus.code)?.[1] : undefined
    return n ? { [n]: true } : {}
  })

  return (
    <CourseShell role="student" active="plan">
      <Page>
        <div className="practice-workspace flex flex-1 min-h-0 overflow-hidden">
        {/* unit tree rail */}
        <SidePanel title="Units" width="index">
          <div className="px-4 py-4">
          <ul className="flex flex-col gap-0.5 mb-4">
            {UNITS.map((u) => {
              const isOpen = !!expanded[u.n]
              return (
                <li key={u.n}>
                  <button
                    type="button"
                    onClick={() =>
                      u.subs && setExpanded((e) => ({ ...e, [u.n]: !e[u.n] }))
                    }
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-[14px] text-left transition-colors duration-[120ms] ease-out ${
                      u.subs ? 'text-ink font-medium hover:bg-paper' : 'text-ink hover:bg-paper'
                    }`}
                  >
                    <span className="font-mono text-[12px] text-ink-muted w-4">{u.n}</span>
                    <span className="flex-1 truncate">{u.title}</span>
                    {u.subs ? (
                      <ChevronDown
                        size={14}
                        className={`text-ink-muted transition-transform duration-[120ms] ease-out ${isOpen ? '' : '-rotate-90'}`}
                      />
                    ) : (
                      <ChevronRight size={14} className="text-ink-muted" />
                    )}
                  </button>
                  {u.subs && isOpen ? (
                    <ul className="ml-6 mt-0.5 flex flex-col gap-0.5">
                      {u.subs.map((s) => (
                        <li key={s.code}>
                          <button
                            type="button"
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded-control text-[14px] text-left transition-colors duration-[120ms] ease-out ${
                              s.active ? 'bg-board-tint text-board' : 'text-ink-muted hover:bg-paper'
                            }`}
                          >
                            <span className="font-mono text-[12px]">{s.code}</span>
                            <span className="flex-1 truncate">{s.title}</span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                s.active ? 'bg-board' : 'border border-rule bg-surface'
                              }`}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={() => navigate('/course/know')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-[14px] text-ink hover:bg-paper text-left transition-colors duration-[120ms] ease-out"
          >
            <BarChart3 size={16} className="text-ink-muted" /> Progress
          </button>
          </div>
        </SidePanel>

        {/* center */}
        <PageBody measure="wide">
          {/* column headers */}
          <div className="grid grid-cols-[64px_minmax(0,1fr)_120px_110px_170px_90px] gap-4 pb-2 border-b border-rule">
            {['Date', 'Focus', 'Topics', 'Est. time', 'Mastery', 'Action'].map((h) => (
              <span
                key={h}
                className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted"
              >
                {h}
              </span>
            ))}
          </div>

          {/* timeline */}
          <div>
            {DAYS.map((d, i) => (
              <div key={d.date} className="relative">
                {i < DAYS.length - 1 ? (
                  <span
                    className="absolute left-[19px] top-12 bottom-0 w-px bg-rule"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="grid grid-cols-[64px_minmax(0,1fr)_120px_110px_170px_90px] gap-4 items-center py-4 border-b border-rule">
                  <span className="flex items-start gap-2">
                    <span className="w-10 h-10 rounded-full bg-board text-paper flex items-center justify-center shrink-0">
                      <Calendar size={16} />
                    </span>
                    <span>
                      <span className="block text-[12px] text-ink-muted leading-tight">
                        {d.day}
                      </span>
                      <span className="block text-[18px] font-medium text-ink leading-tight">
                        {d.date}
                      </span>
                      <span className="block text-[12px] text-ink-muted leading-tight">
                        {d.month}
                      </span>
                    </span>
                  </span>
                  <span className="text-[16px] font-medium text-ink">{d.title}</span>
                  <span className="flex gap-1">
                    {d.chips.map((c) => (
                      <span
                        key={c}
                        className="font-mono text-[12px] text-ink border border-rule rounded-chip bg-surface px-2 py-0.5"
                      >
                        {c}
                      </span>
                    ))}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
                    <Clock size={14} /> {d.minutes} min
                  </span>
                  <span className="flex flex-col gap-1">
                    <MasteryMini filled={d.mastery} />
                    <span className="text-[12px] text-ink-muted">Not started</span>
                  </span>
                  <PageAction variant="primary" onClick={() => navigate('/course/questions')}>
                    Open
                  </PageAction>
                </div>
              </div>
            ))}
          </div>

          {/* footer note */}
          <div className="mt-6 border border-rule rounded-card bg-surface px-4 py-3 flex items-center gap-2.5">
            <Info size={16} className="text-ink-muted shrink-0" />
            <span className="text-[14px] text-ink">Plan adapts after every check</span>
          </div>
        </PageBody>
        </div>
      </Page>
    </CourseShell>
  )
}
