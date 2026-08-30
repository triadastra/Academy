// mock.ts — canonical seeded content for Synonance v2 (design.md §Mock data
// plus page-doc specifics). READ ONLY for page agents: do not modify here.
// Institution SHSID; student Yun Lin (YL); teacher Mr. Halvorsen / Jamie
// Thompson; course MATH AA HL (2025–26, DP Year 1), Unit 2 Integration.
import { getDatabase } from '@/database/client'

const applicationDatabase = getDatabase()
const sharedTables = applicationDatabase.sharedTables
const studentRecord = applicationDatabase.users.find((user) => user.id === 'student-yun-lin')
const teacherRecord = applicationDatabase.users.find((user) => user.id === 'teacher-jamie-thompson')

export const institution = {
  name: applicationDatabase.institution.name,
  short: applicationDatabase.institution.short,
  dataRegion: applicationDatabase.institution.dataRegion,
  session: applicationDatabase.institution.session,
}

export const currentStudent = {
  name: studentRecord?.name ?? 'Yun Lin',
  initials: studentRecord?.initials ?? 'YL',
  role: 'Student',
  email: studentRecord?.email ?? 'yun.lin@student.shsid.org.cn',
  schoolId: studentRecord?.schoolId ?? '23S12345',
}

export const currentTeacher = {
  name: teacherRecord?.name ?? 'Jamie Thompson',
  displayName: teacherRecord?.displayName ?? 'Mr. Halvorsen',
  initials: teacherRecord?.initials ?? 'JT',
  role: 'Teacher',
}

// ── Courses ────────────────────────────────────────────────────────────────
export interface Course {
  id: string
  code: string
  title: string
  teacher: string
  unit: string
  progressPct: number
  gaps: number
}

export const courses: Course[] = applicationDatabase.seedCourses

// ── Objectives (Unit 2 Integration) ────────────────────────────────────────
export interface Objective {
  code: string
  title: string
  mastery: number // 0–5
  gap?: boolean
  notStarted?: boolean
}

export const objectives = sharedTables.objectives as Objective[]

// ── Documents (library) ────────────────────────────────────────────────────
export interface LibraryDoc {
  id: string
  title: string
  kind: 'lecture' | 'problem_set' | 'mark_scheme'
  pages: number
  objectives: string[]
  status: 'reviewed' | 'locked' | 'needs_review'
  note?: string
}

export const libraryDocs = sharedTables.libraryDocs as LibraryDoc[]

// ── Misconception clusters (class picture) ─────────────────────────────────
export interface MisconceptionCluster {
  id: string
  title: string
  flags: number
  coOccurs?: string
  source?: string
}

export const misconceptionClusters = sharedTables.misconceptionClusters as MisconceptionCluster[]
export const clusterFootnote = sharedTables.clusterFootnote as string

// ── Coverage rows (30 anonymous students each) ─────────────────────────────
export interface CoverageRow {
  code: string
  title: string
  taught: number // of 30
  total: number
  status: 'taught' | 'planned'
}

export const coverageRows = sharedTables.coverageRows as CoverageRow[]

// ── Review item (teacher item queue) ───────────────────────────────────────
export interface ReviewItem {
  id: string
  prompt: string
  answer: string
  marks: number
  provenance: string
  verifier: string
}

export const reviewItem = sharedTables.reviewItem as ReviewItem
export const reviewPendingCount = sharedTables.reviewPendingCount as number

// ── Chat seed (student chat) ───────────────────────────────────────────────
export interface ChatToolCall {
  tool: string
  arg?: string
  hits?: number
  lines: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  time: string
  text: string
  tools?: ChatToolCall[]
  spec?: { code: string; filled: number; label: string; citation: string }
  check?: string // "Check your understanding" prompt
}

export const chatSeed = sharedTables.chatSeed as ChatMessage[]
export const policyNotice = sharedTables.policyNotice as string

// ── Notifications ──────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string
  group: 'Today' | 'Yesterday' | 'Earlier'
  title: string
  meta: string
  unread?: boolean
}

export const notifications = sharedTables.notifications as NotificationItem[]

// ── People (admin) ─────────────────────────────────────────────────────────
export type PersonRole = 'Student' | 'Teacher' | 'Admin'

export interface Person {
  id: string
  name: string
  initials: string
  schoolId: string
  role: PersonRole
  courseCount: number | null
  status: 'Active' | 'Suspended'
  lastActive: string
}

export const people = sharedTables.people as Person[]

// ── Audit rows (admin) ─────────────────────────────────────────────────────
export interface AuditRow {
  id: string
  time: string
  actor: string
  actorId: string
  purpose: string
  rows: number
  result: string
}

export const auditRows = sharedTables.auditRows as AuditRow[]

// ── Study plan (12-day plan, day cards) ────────────────────────────────────
export interface StudyPlanDay {
  id: string
  day: string // e.g. "Sat 15"
  title: string
  topics: string[]
  minutes: number
  status: 'Not yet started' | 'In progress' | 'Done'
}

export const studyPlanDays = sharedTables.studyPlanDays as StudyPlanDay[]
export const studyPlanMeta = sharedTables.studyPlanMeta as {
  title: string
  target: string
  targetDate: string
  footerNote: string
}

// ── Paper items (teacher paper builder) ────────────────────────────────────
export type PaperFormat = 'MCQ' | 'SAQ' | 'FRQ'

export interface PaperItem {
  no: number
  title: string
  code: string
  format: PaperFormat
  marks: number
  difficulty: number // 0–5 segment bar
}

export const paperItems = sharedTables.paperItems as PaperItem[]
export const paperMeta = sharedTables.paperMeta as {
  itemCount: number
  totalMarks: number
  timeMinutes: number
}
