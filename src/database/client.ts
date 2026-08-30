import seedJson from './synonance.database.json'
import { uuid } from '@/lib/uuid'
import { isMarkable, markAnswer } from '@/lib/marking'
import {
  PBKDF2_ITERATIONS,
  hashPassword,
  passwordProblem,
  verifyPassword,
} from '@/lib/password'
import {
  DELTA_STORAGE_KEY,
  LEGACY_FULL_STORAGE_KEY,
  extractDelta,
  purgeAllStorage,
  readDelta,
  writeDelta,
  type DatabaseDelta,
  type WriteOutcome,
} from './storage'
import type {
  AccountStatus,
  PasswordHash,
  AuditAction,
  AuditEntry,
  CourseLevel,
  CoursePathway,
  AuthSession,
  DatabaseSettings,
  GradedPaper,
  IndexedQuestion,
  QuestionAttempt,
  SignInThrottle,
  SynonanceDatabase,
  UnitNote,
  UserDatabase,
  UserMemory,
  UserProfile,
  UserRole,
} from './types'

const STORAGE_KEY = LEGACY_FULL_STORAGE_KEY
const PREVIOUS_STORAGE_KEY = 'synonance:json-database:v1'
const AUTH_STORAGE_KEY = 'synonance:auth-session:v1'
const THROTTLE_STORAGE_KEY = 'synonance:signin-throttle:v1'
const DEVICE_STORAGE_KEY = 'synonance:device-id:v1'
const DATABASE_EVENT = 'synonance:database-changed'
const seedDatabase = seedJson as SynonanceDatabase

/**
 * Session lifetimes.
 *
 * Sessions previously never ended, which meant a browser on a shared school
 * machine stayed signed in to a student's coursework indefinitely. The idle
 * window closes an abandoned session; the absolute window bounds a device that
 * is lost while in use, however active it looks.
 */
const SESSION_IDLE_MS = 12 * 60 * 60 * 1000
const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000
/** How often activity is written back. Touching on every read would thrash. */
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000

/**
 * A verifier to derive against when no account matches the address.
 *
 * Never matches anything: the stored hash is all zeros, which no PBKDF2 output
 * realistically equals. Its only job is to make an unknown address cost the
 * same key derivation as a known one — see `signInAdministrator`.
 */
const ENUMERATION_DECOY: PasswordHash = {
  algorithm: 'pbkdf2-sha256',
  iterations: PBKDF2_ITERATIONS,
  salt: '00'.repeat(16),
  hash: '00'.repeat(32),
}

/** Failed administrator sign-ins before the form locks, and for how long. */
const SIGNIN_MAX_ATTEMPTS = 5
const SIGNIN_LOCKOUT_MS = 15 * 60 * 1000
/** Failures older than this no longer count towards the lockout. */
const SIGNIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000

interface DurableAuthSession extends AuthSession {
  userId: string
}

function cloneSeed(): SynonanceDatabase {
  return structuredClone(seedDatabase)
}

function emptyUserDatabase(): UserDatabase {
  return {
    profile: {
      displayName: '',
      email: '',
      language: 'English',
      timezone: 'Asia/Shanghai',
      reducedMotion: false,
      emailSummaries: 'Weekly',
      citationDisplay: 'In-text (author-date)',
    },
    memory: { persona: '', study: '', updatedAt: '' },
    session: {
      authenticated: false,
      institutionId: 'shsid',
      signedInAt: null,
      lastSeenAt: null,
      expiresAt: null,
      idleExpiresAt: null,
    },
    settings: {
      grade: null,
      pathway: null,
      selectedCourseIds: [],
      courseLevels: {},
      activeCourseId: null,
      courseMenuCollapsed: false,
      pendingChatPrompt: '',
    },
    questionAttempts: [],
    gradedPapers: [],
    chatThreads: [],
    uploads: [],
  }
}

function userDatabaseFrom(database: SynonanceDatabase, userId = database.appSettings.currentUserId) {
  database.userDatabases[userId] ??= emptyUserDatabase()
  return database.userDatabases[userId]
}

function readLegacyJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * A stable random identifier for this browser.
 *
 * Used to label sessions in the account UI ("this device" versus another one)
 * without deriving anything from the machine itself. It is regenerated freely
 * if storage is cleared, which is the point: it identifies a browser profile,
 * not a person, and follows nobody across a wipe.
 */
function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (existing) return existing
    const fresh = uuid()
    localStorage.setItem(DEVICE_STORAGE_KEY, fresh)
    return fresh
  } catch {
    return 'unknown-device'
  }
}

/**
 * Whether a session is still live.
 *
 * A session written before expiry existed carries neither deadline. Those are
 * treated as expired rather than as immortal: the upgrade signs people out
 * once, which is the safe direction when the alternative is a session with no
 * end date surviving the change that was meant to give it one.
 */
export function isSessionValid(session: AuthSession | null | undefined): boolean {
  if (!session?.authenticated) return false
  if (!session.expiresAt || !session.idleExpiresAt) return false
  const now = Date.now()
  return now < Date.parse(session.expiresAt) && now < Date.parse(session.idleExpiresAt)
}

function hasLaunchpadInstitutionBinding(
  account: SynonanceDatabase['users'][number] | null | undefined,
  session: AuthSession | null | undefined,
  institutionId: string,
) {
  return (
    session?.identityProvider === 'launchpad' &&
    session.institutionId === institutionId &&
    !!account?.launchpadSub &&
    !!account.launchpadVid &&
    account.launchpadInstitutionId === institutionId &&
    !!account.launchpadVerifiedAt
  )
}

function isSessionAuthorizedForAccount(
  account: SynonanceDatabase['users'][number] | null | undefined,
  session: AuthSession | null | undefined,
  institutionId: string,
) {
  if (session?.identityProvider === 'local-admin') return account?.role === 'Admin'
  return hasLaunchpadInstitutionBinding(account, session, institutionId)
}

/** A fresh pair of deadlines from now. */
function sessionDeadlines(signedInAt: string) {
  const now = Date.now()
  return {
    expiresAt: new Date(Date.parse(signedInAt) + SESSION_ABSOLUTE_MS).toISOString(),
    idleExpiresAt: new Date(now + SESSION_IDLE_MS).toISOString(),
  }
}

function readDurableAuth(): DurableAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as DurableAuthSession
    return session.userId && typeof session.authenticated === 'boolean' ? session : null
  } catch {
    return null
  }
}

function writeDurableAuth(session: DurableAuthSession) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage is blocked or full. The in-memory session still works for this
    // page view; it simply will not survive a reload.
  }
}

function clearDurableAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Nothing to do — the session object is authoritative for this page view.
  }
}

/**
 * Reconcile the small auth record with the database on load.
 *
 * Expiry, suspension and erasure are all enforced here rather than at the call
 * sites, so there is one place a stale or revoked session is turned back into
 * a signed-out one — and no page can accidentally skip the check.
 */
function applyDurableAuth(database: SynonanceDatabase) {
  const durable = readDurableAuth()
  if (!durable) {
    // Adopt an existing database session once, so a user upgrading from the
    // pre-auth-key implementation is not signed out for no reason. It is given
    // fresh deadlines, because a session that predates expiry has none.
    const userId = database.appSettings.currentUserId
    const session = userDatabaseFrom(database, userId).session
    const account = database.users.find((item) => item.id === userId)
    if (
      session?.authenticated &&
      isSessionAuthorizedForAccount(account, session, database.institution.id)
    ) {
      const signedInAt = session.signedInAt ?? new Date().toISOString()
      const adopted: AuthSession = { ...session, signedInAt, ...sessionDeadlines(signedInAt) }
      userDatabaseFrom(database, userId).session = adopted
      writeDurableAuth({ userId, ...adopted })
    }
    return database
  }

  database.appSettings.currentUserId = durable.userId
  const user = userDatabaseFrom(database, durable.userId)
  const account = database.users.find((item) => item.id === durable.userId)
  const status: AccountStatus = account?.status ?? 'active'

  // An account suspended or erased by an administrator loses its session at
  // the next load, rather than staying inside the app until it signs out.
  const membershipRevoked = !isSessionAuthorizedForAccount(
    account,
    durable,
    database.institution.id,
  )
  const revoked = status !== 'active' || membershipRevoked
  const expired = !isSessionValid(durable)

  if (revoked || expired) {
    const ended: AuthSession = {
      authenticated: false,
      institutionId: durable.institutionId,
      signedInAt: durable.signedInAt,
      lastSeenAt: new Date().toISOString(),
      expiresAt: durable.expiresAt ?? null,
      idleExpiresAt: durable.idleExpiresAt ?? null,
      deviceId: durable.deviceId,
      identityProvider: durable.identityProvider,
    }
    user.session = ended
    clearDurableAuth()
    pendingAudit.push({
      actorId: durable.userId,
      actorName: account?.name ?? 'Unknown',
      action: revoked ? 'session.denied' : 'session.expired',
      purpose: revoked
        ? membershipRevoked
          ? 'Session ended because verified institution membership is missing'
          : `Session ended because the account is ${status}`
        : 'Session ended because it expired',
      rows: 1,
      result: revoked ? 'denied' : 'success',
    })
    return database
  }

  user.session = {
    authenticated: durable.authenticated,
    institutionId: durable.institutionId,
    signedInAt: durable.signedInAt,
    lastSeenAt: durable.lastSeenAt,
    expiresAt: durable.expiresAt,
    idleExpiresAt: durable.idleExpiresAt,
    deviceId: durable.deviceId,
    identityProvider: durable.identityProvider,
  }
  return database
}

/**
 * Audit entries raised during load, before the database exists to write them
 * into. Drained by the first `updateDatabase` after hydration.
 */
const pendingAudit: Array<Omit<AuditEntry, 'id' | 'at'>> = []

function migrateVersionOne(database: SynonanceDatabase) {
  try {
    const raw = localStorage.getItem(PREVIOUS_STORAGE_KEY)
    if (!raw) return false
    const old = JSON.parse(raw) as Record<string, unknown>
    const oldSettings = old.settings as (Partial<DatabaseSettings> & { currentUserId?: string })
    const userId = oldSettings.currentUserId ?? database.appSettings.currentUserId
    database.appSettings.currentUserId = userId
    const userDatabase = userDatabaseFrom(database, userId)
    userDatabase.settings = {
      ...userDatabase.settings,
      grade: oldSettings.grade ?? null,
      pathway: oldSettings.pathway ?? null,
      selectedCourseIds: oldSettings.selectedCourseIds ?? [],
      courseLevels: oldSettings.courseLevels ?? {},
      activeCourseId: oldSettings.activeCourseId ?? null,
      courseMenuCollapsed: oldSettings.courseMenuCollapsed ?? false,
      pendingChatPrompt: oldSettings.pendingChatPrompt ?? '',
    }
    userDatabase.questionAttempts = (old.questionAttempts as QuestionAttempt[] | undefined) ?? []
    userDatabase.gradedPapers = (old.gradedPapers as GradedPaper[] | undefined) ?? []
    userDatabase.chatThreads = (old.chatThreads as Array<Record<string, unknown>> | undefined) ?? []
    userDatabase.uploads = (old.uploads as Array<Record<string, unknown>> | undefined) ?? []
    return true
  } catch {
    return false
  }
}

function migrateLooseBrowserKeys(database: SynonanceDatabase) {
  const userId = database.appSettings.currentUserId
  const userDatabase = userDatabaseFrom(database, userId)
  const gradeValue = Number(localStorage.getItem('synonance:grade'))
  const pathwayValue = localStorage.getItem('synonance:pathway')
  const pathway = ['HS', 'IB', 'AP', 'AL'].includes(pathwayValue ?? '')
    ? (pathwayValue as CoursePathway)
    : null

  userDatabase.settings = {
    ...userDatabase.settings,
    grade: [9, 10, 11, 12].includes(gradeValue) ? gradeValue : null,
    pathway,
    selectedCourseIds: readLegacyJson<string[]>('synonance:selected-course-ids', []),
    courseLevels: readLegacyJson<Record<string, CourseLevel>>('synonance:course-levels', {}),
    activeCourseId: localStorage.getItem('synonance:active-course-id'),
    courseMenuCollapsed: localStorage.getItem('synonance:course-menu-collapsed') === 'true',
    pendingChatPrompt: localStorage.getItem('synonance:pending-chat-prompt') ?? '',
  }

  const oldAttempts = readLegacyJson<Array<Record<string, unknown>>>('synonance:question-attempts', [])
  userDatabase.questionAttempts = oldAttempts.map((attempt, index) => ({
    id: `legacy-attempt-${index}`,
    userId,
    courseId: userDatabase.settings.activeCourseId ?? '*',
    questionId: String(attempt.questionId ?? ''),
    answer: String(attempt.answer ?? ''),
    result: attempt.result === 'correct' ? 'correct' : 'incorrect',
    attemptedAt: String(attempt.attemptedAt ?? new Date().toISOString()),
  }))

  const oldPapers = readLegacyJson<Array<Record<string, unknown>>>('synonance:graded-papers', [])
  userDatabase.gradedPapers = oldPapers.map((paper, index) => ({
    id: String(paper.id ?? `legacy-paper-${index}`),
    userId,
    courseId: userDatabase.settings.activeCourseId ?? '*',
    mockTestId: 'mock-ap-calc-01',
    fileName: String(paper.fileName ?? 'Uploaded paper.pdf'),
    testName: String(paper.testName ?? 'Mock Test 01 · Calculus foundations'),
    score: Number(paper.score ?? 0),
    total: Number(paper.total ?? 40),
    gradedAt: String(paper.gradedAt ?? new Date().toISOString()),
    annotatedPdfUrl: '/mock-tests/ap-calculus-ab-mock-01-annotated.pdf',
  }))
}

/**
 * Rebuild the full database from the seed plus whatever was stored.
 *
 * Takes either the delta written by `storage.ts` or one of the older full
 * documents: the two share field names, and every merge below is written to
 * reconcile rather than to overwrite, so a full document simply supplies more
 * rows that turn out to match the seed.
 */
function hydrateStoredDatabase(stored: Partial<SynonanceDatabase> & Partial<DatabaseDelta>) {
  const hydrated = cloneSeed()
  hydrated.appSettings = { ...hydrated.appSettings, ...stored.appSettings }
  for (const [userId, storedUser] of Object.entries(stored.userDatabases ?? {})) {
    const seededUser = hydrated.userDatabases[userId] ?? emptyUserDatabase()
    hydrated.userDatabases[userId] = {
      ...seededUser,
      ...storedUser,
      profile: { ...seededUser.profile, ...storedUser.profile },
      memory: { ...seededUser.memory, ...storedUser.memory },
      // A database written before sessions existed used to be adopted as an
      // already-signed-in user. Now that sessions expire, such a session has
      // no deadlines and `isSessionValid` rejects it anyway, so granting one
      // here would only produce a session that reads as authenticated and
      // behaves as expired. It starts signed out instead; `applyDurableAuth`
      // restores the real one from the auth key immediately afterwards.
      session: { ...seededUser.session, ...storedUser.session },
      settings: { ...seededUser.settings, ...storedUser.settings },
      questionAttempts: storedUser.questionAttempts ?? [],
      gradedPapers: storedUser.gradedPapers ?? [],
      chatThreads: storedUser.chatThreads ?? [],
      uploads: storedUser.uploads ?? [],
    }
  }
  hydrated.courseContributions = stored.courseContributions ?? []

  // Shared tables are rebuilt from the seed on every load, so any that
  // accumulate runtime state have to be carried across explicitly — otherwise
  // a write to shared course material is discarded on the very next read.
  //
  // Notes are reconciled by revision number rather than by "stored wins": a
  // stored note that carries applied edits is ahead of the seed and keeps its
  // text, while an untouched one steps up to whatever the seed now ships.
  const storedNotes = new Map((stored.notes ?? []).map((note) => [note.id, note]))
  hydrated.notes = hydrated.notes.map((seedNote) => {
    const storedNote = storedNotes.get(seedNote.id)
    return storedNote && storedNote.revision > seedNote.revision ? storedNote : seedNote
  })
  // An edited note the seed has never heard of came from the fetched corpus.
  // Without this, a revision applied to a corpus note was written to storage
  // and then dropped on the next read — the edit vanished on reload while the
  // revision record claiming it had been applied stayed behind.
  const seedNoteIds = new Set(hydrated.notes.map((note) => note.id))
  hydrated.notes = [
    ...hydrated.notes,
    ...(stored.notes ?? []).filter((note) => !seedNoteIds.has(note.id)),
  ]
  hydrated.noteRevisions = stored.noteRevisions ?? []
  hydrated.auditLog = stored.auditLog ?? []

  // Generated material is runtime-only: the seed has no copy, so "stored wins"
  // is the whole rule and there is nothing to reconcile. Missing keys read as
  // empty rather than as undefined, so a delta written before generation
  // existed loads as a session that simply has not generated anything yet —
  // which is exactly what it is. (Adding these did NOT bump schemaVersion:
  // a bump quarantines every existing delta, and an absent optional table is
  // readable by both the build that wrote it and the one that did not.)
  hydrated.synthesizedQuestions = stored.synthesizedQuestions ?? []
  hydrated.synthesizedPapers = stored.synthesizedPapers ?? []
  hydrated.synthesisBatches = stored.synthesisBatches ?? []
  // Same rule for notifications: runtime-only, stored wins, absent is empty.
  // (Per-reader read state travels inside each user's own `userDatabases`
  // entry, which the merge above already carries across.)
  hydrated.notifications = stored.notifications ?? []

  // Users are a shared table too, so an account created at runtime — anyone
  // who signed up with Launchpad — was discarded on the very next read. Their
  // per-user data survived, because that is keyed by id and carried across,
  // which made the failure quiet: the coursework was still there while the
  // name, initials and email backing it had gone.
  //
  // A stored row for a SEEDED user carries administrative changes — a
  // suspension, a role grant, a password set — which have to survive, or
  // suspending an account appears to work and silently undoes itself on reload.
  //
  // But the stored row must NOT replace the seed row wholesale. A stored copy
  // is a snapshot of whatever the seed said when it was written, so letting it
  // win outright means every later seed correction is shadowed forever by a
  // stale row. That is not hypothetical: replacing the demo administrator's
  // plaintext `password` with a PBKDF2 verifier had no effect on any browser
  // that had already run the app, because the migrated row still held the old
  // field and overrode the fixed seed.
  //
  // So the seed is the base and only the fields below are taken from storage,
  // and only where the stored row actually has them.
  const OVERRIDABLE = [
    'name',
    'displayName',
    'initials',
    'email',
    'schoolId',
    'launchpadSub',
    'launchpadVid',
    'launchpadInstitutionId',
    'launchpadVerifiedAt',
    'role',
    'passwordHash',
    'status',
    'createdAt',
    'suspendedAt',
    'suspendedBy',
    'erasedAt',
  ] as const

  const storedUsers = new Map((stored.users ?? []).map((user) => [user.id, user]))
  const seededUserIds = new Set(hydrated.users.map((user) => user.id))
  hydrated.users = [
    ...hydrated.users.map((seedUser) => {
      const storedUser = storedUsers.get(seedUser.id)
      if (!storedUser) return seedUser
      const merged = { ...seedUser }
      for (const field of OVERRIDABLE) {
        const value = storedUser[field]
        if (value !== undefined) Object.assign(merged, { [field]: value })
      }
      return merged
    }),
    ...(stored.users ?? []).filter((user) => !seededUserIds.has(user.id)),
  ]

  // Belt and braces on the credential specifically: a `password` field is the
  // pre-hash shape and must never survive a load, wherever it came from.
  for (const user of hydrated.users) {
    delete (user as { password?: string }).password
  }

  // An erased account's per-user database must stay erased.
  //
  // `userDatabases` is rebuilt from the seed on every read, and three of its
  // entries are seeded. Deleting one at erasure therefore removed it from
  // memory and from the delta, and the very next read put it straight back
  // from the bundle — so erasing a seeded student reported success, cleared
  // their name, and left every attempt, paper and chat thread intact. The
  // tombstone in `users` is the durable record of the erasure, so it is what
  // decides this, rather than the absence of a key that the seed keeps
  // resupplying.
  for (const user of hydrated.users) {
    if (user.status === 'erased') delete hydrated.userDatabases[user.id]
  }

  return hydrated
}

/**
 * Reading the database means a localStorage read, a JSON.parse, a rehydrate
 * and a JSON.stringify write-back. That is affordable once and ruinous per
 * call: a list that looks up mastery for each of its rows turned a single
 * render into one full multi-megabyte serialisation per row and visibly
 * stalled the page. The parsed database is therefore held in memory and
 * rebuilt only when something actually writes.
 */
let rawCache: SynonanceDatabase | null = null
let mergedCache: SynonanceDatabase | null = null
let mergedCorpusCount = -1

function invalidateDatabaseCache() {
  rawCache = null
  mergedCache = null
  mergedCorpusCount = -1
}

function loadDatabase(): SynonanceDatabase {
  if (!rawCache) rawCache = readDatabaseFromStorage()
  return rawCache
}

/**
 * Read the delta and rebuild the database around it.
 *
 * Reading no longer writes. The previous implementation serialised the whole
 * rehydrated document straight back to storage on every cold read, which cost
 * a 409 KB write to establish that nothing had changed. Persistence now
 * happens only where something is actually mutated.
 */
function readDatabaseFromStorage(): SynonanceDatabase {
  const delta = readDelta(seedDatabase.meta.schemaVersion)
  if (delta) return applyDurableAuth(hydrateStoredDatabase(delta))

  // No delta. Either this is a first run, or a pre-delta full document is still
  // sitting in the old key and needs carrying across exactly once.
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as SynonanceDatabase
      if (stored.meta?.schemaVersion === seedDatabase.meta.schemaVersion) {
        const hydrated = applyDurableAuth(hydrateStoredDatabase(stored))
        // Write the delta first, and only drop the old document once it has
        // landed — an interrupted upgrade must not be able to delete the only
        // copy of the user's work.
        const outcome = persist(hydrated)
        if (outcome.status !== 'failed') localStorage.removeItem(STORAGE_KEY)
        return hydrated
      }
    }
  } catch {
    // A damaged copy falls through to a fresh, versioned database.
  }

  const database = cloneSeed()
  if (!migrateVersionOne(database)) migrateLooseBrowserKeys(database)
  applyDurableAuth(database)
  persist(database)
  return database
}

/** The most recent write result, for the storage readout and the warning banner. */
let lastWriteOutcome: WriteOutcome = { status: 'ok', bytes: 0 }

export function getLastWriteOutcome(): WriteOutcome {
  return lastWriteOutcome
}

/**
 * Write the mutable delta of `database` to storage.
 *
 * Compaction happens inside `writeDelta` and mutates the delta in place. The
 * compacted arrays are the same object references the in-memory database holds
 * for `userDatabases`, so trimming them there trims them here too and the two
 * copies stay in step. `notes`, `users` and `auditLog` are freshly filtered
 * arrays, so `auditLog` — the one of the three compaction touches — is copied
 * back explicitly.
 */
function persist(database: SynonanceDatabase): WriteOutcome {
  const delta = extractDelta(database, seedDatabase, database.auditLog ?? [])
  const outcome = writeDelta(delta)
  database.auditLog = delta.auditLog
  lastWriteOutcome = outcome

  // Losing history has to leave a trace. It is queued rather than written here
  // because writing during a write would recurse — and because the entry
  // belongs to the next successful save, not to the one that just struggled.
  if (outcome.status === 'compacted') {
    pendingAudit.push({
      actorId: 'system',
      actorName: 'Storage',
      action: 'storage.compacted',
      purpose: `Browser storage was full; history was trimmed to keep saving (${outcome.dropped.join('; ')})`,
      rows: outcome.dropped.length,
      result: 'success',
    })
  }
  return outcome
}

/**
 * Imported IDX study guides, fetched at runtime from public/course-notes.json
 * rather than compiled into the bundle — the corpus is larger than the whole
 * application. The app works without it: seeded notes ship in the bundle, and
 * these merge in when the fetch lands, announced by the usual change event.
 */
let corpusNotes: UnitNote[] = []
let corpusRequest: Promise<void> | null = null

/**
 * Load the imported corpus.
 *
 * It arrives as one file per course plus a manifest, rather than as a single
 * multi-megabyte document: the deploy step will not upload a file that large,
 * and skipped it silently, which would have shipped a site with no notes at
 * all. Shards also mean a slow connection gets usable content sooner, since
 * each course lands on its own.
 *
 * A course whose shard fails is simply absent — one bad file does not take the
 * rest of the corpus with it. If the manifest itself is missing, the single
 * pre-shard corpus file is tried, so an older deployment keeps working.
 */
/**
 * Fetch one course shard, preferring the gzipped copy.
 *
 * Lesson markdown compresses to under a third of its size, and only the
 * gzipped shards are deployed — the plain ones exist for the dev server and
 * the Python tooling. `DecompressionStream` covers every browser from 2023
 * onward; where it is missing, or where only the plain file was deployed, the
 * uncompressed shard is tried instead.
 */
async function loadShard(stem: string): Promise<UnitNote[]> {
  if (typeof DecompressionStream === 'function') {
    try {
      const response = await fetch(`${stem}.json.gz`)
      if (response.ok && response.body) {
        const stream = response.body.pipeThrough(new DecompressionStream('gzip'))
        const text = await new Response(stream).text()
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return parsed
      }
      // A 5xx is the host under load, not a missing file. Falling straight
      // through to the uncompressed copy turns one refused request into two,
      // which is the opposite of what a loaded server needs — so it is
      // reported as retryable instead, and `mapWithLimit` backs off.
      if (response.status >= 500) throw new Error(`shard ${response.status}`)
    } catch (error) {
      if ((error as Error).message?.startsWith('shard 5')) throw error
      // Otherwise fall through to the uncompressed copy.
    }
  }
  return fetch(`${stem}.json`)
    .then((response) => (response.ok ? response.json() : []))
    .then((notes) => (Array.isArray(notes) ? notes : []))
    .catch(() => [])
}

/**
 * How many shards may be in flight at once.
 *
 * The corpus is 28 files and they were all requested simultaneously. The
 * static host answered about half of them with 503, and because a failed shard
 * is deliberately non-fatal, the result was a deployment where fourteen
 * courses silently had no study notes at all — the app looked fine and the
 * content was simply missing. Six at a time is comfortably under the limit and
 * still loads the whole corpus in a couple of seconds.
 */
const SHARD_CONCURRENCY = 6
const SHARD_RETRIES = 2

/**
 * Run `task` over `items` with a bounded number in flight, retrying the ones
 * that fail with a retryable error. Results keep the input order.
 */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
  fallback: R,
): Promise<R[]> {
  const results = new Array<R>(items.length).fill(fallback)
  let next = 0

  async function worker() {
    for (;;) {
      const index = next++
      if (index >= items.length) return
      for (let attempt = 0; attempt <= SHARD_RETRIES; attempt++) {
        try {
          results[index] = await task(items[index])
          break
        } catch {
          if (attempt === SHARD_RETRIES) break
          // Linear backoff. The server is shedding load, so the useful thing
          // is to arrive later, not to arrive again immediately.
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function ensureCorpusLoaded() {
  if (corpusRequest || typeof fetch !== 'function') return
  const base = import.meta.env.BASE_URL
  const publish = (notes: UnitNote[]) => {
    if (notes.length === 0) return
    corpusNotes = notes
    window.dispatchEvent(new CustomEvent(DATABASE_EVENT))
  }
  corpusRequest = fetch(`${base}notes/manifest.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then(async (manifest: Array<{ courseId: string }> | null) => {
      if (!Array.isArray(manifest) || manifest.length === 0) {
        const fallback = await fetch(`${base}course-notes.json`)
          .then((response) => (response.ok ? response.json() : []))
          .catch(() => [])
        publish(Array.isArray(fallback) ? fallback : [])
        return
      }
      const shards = await mapWithLimit(
        manifest,
        SHARD_CONCURRENCY,
        (entry) => loadShard(`${base}notes/${entry.courseId}`),
        [] as UnitNote[],
      )
      publish(shards.flat().filter(Boolean) as UnitNote[])
    })
    .catch(() => {
      // No corpus deployed — the seeded notes are still there.
    })
}

export function getDatabase(): SynonanceDatabase {
  ensureCorpusLoaded()
  const database = loadDatabase()
  if (mergedCache && mergedCorpusCount === corpusNotes.length) return mergedCache
  // The corpus merges into a shallow copy, never into the stored object: the
  // imported notes are fetched at runtime precisely so they stay out of
  // localStorage, and mutating the cached original would write them straight
  // back in on the next save.
  mergedCache = database
  if (corpusNotes.length > 0) {
    const seeded = new Set(database.notes.map((note) => note.id))
    mergedCache = {
      ...database,
      notes: [...database.notes, ...corpusNotes.filter((note) => !seeded.has(note.id))],
    }
  }
  mergedCorpusCount = corpusNotes.length
  return mergedCache
}

export function getCurrentUserId() {
  return getDatabase().appSettings.currentUserId
}

export function getCurrentUserDatabase() {
  const database = getDatabase()
  return userDatabaseFrom(database)
}

function fallbackSession(): AuthSession {
  return {
    authenticated: false,
    institutionId: 'shsid',
    signedInAt: null,
    lastSeenAt: null,
    expiresAt: null,
    idleExpiresAt: null,
  }
}

export function getAuthSession(): AuthSession {
  return getCurrentUserDatabase().session ?? fallbackSession()
}

/**
 * The signed-in account row, or null.
 *
 * The one place identity comes from. Pages used to read a module constant in
 * `data/mock.ts` that was pinned to the seeded demo student, so every account —
 * including anyone who had just registered through Launchpad — saw "Yun Lin"
 * and that student's school email address in the sidebar and on the profile
 * form. Nothing may reintroduce a hardcoded current user.
 */
export function getCurrentUser() {
  const database = getDatabase()
  return database.users.find((user) => user.id === database.appSettings.currentUserId) ?? null
}

/**
 * Whether there is a live session AND the account behind it is still active.
 *
 * Both halves matter: expiry is enforced on load by `applyDurableAuth`, but a
 * suspension applied in another tab has to take effect here too, without
 * waiting for a reload.
 */
export function isAuthenticated() {
  const session = getAuthSession()
  if (!isSessionValid(session)) return false
  const account = getCurrentUser()
  if ((account?.status ?? 'active') !== 'active') return false
  return isSessionAuthorizedForAccount(account, session, getDatabase().institution.id)
}

/** Whether this session may open this installation's institution content. */
export function hasVerifiedInstitutionMembership() {
  const session = getAuthSession()
  if (!isSessionValid(session)) return false
  const account = getCurrentUser()
  if ((account?.status ?? 'active') !== 'active') return false
  return hasLaunchpadInstitutionBinding(account, session, getDatabase().institution.id)
}

/**
 * Push the idle deadline forward.
 *
 * Called from the shells on user activity. Writes at most once every few
 * minutes: refreshing on every interaction would put a storage write behind
 * every keystroke, which is exactly the amplification this layer exists to
 * avoid.
 */
export function touchSession() {
  const session = getAuthSession()
  if (!isSessionValid(session)) return
  const lastSeen = session.lastSeenAt ? Date.parse(session.lastSeenAt) : 0
  if (Date.now() - lastSeen < SESSION_TOUCH_INTERVAL_MS) return

  const now = new Date().toISOString()
  const userId = getCurrentUserId()
  const refreshed: AuthSession = {
    ...session,
    lastSeenAt: now,
    idleExpiresAt: new Date(Date.now() + SESSION_IDLE_MS).toISOString(),
  }
  writeDurableAuth({ userId, ...refreshed })
  updateDatabase((database) => {
    userDatabaseFrom(database, userId).session = refreshed
  })
}

// ── Roles ──────────────────────────────────────────────────────────────────

export function getCurrentUserRole(): UserRole | null {
  return isAuthenticated() ? (getCurrentUser()?.role ?? null) : null
}

/**
 * Role check for route guards and for any action a student must not take.
 *
 * Administrators are NOT implicitly teachers. A role that silently contains
 * another one makes "who can do this" impossible to read off the call site, so
 * every caller lists the roles it means.
 */
export function hasRole(...roles: UserRole[]): boolean {
  const role = getCurrentUserRole()
  return role !== null && roles.includes(role)
}

/**
 * The institution this installation serves.
 *
 * The three shells each had its short name and full name typed into the markup
 * as string literals, while the record they describe sat in the database with
 * an id, a code, a data region and a session policy on it. That is fine for
 * exactly one deployment and wrong for the second: the app already carries a
 * per-institution record precisely so the name is data, and a shell that
 * hardcodes it cannot be pointed at another school without editing components.
 */
export function getInstitution() {
  return getDatabase().institution as {
    id: string
    code: string
    name: string
    short: string
    dataRegion: string
    session: string
  }
}

export function getInstitutionByCode(code: string) {
  const normalizedCode = code.replace(/\D/g, '')
  const institution = getDatabase().institution
  return normalizedCode.length === 6 && institution.code === normalizedCode
    ? institution
    : null
}

/**
 * Open a session for an already-authenticated user.
 *
 * Private on purpose. It performs no credential check of its own, so every
 * caller must have established identity first — the exported wrappers below
 * are the only entry points. Two earlier exports, `signInCurrentUser` and
 * `signInStudentWithInstitutionCode`, called straight into this with no
 * credential at all: the second signed the caller in as whichever row happened
 * to be the first Student in the table. Both are gone.
 */
function signInUser(
  userId: string,
  institutionId: string,
  identityProvider: NonNullable<AuthSession['identityProvider']>,
) {
  const database = getDatabase()
  const account = database.users.find((user) => user.id === userId)
  if (!account) return null
  if ((account.status ?? 'active') !== 'active') {
    auditSession(
      'session.denied',
      userId,
      account.name,
      `Sign-in refused: account is ${account.status}`,
      'denied',
    )
    // The pending entry needs a write to land, and nothing else is changing.
    updateDatabase(() => {})
    return null
  }

  // A new sign-in starts a new absolute window rather than continuing the old
  // one, so signing in again is a genuine renewal.
  const now = new Date().toISOString()
  const session: AuthSession = {
    authenticated: true,
    institutionId,
    identityProvider,
    signedInAt: now,
    lastSeenAt: now,
    deviceId: deviceId(),
    ...sessionDeadlines(now),
  }
  writeDurableAuth({ userId, ...session })
  auditSession('session.signin', userId, account.name, `Signed in as ${account.role}`)
  updateDatabase((draft) => {
    draft.appSettings.currentUserId = userId
    userDatabaseFrom(draft, userId).session = session
  })
  return session
}

// ── Sign-in throttling ─────────────────────────────────────────────────────

function readThrottle(): SignInThrottle {
  try {
    const raw = localStorage.getItem(THROTTLE_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SignInThrottle
  } catch {
    // Fall through to a clean record.
  }
  return { failedAttempts: 0, firstFailureAt: null, lockedUntil: null }
}

function writeThrottle(throttle: SignInThrottle) {
  try {
    localStorage.setItem(THROTTLE_STORAGE_KEY, JSON.stringify(throttle))
  } catch {
    // Throttling that cannot persist is still better than none within a page.
  }
}

/** Seconds remaining on a lockout, or 0 when the form is usable. */
export function signInLockoutSeconds(): number {
  const { lockedUntil } = readThrottle()
  if (!lockedUntil) return 0
  const remaining = Date.parse(lockedUntil) - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

function recordSignInFailure() {
  const throttle = readThrottle()
  const now = Date.now()
  // Failures from a previous, long-finished burst should not stack onto this
  // one, or a user who mistypes once a week eventually locks themselves out.
  const windowOpen =
    throttle.firstFailureAt !== null && now - Date.parse(throttle.firstFailureAt) < SIGNIN_ATTEMPT_WINDOW_MS
  const failedAttempts = windowOpen ? throttle.failedAttempts + 1 : 1
  writeThrottle({
    failedAttempts,
    firstFailureAt: windowOpen ? throttle.firstFailureAt : new Date(now).toISOString(),
    lockedUntil:
      failedAttempts >= SIGNIN_MAX_ATTEMPTS ? new Date(now + SIGNIN_LOCKOUT_MS).toISOString() : null,
  })
}

function clearSignInFailures() {
  writeThrottle({ failedAttempts: 0, firstFailureAt: null, lockedUntil: null })
}

/** "Yun Lin" -> "YL"; an email local part is used when there is no name. */
function initialsFor(name: string, email: string) {
  const source = name.trim() || email.split('@')[0].replace(/[._-]+/g, ' ')
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}

/**
 * Sign in — or register — a user who authenticated with Launchpad.
 *
 * The identity is external and already verified by the platform, so there is
 * no credential to check: this binds a Launchpad account to a local user row.
 *
 * Matching is by Launchpad `sub`, the stable account identifier. Email is used
 * only once to adopt a seeded school row that has never been linked; after
 * that it cannot move the binding. VID is separately unique, so neither one
 * Launchpad account nor one VID can back two Synonance users.
 *
 * Registration is deliberately the same call as sign-in. The platform has
 * already decided who this is, so a separate "sign up" step could only ask
 * for things it already knows.
 */
export interface LaunchpadIdentity {
  sub: string
  email: string
  name?: string
  org?: string
  verified?: boolean
  vid?: string
}

function bindLaunchpadIdentity(identity: LaunchpadIdentity, openSession: boolean) {
  const database = getDatabase()
  const institutionId = database.institution.id.trim().toLowerCase()
  const subject = identity.sub.trim()
  const email = identity.email.trim().toLowerCase()
  const assertedInstitution = identity.org?.trim().toLowerCase() ?? ''
  const vid = identity.vid?.trim().toUpperCase() ?? ''
  if (!subject) return { ok: false, reason: 'missing-subject' } as const
  if (!email) return { ok: false, reason: 'missing-email' } as const
  if (identity.verified !== true) return { ok: false, reason: 'unverified' } as const
  if (assertedInstitution !== institutionId) {
    return {
      ok: false,
      reason: 'wrong-institution',
      expectedInstitution: database.institution.name,
      receivedInstitution: identity.org?.trim() || null,
    } as const
  }
  if (!/^[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(vid)) {
    return { ok: false, reason: 'missing-vid' } as const
  }

  const subjectMatch = database.users.find((user) => user.launchpadSub === subject)
  const emailMatch = database.users.find((user) => user.email.toLowerCase() === email)
  const vidMatch = database.users.find((user) => user.launchpadVid === vid)
  if (
    (subjectMatch && emailMatch && subjectMatch.id !== emailMatch.id) ||
    (subjectMatch && vidMatch && subjectMatch.id !== vidMatch.id) ||
    (!subjectMatch && emailMatch?.launchpadSub && emailMatch.launchpadSub !== subject) ||
    (!subjectMatch && vidMatch?.launchpadSub && vidMatch.launchpadSub !== subject)
  ) {
    return { ok: false, reason: 'identity-conflict' } as const
  }
  // Email is used only once to adopt a seeded, not-yet-bound school account.
  // Every subsequent sign-in resolves by Launchpad sub, never by mutable email.
  const existing = subjectMatch ?? (emailMatch?.launchpadSub ? undefined : emailMatch)

  // A suspended or erased account cannot be re-entered by signing in through
  // the platform again. Without this, "suspend access" was undone by the next
  // Launchpad round trip.
  if (existing && (existing.status ?? 'active') !== 'active') {
    recordAudit({
      actorId: existing.id,
      actorName: existing.name,
      action: 'session.denied',
      subjectId: existing.id,
      subjectName: existing.name,
      purpose: `Launchpad sign-in refused: account is ${existing.status}`,
      rows: 1,
      result: 'denied',
    })
    return {
      ok: false,
      reason: 'blocked',
      blocked: existing.status ?? 'suspended',
    } as const
  }

  const name = identity.name?.trim() || email.split('@')[0]
  // A stable id derived from the Launchpad subject, so the same account maps
  // to the same local user across sign-ins even if the email is later changed.
  const userId = existing?.id ?? `launchpad-${subject}`
  const isNew = !existing
  const role = roleForIdentity(email, identity.org)

  if (!openSession) {
    const session = getAuthSession()
    if (
      getCurrentUserId() !== userId ||
      !isSessionValid(session) ||
      session.identityProvider !== 'launchpad'
    ) {
      return { ok: false, reason: 'identity-conflict' } as const
    }
  }

  updateDatabase((stored) => {
    const user = stored.users.find((item) => item.id === userId)
    if (user) {
      user.email = identity.email
      if (identity.name) user.name = name
      user.launchpadSub = subject
      user.launchpadVid = vid
      user.launchpadInstitutionId = institutionId
      user.launchpadVerifiedAt = new Date().toISOString()
      // A role granted inside the app by an administrator outranks the guess
      // made from the address, so an existing row's role is never rewritten.
    } else {
      stored.users.push({
        id: userId,
        name,
        initials: initialsFor(name, email),
        role,
        email: identity.email,
        schoolId: '',
        launchpadSub: subject,
        launchpadVid: vid,
        launchpadInstitutionId: institutionId,
        launchpadVerifiedAt: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
      })
    }
    const userDatabase = userDatabaseFrom(stored, userId)
    userDatabase.profile = {
      ...userDatabase.profile,
      email: identity.email,
      displayName: name,
    }
  })

  if (isNew) {
    recordAudit({
      actorId: userId,
      actorName: name,
      action: 'account.created',
      subjectId: userId,
      subjectName: name,
      purpose: `Account opened through Launchpad as ${role}`,
      rows: 1,
      result: 'success',
    })
  }

  if (!openSession) {
    return { ok: true, session: getAuthSession(), isNew } as const
  }

  const session = signInUser(userId, institutionId, 'launchpad')
  return session
    ? ({ ok: true, session, isNew } as const)
    : ({ ok: false, reason: 'blocked', blocked: 'suspended' } as const)
}

/** Bind the identity and open a fresh Synonance session after the OAuth callback. */
export function signInWithLaunchpad(identity: LaunchpadIdentity) {
  return bindLaunchpadIdentity(identity, true)
}

/** Re-check a live session without renewing its absolute lifetime or duplicating sign-in audit rows. */
export function refreshLaunchpadAccess(identity: LaunchpadIdentity) {
  return bindLaunchpadIdentity(identity, false)
}

/**
 * Provisional role for a brand-new account.
 *
 * PROVISIONAL IS THE OPERATIVE WORD. Launchpad does not tell this app what
 * somebody's role at their school is, and an email address is a hint, not an
 * authorisation — anybody able to register can pick an address. Everyone
 * therefore starts as a Student, and staff are promoted by an administrator in
 * People and roles, which is recorded in the audit log.
 *
 * The address pattern is used only to keep the *seeded* staff accounts working
 * when their owner signs in through the platform for the first time; it can
 * never mint a new privileged account, because a match here only applies to a
 * row that does not exist yet, and the domains listed are the institution's own
 * staff domains rather than anything a stranger can obtain.
 */
function roleForIdentity(email: string, org?: string): UserRole {
  const database = getDatabase()
  const seededMatch = seedDatabase.users.find((user) => user.email.toLowerCase() === email)
  if (seededMatch && org?.trim().toLowerCase() === database.institution.id.toLowerCase()) {
    return seededMatch.role
  }
  return 'Student'
}

/**
 * Administrator sign-in against a locally stored PBKDF2 verifier.
 *
 * Async because deriving the key is deliberately slow — around 850 ms on the
 * pure-JS path the plain-http deployment is forced onto, and a few
 * milliseconds where SubtleCrypto exists.
 *
 * This is credential hygiene and provisioning UX, NOT an access-control
 * boundary: the check runs on the user's own machine, so anyone willing to
 * open devtools can grant themselves the session regardless. The boundary has
 * to be a server. See "Server-side requirements" in src/database/README.md.
 */
export async function signInAdministrator(
  email: string,
  password: string,
): Promise<
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'locked'; seconds: number }
  | { ok: false; reason: 'invalid' | 'suspended' | 'no-credential' }
> {
  const locked = signInLockoutSeconds()
  if (locked > 0) return { ok: false, reason: 'locked', seconds: locked }

  const normalizedEmail = email.trim().toLowerCase()
  const administrator = getDatabase().users.find(
    (user) => user.role === 'Admin' && user.email.toLowerCase() === normalizedEmail,
  )

  // Always derive, including for an address with no account behind it.
  //
  // The obvious `stored ? await verifyPassword(...) : false` skips the key
  // derivation entirely when the address is unknown, so an unknown address
  // answers in about a millisecond and a real one takes the best part of a
  // second. That gap is a free account-enumeration oracle — it tells an
  // attacker which addresses are administrators without them ever guessing a
  // password. Deriving against a decoy keeps both paths the same shape.
  const stored = administrator?.passwordHash
  const matched = await verifyPassword(password, stored ?? ENUMERATION_DECOY)

  // An administrator row that has never had a password set is a provisioning
  // state, not a wrong guess. It is recorded, but deliberately does NOT count
  // towards the lockout: no password can succeed here, so counting attempts
  // would lock out the very person who has arrived to set one.
  if (administrator && !stored) {
    recordAudit({
      actorId: administrator.id,
      actorName: administrator.name,
      action: 'session.denied',
      purpose: 'Administrator sign-in refused: no password has been provisioned',
      rows: 1,
      result: 'denied',
    })
    return { ok: false, reason: 'no-credential' }
  }

  if (!administrator || !matched) {
    recordSignInFailure()
    recordAudit({
      actorId: administrator?.id ?? 'anonymous',
      actorName: administrator?.name ?? normalizedEmail,
      action: 'session.denied',
      purpose: 'Administrator sign-in failed',
      rows: 1,
      result: 'failure',
    })
    return { ok: false, reason: 'invalid' }
  }

  if ((administrator.status ?? 'active') !== 'active') {
    recordSignInFailure()
    return { ok: false, reason: 'suspended' }
  }

  clearSignInFailures()
  const session = signInUser(
    administrator.id,
    getDatabase().institution.id,
    'local-admin',
  )
  return session ? { ok: true, session } : { ok: false, reason: 'suspended' }
}

/**
 * Set or change an administrator's password.
 *
 * Requires the current password unless the account has no verifier at all,
 * which is the first-run provisioning case for an administrator row that ships
 * without one.
 */
export async function setAdministratorPassword(
  userId: string,
  nextPassword: string,
  currentPassword?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Gated like every other administrative operation.
  //
  // This was the one that checked nothing about the caller. It verified the
  // *current password* when one existed, which sounds sufficient until you
  // notice the other branch: an administrator row with no verifier yet — the
  // first-run provisioning state — could have a password set on it by anyone
  // signed in at all, with no credential of any kind. Whoever got there first
  // owned the administrator account.
  //
  // The account's own holder may change their own password; otherwise the
  // caller must already be an administrator.
  if (userId !== getCurrentUserId() && !isCurrentUserAdministrator()) {
    return { ok: false, message: 'Only an administrator can change this password.' }
  }
  const account = getDatabase().users.find((user) => user.id === userId)
  if (!account || account.role !== 'Admin') return { ok: false, message: 'No such administrator.' }

  if (account.passwordHash) {
    const matched = currentPassword
      ? await verifyPassword(currentPassword, account.passwordHash)
      : false
    if (!matched) return { ok: false, message: 'The current password is incorrect.' }
  }

  const problem = passwordProblem(nextPassword)
  if (problem) return { ok: false, message: problem }

  const passwordHash = await hashPassword(nextPassword)
  updateDatabase((database) => {
    const user = database.users.find((item) => item.id === userId)
    if (user) user.passwordHash = passwordHash
  })
  recordAudit({
    // Its own action. Filed under `account.role-changed` until now, so an
    // access review reading the log was told a role had changed when one had
    // not — and a genuine role change and a password rotation were
    // indistinguishable.
    action: 'account.password-changed',
    subjectId: userId,
    subjectName: account.name,
    purpose:
      userId === getCurrentUserId()
        ? 'Administrator changed their own password'
        : 'Administrator password changed',
    rows: 1,
    result: 'success',
  })
  return { ok: true }
}

export function isCurrentUserAdministrator() {
  return hasRole('Admin')
}

/** Teachers and administrators. Used by the `/teacher/*` route guard. */
export function canAccessTeaching() {
  return hasVerifiedInstitutionMembership() && hasRole('Teacher', 'Admin')
}

export function signOutCurrentUser() {
  const userId = getCurrentUserId()
  const account = getCurrentUser()
  const previous = getAuthSession()
  const session: AuthSession = {
    ...previous,
    authenticated: false,
    lastSeenAt: new Date().toISOString(),
    // Signing out invalidates the window as well as the flag, so a stored
    // record that survives somehow cannot be flipped back to authenticated.
    expiresAt: null,
    idleExpiresAt: null,
  }
  // Remove the durable record rather than writing a signed-out one: an absent
  // key is unambiguous, and there is nothing left for anyone to edit.
  clearDurableAuth()
  if (account) auditSession('session.signout', userId, account.name, 'Signed out')
  updateDatabase((database) => {
    userDatabaseFrom(database, userId).session = session
  })
}

export function getSignedInHomeRoute() {
  const role = getCurrentUserRole()
  if (role === 'Admin') return '/admin/audit'
  if (role === 'Teacher') return '/teacher/class-picture'
  const settings = getCurrentUserDatabase().settings
  return settings.selectedCourseIds.length > 0 ? '/courses' : '/setup'
}

/**
 * Guards the follow-up write below. A compaction queues an audit entry from
 * inside `persist`, and writing that entry means persisting again — which
 * could compact again, and so on. One extra pass is enough (the entry is a few
 * hundred bytes and the preceding write has already fitted), and the flag makes
 * "one" provable rather than hoped for.
 */
let flushingAudit = false

export function updateDatabase(mutator: (database: SynonanceDatabase) => void) {
  const database = loadDatabase()
  mutator(database)
  drainPendingAudit(database)
  persist(database)

  // A compaction entry queued during the write above would otherwise sit
  // unwritten until something else happened to save — which, for a user who
  // closes the tab after hitting the limit, is never. The one moment the log
  // most needs to record is the one where data was dropped.
  if (!flushingAudit && pendingAudit.length > 0) {
    flushingAudit = true
    try {
      drainPendingAudit(database)
      persist(database)
    } finally {
      flushingAudit = false
    }
  }
  // The mutator has just edited the cached instance in place, so the derived
  // corpus-merged copy is stale. Dropping both is cheaper than reasoning about
  // which fields the mutator touched.
  invalidateDatabaseCache()
  window.dispatchEvent(new CustomEvent(DATABASE_EVENT))
  return database
}

export function subscribeDatabase(listener: () => void) {
  // Another tab writing to the same key leaves this tab's cache stale, so the
  // cache is dropped before the listener runs and re-reads.
  const onStorage = (event: StorageEvent) => {
    // event.key is null when the other tab called clear().
    if (event.key === null || event.key === DELTA_STORAGE_KEY || event.key === AUTH_STORAGE_KEY) {
      invalidateDatabaseCache()
      listener()
    }
  }
  window.addEventListener(DATABASE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(DATABASE_EVENT, listener)
    // Previously this passed `listener`, which is not the function that was
    // registered, so every component that subscribed left a storage listener
    // behind for the lifetime of the page — and each one re-read and re-rendered
    // on every cross-tab write.
    window.removeEventListener('storage', onStorage)
  }
}

// ── Audit log ──────────────────────────────────────────────────────────────

function drainPendingAudit(database: SynonanceDatabase) {
  if (pendingAudit.length === 0) return
  database.auditLog ??= []
  for (const entry of pendingAudit.splice(0)) {
    database.auditLog.push({ ...entry, id: `audit-${uuid()}`, at: new Date().toISOString() })
  }
}

/**
 * Append to the access log.
 *
 * Every administrative action and every session event goes through here, so
 * "who touched this account and when" has one answer rather than depending on
 * whichever page happened to remember to record it. The log is append-only:
 * nothing in the app edits or deletes an entry, and storage compaction is the
 * only thing that ever drops one — loudly, by writing an entry saying so.
 */
export function recordAudit(entry: Omit<AuditEntry, 'id' | 'at' | 'actorId' | 'actorName'> & {
  actorId?: string
  actorName?: string
}) {
  const database = loadDatabase()
  const actorId = entry.actorId ?? database.appSettings.currentUserId
  const actor = database.users.find((user) => user.id === actorId)
  const record: AuditEntry = {
    ...entry,
    id: `audit-${uuid()}`,
    at: new Date().toISOString(),
    actorId,
    actorName: entry.actorName ?? actor?.name ?? actorId,
  }
  updateDatabase((draft) => {
    draft.auditLog ??= []
    draft.auditLog.push(record)
  })
  return record
}

/** The access log, newest first. Administrator-only at every call site. */
export function getAuditLog(): AuditEntry[] {
  if (!isCurrentUserAdministrator()) return []
  return [...(getDatabase().auditLog ?? [])].reverse()
}

/** Audit-log shorthand used by the session helpers below. */
function auditSession(
  action: AuditAction,
  userId: string,
  userName: string,
  purpose: string,
  result: AuditEntry['result'] = 'success',
  detail?: string,
) {
  pendingAudit.push({ actorId: userId, actorName: userName, action, purpose, rows: 1, result, detail })
}

export function getSettings(): DatabaseSettings {
  return getCurrentUserDatabase().settings
}

export function updateSettings(patch: Partial<DatabaseSettings>) {
  const database = updateDatabase((draft) => {
    const userDatabase = userDatabaseFrom(draft)
    userDatabase.settings = { ...userDatabase.settings, ...patch }
  })
  return userDatabaseFrom(database).settings
}

/**
 * The current student's private memory. Reads from their own record only —
 * there is deliberately no way to address another user's memory from here.
 */
export function getUserMemory(): UserMemory {
  const memory = getCurrentUserDatabase().memory
  return memory ?? { persona: '', study: '', updatedAt: '' }
}

export function updateUserMemory(patch: Partial<Pick<UserMemory, 'persona' | 'study'>>) {
  updateDatabase((database) => {
    const user = userDatabaseFrom(database)
    user.memory = {
      ...(user.memory ?? { persona: '', study: '', updatedAt: '' }),
      ...patch,
      updatedAt: new Date().toISOString(),
    }
  })
  return getUserMemory()
}

export function getUserProfile() {
  return getCurrentUserDatabase().profile
}

export function updateUserProfile(patch: Partial<UserProfile>) {
  const database = updateDatabase((draft) => {
    const userDatabase = userDatabaseFrom(draft)
    userDatabase.profile = { ...userDatabase.profile, ...patch }
  })
  return userDatabaseFrom(database).profile
}

export function appendChatMessage(
  threadId: string,
  courseId: string,
  message: Record<string, unknown>,
) {
  updateDatabase((database) => {
    const userDatabase = userDatabaseFrom(database)
    let thread = userDatabase.chatThreads.find((item) => item.id === threadId)
    if (!thread) {
      thread = { id: threadId, courseId, createdAt: new Date().toISOString(), messages: [] }
      userDatabase.chatThreads.unshift(thread)
    }
    const messages = (thread.messages as Array<Record<string, unknown>>) ?? []
    // Stamped here rather than at the call sites so every turn carries a real
    // instant. `time` is a display string ("14:03"): it cannot date a thread,
    // order two messages a day apart, or survive a change of timezone, and the
    // history pages need all three. A caller that knows better may override it.
    messages.push({ at: new Date().toISOString(), ...message })
    thread.messages = messages
    thread.updatedAt = new Date().toISOString()
  })
}

/**
 * Write a message into its thread, replacing any earlier write carrying the
 * same id.
 *
 * A streaming answer used to reach the database only once it had finished, so
 * an aborted generation, a gateway failure or a closed tab threw the whole
 * reply away and left the student's question sitting alone in the thread.
 * Checkpointing the partial text as it arrives keeps whatever was produced.
 */
export function upsertChatMessage(
  threadId: string,
  courseId: string,
  message: Record<string, unknown> & { id: string },
) {
  updateDatabase((database) => {
    const userDatabase = userDatabaseFrom(database)
    let thread = userDatabase.chatThreads.find((item) => item.id === threadId)
    if (!thread) {
      thread = { id: threadId, courseId, createdAt: new Date().toISOString(), messages: [] }
      userDatabase.chatThreads.unshift(thread)
    }
    const messages = (thread.messages as Array<Record<string, unknown>>) ?? []
    const at = messages.findIndex((item) => item.id === message.id)
    if (at >= 0) messages[at] = { ...messages[at], ...message }
    else messages.push({ at: new Date().toISOString(), ...message })
    thread.messages = messages
    thread.updatedAt = new Date().toISOString()
  })
}

export function recordCourseContribution(contribution: Record<string, unknown>) {
  updateDatabase((database) => {
    database.courseContributions.unshift({
      id: `contribution-${uuid()}`,
      status: 'agent-verifying',
      createdAt: new Date().toISOString(),
      ...contribution,
    })
  })
}

export function consumePendingChatPrompt() {
  const prompt = getSettings().pendingChatPrompt
  if (prompt) updateSettings({ pendingChatPrompt: '' })
  return prompt
}

/**
 * Every published question for a course, curated and generated alike.
 *
 * Level is deliberately NOT filtered here — that is a session concern and
 * belongs to `questionsForSession` in question-bank.ts, which is the only
 * place that knows which level the student is taking the course at. This
 * returns the course's rows; the session narrows them.
 *
 * Drafts are excluded. A draft is an item awaiting a decision in the review
 * queue, and serving it to a practice surface would be publishing it by the
 * back door.
 */
export function getQuestions(courseId: string) {
  const database = getDatabase()
  const synthesized = (database.synthesizedQuestions ?? []).filter(
    (question) => (question.status ?? 'published') === 'published',
  )
  return [...database.questions, ...synthesized].filter(
    (question) => question.courseId === '*' || question.courseId === courseId,
  )
}

/**
 * Whether a question can be marked automatically at all. Essay and method
 * prompts carry no accept terms, and substring-matching them would be marking
 * theatre — the UI teaches those instead of scoring them.
 *
 * The rules themselves live in lib/marking.ts, which has no database imports,
 * so the generator's validator can apply exactly the marking a student will
 * meet before it decides whether a draft is worth keeping.
 */
export function isAutoCheckable(question: IndexedQuestion) {
  return isMarkable(question)
}

export function checkQuestionAnswer(question: IndexedQuestion, answer: string) {
  return markAnswer(question, answer)
}

export function recordQuestionAttempt(attempt: Omit<QuestionAttempt, 'id' | 'attemptedAt'>) {
  const record: QuestionAttempt = {
    ...attempt,
    id: `attempt-${uuid()}`,
    attemptedAt: new Date().toISOString(),
  }
  updateDatabase((database) => userDatabaseFrom(database, attempt.userId).questionAttempts.push(record))
  return record
}

export function getGradedPapers(courseId?: string) {
  const papers = getCurrentUserDatabase().gradedPapers
  return courseId ? papers.filter((paper) => paper.courseId === courseId) : papers
}

export function recordGradedPaper(paper: GradedPaper) {
  updateDatabase((database) => userDatabaseFrom(database, paper.userId).gradedPapers.unshift(paper))
  return paper
}

/**
 * Erase every trace of Synonance from this browser and drop the in-memory
 * copy with it.
 *
 * Only ever called by account deletion, and only after the caller has offered
 * an export. `client.ts` stays the single module that touches browser
 * persistence, so the purge is exposed here rather than importing the storage
 * primitive elsewhere.
 *
 * The next read re-seeds a fresh, empty database, so a storage key reappears
 * almost immediately — that is a first-run database, not a survival of the
 * deleted account, and an app cannot run without one. Callers should reload the
 * page rather than navigate, so no mounted component keeps a reference to the
 * account that no longer exists.
 */
export function purgeLocalData() {
  purgeAllStorage()
  invalidateDatabaseCache()
  window.dispatchEvent(new CustomEvent(DATABASE_EVENT))
}

export const DATABASE_STORAGE_KEY = STORAGE_KEY
export const AUTH_SESSION_STORAGE_KEY = AUTH_STORAGE_KEY
