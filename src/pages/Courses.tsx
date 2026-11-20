// Courses — route /courses — ref syn_p5.png
// Landing after sign-in: full-width course rows (no cards). Mastery and gap
// columns are hidden for now. Uses the shared CourseShell student rail.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageBody } from '@/components/Page'
import { courses, type Course } from '@/data/mock'
import { findCatalogCourses } from '@/data/course-catalog'
import { courseDisplayName, setActiveCourse } from '@/lib/course-selection'
import { getSettings, isPersonalAccount } from '@/database/client'
import PersonalCourses from '@/pages/PersonalCourses'

const SLUGS: Record<string, string> = {
  'math-aa-hl': 'maaa-hl-24s2',
  'physics-sl': 'physics-sl-24s2',
  'chemistry-hl': 'chem-hl-24s2',
}

export default function Courses() {
  // A personal account has no school catalogue: its own courses instead.
  return isPersonalAccount() ? <PersonalCourses /> : <SchoolCourses />
}

function SchoolCourses() {
  const navigate = useNavigate()
  const [displayCourses] = useState<(Course & { displayName: string })[]>(() => {
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
          displayName: courseDisplayName(course.title, settings.grade),
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
    return courses.map((course) => ({ ...course, displayName: course.code }))
  })

  return (
    <CourseShell role="student" active="courses">
      <Page>
        <PageBody measure="wide" className="flex min-h-full flex-col">
        {/* Header row */}
        <div className="grid grid-cols-[220px_160px_1fr_32px] gap-4 pb-2 border-b border-rule">
          {['Course', 'Teacher', 'Current unit', ''].map((h) => (
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
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCourse(c.id)
                  navigate('/course/chat')
                }}
                className="w-full grid grid-cols-[220px_160px_1fr_32px] gap-4 items-center py-5 border-b border-rule text-left hover:bg-surface transition-colors duration-[120ms] ease-out"
              >
                <span>
                  <span className="block font-serif text-[24px] leading-tight text-ink">
                    {c.displayName}
                  </span>
                  <span className="block font-mono text-[12px] text-ink-muted">
                    {SLUGS[c.id] ?? c.id}
                  </span>
                </span>
                <span className="text-[14px] text-ink">{c.teacher}</span>
                <span className="text-[14px] text-ink">{c.unit}</span>
                <ArrowRight size={16} className="text-ink-muted justify-self-end" />
              </button>
            )
          })}
        </div>

        </PageBody>
      </Page>
    </CourseShell>
  )
}
