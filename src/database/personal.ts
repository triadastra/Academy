// personal.ts — a personal account's private workspace.
//
// A personal account is not a member of the school. It never reads the
// institution's shared catalogue, notes, question bank or contributions, and
// nothing it creates is written anywhere another account can see. Instead it
// builds its own courses (`PersonalCourse`), drops files into them
// (`PersonalSource`, text in IndexedDB via lib/personal-files.ts), and keeps
// the notes the agent writes from those files (`UnitNote`, stored here rather
// than in the shared `notes` table).
//
// Because the notes have the same shape as shared ones and `notesForCourse`
// merges them in for personal courses, the Notes page, the tutor's search
// tools and the performance tracker all work on a personal course unchanged.
import { getCurrentUserDatabase, updateDatabase } from '@/database/client'
import { parseNote } from '@/database/notes-markdown'
import type { PersonalCourse, PersonalSource, PersonalWorkspace, UnitNote } from '@/database/types'
import { uuid } from '@/lib/uuid'

export const PERSONAL_COURSE_PREFIX = 'personal-'

export function isPersonalCourseId(courseId: string) {
  return courseId.startsWith(PERSONAL_COURSE_PREFIX)
}

export const RIGOR_BOOST: Record<PersonalCourse['rigor'], number> = {
  Regular: 0,
  Honors: 0.5,
  'AP/IB': 1,
}

export function getPersonalWorkspace(): PersonalWorkspace {
  const workspace = getCurrentUserDatabase().personal
  return {
    courses: workspace?.courses ?? [],
    sources: workspace?.sources ?? [],
    notes: workspace?.notes ?? [],
  }
}

function mutate(change: (workspace: PersonalWorkspace) => void) {
  updateDatabase((database) => {
    const user = database.userDatabases[database.appSettings.currentUserId]
    if (!user) return
    user.personal ??= { courses: [], sources: [], notes: [] }
    user.personal.courses ??= []
    user.personal.sources ??= []
    user.personal.notes ??= []
    change(user.personal)
  })
}

// ── Courses ───────────────────────────────────────────────────────────────

export function createPersonalCourse(input: Omit<PersonalCourse, 'id' | 'createdAt'>): PersonalCourse {
  const course: PersonalCourse = {
    ...input,
    code: input.code.trim().toUpperCase() || input.title.trim().slice(0, 12).toUpperCase(),
    title: input.title.trim(),
    subject: input.subject.trim() || 'General',
    description: input.description.trim(),
    id: `${PERSONAL_COURSE_PREFIX}${uuid()}`,
    createdAt: new Date().toISOString(),
  }
  mutate((workspace) => workspace.courses.push(course))
  return course
}

export function updatePersonalCourse(id: string, patch: Partial<Omit<PersonalCourse, 'id' | 'createdAt'>>) {
  mutate((workspace) => {
    const course = workspace.courses.find((item) => item.id === id)
    if (course) Object.assign(course, patch)
  })
}

/** Removes the course, its files' records and its notes. Returns the file ids to purge. */
export function deletePersonalCourse(id: string): string[] {
  const sourceIds = getPersonalWorkspace().sources.filter((source) => source.courseId === id).map((source) => source.id)
  mutate((workspace) => {
    workspace.courses = workspace.courses.filter((course) => course.id !== id)
    workspace.sources = workspace.sources.filter((source) => source.courseId !== id)
    workspace.notes = workspace.notes.filter((note) => note.courseId !== id)
  })
  return sourceIds
}

// ── Sources ───────────────────────────────────────────────────────────────

export function addPersonalSource(input: Omit<PersonalSource, 'id' | 'addedAt'>): PersonalSource {
  const source: PersonalSource = { ...input, id: `source-${uuid()}`, addedAt: new Date().toISOString() }
  mutate((workspace) => workspace.sources.push(source))
  return source
}

export function removePersonalSource(id: string) {
  mutate((workspace) => {
    workspace.sources = workspace.sources.filter((source) => source.id !== id)
  })
}

export function markSourcesUsed(ids: string[]) {
  const at = new Date().toISOString()
  mutate((workspace) => {
    for (const source of workspace.sources) if (ids.includes(source.id)) source.usedAt = at
  })
}

// ── Notes ─────────────────────────────────────────────────────────────────

export function personalNotesFor(courseId: string): UnitNote[] {
  return getPersonalWorkspace().notes.filter((note) => note.courseId === courseId)
}

/** Build a stored note from Markdown whose first line is `# <code> <title>`. */
export function noteFromMarkdown(courseId: string, markdown: string, fallbackCode: string): UnitNote {
  const parsed = parseNote(markdown)
  const code = parsed.code || fallbackCode
  return {
    id: `pnote-${courseId}-${code}`,
    courseId,
    code,
    title: parsed.title || `Note ${code}`,
    summary: parsed.summary,
    revision: 1,
    updated: 'Just now',
    markdown,
    sections: parsed.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.blocks.filter((block) => block.kind !== 'callout').map((block) => block.text),
      callout: section.blocks.find((block) => block.kind === 'callout')?.text,
    })),
  }
}

/** Insert or replace notes by code; a rewrite bumps the revision. */
export function upsertPersonalNotes(courseId: string, notes: UnitNote[]) {
  mutate((workspace) => {
    for (const note of notes) {
      const index = workspace.notes.findIndex((item) => item.courseId === courseId && item.code === note.code)
      if (index >= 0) workspace.notes[index] = { ...note, revision: workspace.notes[index].revision + 1 }
      else workspace.notes.push(note)
    }
  })
}

export function deletePersonalNote(id: string) {
  mutate((workspace) => {
    workspace.notes = workspace.notes.filter((note) => note.id !== id)
  })
}
