export type CoursePathway = 'HS' | 'IB' | 'AP' | 'AL'
// SHSID streams each course by level and teaches different content in each, so
// a level is not a difficulty dial over shared material — it selects which
// notes exist at all. H+ is taught in Maths and English only.
export type CourseLevel = 'S' | 'S+' | 'H' | 'H+'

export interface CatalogCourse {
  id: string
  pathway: CoursePathway
  code: string
  title: string
  subject: string
  grades: number[]
}

export interface SeedCourse {
  id: string
  code: string
  title: string
  teacher: string
  unit: string
  progressPct: number
  gaps: number
}

export interface NoteSection {
  id: string
  title: string
  body: string[]
  callout?: string
}

export interface UnitNote {
  id: string
  /** Real course id. `*` is the legacy wildcard from before notes were scoped. */
  courseId: string
  code: string
  title: string
  summary: string
  revision: number
  updated: string
  /**
   * Source of truth for the note body. `title`, `summary` and `sections` are
   * derived from it on every applied revision — never edit them independently.
   */
  markdown?: string
  /** Derived from `markdown`; kept for readers that want the parsed shape. */
  sections: NoteSection[]
  /**
   * Course level this note was written for. A note without one predates level
   * scoping and is shown at every level; a note with one is shown only to
   * students taking the course at that level.
   */
  level?: CourseLevel
}

export type NoteRevisionStatus = 'pending' | 'applied' | 'rejected'

/** An edit to shared class material, recorded whether or not it is applied. */
export interface NoteRevision {
  id: string
  courseId: string
  code: string
  status: NoteRevisionStatus
  markdown: string
  rationale: string
  authorId: string
  authorRole: 'student' | 'teacher' | 'agent'
  createdAt: string
  fromRevision: number
  toRevision?: number
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
}

export type TopicStatus = 'Needs practice' | 'Building' | 'On track' | 'Not started'

export interface ProgressTopic {
  code: string
  title: string
  description: string
  mastery: number
  status: TopicStatus
}

/**
 * How a typed answer is marked.
 *
 * `includesAll` and `equalsAny` are string tests and were the only two modes:
 * every numeric answer was therefore marked by substring, so "0.667" failed a
 * question whose stored answer was "2/3" and "16" passed one whose answer was
 * "6". `numeric` compares magnitudes with a tolerance, and `choice` matches an
 * option id, so multiple choice is marked as a choice rather than as prose that
 * happens to contain the letter B.
 */
export interface AnswerRule {
  mode: 'includesAll' | 'equalsAny' | 'numeric' | 'choice'
  values: string[]
  /**
   * `numeric` only. Absolute tolerance when < 1 and the expected value is
   * small; otherwise treated as relative. Defaults to a tight relative
   * tolerance so a rounded decimal passes and a wrong answer does not.
   */
  tolerance?: number
}

/** One option of a multiple-choice item. `id` is what `answerRule` matches. */
export interface QuestionOption {
  id: string
  text: string
  /** Why this distractor is tempting — shown after an incorrect attempt. */
  why?: string
}

/** One line of a mark scheme, for items no string rule can mark. */
export interface RubricCriterion {
  marks: number
  criterion: string
}

/**
 * Where a question came from.
 *
 * `indexed` is curated material — a course problem set, a past paper, a
 * de-identified student script. `synthesized` was written by Syno from the
 * session's own notes. The two are never presented as the same thing: a
 * synthesized item carries the tag everywhere it appears, because a student
 * deserves to know whether they are practising the course's questions or the
 * model's reading of the course's notes.
 */
export type QuestionOrigin = 'indexed' | 'synthesized'

/**
 * Review state. Only synthesized items have one.
 *
 * `draft` — written but not yet accepted into the bank. Visible only in the
 * review queue. `published` — accepted; practises like any other question.
 * `retired` — kept for the audit trail, hidden from practice.
 */
export type QuestionStatus = 'draft' | 'published' | 'retired'

/**
 * What a synthesized item was made from, and by what.
 *
 * This is the receipt. Without it a synthesized question is an unattributable
 * claim about the syllabus; with it, a student can open the exact note section
 * it was drawn from and a teacher can see which model wrote it and when.
 */
export interface QuestionProvenance {
  /** Note codes the item was drawn from, e.g. ["1.4"]. */
  noteCodes: string[]
  /** Citation strings pinned to the note revision that was read. */
  citations: string[]
  /** Note revisions at generation time — how staleness is detected later. */
  noteRevisions?: Record<string, number>
  model: string
  generatedAt: string
  /** Who set it going: a person pressing the button, or Syno reading notes. */
  trigger: 'manual' | 'agent'
  /** The account the generation ran under. */
  requestedBy?: string
}

export interface IndexedQuestion {
  id: string
  courseId: string
  code: string
  unit: string
  topic: string
  prompt: string
  tex?: string
  type: 'Short response' | 'Extended response' | 'Multiple choice'
  difficulty: 'Foundation' | 'Standard' | 'Challenge'
  marks: number
  source: string
  sourceType: 'Course material' | 'Student paper' | 'Course paper' | 'Synthesized from notes'
  answer: string
  answerRule: AnswerRule
  steps: string[]
  /**
   * Catalogue subject. Present on every seeded row and read by the wildcard
   * narrowing in the question base; it was previously only ever cast in.
   */
  subject?: string
  /**
   * Session scope — the level this question belongs to.
   *
   * SHSID teaches different material at S, S+, H and H+, so a question written
   * for G9 English S+ is not a harder or easier version of the H one, it is a
   * question about a text the H class was never set. A row with no level
   * predates session scoping and stays visible at every level; a synthesized
   * row always carries one and is shown to that session only.
   */
  level?: CourseLevel
  /** Absent means `indexed` — every curated row predates the distinction. */
  origin?: QuestionOrigin
  /** Absent means `published`. Only synthesized rows are ever drafts. */
  status?: QuestionStatus
  provenance?: QuestionProvenance
  /** The synthesis block (batch) this item was written in. */
  batchId?: string
  /** Multiple choice options. `answerRule.mode` is `choice` when present. */
  options?: QuestionOption[]
  /** Mark scheme for extended responses, which no string rule can mark. */
  rubric?: RubricCriterion[]
  /** The specific wrong turn the item is designed to catch. */
  misconception?: string
  /** Free-form retrieval tags. */
  tags?: string[]
}

/**
 * One generation run, scoped to exactly one session.
 *
 * Generated items arrive as a *block*, not as loose rows: a block records the
 * session it belongs to, the notes it was drawn from, what was discarded by
 * validation, and who or what asked for it. That is what makes the output
 * reviewable and reversible — accepting or discarding a whole run is one act,
 * and a bank that has drifted can be rolled back a block at a time instead of
 * a question at a time.
 */
export interface SynthesisBatch {
  id: string
  courseId: string
  /** null only for a course whose notes carry no level at all. */
  level: CourseLevel | null
  /** `${courseId}::${level ?? '*'}` — the session this block belongs to. */
  sessionKey: string
  kind: 'questions' | 'paper'
  createdAt: string
  createdBy: string
  trigger: 'manual' | 'agent'
  model: string
  noteCodes: string[]
  questionIds: string[]
  /** Papers only. */
  paperId?: string
  status: 'draft' | 'accepted' | 'discarded'
  /** How many drafts validation threw away, so the count stays honest. */
  rejected: number
  /** Why they were thrown away, deduplicated. */
  rejectionReasons?: string[]
}

export interface MockTest {
  id: string
  /** Papers are shared per catalogue subject, not per course. */
  subject: string
  courseId: string
  name: string
  /** Paper topic, e.g. "Techniques of integration". */
  title: string
  subtitle: string
  timeMinutes: number
  totalMarks: number
  questionCount: number
  pageCount: number
  pdfUrl: string
  annotatedPdfUrl: string
  downloadName: string
  sources: string[]
  /**
   * Session scope, same rule as `IndexedQuestion.level`. The shipped papers
   * carry none and are shown at every level; a synthesized paper always
   * carries one, because it is assembled out of one session's questions.
   */
  level?: CourseLevel
  /** Absent means `indexed` — a paper with a rendered PDF behind it. */
  origin?: QuestionOrigin
  /**
   * Synthesized papers have no PDF. They are an ordered selection of question
   * ids drawn from the session's own bank, rendered in the app and printed
   * from there, so `pdfUrl` is empty and this is what the viewer reads.
   */
  questionIds?: string[]
  /** Rubric heading shown above the first question. */
  instructions?: string
  batchId?: string
  createdAt?: string
}

export interface QuestionAttempt {
  id: string
  userId: string
  courseId: string
  questionId: string
  answer: string
  result: 'correct' | 'incorrect'
  attemptedAt: string
}

export interface GradedPaper {
  id: string
  userId: string
  courseId: string
  mockTestId: string
  fileName: string
  testName: string
  score: number
  total: number
  gradedAt: string
  annotatedPdfUrl: string
}

export interface DatabaseSettings {
  grade: number | null
  pathway: CoursePathway | null
  selectedCourseIds: string[]
  courseLevels: Record<string, CourseLevel>
  activeCourseId: string | null
  courseMenuCollapsed: boolean
  pendingChatPrompt: string
  /**
   * Whether Syno may draft questions on its own while it reads and compares
   * this course's notes during a conversation.
   *
   * `undefined` reads as ON — see `autoSynthesisEnabled` in question-bank.ts.
   * It is opt-OUT rather than opt-in because the drafts land in a review queue
   * and nothing reaches the practice bank without someone accepting it; the
   * cost of it being on is a small background call, and the cost of it being
   * off by default is that the feature never runs for anyone.
   */
  autoSynthesis?: boolean
  /**
   * When this account finished the first-run tour of the app (ISO time).
   * Absent means it has never been completed, so the tour is shown — and
   * cannot be dismissed — on the account's first visit to a course page.
   * Optional, so databases written before the tour existed read as "not
   * seen" without a schema bump.
   */
  tutorialCompletedAt?: string
  /**
   * How each tutorial ended for this account — finished or skipped — so a
   * choice made on one browser holds on the next. Mirrored in the
   * `synonance_tutorials` cookie; see the tutorial section of client.ts.
   */
  tutorials?: Partial<Record<TutorialId, TutorialChoice>>
}

export type TutorialId = 'access-video' | 'access-guide' | 'app-tour'

export interface TutorialChoice {
  outcome: 'done' | 'skipped'
  /** ISO instant. */
  at: string
}

export interface UserProfile {
  displayName: string
  email: string
  language: string
  timezone: string
  reducedMotion: boolean
  emailSummaries: string
  citationDisplay: string
}

export type UserRole = 'Student' | 'Teacher' | 'Admin'

/**
 * Account lifecycle. `suspended` blocks sign-in and ends any live session;
 * `erased` is the tombstone left behind after a deletion, keeping the id
 * resolvable so audit entries referring to it do not dangle.
 */
export type AccountStatus = 'active' | 'suspended' | 'erased'

/**
 * School accounts sign in through Launchpad and read the institution's shared
 * course material. Personal accounts are private to this browser: they build
 * their own courses and never see, or write to, anything the school shares.
 */
export type AccountKind = 'school' | 'personal'

export interface ApplicationUser {
  id: string
  /** Absent means a school account — every row written before this existed. */
  accountKind?: AccountKind
  /** Personal accounts sign in with this instead of a school email. */
  username?: string
  name: string
  initials: string
  role: UserRole
  email: string
  /** Legacy institution-local identifier. New Launchpad accounts use launchpadVid. */
  schoolId: string
  /** Stable OIDC subject. This, rather than email, is the 1:1 account binding. */
  launchpadSub?: string
  /** Launchpad Virtual Identifier, copied from Launchpad and never user-editable in Synonance. */
  launchpadVid?: string
  /** Institution asserted by Launchpad at the most recent verified sign-in. */
  launchpadInstitutionId?: string
  /** When Launchpad most recently asserted both verification and institution membership. */
  launchpadVerifiedAt?: string
  displayName?: string
  avatarUrl?: string
  /**
   * PBKDF2 verifier — never a password. See src/lib/password.ts for what this
   * does and does not protect against.
   */
  passwordHash?: PasswordHash
  status?: AccountStatus
  createdAt?: string
  suspendedAt?: string
  /** User id of the administrator who suspended or reinstated this account. */
  suspendedBy?: string
  erasedAt?: string
}

/**
 * One entry in the append-only access log.
 *
 * Recorded for anything an administrator would be asked to account for: who
 * signed in, whose data was exported, who changed a role, what was erased. It
 * deliberately carries ids and a summary rather than the affected content — an
 * audit log that quotes the data it is auditing is a second copy of it.
 */
export interface AuditEntry {
  id: string
  at: string
  /** Who acted. `system` for anything not user-initiated. */
  actorId: string
  actorName: string
  action: AuditAction
  /** The user, note or record acted upon, when there is one. */
  subjectId?: string
  subjectName?: string
  /** Human-readable purpose shown in the compliance table. */
  purpose: string
  /** How many records the action touched. */
  rows: number
  result: 'success' | 'failure' | 'denied'
  /** Failure reason, or any short qualifier worth keeping. */
  detail?: string
}

export type AuditAction =
  | 'session.signin'
  | 'session.signout'
  | 'session.expired'
  | 'session.denied'
  | 'account.created'
  | 'account.role-changed'
  | 'account.password-changed'
  | 'account.suspended'
  | 'account.reinstated'
  | 'account.erased'
  | 'data.exported'
  | 'note.revision-proposed'
  | 'note.revision-applied'
  | 'note.revision-rejected'
  | 'storage.compacted'
  | 'storage.quarantined'
  | 'questions.synthesized'
  | 'questions.accepted'
  | 'questions.discarded'
  | 'paper.synthesized'
  | 'notification.sent'

/**
 * How a notification was addressed.
 *
 * `direct` — an administrator wrote to one person. `broadcast` — an
 * administrator wrote to the whole institution. `system` — the app itself
 * reporting an event to the person it affects (a revision decision, a role
 * change), with no human composer behind it.
 */
export type NotificationKind = 'direct' | 'broadcast' | 'system'

/**
 * One notification, in the shared runtime table.
 *
 * Rows are runtime-created in their entirety — the seed ships none — so the
 * table is stored whole in the delta, like `synthesizedQuestions`. Read state
 * deliberately does NOT live here: a broadcast is one row delivered to every
 * account, so "read" belongs to each reader (`UserDatabase.notificationReads`),
 * not to the row.
 */
export interface AppNotification {
  id: string
  kind: NotificationKind
  /** User id, or `'*'` for a broadcast to every account. */
  recipientId: string
  /** `system` for app-generated rows. */
  senderId: string
  senderName: string
  title: string
  body: string
  createdAt: string
}

/**
 * Two markdown documents the tutor may read to personalise its answers.
 *
 * PRIVACY: this is personal data and lives ONLY inside the owning user's entry
 * in `userDatabases`. It is never written to a shared table, never attached to
 * a note revision, and never leaves the student's own record — the one place it
 * does travel is into the model prompt when that student asks a question, which
 * is the point of it. Keep it that way: anything added here should be about the
 * student's own learning, not identifying detail.
 */
export interface UserMemory {
  /** userpersona.md — who the student is: how they learn, what helps them. */
  persona: string
  /** userstudy.md — what they are studying now: goals, deadlines, focus. */
  study: string
  updatedAt: string
}

/**
 * Durable local authentication.
 *
 * Two clocks, because they answer different questions. `expiresAt` is the
 * absolute ceiling — a session is never valid past it however active the user
 * has been, which is what bounds the damage from a device that is lost while
 * signed in. `idleExpiresAt` slides forward on activity and closes an
 * abandoned session on a shared school machine long before the ceiling.
 *
 * A session with neither field predates expiry and is treated as expired on
 * first read, so upgrading does not leave old sessions immortal.
 */
export interface AuthSession {
  authenticated: boolean
  institutionId: string
  /** Launchpad sessions may read institution content; local-admin sessions may not. */
  identityProvider?: 'launchpad' | 'local-admin' | 'personal'
  signedInAt: string | null
  lastSeenAt: string | null
  /** Absolute end of the session, ISO. */
  expiresAt?: string | null
  /** Sliding idle deadline, ISO. Refreshed by `touchSession`. */
  idleExpiresAt?: string | null
  /**
   * Random per-browser identifier, so the session list can distinguish devices
   * without fingerprinting one.
   */
  deviceId?: string
}

/** PBKDF2-HMAC-SHA256 verifier. Mirrors the shape in src/lib/password.ts. */
export interface PasswordHash {
  algorithm: 'pbkdf2-sha256'
  iterations: number
  salt: string
  hash: string
}

/**
 * Failed sign-in throttling for the local administrator form.
 *
 * Client-side, so it slows a person at a keyboard rather than an attacker with
 * devtools. That is still the right thing to have: the realistic threat to a
 * shared school machine is someone guessing, not someone scripting.
 */
export interface SignInThrottle {
  failedAttempts: number
  firstFailureAt: string | null
  lockedUntil: string | null
}

export interface UserDatabase {
  profile: UserProfile
  memory: UserMemory
  session: AuthSession
  settings: DatabaseSettings
  questionAttempts: QuestionAttempt[]
  gradedPapers: GradedPaper[]
  chatThreads: Array<Record<string, unknown>>
  uploads: Array<Record<string, unknown>>
  /**
   * Ids from the shared `notifications` table this user has read. Per-reader,
   * because a broadcast is one row with many readers. Optional: absent on any
   * database written before notifications existed, and reads as "none read".
   */
  notificationReads?: string[]
  /**
   * The student's own grade book, study log and projections — see
   * src/database/performance.ts. Optional, so a database written before the
   * tracker existed reads as an empty record without a schema bump.
   */
  performance?: PerformanceRecord
  /**
   * A personal account's private workspace: courses it created, the files it
   * dropped in, and the notes the agent wrote from them. Never present on a
   * school account. See src/database/personal.ts.
   */
  personal?: PersonalWorkspace
}

// ── Performance tracking ──────────────────────────────────────────────────

/** Per-course settings the grade and GPA maths need. */
export interface PerformanceCourseSettings {
  courseId: string
  /** Credit hours / units; the GPA weight of this course. */
  credits: number
  /** Added to grade points for weighted GPA (Honors 0.5, AP/IB 1.0). */
  gpaBoost: number
  /** Target final percentage. */
  target: number
  /** Minutes per week the student plans to study; drives the projection. */
  plannedMinutesPerWeek: number | null
  /**
   * How the course is graded, by category. When set, each assessment's weight
   * in a listed category is derived from it (see `rubricWeights`).
   */
  rubric?: Array<{ category: string; weight: number; count?: number }>
}

export interface PerformanceAssessment {
  id: string
  courseId: string
  title: string
  category: string
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string
  /** Share of the final course grade, in percent. 0 = tracked but not graded. */
  weight: number
  /** Marks earned; null while the assessment is still upcoming. */
  score: number | null
  total: number
  /** Made by "Load a sample term", so "Remove sample data" can find it. */
  sample?: true
}

export interface StudySession {
  id: string
  courseId: string
  /** `YYYY-MM-DD` */
  date: string
  minutes: number
  note?: string
  /** Made by "Load a sample term". */
  sample?: true
}

/**
 * How fluent the student is in one topic, as judged by Syno from a
 * conversation (or set by hand). Shown on the dashboard and fed into the
 * knowledge curve as light evidence.
 */
export interface FluencyRating {
  id: string
  courseId: string
  /** Topic in the student's words or the note title. */
  topic: string
  noteCode?: string
  /** 0–100. */
  score: number
  /** One line of evidence: what the student said or did that shows it. */
  evidence: string
  source: 'chat' | 'manual'
  /** ISO instant. */
  at: string
}

export interface PerformanceRecord {
  courses: Record<string, PerformanceCourseSettings>
  assessments: PerformanceAssessment[]
  sessions: StudySession[]
  /** Latest rating per course + topic. Optional: absent on older records. */
  fluency?: FluencyRating[]
  /** Last review written by the model, kept so the page reopens with it. */
  coach?: { at: string; text: string }
}

// ── Personal accounts ─────────────────────────────────────────────────────

export interface PersonalCourse {
  id: string
  code: string
  title: string
  subject: string
  description: string
  /** Rigour, which also sets the default GPA boost. */
  rigor: 'Regular' | 'Honors' | 'AP/IB'
  createdAt: string
}

/** A file dropped into a personal course. Its text lives in IndexedDB. */
export interface PersonalSource {
  id: string
  courseId: string
  name: string
  bytes: number
  chars: number
  addedAt: string
  /** When the agent last wrote notes that read this file. */
  usedAt?: string
}

export interface PersonalWorkspace {
  courses: PersonalCourse[]
  sources: PersonalSource[]
  /** Agent-written notes. Same shape as shared notes so every reader works. */
  notes: UnitNote[]
}

export interface SynonanceDatabase {
  meta: {
    name: string
    schemaVersion: number
    seededAt: string
    storage: string
    description: string
  }
  institution: Record<string, string>
  users: ApplicationUser[]
  courseLevels: CourseLevel[]
  courseCatalog: CatalogCourse[]
  seedCourses: SeedCourse[]
  sharedTables: Record<string, unknown>
  notes: UnitNote[]
  noteRevisions: NoteRevision[]
  progressTopics: { default: ProgressTopic[]; apCalculus: ProgressTopic[] }
  questions: IndexedQuestion[]
  mockTests: MockTest[]
  /**
   * Questions Syno wrote from the notes, and the papers assembled out of them.
   *
   * Deliberately separate tables rather than extra rows in `questions` and
   * `mockTests`. Those two are seed material — 358 questions and 220 papers
   * compiled into the bundle — and the delta only stores what a build cannot
   * rebuild. Mixing generated rows in would mean diffing the whole seed on
   * every save to find the handful that are new. Readers that want everything
   * merge the two (see `getQuestions`); the storage layer never has to.
   */
  synthesizedQuestions?: IndexedQuestion[]
  synthesizedPapers?: MockTest[]
  /** One row per generation run — see `SynthesisBatch`. */
  synthesisBatches?: SynthesisBatch[]
  /**
   * Delivered notifications — administrator messages and system events. Whole
   * table is runtime-created (see `AppNotification`); absent reads as empty,
   * so adding it did not bump schemaVersion.
   */
  notifications?: AppNotification[]
  appSettings: { currentUserId: string }
  userDatabases: Record<string, UserDatabase>
  courseContributions: Array<Record<string, unknown>>
  /** Append-only access log. Trimmed by storage compaction, never edited. */
  auditLog?: AuditEntry[]
}
