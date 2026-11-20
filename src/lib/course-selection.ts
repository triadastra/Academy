import { findCatalogCourses } from '@/data/course-catalog'
import { courses as seededCourses } from '@/data/mock'
import { getSettings, isPersonalAccount, updateSettings } from '@/database/client'
import { getPersonalWorkspace } from '@/database/personal'

export interface ActiveCourse {
  id: string
  code: string
  title: string
  context: string
  symbol: string
  /** Catalogue subject. Mock papers are shared per subject, not per course. */
  subject: string
  /** How the course is named to the student: `G10-AP Music Theory`. */
  displayName: string
}

/** `[Grade]-[Title]`, e.g. `G10-AP Music Theory`; just the title with no grade. */
export function courseDisplayName(title: string, grade: number | null | undefined) {
  return grade ? `G${grade}-${title}` : title
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

/** Shown in the rail before a personal account has created any course. */
const NO_COURSE: ActiveCourse = {
  id: '',
  code: 'NEW',
  title: 'No course yet',
  context: 'Create one to begin',
  symbol: '+',
  subject: '',
  displayName: 'No course yet',
}

export function getAvailableCourses(): ActiveCourse[] {
  // Personal accounts see only the courses they built — never the school's
  // catalogue, nor the seeded demo courses.
  if (isPersonalAccount()) {
    return getPersonalWorkspace().courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      context: `Personal · ${course.rigor}`,
      symbol: course.title.trim().charAt(0).toUpperCase() || '·',
      // Namespaced so subject-scoped shared material (question bank, mock
      // papers) never matches a personal course.
      subject: `personal:${course.subject}`,
      displayName: course.title,
    }))
  }
  try {
    const settings = getSettings()
    const savedIds = settings.selectedCourseIds
    const grade = settings.grade
    const pathway = settings.pathway
    const courseLevels = settings.courseLevels
    const catalogCourses = findCatalogCourses(savedIds)

    if (catalogCourses.length > 0) {
      return catalogCourses.map((course) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        context: [
          grade ? `Grade ${grade}` : null,
          course.pathway === 'HS' ? courseLevels[course.id] ?? 'S' : course.pathway ?? pathway,
        ]
          .filter(Boolean)
          .join(' · '),
        symbol: courseSymbol(course.code),
        subject: course.subject,
        displayName: courseDisplayName(course.title, grade),
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
    displayName: course.code,
  }))
}

export function getActiveCourse(): ActiveCourse {
  const available = getAvailableCourses()
  const activeId = getSettings().activeCourseId
  return available.find((course) => course.id === activeId) ?? available[0] ?? NO_COURSE
}

export function setActiveCourse(courseId: string) {
  updateSettings({ activeCourseId: courseId })
  window.dispatchEvent(new CustomEvent('synonance:active-course-changed', { detail: courseId }))
}
