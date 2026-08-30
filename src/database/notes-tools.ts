// notes-tools.ts — the agent's hands on the shared course notes.
//
// Course notes are ONE shared markdown document per (course, unit). Every
// student in the course reads the same text, so an edit is a change to class
// material, not to a personal copy. That is why nothing here writes to a note
// directly: an agent proposes a revision, and applying it is a separate,
// recorded step. `AUTO_APPLY_TRUSTED` decides whether a trusted caller (a
// teacher, or the agent acting on a teacher's instruction) skips the queue.
//
// Every function is a tool: narrow arguments, a serialisable result, and a
// refusal instead of a guess when the request is ambiguous. NOTE_TOOLS at the
// bottom is the manifest to hand an LLM as its tool list.
import {
  getCurrentUserDatabase,
  getCurrentUserId,
  getDatabase,
  recordAudit,
  updateDatabase,
} from './client'
import { uuid } from '@/lib/uuid'
import { pushSystemNotification } from './notifications'
import type { CourseLevel, NoteRevision, NoteRevisionStatus, UnitNote } from './types'
import {
  appendCallout as appendCalloutToMarkdown,
  diffMarkdown,
  parseNote,
  replacePassage as replacePassageInMarkdown,
  searchNote,
  type DiffLine,
  type NoteSearchHit,
  type ParsedNote,
} from './notes-markdown'

/** A teacher-initiated edit skips review; a student-initiated one never does. */
const AUTO_APPLY_TRUSTED = true

/**
 * Level order for display. Read from the seed rather than redeclared, so the
 * picker in Setup and the ordering here can never drift apart.
 */
const LEVEL_ORDER = getDatabase().courseLevels

export type RevisionStatus = NoteRevisionStatus
export type { NoteRevision }

export interface ToolFailure {
  ok: false
  error: string
}

export type ToolResult<T> = ({ ok: true } & T) | ToolFailure

function fail(error: string): ToolFailure {
  return { ok: false, error }
}

function revisions(): NoteRevision[] {
  const database = getDatabase() as unknown as { noteRevisions?: NoteRevision[] }
  return database.noteRevisions ?? []
}

/**
 * Notes visible to a course: those authored for it, plus any still carrying the
 * legacy `*` wildcard from before notes were course-scoped.
 *
 * Levels filter rather than rank. SHSID teaches different material at S, S+, H
 * and H+, so a student sees only the notes written for their own level — never
 * a nearby level's, which would be content their class was not taught. A note
 * with no level predates level scoping and stays visible to everyone.
 */
export function notesForCourse(courseId: string, level?: CourseLevel): UnitNote[] {
  const resolved = level ?? getCourseLevel(courseId)
  return getDatabase().notes.filter((note) => {
    if (note.courseId !== courseId && note.courseId !== '*') return false
    if (!note.level) return true
    return note.level === resolved
  })
}

/** The level this student takes a course at, if they have chosen one. */
export function getCourseLevel(courseId: string): CourseLevel | undefined {
  return getCurrentUserDatabase().settings.courseLevels?.[courseId]
}

/**
 * Levels this course actually has notes for. Used to tell "you have not picked
 * a level" apart from "no guide exists at your level", which read the same to a
 * student but need different messages.
 */
export function levelsWithNotes(courseId: string): CourseLevel[] {
  const levels = new Set<CourseLevel>()
  for (const note of getDatabase().notes) {
    if (note.courseId !== courseId) continue
    if (note.level) levels.add(note.level)
  }
  return LEVEL_ORDER.filter((level) => levels.has(level))
}

function findNote(courseId: string, code: string): UnitNote | undefined {
  return notesForCourse(courseId).find((note) => note.code === code)
}

/** Markdown body of a note, falling back to the legacy `sections` shape. */
export function noteMarkdown(note: UnitNote): string {
  if (note.markdown) return note.markdown
  const parts = [`# ${note.code} ${note.title}`, '', note.summary, '']
  for (const section of note.sections ?? []) {
    parts.push(`## ${section.title}`, '')
    for (const paragraph of section.body) parts.push(paragraph, '')
    if (section.callout) parts.push(`> ${section.callout}`, '')
  }
  return parts.join('\n').trim()
}

// ── read tools ─────────────────────────────────────────────────────────────

export function listNotes(courseId: string) {
  return {
    ok: true as const,
    notes: notesForCourse(courseId).map((note) => ({
      code: note.code,
      title: note.title,
      summary: note.summary,
      revision: note.revision,
      updated: note.updated,
    })),
  }
}

export function readNote(
  courseId: string,
  code: string,
): ToolResult<{ code: string; markdown: string; revision: number; parsed: ParsedNote }> {
  const note = findNote(courseId, code)
  if (!note) return fail(`No note ${code} in course ${courseId}.`)
  const markdown = noteMarkdown(note)
  return { ok: true, code: note.code, markdown, revision: note.revision, parsed: parseNote(markdown) }
}

export function readSection(
  courseId: string,
  code: string,
  sectionId: string,
): ToolResult<{ sectionTitle: string; text: string }> {
  const note = findNote(courseId, code)
  if (!note) return fail(`No note ${code} in course ${courseId}.`)
  const section = parseNote(noteMarkdown(note)).sections.find((item) => item.id === sectionId)
  if (!section) return fail(`No section "${sectionId}" in note ${code}.`)
  return {
    ok: true,
    sectionTitle: section.title,
    text: section.blocks.map((block) => block.text).join('\n\n'),
  }
}

/** Searches every note in the course — the agent's entry point for grounding. */
export function searchNotes(
  courseId: string,
  query: string,
  limit = 8,
): ToolResult<{ hits: Array<NoteSearchHit & { code: string; noteTitle: string }> }> {
  if (!query.trim()) return fail('Search query is empty.')
  const hits: Array<NoteSearchHit & { code: string; noteTitle: string }> = []
  for (const note of notesForCourse(courseId)) {
    for (const hit of searchNote(noteMarkdown(note), query, limit)) {
      hits.push({ ...hit, code: note.code, noteTitle: note.title })
      if (hits.length >= limit) return { ok: true, hits }
    }
  }
  return { ok: true, hits }
}

/** A citation an answer can carry back to the exact passage it came from. */
export function citePassage(
  courseId: string,
  code: string,
  sectionId: string,
): ToolResult<{ citation: string; anchor: string }> {
  const note = findNote(courseId, code)
  if (!note) return fail(`No note ${code} in course ${courseId}.`)
  const section = parseNote(noteMarkdown(note)).sections.find((item) => item.id === sectionId)
  if (!section) return fail(`No section "${sectionId}" in note ${code}.`)
  return {
    ok: true,
    citation: `${note.code} ${note.title} · ${section.title} · rev ${note.revision}`,
    anchor: `/course/notes?note=${note.code}#${section.id}`,
  }
}

export function listRevisions(courseId: string, code?: string) {
  return {
    ok: true as const,
    revisions: revisions().filter(
      (revision) => revision.courseId === courseId && (!code || revision.code === code),
    ),
  }
}

// ── write tools ────────────────────────────────────────────────────────────

interface ProposeInput {
  courseId: string
  code: string
  markdown: string
  rationale: string
  authorRole?: NoteRevision['authorRole']
  authorId?: string
}

/**
 * Queues a full-document revision. Returns the diff so the caller can show what
 * would change before anyone commits to it.
 */
export function proposeRevision(
  input: ProposeInput,
): ToolResult<{ revision: NoteRevision; diff: DiffLine[]; applied: boolean }> {
  const note = findNote(input.courseId, input.code)
  if (!note) return fail(`No note ${input.code} in course ${input.courseId}.`)
  if (!input.rationale.trim()) return fail('A revision needs a rationale.')

  const before = noteMarkdown(note)
  if (before.trim() === input.markdown.trim()) return fail('Proposed markdown is unchanged.')

  const authorRole = input.authorRole ?? 'student'
  const revision: NoteRevision = {
    id: `rev-${note.code}-${uuid()}`,
    courseId: note.courseId,
    code: note.code,
    status: 'pending',
    markdown: input.markdown,
    rationale: input.rationale.trim(),
    authorId: input.authorId ?? getCurrentUserId(),
    authorRole,
    createdAt: new Date().toISOString(),
    fromRevision: note.revision,
  }

  updateDatabase((database) => {
    const table = database as unknown as { noteRevisions?: NoteRevision[] }
    table.noteRevisions ??= []
    table.noteRevisions.push(revision)
  })
  recordAudit({
    actorId: revision.authorId,
    action: 'note.revision-proposed',
    subjectId: revision.id,
    subjectName: `${note.code} · ${note.title}`,
    purpose: `Revision proposed to shared course material by a ${authorRole}`,
    rows: 1,
    result: 'success',
  })

  const diff = diffMarkdown(before, input.markdown)
  const trusted = authorRole === 'teacher' && AUTO_APPLY_TRUSTED
  if (!trusted) return { ok: true, revision, diff, applied: false }

  const result = applyRevision(revision.id, revision.authorId)
  if (!result.ok) return { ok: true, revision, diff, applied: false }
  return { ok: true, revision: result.revision, diff, applied: true }
}

/** Commits a pending revision to the shared note every student reads. */
export function applyRevision(
  revisionId: string,
  reviewerId?: string,
): ToolResult<{ revision: NoteRevision }> {
  const pending = revisions().find((revision) => revision.id === revisionId)
  if (!pending) return fail(`No revision ${revisionId}.`)
  if (pending.status !== 'pending') return fail(`Revision ${revisionId} is already ${pending.status}.`)

  // The note may live only in the runtime-fetched corpus, which merges into a
  // shallow copy on read and is deliberately not part of the stored database.
  // `updateDatabase` hands out the stored object, so looking there alone found
  // nothing for any corpus note: the revision was marked pending forever and
  // applying it silently did nothing. Copy it in on first edit — from then on
  // it is a stored, edited note like any other.
  const corpusNote = findNote(pending.courseId, pending.code)

  let applied: NoteRevision | null = null
  updateDatabase((database) => {
    let note = database.notes.find(
      (item) => item.code === pending.code && item.courseId === pending.courseId,
    )
    if (!note && corpusNote) {
      note = structuredClone(corpusNote)
      database.notes.push(note)
    }
    if (!note) return
    note.markdown = pending.markdown
    note.revision += 1
    note.updated = 'Just now'

    // Keep the derived fields the rest of the app still reads in step.
    const parsed = parseNote(pending.markdown)
    note.title = parsed.title || note.title
    note.summary = parsed.summary || note.summary
    note.sections = parsed.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.blocks.filter((block) => block.kind !== 'callout').map((block) => block.text),
      callout: section.blocks.find((block) => block.kind === 'callout')?.text,
    }))

    const table = database as unknown as { noteRevisions?: NoteRevision[] }
    const record = table.noteRevisions?.find((revision) => revision.id === revisionId)
    if (record) {
      record.status = 'applied'
      record.toRevision = note.revision
      record.reviewedBy = reviewerId ?? getCurrentUserId()
      record.reviewedAt = new Date().toISOString()
      applied = record
    }
  })

  if (!applied) return fail(`Could not apply revision ${revisionId}.`)
  const appliedBy = reviewerId ?? getCurrentUserId()
  recordAudit({
    actorId: appliedBy,
    action: 'note.revision-applied',
    subjectId: revisionId,
    subjectName: pending.code,
    purpose: 'Revision committed to shared course material',
    rows: 1,
    result: 'success',
  })
  // Tell the author their edit landed — unless they applied it themselves,
  // in which case they were watching it happen.
  if (pending.authorId !== appliedBy) {
    pushSystemNotification({
      recipientId: pending.authorId,
      title: `Your edit to note ${pending.code} was applied`,
      body: `The revision you proposed to note ${pending.code} has been reviewed and committed to the shared course material. Every student in the course now reads your version.`,
    })
  }
  return { ok: true, revision: applied }
}

export function rejectRevision(
  revisionId: string,
  reason: string,
  reviewerId?: string,
): ToolResult<{ revision: NoteRevision }> {
  const pending = revisions().find((revision) => revision.id === revisionId)
  if (!pending) return fail(`No revision ${revisionId}.`)
  if (pending.status !== 'pending') return fail(`Revision ${revisionId} is already ${pending.status}.`)

  let rejected: NoteRevision | null = null
  updateDatabase((database) => {
    const table = database as unknown as { noteRevisions?: NoteRevision[] }
    const record = table.noteRevisions?.find((revision) => revision.id === revisionId)
    if (!record) return
    record.status = 'rejected'
    record.rejectionReason = reason
    record.reviewedBy = reviewerId ?? getCurrentUserId()
    record.reviewedAt = new Date().toISOString()
    rejected = record
  })

  if (!rejected) return fail(`Could not reject revision ${revisionId}.`)
  const rejectedBy = reviewerId ?? getCurrentUserId()
  recordAudit({
    actorId: rejectedBy,
    action: 'note.revision-rejected',
    subjectId: revisionId,
    subjectName: pending.code,
    purpose: `Revision rejected: ${reason}`,
    rows: 1,
    result: 'success',
  })
  if (pending.authorId !== rejectedBy) {
    pushSystemNotification({
      recipientId: pending.authorId,
      title: `Your edit to note ${pending.code} was not applied`,
      body: `The revision you proposed to note ${pending.code} was reviewed and rejected: ${reason}. The shared course material is unchanged; you can revise the proposal and submit it again.`,
    })
  }
  return { ok: true, revision: rejected }
}

/**
 * Targeted edit: swap one passage for another. Refuses when the passage is
 * missing or appears more than once, rather than editing the wrong copy.
 */
export function proposePassageEdit(input: {
  courseId: string
  code: string
  find: string
  replace: string
  rationale: string
  authorRole?: NoteRevision['authorRole']
}) {
  const note = findNote(input.courseId, input.code)
  if (!note) return fail(`No note ${input.code} in course ${input.courseId}.`)
  const next = replacePassageInMarkdown(noteMarkdown(note), input.find, input.replace)
  if (!next) return fail('That passage is missing or appears more than once — quote it exactly.')
  return proposeRevision({ ...input, markdown: next.markdown })
}

/** Adds a teaching aside to a section — the most common agent-authored edit. */
export function proposeCallout(input: {
  courseId: string
  code: string
  sectionId: string
  text: string
  rationale: string
  authorRole?: NoteRevision['authorRole']
}) {
  const note = findNote(input.courseId, input.code)
  if (!note) return fail(`No note ${input.code} in course ${input.courseId}.`)
  const next = appendCalloutToMarkdown(noteMarkdown(note), input.sectionId, input.text)
  if (!next) return fail(`No section "${input.sectionId}" in note ${input.code}.`)
  return proposeRevision({ ...input, markdown: next })
}

// ── manifest ───────────────────────────────────────────────────────────────

/**
 * Tool list to hand a model. Kept beside the implementations so a tool cannot
 * be added, renamed or re-scoped without its description moving with it.
 */
export const NOTE_TOOLS = [
  {
    name: 'notes_list',
    description: 'List every shared note in the course with its revision number.',
    parameters: { courseId: 'string' },
  },
  {
    name: 'notes_read',
    description: 'Read one note as markdown, plus its parsed sections.',
    parameters: { courseId: 'string', code: 'string' },
  },
  {
    name: 'notes_read_section',
    description: 'Read a single section of a note by its slug.',
    parameters: { courseId: 'string', code: 'string', sectionId: 'string' },
  },
  {
    name: 'notes_search',
    description: 'Search the course notes. Use before answering, to ground the answer in the shared text.',
    parameters: { courseId: 'string', query: 'string', limit: 'number?' },
  },
  {
    name: 'notes_cite',
    description: 'Get a citation string and deep link for a section, to attach to an answer.',
    parameters: { courseId: 'string', code: 'string', sectionId: 'string' },
  },
  {
    name: 'notes_propose_revision',
    description:
      'Queue a full rewrite of a note. Shared class material — a student proposal waits for review.',
    parameters: { courseId: 'string', code: 'string', markdown: 'string', rationale: 'string' },
  },
  {
    name: 'notes_propose_passage_edit',
    description:
      'Queue a change to one exact passage. Refuses if the quoted text is missing or ambiguous.',
    parameters: {
      courseId: 'string',
      code: 'string',
      find: 'string',
      replace: 'string',
      rationale: 'string',
    },
  },
  {
    name: 'notes_propose_callout',
    description: 'Queue a teaching aside appended to a section.',
    parameters: {
      courseId: 'string',
      code: 'string',
      sectionId: 'string',
      text: 'string',
      rationale: 'string',
    },
  },
  {
    name: 'notes_list_revisions',
    description: 'List proposed, applied and rejected revisions for a course or a single note.',
    parameters: { courseId: 'string', code: 'string?' },
  },
  {
    name: 'notes_apply_revision',
    description: 'Apply a pending revision to the shared note. Teacher action.',
    parameters: { revisionId: 'string' },
  },
  {
    name: 'notes_reject_revision',
    description: 'Reject a pending revision with a reason. Teacher action.',
    parameters: { revisionId: 'string', reason: 'string' },
  },
] as const
