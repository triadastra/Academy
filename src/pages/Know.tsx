import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  MessageSquare,
  Target,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBody } from '@/components/Page'
import { getActiveCourse } from '@/lib/course-selection'
import { subscribeDatabase, updateSettings } from '@/database/client'
import { topicsForCourse as courseTopics } from '@/lib/course-content'
import { getCourseLevel, levelsWithNotes } from '@/database/notes-tools'
import type { ProgressTopic, TopicStatus } from '@/database/types'

type TopicFilter = 'All topics' | 'Needs practice' | 'On track' | 'Not started'

type Topic = ProgressTopic

/**
 * The seeded progress tables cover the demo Maths courses only, so keying off
 * the course code showed CHINESE 9 a syllabus of rational functions and partial
 * fractions. Topics come from the course's own notes instead; the seeded tables
 * survive as the mastery source inside `topicsForCourse`.
 */
function topicsFor(courseId: string): Topic[] {
  return courseTopics(courseId).map((topic) => ({
    code: topic.code,
    title: topic.title,
    description: topic.description,
    mastery: topic.mastery,
    status: topic.status,
  }))
}

const FILTERS: TopicFilter[] = ['All topics', 'Needs practice', 'On track', 'Not started']

function statusStyle(status: TopicStatus) {
  if (status === 'Needs practice') return 'bg-mark-tint text-mark'
  if (status === 'On track') return 'bg-board-tint text-board-deep'
  if (status === 'Building') return 'bg-[#EEE8D8] text-[#765F25]'
  return 'bg-paper text-ink-muted'
}

function actionLabel(status: TopicStatus) {
  if (status === 'Needs practice') return 'Practice'
  if (status === 'Not started') return 'Start'
  return 'Continue'
}

export default function Know() {
  const navigate = useNavigate()
  const [activeCourse] = useState(getActiveCourse)
  const [filter, setFilter] = useState<TopicFilter>('All topics')
  // The imported corpus is fetched after first paint, so a page that reads it
  // once renders "no notes" forever on a cold load. Re-read when it lands.
  const [, setDbTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])
  const topics = topicsFor(activeCourse.id)
  // An empty page has three different causes and three different fixes: no
  // level chosen, a level with nothing written for it, or a course with no
  // notes at all. Saying which one it is saves the student guessing.
  const level = getCourseLevel(activeCourse.id)
  const published = levelsWithNotes(activeCourse.id)

  const shownTopics = topics.filter((topic) => {
    if (filter === 'All topics') return true
    return topic.status === filter
  })
  // A course with no published notes has no topics — without the guard the
  // page renders "NaN%" and then crashes reaching into an empty focus topic.
  const averageMastery =
    topics.length === 0
      ? 0
      : Math.round(
          (topics.reduce((total, topic) => total + topic.mastery, 0) / (topics.length * 5)) * 100,
        )
  const needsPractice = topics.filter((topic) => topic.status === 'Needs practice').length
  const onTrack = topics.filter((topic) => topic.status === 'On track').length
  const focusTopic = topics.find((topic) => topic.status === 'Needs practice') ?? topics[0]

  function askAboutFocus() {
    updateSettings({ pendingChatPrompt: `Help me understand ${focusTopic.code} ${focusTopic.title}.` })
    navigate('/course/chat')
  }

  if (topics.length === 0) {
    return (
      <CourseShell role="student" active="know">
        <Page>
          <PageBody measure="wide">
            <div className="rounded-card border border-rule bg-surface p-8 text-center">
              <h2 className="font-serif text-[20px] text-ink">
                {!level && published.length > 0
                  ? 'Choose your level first'
                  : level && published.length > 0
                    ? `No topics at ${level} level`
                    : 'No topics yet'}
              </h2>
              <p className="mx-auto mt-2 max-w-[48ch] text-[14px] leading-relaxed text-ink-muted">
                {!level && published.length > 0 ? (
                  <>
                    {activeCourse.code} is taught at {published.join(' and ')} level, and each
                    level covers different material. Pick yours and this page fills with the
                    topics you are actually assessed on.
                  </>
                ) : level && published.length > 0 ? (
                  <>
                    {activeCourse.code} has topics at {published.join(' and ')} level, but none
                    written for {level}. Notes from another level are not shown, because each
                    level is taught different material.
                  </>
                ) : (
                  <>
                    {activeCourse.code} has no notes published yet, so there is no progress to
                    track. Once notes exist, every section becomes a topic here.
                  </>
                )}
              </p>
            </div>
          </PageBody>
        </Page>
      </CourseShell>
    )
  }

  return (
    <CourseShell role="student" active="know">
      <Page>
        <PageBody measure="wide">
          <section aria-label="Progress summary" className="grid gap-3 md:grid-cols-3">
            <div className="rounded-card border border-rule bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">Overall progress</span>
                <Target size={18} className="text-board" />
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-serif text-[34px] leading-none text-ink">{averageMastery}%</span>
                <span className="pb-0.5 text-[12px] text-ink-muted">across this unit</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-chip bg-paper">
                <div className="h-full bg-board" style={{ width: `${averageMastery}%` }} />
              </div>
            </div>

            <div className="rounded-card border border-rule bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">Needs your attention</span>
                <CircleAlert size={18} className="text-mark" />
              </div>
              <div className="mt-3 font-serif text-[34px] leading-none text-ink">{needsPractice}</div>
              <p className="mt-3 text-[12px] text-ink-muted">
                {needsPractice === 1 ? 'topic is ready for practice' : 'topics are ready for practice'}
              </p>
            </div>

            <div className="rounded-card border border-rule bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">Going well</span>
                <CheckCircle2 size={18} className="text-board" />
              </div>
              <div className="mt-3 font-serif text-[34px] leading-none text-ink">{onTrack}</div>
              <p className="mt-3 text-[12px] text-ink-muted">topics are on track</p>
            </div>
          </section>

          <section className="mt-6 rounded-card border border-board/25 bg-board-tint/60 p-5 md:flex md:items-center md:gap-6">
            <div className="flex min-w-0 flex-1 gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-board text-paper">
                <BookOpen size={19} />
              </span>
              <div className="min-w-0">
                <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-board">
                  Focus next
                </div>
                <h2 className="mt-1 text-[20px] font-medium text-ink">
                  {focusTopic.code} {focusTopic.title}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  Recent work suggests this is the most useful topic to practise next.
                </p>
              </div>
            </div>
            <div className="mt-4 flex shrink-0 gap-2 md:mt-0">
              <PageAction onClick={askAboutFocus}>
                <MessageSquare size={15} /> Ask Syno
              </PageAction>
              <PageAction variant="primary" onClick={() => navigate('/course/questions')}>
                Practise now <ArrowRight size={15} />
              </PageAction>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex flex-col gap-4 border-b border-rule pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-serif text-[24px] text-ink">All topics</h2>
                <p className="mt-1 text-[13px] text-ink-muted">Choose a topic to continue learning.</p>
              </div>
              <div className="flex flex-wrap gap-1" aria-label="Filter topics">
                {FILTERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    aria-pressed={filter === option}
                    className={
                      filter === option
                        ? 'rounded-control bg-board px-3 py-1.5 text-[12px] text-paper'
                        : 'rounded-control px-3 py-1.5 text-[12px] text-ink-muted hover:bg-surface hover:text-ink'
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-rule">
              {shownTopics.map((topic) => (
                <article
                  key={topic.code}
                  className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="font-mono text-[12px] text-ink-muted">{topic.code}</span>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-medium leading-tight text-ink">{topic.title}</h3>
                      <p className="mt-1 text-[13px] leading-snug text-ink-muted">{topic.description}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className={`rounded-chip px-2 py-1 text-[11px] ${statusStyle(topic.status)}`}>
                        {topic.status}
                      </span>
                      <span className="text-[11px] text-ink-muted">{topic.mastery} of 5</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-chip bg-rule">
                      <div
                        className={topic.status === 'Needs practice' ? 'h-full bg-mark' : 'h-full bg-board'}
                        style={{ width: `${topic.mastery * 20}%` }}
                      />
                    </div>
                  </div>

                  <PageAction
                    onClick={() => navigate('/course/questions')}
                    className="sm:min-w-[104px]"
                  >
                    {actionLabel(topic.status)} <ArrowRight size={14} />
                  </PageAction>
                </article>
              ))}
            </div>

            {shownTopics.length === 0 ? (
              <div className="rounded-card border border-dashed border-rule bg-surface px-5 py-10 text-center">
                <CheckCircle2 size={22} className="mx-auto text-board" />
                <p className="mt-3 text-[14px] text-ink">Nothing in this group right now.</p>
              </div>
            ) : null}
          </section>
        </PageBody>
      </Page>
    </CourseShell>
  )
}
