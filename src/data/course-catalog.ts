import { getDatabase } from '@/database/client'
import type { CatalogCourse, CourseLevel, CoursePathway } from '@/database/types'

export type { CatalogCourse, CourseLevel, CoursePathway }

export const COURSE_LEVELS: CourseLevel[] = getDatabase().courseLevels
export const COURSE_CATALOG: CatalogCourse[] = getDatabase().courseCatalog

export function findCatalogCourses(ids: string[]) {
  const selected = new Set(ids)
  return getDatabase().courseCatalog.filter((course) => selected.has(course.id))
}
