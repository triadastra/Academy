// Courses — route /courses — ref syn_p5.png
// Landing after sign-in: full-width course rows (no cards), ten-segment
// mastery bars, gap counts in mark. Uses the shared CourseShell student rail.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageBody } from '@/components/Page'
import SegmentBar from '@/components/SegmentBar'
import { courses, type Course } from '@/data/mock'
import { findCatalogCourses } from '@/data/course-catalog'
import { setActiveCourse } from '@/lib/course-selection'
import { getSettings } from '@/database/client'

const SLUGS: Record<string, string> = {
  'math-aa-hl': 'maaa-hl-24s2',
  'physics-sl': 'physics-sl-24s2',
  'chemistry-hl': 'chem-hl-24s2',
}

export default function Courses() {
  const navigate = useNavigate()
  const [displayCourses] = useState<Course[]>(() => {
    try {
      const settings = getSettings()
      const savedIds = settings.selectedCourseIds
      const selected = findCatalogCourses(savedIds)
      const courseLevels = settings.courseLevels
      if (selected.length > 0) {
        return selected.map((course) => ({
          id: course.id,
          code: course.code,
          title: course.title,
          teacher: 'Shared course',
          unit:
            course.pathway === 'HS'
              ? `${courseLevels[course.id] ?? 'S'} level · Open course workspace`
              : 'Open course workspace',
          progressPct: 0,
          gaps: 0,
        }))
      }
    } catch {
      // Fall back to the seeded demo courses if setup data is unavailable.
    }
    return courses
  })

  return (
    <CourseShell role="student" active="courses">
      <Page>
        <PageBody measure="wide" className="flex min-h-full flex-col">
        {/* Header row */}
        <div className="grid grid-cols-[220px_160px_1fr_220px_90px_32px] gap-4 pb-2 border-b border-rule">
          {['Course', 'Teacher', 'Current unit', 'Mastery', 'Gaps', ''].map((h) => (
            <span
              key={h}
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div>
          {displayCourses.map((c) => {
            const filled = Math.round(c.progressPct / 10)
            const weak = c.progressPct < 50
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCourse(c.id)
                  navigate('/course/chat')
                }}
                className="w-full grid grid-cols-[220px_160px_1fr_220px_90px_32px] gap-4 items-center py-5 border-b border-rule text-left hover:bg-surface transition-colors duration-[120ms] ease-out"
              >
                <span>
                  <span className="block font-serif text-[24px] leading-tight text-ink">
                    {c.code}
                  </span>
                  <span className="block font-mono text-[12px] text-ink-muted">
                    {SLUGS[c.id] ?? c.id}
                  </span>
                </span>
                <span className="text-[14px] text-ink">{c.teacher}</span>
                <span className="text-[14px] text-ink">{c.unit}</span>
                <span className="flex flex-col gap-1.5">
                  <span
                    className={`text-[24px] leading-none font-medium ${
                      weak ? 'text-mark' : 'text-ink'
                    }`}
                  >
                    {c.progressPct}%
                  </span>
                  <SegmentBar
                    filled={filled}
                    total={10}
                    size={10}
                    color={weak ? '#A63D40' : '#2F5D50'}
                  />
                </span>
                <span
                  className={`text-[14px] ${c.gaps > 0 ? 'text-mark font-medium' : 'text-ink-muted'}`}
                >
                  {c.gaps} gap{c.gaps === 1 ? '' : 's'}
                </span>
                <ArrowRight size={16} className="text-ink-muted justify-self-end" />
              </button>
            )
          })}
        </div>

        {/* Footer notes */}
        <div className="mt-auto pt-10 flex items-end justify-between gap-8">
          <p className="text-[12px] text-ink-muted max-w-[320px]">
            Mastery shows your current progress toward unit mastery (10 segments).
          </p>
          <p className="text-[12px] text-ink-muted max-w-[320px] text-right">
            Gaps indicate the number of priority learning gaps.
          </p>
        </div>
        </PageBody>
      </Page>
    </CourseShell>
  )
}
