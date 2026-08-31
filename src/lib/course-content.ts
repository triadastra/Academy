// course-content.ts — what a course actually contains.
//
// Every "topic" surface in the app (What you know, Study plan, Chat's objective
// list) used to read from one hardcoded IB Maths array, so PHYSICS 10 was shown
// "2.3 Partial fractions". Topics now derive from the course's own shared
// notes: a note IS a topic. A course with no published notes has no topics, and
// the pages say so rather than borrowing another subject's syllabus.
import { getDatabase, getCurrentUserDatabase } from '@/database/client'
import { notesForCourse } from '@/database/notes-tools'
import { noteCodeFor } from '@/database/question-bank'
import type { IndexedQuestion, TopicStatus } from '@/database/types'

export interface CourseTopic {
  code: string
  title: string
  description: string
  /** 0–5. Seeded progress when the course has it, else derived from attempts. */
  mastery: number
  status: TopicStatus
}

function statusFor(mastery: number): TopicStatus {
  if (mastery === 0) return 'Not started'
  if (mastery <= 2) return 'Needs practice'
  if (mastery <= 3) return 'Building'
  return 'On track'
}

/**
 * Topics for a course, in note order. Mastery prefers the seeded progress table
 * (which only covers the demo Maths course) and otherwise reflects this
 * student's own answered questions for the topic.
 */
/**
 * The seeded progress tables are demo data for the courses they were written
 * for. Matching them by bare section code applied them to every course that
 * happened to have a 2.1, so CHINESE 9's 陶渊明与《归园田居》 was described as
 * "Domain, range, and behaviour of rational functions" and handed a mastery of
 * 4 out of 5 the student had never earned.
 */
const SEEDED_PROGRESS: Record<string, 'default' | 'apCalculus'> = {
  'math-aa-hl': 'default',
  'ap-calculus-ab': 'apCalculus',
}

export function topicsForCourse(courseId: string): CourseTopic[] {
  const database = getDatabase()
  const seededKey = SEEDED_PROGRESS[courseId]
  const seeded = seededKey ? database.progressTopics[seededKey] : []
  const attempts = getCurrentUserDatabase().questionAttempts

  // Attempts only record the question id (see QuestionAttempt in types.ts), not
  // the note it belongs to, so resolving "which topic was this attempt on"
  // means looking the question up and asking `noteCodeFor` — the same rule the
  // question bank itself uses to measure coverage. A bare substring match on
  // the id (e.g. id.includes(note.code)) both misses every seeded question,
  // whose ids are shaped like "hs-math-9-q01" with no note code in them, and
  // can falsely match an unrelated id that happens to contain the same digits.
  const questionsById = new Map<string, IndexedQuestion>()
  for (const question of [...database.questions, ...(database.synthesizedQuestions ?? [])]) {
    questionsById.set(question.id, question)
  }

  return notesForCourse(courseId).map((note) => {
    const seed = seeded.find((topic) => topic.code === note.code)
    if (seed) {
      return {
        code: note.code,
        title: note.title,
        // The note's own summary wins: it describes the lesson that is really
        // published, where the seed only describes the demo topic.
        description: note.summary || seed.description,
        mastery: seed.mastery,
        status: seed.status,
      }
    }

    // No seeded progress: count this student's correct answers on the topic,
    // capped at the 5-segment scale the UI uses.
    const forTopic = attempts.filter((attempt) => {
      const question = questionsById.get(attempt.questionId)
      return question ? noteCodeFor(question) === note.code : false
    })
    const correct = forTopic.filter((attempt) => attempt.result === 'correct').length
    const mastery = Math.min(5, correct)
    return {
      code: note.code,
      title: note.title,
      description: note.summary,
      mastery,
      status: statusFor(mastery),
    }
  })
}

/** Indexed questions for a course, scoped by the subject they were written for. */
export function questionsForSubject(subject: string) {
  return getDatabase().questions.filter(
    (question) => (question as { subject?: string }).subject === subject,
  )
}
