// retention.ts — what this installation is actually holding, measured against
// the limits it actually enforces.
//
// /admin/retention used to be a rail item that re-rendered the audit log and a
// chip reading "Retention 1095 days". Nothing anywhere honoured 1095 days:
// retention here is not time-based at all. The store keeps a fixed number of
// the most recent records per kind, and sheds history in a defined order when
// the browser's quota comes under pressure. That is the policy, so that is
// what this module reports — counts against the real ceilings in storage.ts,
// and what the last write actually cost.
import {
  getAuditLog,
  getDatabase,
  getLastWriteOutcome,
  isCurrentUserAdministrator,
} from './client'
import {
  AUDIT_LIMIT,
  COMPACT_ATTEMPT_LIMIT,
  COMPACT_AUDIT_FLOOR,
  COMPACT_MESSAGE_LIMIT,
  COMPACT_THREAD_LIMIT,
  SOFT_LIMIT_BYTES,
  storedBytes,
  type WriteOutcome,
} from './storage'
import type { AuditEntry } from './types'

/** One kind of record, what bounds it, and how close it is to that bound. */
export interface RetentionLine {
  key: string
  label: string
  /** What the ceiling applies to — "per account", "per thread", "in total". */
  scope: string
  /** The largest count observed, which is what the ceiling is measured against. */
  peak: number
  limit: number
  /** Sum across the whole installation, for context beside the peak. */
  total: number
  /** Plain statement of what happens at the ceiling. */
  rule: string
}

/** A rung of the compaction ladder, in the order `compactStep` runs them. */
export interface CompactionRung {
  step: number
  label: string
  detail: string
}

export interface RetentionReport {
  lines: RetentionLine[]
  ladder: CompactionRung[]
  storedBytes: number
  softLimitBytes: number
  lastWrite: WriteOutcome
  auditOldestAt: string | null
  auditNewestAt: string | null
  auditCount: number
  /** Compaction and quarantine events, newest first. */
  storageEvents: AuditEntry[]
  accountCount: number
  erasedCount: number
}

/**
 * What a caller without the administrator role gets.
 *
 * The policy itself is not secret — the limits and the order things are
 * dropped in are properties of the build, and describing them to the wrong
 * person leaks nothing. The measurements are the sensitive half, so those come
 * back at zero rather than the whole call failing, and the page renders the
 * policy with nothing counted against it.
 */
function emptyReport(): RetentionReport {
  return {
    lines: [],
    ladder: ladder(),
    storedBytes: 0,
    softLimitBytes: SOFT_LIMIT_BYTES,
    lastWrite: { status: 'ok', bytes: 0 },
    auditOldestAt: null,
    auditNewestAt: null,
    auditCount: 0,
    storageEvents: [],
    accountCount: 0,
    erasedCount: 0,
  }
}

/**
 * The ladder, in `compactStep`'s switch order.
 *
 * Kept beside the report rather than inside storage.ts so the writer stays
 * free of presentation, but it describes that function and nothing else — if a
 * rung is added there, it belongs here too, or this page starts lying about
 * what gets dropped first.
 */
function ladder(): CompactionRung[] {
  return [
    {
      step: 1,
      label: 'Interrupted partial replies',
      detail: 'Checkpoints from a tutor reply that was cut off. Pure overhead once the final message has landed.',
    },
    {
      step: 2,
      label: `Chat messages beyond the newest ${COMPACT_MESSAGE_LIMIT} in a thread`,
      detail: 'The oldest turns of long conversations, thread by thread.',
    },
    {
      step: 3,
      label: `Chat threads beyond the newest ${COMPACT_THREAD_LIMIT} per account`,
      detail: 'Whole conversations, oldest first.',
    },
    {
      step: 4,
      label: `Audit entries beyond the newest ${COMPACT_AUDIT_FLOOR}`,
      detail: 'The log is trimmed only under real pressure, and the trim is itself recorded.',
    },
    {
      step: 5,
      label: `Question attempts beyond the newest ${COMPACT_ATTEMPT_LIMIT} per account`,
      detail: 'A student’s own attempt record outlives the transcript of how they got there.',
    },
    {
      step: 6,
      label: 'Chat transcripts of signed-out accounts',
      detail: 'Last resort before a write fails. Their settings, attempts and grades stay.',
    },
  ]
}

export function retentionReport(): RetentionReport {
  // Gated like its siblings.
  //
  // `listAccounts` and `getAuditLog` both refuse a non-administrator at the
  // data layer, and this reads the same institution-wide material — every
  // account's thread, message, attempt and paper counts, how many accounts
  // exist, how many have been erased, and the extent of the audit log. It was
  // the one of the three that answered anybody who called it, which made the
  // route guard the only thing standing in front of it. Three sibling readers
  // of the same data should not disagree about who may read it.
  if (!isCurrentUserAdministrator()) return emptyReport()

  const database = getDatabase()
  const entries = getAuditLog()
  const userDatabases = Object.values(database.userDatabases ?? {})

  let threadPeak = 0
  let threadTotal = 0
  let messagePeak = 0
  let messageTotal = 0
  let attemptPeak = 0
  let attemptTotal = 0
  let paperPeak = 0
  let paperTotal = 0

  for (const user of userDatabases) {
    const threads = user.chatThreads ?? []
    threadPeak = Math.max(threadPeak, threads.length)
    threadTotal += threads.length
    for (const thread of threads) {
      const messages = (thread.messages as unknown[] | undefined) ?? []
      messagePeak = Math.max(messagePeak, messages.length)
      messageTotal += messages.length
    }
    const attempts = user.questionAttempts ?? []
    attemptPeak = Math.max(attemptPeak, attempts.length)
    attemptTotal += attempts.length
    const papers = user.gradedPapers ?? []
    paperPeak = Math.max(paperPeak, papers.length)
    paperTotal += papers.length
  }

  const lines: RetentionLine[] = [
    {
      key: 'audit',
      label: 'Audit entries',
      scope: 'in total',
      peak: entries.length,
      limit: AUDIT_LIMIT,
      total: entries.length,
      rule: `Append-only. The oldest are dropped past ${AUDIT_LIMIT.toLocaleString()}, and only to ${COMPACT_AUDIT_FLOOR} under storage pressure.`,
    },
    {
      key: 'threads',
      label: 'Chat threads',
      scope: 'per account',
      peak: threadPeak,
      limit: COMPACT_THREAD_LIMIT,
      total: threadTotal,
      rule: 'Kept in full until storage runs short; then the oldest threads go first.',
    },
    {
      key: 'messages',
      label: 'Messages in one thread',
      scope: 'per thread',
      peak: messagePeak,
      limit: COMPACT_MESSAGE_LIMIT,
      total: messageTotal,
      rule: 'Kept in full until storage runs short; then the oldest turns go first.',
    },
    {
      key: 'attempts',
      label: 'Question attempts',
      scope: 'per account',
      peak: attemptPeak,
      limit: COMPACT_ATTEMPT_LIMIT,
      total: attemptTotal,
      rule: 'Survives chat history. Trimmed only when dropping transcripts was not enough.',
    },
    {
      key: 'papers',
      label: 'Graded papers',
      scope: 'per account',
      peak: paperPeak,
      limit: 0,
      total: paperTotal,
      rule: 'No ceiling. Graded work is never dropped to make room.',
    },
  ]

  // `getAuditLog` returns newest-first.
  const auditNewestAt = entries[0]?.at ?? null
  const auditOldestAt = entries[entries.length - 1]?.at ?? null

  return {
    lines,
    ladder: ladder(),
    storedBytes: storedBytes(),
    softLimitBytes: SOFT_LIMIT_BYTES,
    lastWrite: getLastWriteOutcome(),
    auditOldestAt,
    auditNewestAt,
    auditCount: entries.length,
    storageEvents: entries.filter(
      (entry) => entry.action === 'storage.compacted' || entry.action === 'storage.quarantined',
    ),
    accountCount: database.users.length,
    erasedCount: database.users.filter((user) => user.status === 'erased').length,
  }
}

/**
 * "12.3 GB" / "1.4 MB" / "812 KB" / "0 bytes" — the same shape everywhere.
 *
 * The GB tier is not decoration: Chrome grants an origin a share of free disk
 * and reports it here, so the quota readout is routinely five figures of
 * megabytes.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 bytes'
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
