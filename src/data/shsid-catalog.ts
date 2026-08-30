// shsid-catalog.ts — the school's real course list, from the CC Advisor API.
//
// The bundled catalogue is 52 hand-written entries. SHSID actually offers 255
// courses, and which ones exist depends on the grade — so a student picking
// courses was choosing from a list that was partly invented and partly missing.
// This pulls the official catalogue instead and falls back to the bundled one
// when the network is unavailable.
//
// The API models every level as its own course (Biology 9 Standard and Biology
// 9 Honors are two ids). This app models one course taught at several levels,
// which is also how the notes are filed, so the API's courses are grouped back
// together and their levels collected.
import type { CatalogCourse, CoursePathway } from '@/database/types'

const ENDPOINT = 'https://cc.indexademics.com/api/courses'
const CACHE_KEY = 'synonance:shsid-catalog:v1'
/** The upstream catalogue changes a few times a year; a day is plenty. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Levels the school streams at — wider than the note-scoping levels. */
export type CatalogLevel = 'S' | 'S+' | 'H' | 'H+' | 'SL' | 'HL' | 'AS' | 'A2' | 'AP'

export interface ShsidCourse extends CatalogCourse {
  department: string
  /** Levels this course is taught at, empty when it is not streamed. */
  levels: CatalogLevel[]
  /** The official course ids grouped into this one. */
  officialIds: string[]
}

interface ApiCourse {
  id: string
  name: string
  track: string
  level?: string | null
  department: string
  grade: string
}

const PATHWAY: Record<string, CoursePathway> = {
  school: 'HS',
  AP: 'AP',
  IB: 'IB',
  ASA2: 'AL',
}

/** Department name -> the slug this app's course ids and note folders use. */
const SUBJECT_SLUG: Record<string, string> = {
  'Computer Science': 'cs',
  Art: 'visual-arts',
  'Social Sciences': 'social-sciences',
  'World Languages': 'world-languages',
}

/** Courses this app already names differently from the official catalogue. */
const ID_ALIASES: Record<string, string> = {
  'hs-economics-and-business-10': 'hs-economics-10',
  'ap-language-and-composition': 'ap-english-lang',
  'ap-literature-and-composition': 'ap-english-lit',
  'ap-microeconomics': 'ap-economics',
  'ap-world-history': 'ap-world-history',
}

/** These two are not streamed by grade in this app, so they carry no suffix. */
const UNGRADED_SUBJECTS = new Set(['visual-arts', 'music'])

/**
 * Departments holding several genuinely different courses, where the department
 * cannot identify a course. Social Sciences alone covers Economics, Business
 * Management, Law, Sociology and Accounting.
 */
const NAME_SCOPED = new Set(['Social Sciences', 'World Languages'])

const SUBJECT_AREA: Record<string, string> = {
  Biology: 'Science',
  Chemistry: 'Science',
  Physics: 'Science',
  Math: 'Mathematics',
  English: 'English',
  Chinese: 'Chinese',
  History: 'Humanities',
  Geography: 'Humanities',
  Psychology: 'Humanities',
  'Social Sciences': 'Humanities',
  'Computer Science': 'Computer Science',
  Art: 'Arts',
  Music: 'Arts',
  'World Languages': 'Languages',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Strips the level and year markers a course name carries, so the variants of
 * one course collapse together: "AP Calculus AB 11" and "AP Calculus AB 12"
 * are the same course, and "Biology 9 Standard" is Biology 9.
 */
function baseName(name: string) {
  return name
    .replace(/\b(Standard|Honors|Honours)\b/gi, '')
    .replace(/\b(S\+|H\+|SL|HL|AS|A2)\b/g, '')
    .replace(/\bY[12]\b/g, '')
    .replace(/\bL\d+(?:-L\d+)?\b/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\b(9|10|11|12)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function levelOf(course: ApiCourse): CatalogLevel | null {
  const raw = (course.level ?? '').trim()
  const known: CatalogLevel[] = ['S+', 'H+', 'SL', 'HL', 'AS', 'A2', 'AP', 'S', 'H']
  return known.find((level) => level === raw) ?? null
}

function appIdFor(course: ApiCourse) {
  const pathway = PATHWAY[course.track] ?? 'HS'
  const prefix = pathway.toLowerCase()
  if (pathway === 'HS') {
    const subject = SUBJECT_SLUG[course.department] ?? slugify(course.department)
    const id = NAME_SCOPED.has(course.department)
      ? `hs-${slugify(baseName(course.name))}-${course.grade}`
      : UNGRADED_SUBJECTS.has(subject)
        ? `hs-${subject}`
        : `hs-${subject}-${course.grade}`
    return ID_ALIASES[id] ?? id
  }
  // AP, IB and A-Level courses are named exams, not department streams: AP
  // Calculus AB and AP Precalculus share a department but are different courses.
  const id = `${prefix}-${slugify(baseName(course.name).replace(/^(AP|IB|A-Level)\s+/i, ''))}`
  return ID_ALIASES[id] ?? id
}

function groupCourses(courses: ApiCourse[]): ShsidCourse[] {
  const grouped = new Map<string, ShsidCourse>()
  for (const course of courses) {
    const id = appIdFor(course)
    const pathway = PATHWAY[course.track] ?? 'HS'
    const grade = Number(course.grade)
    const existing = grouped.get(id)
    const level = levelOf(course)
    if (existing) {
      if (!existing.grades.includes(grade)) existing.grades.push(grade)
      if (level && !existing.levels.includes(level)) existing.levels.push(level)
      existing.officialIds.push(course.id)
      continue
    }
    const title = baseName(course.name)
    grouped.set(id, {
      id,
      pathway,
      code: title.toUpperCase(),
      title,
      subject: SUBJECT_AREA[course.department] ?? course.department,
      department: course.department,
      grades: [grade],
      levels: level ? [level] : [],
      officialIds: [course.id],
    })
  }
  const order: CatalogLevel[] = ['S', 'S+', 'H', 'H+', 'SL', 'HL', 'AS', 'A2', 'AP']
  for (const course of grouped.values()) {
    course.grades.sort((a, b) => a - b)
    course.levels.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }
  return [...grouped.values()].sort(
    (a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title),
  )
}

let memo: ShsidCourse[] | null = null

function readCache(): ShsidCourse[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { fetchedAt: number; courses: ShsidCourse[] }
    if (!Array.isArray(parsed.courses) || parsed.courses.length === 0) return null
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed.courses
  } catch {
    return null
  }
}

/** Cached catalogue, without touching the network. Null when nothing is cached. */
export function cachedShsidCatalog(): ShsidCourse[] | null {
  if (memo) return memo
  memo = readCache()
  return memo
}

/**
 * The official catalogue, from cache when fresh and from the API otherwise.
 * Rejects nothing: callers fall back to the bundled catalogue, so a failed
 * fetch degrades to a smaller list rather than an empty picker.
 */
export async function loadShsidCatalog(): Promise<ShsidCourse[] | null> {
  const cached = cachedShsidCatalog()
  if (cached) return cached
  try {
    const response = await fetch(ENDPOINT)
    if (!response.ok) return null
    const payload = (await response.json()) as { ok?: boolean; data?: { courses?: ApiCourse[] } }
    const courses = payload?.data?.courses
    if (!payload.ok || !Array.isArray(courses) || courses.length === 0) return null
    const mapped = groupCourses(courses)
    memo = mapped
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), courses: mapped }))
    } catch {
      // Storage full or blocked — the in-memory copy still serves this session.
    }
    return mapped
  } catch {
    return null
  }
}

/** Exported for tests and for verifying ids line up with the notes corpus. */
export const __internals = { appIdFor, baseName, groupCourses }
