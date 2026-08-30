import { COURSE_CATALOG } from '@/data/course-catalog'
import { courses as seededCourses } from '@/data/mock'
import { getSettings, updateSettings } from '@/database/client'

export interface ActiveCourse {
  id: string
  code: string
  title: string
  context: string
  symbol: string
  /** Catalogue subject. Mock papers are shared per subject, not per course. */
  subject: string
}

/** The seeded demo courses predate the catalogue, so they carry no subject. */
const SEED_SUBJECTS: Record<string, string> = {
  'math-aa-hl': 'Mathematics',
  'physics-sl': 'Science',
  'chemistry-hl': 'Science',
}

function courseSymbol(code: string) {
  if (code.includes('MATH') || code.includes('CALCULUS') || code.includes('STATISTICS')) return '∫'
  if (code.includes('PHYSICS')) return 'λ'
  if (code.includes('CHEMISTRY')) return 'C'
  if (code.includes('BIOLOGY')) return 'B'
  if (code.includes('ENGLISH')) return 'A'
  if (code.includes('COMPUTER')) return '</>'
  return code.charAt(0)
}

export function getAvailableCourses(): ActiveCourse[] {
  try {
    const settings = getSettings()
    const savedIds = settings.selectedCourseIds
    const selected = new Set(savedIds)
    const grade = settings.grade
    const pathway = settings.pathway
    const courseLevels = settings.courseLevels
    const catalogCourses = COURSE_CATALOG.filter((course) => selected.has(course.id))

    if (catalogCourses.length > 0) {
      return catalogCourses.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        context: [
          grade ? `Grade ${grade}` : null,
          course.pathway === 'HS' ? courseLevels[course.id] ?? 'S' : pathway,
        ]
          .filter(Boolean)
          .join(' · '),
        symbol: courseSymbol(course.code),
        subject: course.subject,
      }))
    }
  } catch {
    // Use the seeded demo courses if onboarding data cannot be read.
  }

  return seededCourses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    context: course.unit,
    symbol: courseSymbol(course.code),
    subject: SEED_SUBJECTS[course.id] ?? 'Mathematics',
  }))
}

export function getActiveCourse(): ActiveCourse {
  const available = getAvailableCourses()
  const activeId = getSettings().activeCourseId
  return available.find((course) => course.id === activeId) ?? available[0]
}

export function setActiveCourse(courseId: string) {
  updateSettings({ activeCourseId: courseId })
  window.dispatchEvent(new CustomEvent('synonance:active-course-changed', { detail: courseId }))
}
