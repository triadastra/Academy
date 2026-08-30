// storage.ts — the browser-persistence primitive underneath the JSON database.
//
// `client.ts` owns the shape of the data; this module owns getting it into and
// out of localStorage without losing it. Three problems it exists to solve:
//
// 1. WRITE AMPLIFICATION. The seed document is ~409 KB, of which ~406 KB is
//    immutable course material already compiled into the JS bundle. Persisting
//    the whole database meant every settings toggle — and every 500 ms chat
//    checkpoint — serialised 409 KB to hold about 3 KB of actual user state.
//    Only the mutable delta is written now; the seed is re-merged on read.
//
// 2. QUOTA. localStorage is ~5 MB per origin and `setItem` throws when it is
//    full. That throw used to escape into a click handler, so writes stopped
//    working with no error and no sign anything was wrong. Writes now compact
//    and retry down a ladder, and report a typed result when they still fail.
//
// 3. DESTRUCTIVE MIGRATION. A stored document whose schemaVersion did not match
//    the build's fell through to a fresh seed, discarding everything the user
//    had. Incompatible documents are quarantined under a separate key instead,
//    so a rollback or a half-deployed build is recoverable rather than fatal.
import type { AuditEntry, SynonanceDatabase } from './types'

/** Delta document. Bump only when the delta's own shape changes. */
export const DELTA_STORAGE_KEY = 'synonance:database-delta:v1'
/** Pre-delta full-document store, read once to carry existing users across. */
export const LEGACY_FULL_STORAGE_KEY = 'synonance:json-database:v2'
/** Where a document this build cannot read is parked instead of deleted. */
export const QUARANTINE_KEY = 'synonance:database-quarantine:v1'
/** Fired when a write is compacted or fails, so the UI can say so. */
export const STORAGE_EVENT = 'synonance:storage-status'

// The retention policy, in numbers. Exported because /admin/retention reports
// them: an administrator asked what this system keeps is owed the figures the
// code actually enforces, not a round number written into a page.
/** Compact before writing if the delta passes this. ~2.5 MB of a ~5 MB quota. */
export const SOFT_LIMIT_BYTES = 2_500_000
/** Chat threads kept per user once compaction starts. */
export const COMPACT_THREAD_LIMIT = 40
/** Messages kept per thread once compaction starts. */
export const COMPACT_MESSAGE_LIMIT = 120
/** Question attempts kept per user once compaction starts. */
export const COMPACT_ATTEMPT_LIMIT = 2_000
/** Audit entries kept once compaction reaches that rung of the ladder. */
export const COMPACT_AUDIT_FLOOR = 100
/** Audit entries retained. The log is append-only but not unbounded. */
export const AUDIT_LIMIT = 1_000

/**
 * The subset of the database that can actually change at runtime. Everything
 * absent here is seed material and is rebuilt from the bundle on load.
 *
 * `users` and `notes` carry only runtime-created or runtime-edited rows —
 * see `extractDelta`.
 */
export interface DatabaseDelta {
  schemaVersion: number
  writtenAt: string
  appSettings: SynonanceDatabase['appSettings']
  userDatabases: SynonanceDatabase['userDatabases']
  users: SynonanceDatabase['users']
  notes: SynonanceDatabase['notes']
  noteRevisions: SynonanceDatabase['noteRevisions']
  courseContributions: SynonanceDatabase['courseContributions']
  /**
   * Generated material. Runtime-created in its entirety — there is no seed
   * copy to diff against, so it is stored whole, which is also why it is
   * capped per session in question-bank.ts rather than left to grow.
   */
  synthesizedQuestions: SynonanceDatabase['synthesizedQuestions']
  synthesizedPapers: SynonanceDatabase['synthesizedPapers']
  synthesisBatches: SynonanceDatabase['synthesisBatches']
  /**
   * Notifications are runtime-created like the generated material above, so
   * the table is stored whole; notifications.ts caps it at send time.
   */
  notifications: SynonanceDatabase['notifications']
  auditLog: AuditEntry[]
}

export type WriteOutcome =
  /** Written as-is. */
  | { status: 'ok'; bytes: number }
  /** Written, but history had to be dropped to make it fit. */
  | { status: 'compacted'; bytes: number; dropped: string[] }
  /** Not written. The in-memory database is ahead of the stored copy. */
  | { status: 'failed'; reason: 'quota' | 'unavailable'; message: string }

export interface StorageStatusDetail {
  outcome: WriteOutcome
}

function announce(outcome: WriteOutcome) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<StorageStatusDetail>(STORAGE_EVENT, { detail: { outcome } }),
  )
}

/**
 * Whether localStorage can be written at all.
 *
 * Safari in private browsing, and any browser with site data blocked, exposes
 * the object but throws on `setItem`. Probing is the only reliable test, and it
 * is cheap enough to do once.
 */
let writable: boolean | null = null
export function isStorageWritable(): boolean {
  if (writable !== null) return writable
  try {
    const probe = '__synonance_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    writable = true
  } catch {
    writable = false
  }
  return writable
}

/** A DOMException raised because the origin is out of storage. */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  // Chrome/Firefox use the standard name; Safari's legacy code is 22, and
  // Firefox's older builds report NS_ERROR_DOM_QUOTA_REACHED / code 1014.
  const code = (error as DOMException).code
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  )
}

/**
 * Pull the mutable delta out of a full in-memory database.
 *
 * `seed` decides what counts as mutable: a user the seed does not know about
 * was created at runtime and must be kept, and a note whose revision is ahead
 * of the seed's carries applied edits. Everything else is reconstructible.
 */
export function extractDelta(
  database: SynonanceDatabase,
  seed: SynonanceDatabase,
  auditLog: AuditEntry[],
): DatabaseDelta {
  const seededUserIds = new Set(seed.users.map((user) => user.id))
  const seedNoteRevisions = new Map(seed.notes.map((note) => [note.id, note.revision]))

  return {
    schemaVersion: seed.meta.schemaVersion,
    writtenAt: new Date().toISOString(),
    appSettings: database.appSettings,
    userDatabases: database.userDatabases,
    // A seeded user row that has been edited (a suspension, a role change) is
    // kept too — otherwise the next load would quietly restore it from seed.
    users: database.users.filter((user) => {
      if (!seededUserIds.has(user.id)) return true
      const seeded = seed.users.find((item) => item.id === user.id)
      return seeded ? JSON.stringify(seeded) !== JSON.stringify(user) : true
    }),
    notes: database.notes.filter((note) => {
      const seedRevision = seedNoteRevisions.get(note.id)
      // A seeded note is stored only once an applied revision has carried it
      // past the revision the bundle ships.
      //
      // A note the seed has never heard of is stored unconditionally, because
      // its mere presence here is the edit. `database` is the RAW database;
      // the fetched corpus is merged into a separate shallow copy in
      // `getDatabase` and never reaches this function, so the only way a
      // non-seed note gets in is `applyRevision` copying one in to edit it.
      //
      // This used to read `note.revision > 0`, which looks like a safety net
      // and is not one: corpus notes ship at revision 1, so had one ever
      // reached the raw database unedited, that test would have passed and
      // written the entire multi-megabyte study-guide corpus into
      // localStorage — the exact thing this whole delta scheme exists to
      // prevent. Presence is the correct signal; a revision number is not.
      return seedRevision === undefined ? true : note.revision > seedRevision
    }),
    noteRevisions: database.noteRevisions ?? [],
    courseContributions: database.courseContributions ?? [],
    synthesizedQuestions: database.synthesizedQuestions ?? [],
    synthesizedPapers: database.synthesizedPapers ?? [],
    synthesisBatches: database.synthesisBatches ?? [],
    notifications: database.notifications ?? [],
    auditLog: auditLog.slice(-AUDIT_LIMIT),
  }
}

/** Read the stored delta, or null when there is nothing usable to read. */
export function readDelta(currentSchemaVersion: number): DatabaseDelta | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(DELTA_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: DatabaseDelta
  try {
    parsed = JSON.parse(raw) as DatabaseDelta
  } catch {
    quarantine(raw, 'unparseable')
    return null
  }

  if (parsed.schemaVersion !== currentSchemaVersion) {
    // Do NOT delete it. A version we cannot read is usually a rollback or a
    // half-rolled-out deploy, and the user's coursework is still in there.
    quarantine(raw, `schema ${parsed.schemaVersion} != ${currentSchemaVersion}`)
    return null
  }
  return parsed
}

/**
 * Park a document this build cannot use, keeping the newest quarantined copy
 * only. Best-effort: if there is no room even for this, the original stays
 * where it is rather than being cleared.
 */
function quarantine(raw: string, reason: string) {
  try {
    localStorage.setItem(
      QUARANTINE_KEY,
      JSON.stringify({ quarantinedAt: new Date().toISOString(), reason, document: raw }),
    )
    localStorage.removeItem(DELTA_STORAGE_KEY)
  } catch {
    // Leave the unreadable document in place; a later build may read it.
  }
}

/** The quarantined document, for the recovery UI. */
export function readQuarantine(): { quarantinedAt: string; reason: string; document: string } | null {
  try {
    const raw = localStorage.getItem(QUARANTINE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearQuarantine() {
  try {
    localStorage.removeItem(QUARANTINE_KEY)
  } catch {
    // Nothing to do — it will be overwritten by the next quarantine.
  }
}

/**
 * Drop the least valuable history from a delta, in order, until it fits.
 *
 * Each step is a real loss, so they are ordered by how little the user would
 * miss them, and every step taken is named in the write outcome rather than
 * happening silently. Ancient chat turns go before recent ones; a student's
 * own attempt record survives longer than the transcript of how they got there.
 */
function compactStep(delta: DatabaseDelta, step: number): string | null {
  switch (step) {
    case 0: {
      // Partial checkpoints from an interrupted stream. Pure overhead once the
      // final message has landed.
      let removed = 0
      for (const user of Object.values(delta.userDatabases)) {
        for (const thread of user.chatThreads) {
          const messages = (thread.messages as Array<Record<string, unknown>>) ?? []
          const kept = messages.filter((message) => message.streaming !== true)
          removed += messages.length - kept.length
          thread.messages = kept
        }
      }
      return removed > 0 ? `${removed} interrupted partial replies` : null
    }
    case 1: {
      let removed = 0
      for (const user of Object.values(delta.userDatabases)) {
        for (const thread of user.chatThreads) {
          const messages = (thread.messages as Array<Record<string, unknown>>) ?? []
          if (messages.length <= COMPACT_MESSAGE_LIMIT) continue
          removed += messages.length - COMPACT_MESSAGE_LIMIT
          thread.messages = messages.slice(-COMPACT_MESSAGE_LIMIT)
        }
      }
      return removed > 0 ? `${removed} older chat messages` : null
    }
    case 2: {
      let removed = 0
      for (const user of Object.values(delta.userDatabases)) {
        if (user.chatThreads.length <= COMPACT_THREAD_LIMIT) continue
        // Threads are unshifted newest-first, so the tail is the oldest — but
        // a pinned thread is the student having said "keep this one", and
        // dropping it for age would make the pin a decoration. Pinned threads
        // survive the cut and take up the limit; the newest of the rest fill
        // whatever room is left.
        const pinned = user.chatThreads.filter((thread) => thread.pinned === true)
        const rest = user.chatThreads.filter((thread) => thread.pinned !== true)
        const room = Math.max(0, COMPACT_THREAD_LIMIT - pinned.length)
        const survivors = new Set([...pinned, ...rest.slice(0, room)])
        removed += user.chatThreads.length - survivors.size
        user.chatThreads = user.chatThreads.filter((thread) => survivors.has(thread))
      }
      return removed > 0 ? `${removed} oldest chat threads` : null
    }
    case 3: {
      // Retired and discarded generated items. They are kept for the audit
      // trail, not for practice, and the trail itself lives in `auditLog` —
      // so they are the first thing here that nobody will miss.
      const before = delta.synthesizedQuestions?.length ?? 0
      if (before > 0) {
        const live = new Set(
          (delta.synthesisBatches ?? [])
            .filter((batch) => batch.status !== 'discarded')
            .map((batch) => batch.id),
        )
        delta.synthesizedQuestions = delta.synthesizedQuestions!.filter(
          (question) =>
            question.status !== 'retired' && (!question.batchId || live.has(question.batchId)),
        )
        const removed = before - delta.synthesizedQuestions.length
        if (removed > 0) return `${removed} retired generated questions`
      }
      return null
    }
    case 4: {
      const before = delta.auditLog.length
      delta.auditLog = delta.auditLog.slice(-COMPACT_AUDIT_FLOOR)
      return before > COMPACT_AUDIT_FLOOR ? `${before - COMPACT_AUDIT_FLOOR} audit entries` : null
    }
    case 5: {
      let removed = 0
      for (const user of Object.values(delta.userDatabases)) {
        if (user.questionAttempts.length <= COMPACT_ATTEMPT_LIMIT) continue
        removed += user.questionAttempts.length - COMPACT_ATTEMPT_LIMIT
        user.questionAttempts = user.questionAttempts.slice(-COMPACT_ATTEMPT_LIMIT)
      }
      return removed > 0 ? `${removed} oldest question attempts` : null
    }
    case 6: {
      // Last resort before failing: signed-out users' chat transcripts. Their
      // settings, attempts and grades stay — only the bulkiest field goes.
      const currentUserId = delta.appSettings.currentUserId
      let removed = 0
      for (const [userId, user] of Object.entries(delta.userDatabases)) {
        if (userId === currentUserId || user.chatThreads.length === 0) continue
        removed += user.chatThreads.length
        user.chatThreads = []
      }
      return removed > 0 ? `${removed} chat threads belonging to other accounts` : null
    }
    default:
      return null
  }
}

const COMPACT_STEPS = 7

/**
 * Persist the delta, compacting down the ladder above if it will not fit.
 *
 * The delta is mutated in place while compacting, and the caller re-merges it,
 * so the in-memory database ends up matching what is actually on disk. Writing
 * a smaller document while keeping the larger one in memory would just fail
 * again on the next save.
 */
export function writeDelta(delta: DatabaseDelta): WriteOutcome {
  if (!isStorageWritable()) {
    const outcome: WriteOutcome = {
      status: 'failed',
      reason: 'unavailable',
      message: 'This browser is blocking site storage, so changes cannot be saved.',
    }
    announce(outcome)
    return outcome
  }

  const dropped: string[] = []
  let serialized = JSON.stringify(delta)

  // Compact ahead of the throw when the document is already near the ceiling:
  // a pre-emptive trim is cheaper than a failed write plus a retry, and it
  // keeps the app off the cliff edge instead of repeatedly walking up to it.
  let step = 0
  while (serialized.length > SOFT_LIMIT_BYTES && step < COMPACT_STEPS) {
    const note = compactStep(delta, step)
    step += 1
    if (!note) continue
    dropped.push(note)
    serialized = JSON.stringify(delta)
  }

  for (;;) {
    try {
      localStorage.setItem(DELTA_STORAGE_KEY, serialized)
      const outcome: WriteOutcome =
        dropped.length > 0
          ? { status: 'compacted', bytes: serialized.length, dropped }
          : { status: 'ok', bytes: serialized.length }
      if (dropped.length > 0) announce(outcome)
      return outcome
    } catch (error) {
      if (!isQuotaError(error) || step >= COMPACT_STEPS) {
        const outcome: WriteOutcome = isQuotaError(error)
          ? {
              status: 'failed',
              reason: 'quota',
              message:
                'Browser storage is full and could not be freed. Export your data and clear site data to continue saving.',
            }
          : {
              status: 'failed',
              reason: 'unavailable',
              message: `Saving failed: ${(error as Error).message}`,
            }
        announce(outcome)
        return outcome
      }
      const note = compactStep(delta, step)
      step += 1
      if (note) dropped.push(note)
      serialized = JSON.stringify(delta)
    }
  }
}

/** Bytes the delta currently occupies, for the storage readout in settings. */
export function storedBytes(): number {
  try {
    return localStorage.getItem(DELTA_STORAGE_KEY)?.length ?? 0
  } catch {
    return 0
  }
}

/**
 * Origin quota and usage, when the browser will say. Returns null in Safari
 * and anywhere the Storage API is absent — callers show the stored size alone.
 */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return typeof usage === 'number' && typeof quota === 'number' ? { usage, quota } : null
  } catch {
    return null
  }
}

/** Remove every Synonance key. Used by account deletion, never automatically. */
export function purgeAllStorage() {
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('synonance:')) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // Partial purge is still better than none; the caller reloads regardless.
  }
}
