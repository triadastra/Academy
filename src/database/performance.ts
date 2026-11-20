// performance.ts — the student's own grade book and study log.
//
// Stored on the user's database (`UserDatabase.performance`), so it follows
// the same per-user isolation, delta persistence and storage-quota handling as
// everything else a student owns. A personal account's record is as private as
// the rest of its workspace; a school account's never leaves this browser.
//
// What the student types in (assessments, study sessions, per-course credits
// and targets) is stored here. What the app already knows — answered practice
// questions and graded mock papers — is read from their own tables and merged
// in by `activityFor`, rather than copied, so there is one source of truth for
// each.
import { getCurrentUserDatabase, getCurrentUserId, updateDatabase } from '@/database/client'
import { normaliseCategory, rubricWeights, type ImportRow, type RubricEntry } from '@/lib/performance-import'
import type {
  FluencyRating,
  PerformanceAssessment,
  PerformanceCourseSettings,
  PerformanceRecord,
  StudySession,
} from '@/database/types'
import { uuid } from '@/lib/uuid'
import {
  knowledgeOn,
  localDate,
  percent,
  projectKnowledge,
  recentMinutesPerWeek,
  summariseGrade,
  type KnowledgeEvent,
} from '@/lib/performance-model'

const EMPTY: PerformanceRecord = { courses: {}, assessments: [], sessions: [] }

/** A rough sitting length for one answered practice question, in minutes. */
const MINUTES_PER_ATTEMPT = 3

export function getPerformance(): PerformanceRecord {
  const record = getCurrentUserDatabase().performance
  return {
    courses: record?.courses ?? EMPTY.courses,
    assessments: record?.assessments ?? EMPTY.assessments,
    sessions: record?.sessions ?? EMPTY.sessions,
    fluency: record?.fluency ?? [],
    coach: record?.coach,
  }
}

function mutate(change: (record: PerformanceRecord) => void) {
  updateDatabase((database) => {
    const user = database.userDatabases[database.appSettings.currentUserId]
    if (!user) return
    user.performance ??= { courses: {}, assessments: [], sessions: [] }
    user.performance.courses ??= {}
    user.performance.assessments ??= []
    user.performance.sessions ??= []
    change(user.performance)
    applyRubrics(user.performance)
  })
}

/**
 * Keep every rubric-governed weight in step with its rubric. Runs after every
 * change, so adding, deleting or importing an assessment re-splits its
 * category without each caller having to remember to.
 */
function applyRubrics(record: PerformanceRecord) {
  for (const settings of Object.values(record.courses)) {
    if (!settings.rubric?.length) continue
    const items = record.assessments.filter((item) => item.courseId === settings.courseId)
    const weights = rubricWeights(items, settings.rubric)
    for (const item of items) {
      const weight = weights.get(item.id)
      if (weight !== undefined) item.weight = weight
    }
  }
}

/** Set (or, with null, remove) the course's grading rubric. */
export function setRubric(courseId: string, rubric: RubricEntry[] | null, gpaBoost = 0) {
  mutate((record) => {
    const current = { ...defaultCourseSettings(courseId, gpaBoost), ...record.courses[courseId], courseId }
    if (rubric && rubric.length) current.rubric = rubric.map((entry) => ({ ...entry, category: normaliseCategory(entry.category) }))
    else delete current.rubric
    record.courses[courseId] = current
  })
}

export function rubricFor(courseId: string): RubricEntry[] {
  return getPerformance().courses[courseId]?.rubric ?? []
}

export function defaultCourseSettings(courseId: string, gpaBoost = 0): PerformanceCourseSettings {
  return { courseId, credits: 1, gpaBoost, target: 90, plannedMinutesPerWeek: null }
}

export function courseSettings(courseId: string, gpaBoost = 0): PerformanceCourseSettings {
  return { ...defaultCourseSettings(courseId, gpaBoost), ...getPerformance().courses[courseId] }
}

export function updateCourseSettings(courseId: string, patch: Partial<PerformanceCourseSettings>, gpaBoost = 0) {
  mutate((record) => {
    record.courses[courseId] = { ...defaultCourseSettings(courseId, gpaBoost), ...record.courses[courseId], ...patch, courseId }
  })
}

export function saveAssessment(input: Omit<PerformanceAssessment, 'id'> & { id?: string }) {
  const row: PerformanceAssessment = { ...input, id: input.id ?? `assessment-${uuid()}` }
  mutate((record) => {
    const index = record.assessments.findIndex((item) => item.id === row.id)
    if (index >= 0) record.assessments[index] = row
    else record.assessments.push(row)
  })
  return row
}

export function deleteAssessment(id: string) {
  mutate((record) => {
    record.assessments = record.assessments.filter((item) => item.id !== id)
  })
}

export function logStudySession(input: Omit<StudySession, 'id'>) {
  const row: StudySession = { ...input, id: `study-${uuid()}` }
  mutate((record) => record.sessions.push(row))
  return row
}

export function deleteStudySession(id: string) {
  mutate((record) => {
    record.sessions = record.sessions.filter((item) => item.id !== id)
  })
}

export function saveCoachReview(text: string) {
  mutate((record) => {
    record.coach = { at: new Date().toISOString(), text }
  })
}

/** Everything a course's knowledge curve is built from, oldest first. */
export interface CourseActivity {
  events: KnowledgeEvent[]
  /** Practice answered in the app, per day. */
  practice: Array<{ date: string; answered: number; correct: number }>
  /** Mock papers graded in the app — tracked, never counted in the grade. */
  mockPapers: Array<{ id: string; date: string; title: string; pct: number }>
}

export function activityFor(courseId: string): CourseActivity {
  const user = getCurrentUserDatabase()
  const userId = getCurrentUserId()
  const record = getPerformance()
  const events: KnowledgeEvent[] = []

  for (const session of record.sessions) {
    if (session.courseId === courseId) events.push({ kind: 'study', date: session.date, minutes: session.minutes })
  }
  for (const item of record.assessments) {
    if (item.courseId !== courseId || item.score === null || item.total <= 0) continue
    events.push({ kind: 'score', date: item.date, pct: percent(item.score, item.total) })
  }
  // A fluency rating is one topic's worth of judgement, not a whole-course
  // result, so it nudges the curve rather than resetting it.
  for (const rating of record.fluency ?? []) {
    if (rating.courseId !== courseId) continue
    events.push({ kind: 'score', date: localDate(new Date(rating.at)), pct: rating.score, strength: 0.15 })
  }

  const practiceByDay = new Map<string, { answered: number; correct: number }>()
  for (const attempt of user.questionAttempts ?? []) {
    if (attempt.courseId !== courseId || (attempt.userId && attempt.userId !== userId)) continue
    const date = localDate(new Date(attempt.attemptedAt))
    const day = practiceByDay.get(date) ?? { answered: 0, correct: 0 }
    day.answered += 1
    if (attempt.result === 'correct') day.correct += 1
    practiceByDay.set(date, day)
  }
  const practice = [...practiceByDay.entries()]
    .map(([date, day]) => ({ date, ...day }))
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const day of practice) {
    events.push({ kind: 'study', date: day.date, minutes: day.answered * MINUTES_PER_ATTEMPT })
    // A handful of answers is weak evidence; a full set is stronger.
    events.push({
      kind: 'score',
      date: day.date,
      pct: (day.correct / day.answered) * 100,
      strength: Math.min(0.35, 0.05 * day.answered),
    })
  }

  const mockPapers = (user.gradedPapers ?? [])
    .filter((paper) => paper.courseId === courseId && paper.total > 0)
    .map((paper) => ({
      id: paper.id,
      date: localDate(new Date(paper.gradedAt)),
      title: paper.testName,
      pct: percent(paper.score, paper.total),
    }))
  for (const paper of mockPapers) events.push({ kind: 'score', date: paper.date, pct: paper.pct, strength: 0.5 })

  events.sort((a, b) => a.date.localeCompare(b.date))
  return { events, practice, mockPapers }
}

/** Seed a believable term of data so a first visit shows what the page does. */
export function loadSampleTerm(courseIds: string[], today = localDate()) {
  if (courseIds.length === 0) return
  const base = Date.parse(`${today}T00:00:00Z`)
  const day = (offset: number) => new Date(base + offset * 86_400_000).toISOString().slice(0, 10)
  // Deterministic per course so the sample looks the same on every load.
  let seed = 7
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  mutate((record) => {
    courseIds.forEach((courseId, courseIndex) => {
      const skill = 72 + random() * 20
      const diligence = 0.3 + random() * 0.5
      const tests: Array<[string, string, number, number]> = [
        ['Quiz 1', 'Quiz', -70, 5],
        ['Unit test 1', 'Test', -55, 15],
        ['Quiz 2', 'Quiz', -38, 5],
        ['Unit test 2', 'Test', -20, 15],
        ['Quiz 3', 'Quiz', -6, 5],
        ['Unit test 3', 'Test', 14, 15],
        ['Final exam', 'Exam', 40, 40],
      ]
      for (const [title, category, offset, weight] of tests) {
        const drift = courseIndex % 2 === 0 ? offset / 20 : -offset / 25
        const score = offset <= 0 ? Math.round(Math.min(100, Math.max(45, skill + drift + (random() - 0.5) * 12))) : null
        record.assessments.push({
          sample: true,
          id: `assessment-${uuid()}`,
          courseId,
          title,
          category,
          date: day(offset),
          weight,
          score,
          total: 100,
        })
      }
      for (let offset = -84; offset <= 0; offset++) {
        // The second half of the list studies less lately, so the page has a
        // forgetting curve to show.
        const fading = courseIndex % 3 === 2 && offset > -25
        if (!fading && random() < diligence * 0.45) {
          record.sessions.push({
            sample: true,
            id: `study-${uuid()}`,
            courseId,
            date: day(offset),
            minutes: 20 + Math.round(random() * 70),
          })
        }
      }
    })
  })
}

// ── Fluency ───────────────────────────────────────────────────────────────

export type FluencyBand = 'Strong' | 'Developing' | 'Weak'

export function fluencyBand(score: number): FluencyBand {
  if (score >= 75) return 'Strong'
  if (score >= 50) return 'Developing'
  return 'Weak'
}

const topicKey = (topic: string) => topic.trim().toLowerCase().replace(/\s+/g, ' ')

export function fluencyFor(courseId: string): FluencyRating[] {
  return (getPerformance().fluency ?? [])
    .filter((rating) => rating.courseId === courseId)
    .sort((a, b) => b.score - a.score)
}

export interface FluencyInput {
  topic: string
  score: number
  evidence?: string
  noteCode?: string
}

/**
 * Record ratings, replacing any earlier one for the same topic. Inputs are
 * validated here rather than trusted, because the chat agent calls this with
 * whatever the model produced.
 */
export function recordFluency(courseId: string, inputs: FluencyInput[], source: FluencyRating['source']) {
  const at = new Date().toISOString()
  const clean: FluencyRating[] = []
  for (const input of inputs.slice(0, 12)) {
    const topic = String(input.topic ?? '').trim().slice(0, 80)
    const score = Number(input.score)
    if (!topic || !Number.isFinite(score)) continue
    clean.push({
      id: `fluency-${uuid()}`,
      courseId,
      topic,
      noteCode: input.noteCode ? String(input.noteCode).slice(0, 24) : undefined,
      score: Math.round(Math.min(100, Math.max(0, score))),
      evidence: String(input.evidence ?? '').trim().slice(0, 240),
      source,
      at,
    })
  }
  if (clean.length === 0) return []
  mutate((record) => {
    record.fluency ??= []
    for (const rating of clean) {
      record.fluency = record.fluency.filter(
        (item) => !(item.courseId === courseId && topicKey(item.topic) === topicKey(rating.topic)),
      )
      record.fluency.push(rating)
    }
    // Bounded: the newest 60 per course are plenty for a dashboard.
    const mine = record.fluency.filter((item) => item.courseId === courseId)
    if (mine.length > 60) {
      const drop = new Set(mine.sort((a, b) => a.at.localeCompare(b.at)).slice(0, mine.length - 60).map((item) => item.id))
      record.fluency = record.fluency.filter((item) => !drop.has(item.id))
    }
  })
  return clean
}

export function deleteFluency(id: string) {
  mutate((record) => {
    record.fluency = (record.fluency ?? []).filter((item) => item.id !== id)
  })
}

/**
 * What the chat agent sees when it asks how a student is doing in a course:
 * the same numbers the dashboard shows, compact enough for one tool result.
 */
export function courseSnapshot(courseId: string, today = localDate()) {
  const settings = courseSettings(courseId)
  const activity = activityFor(courseId)
  const pace = recentMinutesPerWeek(activity.events, today)
  const projection = projectKnowledge(activity.events, today, {
    minutesPerWeek: settings.plannedMinutesPerWeek ?? pace,
    horizonDays: 30,
  })
  const assessments = getPerformance()
    .assessments.filter((item) => item.courseId === courseId)
    .sort((a, b) => a.date.localeCompare(b.date))
  const grade = summariseGrade(assessments, settings.target, (date) => knowledgeOn(projection, date))
  const round = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10)
  const recentPractice = activity.practice.slice(-14)
  return {
    ok: true as const,
    today,
    grade: {
      currentPct: round(grade.current),
      projectedPct: round(grade.projected),
      targetPct: settings.target,
      neededOnRemainingPct: round(grade.needed),
      gradedShare: Math.round(grade.completed * 100),
    },
    knowledge: {
      now: round(projection.now),
      in30DaysOnPlan: round(projection.plan.at(-1)?.value ?? null),
      in30DaysIfStop: round(projection.stop.at(-1)?.value ?? null),
      daysSinceLastReview: projection.daysSinceReview,
    },
    study: { recentMinutesPerWeek: Math.round(pace), plannedMinutesPerWeek: settings.plannedMinutesPerWeek },
    assessments: assessments.slice(-10).map((item) => ({
      title: item.title,
      category: item.category,
      date: item.date,
      weightPct: item.weight,
      pct: item.score === null ? null : Math.round(percent(item.score, item.total)),
    })),
    practice: {
      days: recentPractice.length,
      answered: recentPractice.reduce((sum, day) => sum + day.answered, 0),
      correct: recentPractice.reduce((sum, day) => sum + day.correct, 0),
    },
    mockPapers: activity.mockPapers.slice(-5).map((paper) => ({ title: paper.title, date: paper.date, pct: Math.round(paper.pct) })),
    rubric: rubricFor(courseId).map((entry) => ({
      category: entry.category,
      weightPct: entry.weight,
      expectedCount: entry.count ?? null,
      recorded: assessments.filter((item) => normaliseCategory(item.category) === entry.category).length,
    })),
    fluency: fluencyFor(courseId).map((rating) => ({
      topic: rating.topic,
      noteCode: rating.noteCode ?? null,
      score: rating.score,
      band: fluencyBand(rating.score),
      evidence: rating.evidence,
      source: rating.source,
      at: rating.at,
    })),
  }
}

// ── Sample data and bulk import ───────────────────────────────────────────

export function sampleCounts() {
  const record = getPerformance()
  return {
    assessments: record.assessments.filter((item) => item.sample).length,
    sessions: record.sessions.filter((item) => item.sample).length,
  }
}

/** Remove everything "Load a sample term" created, and nothing the student entered. */
export function clearSampleData() {
  mutate((record) => {
    record.assessments = record.assessments.filter((item) => !item.sample)
    record.sessions = record.sessions.filter((item) => !item.sample)
  })
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Add pasted rows to one course. An assessment with the same name and date as
 * one already there is updated rather than duplicated, so pasting the same
 * list twice (say, after a new score comes in) is safe. Study sessions are
 * only skipped when an identical one (date, minutes, note) already exists.
 */
export function importRecords(courseId: string, rows: ImportRow[]) {
  let added = 0
  let updated = 0
  let skipped = 0
  mutate((record) => {
    for (const row of rows) {
      if (row.kind === 'assessment') {
        const existing = record.assessments.find(
          (item) => item.courseId === courseId && item.date === row.date && sameTitle(item.title, row.title),
        )
        if (existing) {
          Object.assign(existing, { category: row.category, weight: row.weight, score: row.score, total: row.total })
          delete existing.sample
          updated += 1
        } else {
          record.assessments.push({
            id: `assessment-${uuid()}`,
            courseId,
            title: row.title,
            category: row.category,
            date: row.date,
            weight: row.weight,
            score: row.score,
            total: row.total,
          })
          added += 1
        }
      } else {
        const duplicate = record.sessions.some(
          (item) =>
            item.courseId === courseId &&
            item.date === row.date &&
            item.minutes === row.minutes &&
            (item.note ?? '') === (row.note ?? ''),
        )
        if (duplicate) {
          skipped += 1
          continue
        }
        record.sessions.push({ id: `study-${uuid()}`, courseId, date: row.date, minutes: row.minutes, note: row.note })
        added += 1
      }
    }
  })
  return { added, updated, skipped }
}
