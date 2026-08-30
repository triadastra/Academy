// Setup.tsx — route /setup.
// Student onboarding: grade, upper-school pathway information where relevant,
// then a searchable catalog with no assumed enrolments.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lock,
  Plus,
  Search,
} from 'lucide-react'
import Crest from '@/components/Crest'
import {
  COURSE_CATALOG,
  COURSE_LEVELS,
  type CourseLevel,
  type CoursePathway,
} from '@/data/course-catalog'
import { cachedShsidCatalog, loadShsidCatalog, type ShsidCourse } from '@/data/shsid-catalog'
import type { CatalogCourse } from '@/database/types'
import { getSettings, updateSettings } from '@/database/client'

type SetupStep = 'grade' | 'pathway' | 'courses'

const GRADES = [9, 10, 11, 12] as const

const PATHWAYS: Array<{
  id: Exclude<CoursePathway, 'HS'>
  name: string
  fullName: string
  description: string
  structure: string
}> = [
  {
    id: 'IB',
    name: 'IB',
    fullName: 'International Baccalaureate',
    description: 'A broad two-year programme combining subject study with a shared core.',
    structure: 'Choose subjects at Higher and Standard Level',
  },
  {
    id: 'AP',
    name: 'AP',
    fullName: 'Advanced Placement',
    description: 'Individual college-level courses that can be combined around your interests.',
    structure: 'Choose courses independently and sit subject exams',
  },
  {
    id: 'AL',
    name: 'A Levels',
    fullName: 'Advanced Levels',
    description: 'A focused pathway built around deeper specialization in fewer subjects.',
    structure: 'Usually concentrate on three or four subjects',
  },
]

function progressFor(step: SetupStep, grade: number | null) {
  const upperSchool = grade !== null && grade >= 11
  const total = upperSchool ? 3 : 2
  const current = step === 'grade' ? 1 : step === 'pathway' ? 2 : total
  return { current, total }
}

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<SetupStep>('grade')
  const [grade, setGrade] = useState<number | null>(() => getSettings().grade)
  const [pathway, setPathway] = useState<CoursePathway | null>(() => {
    const saved = getSettings().pathway
    return saved === 'HS' || saved === 'IB' || saved === 'AP' || saved === 'AL'
      ? saved
      : null
  })
  const [query, setQuery] = useState('')
  const [selectedCourses, setSelectedCourses] = useState<string[]>(() => getSettings().selectedCourseIds)
  const [courseLevels, setCourseLevels] = useState<Record<string, CourseLevel>>(
    () => getSettings().courseLevels,
  )
  // SHSID's real catalogue, so the picker offers courses the school actually
  // runs at this grade. It arrives async; the bundled list stands in until then
  // and stays the fallback if the API cannot be reached.
  const [official, setOfficial] = useState<ShsidCourse[] | null>(cachedShsidCatalog)
  useEffect(() => {
    let live = true
    loadShsidCatalog().then((courses) => {
      if (live && courses) setOfficial(courses)
    })
    return () => {
      live = false
    }
  }, [])

  const progress = progressFor(step, grade)
  const availableCourses = useMemo(() => {
    if (!grade || !pathway) return []
    const normalizedQuery = query.trim().toLowerCase()
    const source: CatalogCourse[] = official ?? COURSE_CATALOG
    return source.filter(
      (course) =>
        course.pathway === pathway &&
        course.grades.includes(grade) &&
        (!normalizedQuery ||
          `${course.code} ${course.title} ${course.subject}`.toLowerCase().includes(normalizedQuery)),
    )
  }, [grade, pathway, query, official])

  function chooseGrade(nextGrade: number) {
    if (nextGrade !== grade) {
      setPathway(null)
      setSelectedCourses([])
      setQuery('')
    }
    setGrade(nextGrade)
  }

  function continueFromGrade() {
    if (!grade) return
    if (grade >= 11) {
      setStep('pathway')
    } else {
      setPathway('HS')
      setStep('courses')
    }
  }

  function choosePathway(nextPathway: CoursePathway) {
    if (nextPathway !== pathway) {
      setSelectedCourses([])
      setQuery('')
    }
    setPathway(nextPathway)
  }

  function toggleCourse(courseId: string) {
    setSelectedCourses((current) =>
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId],
    )
  }

  /**
   * Levels this course is actually streamed at. The official catalogue knows
   * that Biology 9 runs at S and H only, so stepping through all four offered a
   * student a Biology 9 S+ that does not exist. Falls back to the full set for
   * courses the catalogue does not level (AP, IB and A-Level exams).
   */
  function levelsFor(courseId: string): CourseLevel[] {
    const entry = official?.find((course) => course.id === courseId)
    const streamed = (entry?.levels ?? []).filter((level): level is CourseLevel =>
      (COURSE_LEVELS as string[]).includes(level),
    )
    return streamed.length > 0 ? streamed : COURSE_LEVELS
  }

  function changeCourseLevel(courseId: string, direction: -1 | 1) {
    const levels = levelsFor(courseId)
    setCourseLevels((current) => {
      const level = current[courseId] ?? levels[0]
      const at = levels.indexOf(level)
      const nextIndex = Math.max(0, Math.min(levels.length - 1, (at < 0 ? 0 : at) + direction))
      return { ...current, [courseId]: levels[nextIndex] }
    })
  }

  function goBack() {
    if (step === 'courses' && grade && grade >= 11) {
      setStep('pathway')
      return
    }
    setStep('grade')
  }

  function finishSetup() {
    if (!grade || !pathway || selectedCourses.length === 0) return
    const selectedLevels = Object.fromEntries(
      // Default to the course's own lowest stream, not a blanket 'S' — some
      // courses are not offered at S at all, and an unstreamed level shows the
      // student no notes.
      selectedCourses.map((courseId) => [courseId, courseLevels[courseId] ?? levelsFor(courseId)[0]]),
    ) as Record<string, CourseLevel>
    const activeCourseId = getSettings().activeCourseId
    updateSettings({
      grade,
      pathway,
      selectedCourseIds: selectedCourses,
      courseLevels: selectedLevels,
      activeCourseId:
        activeCourseId && selectedCourses.includes(activeCourseId)
          ? activeCourseId
          : selectedCourses[0],
    })
    navigate('/courses')
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-surface flex relative">
      <aside className="w-[38%] shrink-0 bg-board-tint/60 flex flex-col justify-center px-16 py-12">
        <Crest size={64} tone="dark" />
        <h1 className="mt-10 font-serif text-[32px] leading-tight text-ink">
          Build your
          <br />
          course space
        </h1>

        <div
          className="mt-10 flex items-center gap-2"
          aria-label={`Setup step ${progress.current} of ${progress.total}`}
        >
          <span className="h-px w-10 bg-ink/30" />
          {Array.from({ length: progress.total }, (_, index) => index + 1).map((item) => (
            <span
              key={item}
              className={
                item <= progress.current
                  ? 'w-2 h-2 rounded-full bg-board'
                  : 'w-2 h-2 rounded-full border border-ink/40 bg-transparent'
              }
            />
          ))}
          <span className="h-px w-10 bg-ink/30" />
        </div>

        <p className="mt-12 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-muted max-w-[290px]">
          {step === 'pathway' ? (
            <Compass size={15} className="mt-0.5 shrink-0" />
          ) : (
            <Lock size={15} className="mt-0.5 shrink-0" />
          )}
          <span>
            {step === 'pathway'
              ? 'Explore how each pathway is structured before choosing its course catalog.'
              : 'Nothing is added automatically. Choose the courses you take now or want to explore.'}
          </span>
        </p>
      </aside>

      <main className="flex-1 px-16 py-10 overflow-y-auto">
        <div className="w-full max-w-[760px] mx-auto min-h-full flex flex-col justify-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Step {progress.current} of {progress.total}
          </div>

          {step === 'grade' ? (
            <>
              <h2 className="mt-2 font-serif text-[32px] text-ink">What grade are you in?</h2>
              <p className="mt-2 text-[14px] text-ink-muted">
                Your grade determines which pathways and course catalogs are available.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Grade">
                {GRADES.map((item) => {
                  const selected = grade === item
                  return (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseGrade(item)}
                      className={
                        selected
                          ? 'flex items-center justify-between text-left bg-board-tint border border-board rounded-card px-5 py-5 transition-colors duration-[120ms] ease-out'
                          : 'flex items-center justify-between text-left bg-surface border border-rule rounded-card px-5 py-5 hover:border-ink/40 transition-colors duration-[120ms] ease-out'
                      }
                    >
                      <span>
                        <span className="block font-serif text-[24px] text-ink">Grade {item}</span>
                        <span className="block mt-1 font-mono text-[11px] text-ink-muted">
                          {item < 11 ? 'HIGH SCHOOL' : 'UPPER SCHOOL'}
                        </span>
                      </span>
                      <span
                        className={
                          selected
                            ? 'w-6 h-6 rounded-full bg-board text-paper flex items-center justify-center'
                            : 'w-6 h-6 rounded-full border border-rule bg-surface'
                        }
                      >
                        {selected ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={!grade}
                onClick={continueFromGrade}
                className="mt-8 w-full bg-board text-surface text-[14px] font-medium rounded-control py-3.5 hover:bg-board-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms] ease-out"
              >
                Continue
              </button>
            </>
          ) : null}

          {step === 'pathway' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('grade')}
                className="mt-2 inline-flex self-start items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
              >
                <ArrowLeft size={14} /> Change grade
              </button>

              <h2 className="mt-4 font-serif text-[32px] text-ink">Explore upper-school pathways</h2>
              <p className="mt-2 text-[14px] text-ink-muted">
                Compare the structure of each pathway before viewing its full course catalog.
              </p>

              <div className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Pathway">
                {PATHWAYS.map((item) => {
                  const selected = pathway === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => choosePathway(item.id)}
                      className={
                        selected
                          ? 'grid grid-cols-[88px_1fr_28px] items-start gap-4 text-left bg-board-tint border border-board rounded-card px-5 py-4 transition-colors duration-[120ms] ease-out'
                          : 'grid grid-cols-[88px_1fr_28px] items-start gap-4 text-left bg-surface border border-rule rounded-card px-5 py-4 hover:border-ink/40 transition-colors duration-[120ms] ease-out'
                      }
                    >
                      <span className="font-serif text-[24px] text-board leading-tight">{item.name}</span>
                      <span>
                        <span className="block text-[15px] font-medium text-ink">{item.fullName}</span>
                        <span className="block mt-1 text-[13px] leading-relaxed text-ink-muted">
                          {item.description}
                        </span>
                        <span className="block mt-2 font-mono text-[11px] text-ink-muted">
                          {item.structure}
                        </span>
                      </span>
                      <span
                        className={
                          selected
                            ? 'w-6 h-6 rounded-full bg-board text-paper flex items-center justify-center'
                            : 'w-6 h-6 rounded-full border border-rule bg-surface'
                        }
                      >
                        {selected ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={!pathway}
                onClick={() => setStep('courses')}
                className="mt-7 w-full bg-board text-surface text-[14px] font-medium rounded-control py-3.5 hover:bg-board-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms] ease-out"
              >
                View course catalog
              </button>
            </>
          ) : null}

          {step === 'courses' ? (
            <>
              <button
                type="button"
                onClick={goBack}
                className="mt-2 inline-flex self-start items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
              >
                <ArrowLeft size={14} /> {grade && grade >= 11 ? 'Change pathway' : 'Change grade'}
              </button>

              <div className="mt-4 flex items-end justify-between gap-6">
                <div>
                  <h2 className="font-serif text-[32px] text-ink">
                    {pathway === 'HS' ? `Grade ${grade} courses` : `${pathway} course catalog`}
                  </h2>
                  <p className="mt-2 text-[14px] text-ink-muted">
                    Select every course you take now or would like to explore.
                  </p>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted whitespace-nowrap">
                  {selectedCourses.length} selected
                </span>
              </div>

              <label className="mt-5 flex items-center gap-2.5 border border-rule rounded-control bg-surface px-3.5 py-2.5 focus-within:border-board transition-colors duration-[120ms] ease-out">
                <Search size={15} className="text-ink-muted shrink-0" />
                <span className="sr-only">Search courses</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by course, subject, or level…"
                  className="w-full bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-muted"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {availableCourses.map((course) => {
                  const selected = selectedCourses.includes(course.id)
                  const levels = levelsFor(course.id)
                  const level = courseLevels[course.id] ?? levels[0]
                  const levelIndex = levels.indexOf(level)
                  return (
                    <div
                      key={course.id}
                      className={
                        selected
                          ? 'flex items-center text-left bg-board-tint border border-board rounded-card transition-colors duration-[120ms] ease-out'
                          : 'flex items-center text-left bg-surface border border-rule rounded-card hover:border-ink/40 transition-colors duration-[120ms] ease-out'
                      }
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => toggleCourse(course.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                      >
                        <span
                          className={
                            selected
                              ? 'w-6 h-6 rounded-full bg-board text-paper flex items-center justify-center shrink-0'
                              : 'w-6 h-6 rounded-full border border-rule text-ink-muted flex items-center justify-center shrink-0'
                          }
                        >
                          {selected ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[11px] text-ink">{course.code}</span>
                          <span className="block text-[12px] text-ink-muted leading-snug mt-0.5">
                            {course.title}
                          </span>
                        </span>
                      </button>

                      {course.pathway === 'HS' ? (
                        <div
                          className="mr-3 flex shrink-0 items-center rounded-control border border-rule bg-surface"
                          aria-label={`${course.code} level`}
                        >
                          <button
                            type="button"
                            onClick={() => changeCourseLevel(course.id, -1)}
                            disabled={levelIndex === 0}
                            aria-label={`Lower ${course.code} level`}
                            className="flex h-7 w-6 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-25"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <span className="w-7 text-center font-mono text-[11px] font-medium text-board">
                            {level}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeCourseLevel(course.id, 1)}
                            disabled={levelIndex >= levels.length - 1}
                            aria-label={`Raise ${course.code} level`}
                            className="flex h-7 w-6 items-center justify-center text-ink-muted hover:text-ink disabled:opacity-25"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {availableCourses.length === 0 ? (
                <div className="mt-4 border border-dashed border-rule rounded-card px-6 py-8 text-center text-[13px] text-ink-muted">
                  No courses match “{query}”. Try a subject or course level.
                </div>
              ) : null}

              <button
                type="button"
                disabled={selectedCourses.length === 0}
                onClick={finishSetup}
                className="mt-6 w-full bg-board text-surface text-[14px] font-medium rounded-control py-3.5 hover:bg-board-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms] ease-out"
              >
                Add {selectedCourses.length || ''} {selectedCourses.length === 1 ? 'course' : 'courses'}
              </button>
            </>
          ) : null}
        </div>
      </main>

      <span className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        First-time course setup
      </span>
      <span className="absolute bottom-3 right-4 font-mono text-[10px] text-ink-muted">
        {progress.current} / {progress.total}
      </span>
    </div>
  )
}
