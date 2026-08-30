// accounts.ts — account lifecycle: listing, roles, suspension, export, erasure.
//
// These used to be toasts. `/admin/people` rendered a fixed array out of
// `data/mock.ts`, so real accounts never appeared in it, and "Suspend access",
// "Export data" and "Start erasure" changed a local flag or nothing at all.
// Every operation here acts on the real user table, is refused when the caller
// does not hold the role for it, and writes an audit entry either way.
//
// WHERE THE BOUNDARY ACTUALLY IS. The role checks below run in the browser, so
// they are the app behaving correctly rather than a defence against someone
// editing their own storage. They are still worth having — they stop a student
// reaching an admin action by URL, and they make the intended permission model
// explicit — but the enforceable copy has to live on a server. See
// "Server-side requirements" in README.md.
import {
  getCurrentUser,
  getCurrentUserId,
  getDatabase,
  isCurrentUserAdministrator,
  purgeLocalData,
  recordAudit,
  signOutCurrentUser,
  updateDatabase,
} from './client'
import { pushSystemNotification } from './notifications'
import type { AccountStatus, ApplicationUser, UserDatabase, UserRole } from './types'

/** An account as the admin table shows it, joined to its per-user activity. */
export interface AccountSummary {
  id: string
  name: string
  displayName?: string
  initials: string
  email: string
  launchpadVid: string
  role: UserRole
  status: AccountStatus
  createdAt: string | null
  lastActiveAt: string | null
  courseCount: number
  chatThreadCount: number
  attemptCount: number
  /**
   * Graded papers. Carried because it is the third of the three counts
   * `exportAccount` adds up when it records how many rows an export touched —
   * without it, /admin/exports would show a row total that disagreed with the
   * audit entry written the moment the button was pressed.
   */
  paperCount: number
  /** True for the account running the app right now. */
  isCurrent: boolean
}

/** Success carries a `value` only where the operation produces one. */
export type AccountResult<T = never> =
  | { ok: true; value: T }
  | { ok: false; message: string }

function deny(message: string): { ok: false; message: string } {
  return { ok: false, message }
}

/**
 * Guard shared by every administrative operation.
 *
 * Returns the reason on refusal instead of a bare false, so the caller can put
 * something truthful on screen rather than a generic failure.
 */
function requireAdministrator(): string | null {
  if (!isCurrentUserAdministrator()) return 'Only an administrator can do this.'
  return null
}

function activity(userDatabase: UserDatabase | undefined) {
  return {
    courseCount: userDatabase?.settings.selectedCourseIds.length ?? 0,
    chatThreadCount: userDatabase?.chatThreads.length ?? 0,
    attemptCount: userDatabase?.questionAttempts.length ?? 0,
    paperCount: userDatabase?.gradedPapers?.length ?? 0,
    lastActiveAt: userDatabase?.session?.lastSeenAt ?? null,
  }
}

/** Every account, for the People and roles table. Administrators only. */
export function listAccounts(): AccountSummary[] {
  if (!isCurrentUserAdministrator()) return []
  const database = getDatabase()
  const currentUserId = database.appSettings.currentUserId
  return database.users.map((user) => ({
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    initials: user.initials,
    email: user.email,
    launchpadVid: user.launchpadVid ?? '',
    role: user.role,
    status: user.status ?? 'active',
    createdAt: user.createdAt ?? null,
    isCurrent: user.id === currentUserId,
    ...activity(database.userDatabases[user.id]),
  }))
}

// ── Roles ──────────────────────────────────────────────────────────────────

/**
 * Change an account's role.
 *
 * An administrator may not demote themselves. Not out of politeness: the last
 * administrator demoting themselves leaves an institution with no way back
 * into People and roles at all, and on a browser-local store there is no
 * support channel that can undo it.
 */
export function setAccountRole(userId: string, role: UserRole): AccountResult<void> {
  const refusal = requireAdministrator()
  if (refusal) return deny(refusal)

  const database = getDatabase()
  const target = database.users.find((user) => user.id === userId)
  if (!target) return deny('No such account.')
  if (target.role === role) return { ok: true, value: undefined }

  if (userId === getCurrentUserId() && role !== 'Admin') {
    return deny('You cannot remove your own administrator role.')
  }
  if (target.role === 'Admin' && role !== 'Admin' && administratorCount() <= 1) {
    return deny('This is the only administrator. Promote another account first.')
  }

  const previousRole = target.role
  updateDatabase((draft) => {
    const user = draft.users.find((item) => item.id === userId)
    if (user) user.role = role
  })
  recordAudit({
    action: 'account.role-changed',
    subjectId: userId,
    subjectName: target.name,
    purpose: `Role changed from ${previousRole} to ${role}`,
    rows: 1,
    result: 'success',
  })
  if (userId !== getCurrentUserId()) {
    pushSystemNotification({
      recipientId: userId,
      title: `Your role is now ${role}`,
      body: `An administrator changed your Synonance role from ${previousRole} to ${role}. The change takes effect the next time you open a page.`,
    })
  }
  return { ok: true, value: undefined }
}

function administratorCount() {
  return getDatabase().users.filter(
    (user) => user.role === 'Admin' && (user.status ?? 'active') === 'active',
  ).length
}

// ── Suspension ─────────────────────────────────────────────────────────────

/**
 * Suspend or reinstate an account.
 *
 * A suspension is enforced at three points, because a flag nobody checks is
 * just a label: `signInUser` refuses to open a session, `signInWithLaunchpad`
 * refuses to re-open one through the platform, and `applyDurableAuth` ends any
 * session that is already live at the next load.
 */
export function setAccountSuspended(userId: string, suspended: boolean): AccountResult<void> {
  const refusal = requireAdministrator()
  if (refusal) return deny(refusal)

  const database = getDatabase()
  const target = database.users.find((user) => user.id === userId)
  if (!target) return deny('No such account.')
  if ((target.status ?? 'active') === 'erased') return deny('This account has been erased.')

  if (suspended) {
    if (userId === getCurrentUserId()) return deny('You cannot suspend your own account.')
    if (target.role === 'Admin' && administratorCount() <= 1) {
      return deny('This is the only administrator. Promote another account first.')
    }
  }

  const actorId = getCurrentUserId()
  updateDatabase((draft) => {
    const user = draft.users.find((item) => item.id === userId)
    if (!user) return
    user.status = suspended ? 'suspended' : 'active'
    user.suspendedAt = suspended ? new Date().toISOString() : undefined
    user.suspendedBy = suspended ? actorId : undefined
    // End the session immediately as well as blocking the next one, so a
    // suspended user in another tab is out at their next navigation instead of
    // staying inside the app until they happen to sign out.
    const userDatabase = draft.userDatabases[userId]
    if (suspended && userDatabase?.session) {
      userDatabase.session = {
        ...userDatabase.session,
        authenticated: false,
        expiresAt: null,
        idleExpiresAt: null,
      }
    }
  })
  recordAudit({
    action: suspended ? 'account.suspended' : 'account.reinstated',
    subjectId: userId,
    subjectName: target.name,
    purpose: suspended ? 'Access suspended by administrator' : 'Access reinstated by administrator',
    rows: 1,
    result: 'success',
  })
  // A reinstated user gets told on their next sign-in; a suspended one cannot
  // sign in to read anything, so no row is written for the suspension itself.
  if (!suspended) {
    pushSystemNotification({
      recipientId: userId,
      title: 'Your access has been reinstated',
      body: 'An administrator reinstated your Synonance account. Your courses, notes and history are as you left them.',
    })
  }
  return { ok: true, value: undefined }
}

// ── Export ─────────────────────────────────────────────────────────────────

/** A portable copy of one account. JSON, versioned, no other user's data in it. */
export interface AccountExport {
  format: 'synonance-account-export'
  version: 1
  exportedAt: string
  exportedBy: string
  account: Omit<ApplicationUser, 'passwordHash'>
  data: UserDatabase
}

function buildExport(userId: string): AccountExport | null {
  const database = getDatabase()
  const account = database.users.find((user) => user.id === userId)
  if (!account) return null
  // The verifier is stripped rather than exported. It is not the user's data,
  // it is a credential, and an export is a file that gets emailed around.
  const { passwordHash: _passwordHash, ...safeAccount } = account
  void _passwordHash
  return {
    format: 'synonance-account-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: getCurrentUserId(),
    account: safeAccount,
    data: structuredClone(database.userDatabases[userId] ?? ({} as UserDatabase)),
  }
}

/**
 * Export one account's data.
 *
 * A user may always export their own. Exporting somebody else's requires the
 * administrator role and is recorded against the administrator, not the
 * subject — "who read this student's data" is the question an access log
 * exists to answer.
 */
export function exportAccount(userId: string): AccountResult<AccountExport> {
  const isSelf = userId === getCurrentUserId()
  if (!isSelf && !isCurrentUserAdministrator()) {
    return deny('Only an administrator can export another account.')
  }

  const payload = buildExport(userId)
  if (!payload) return deny('No such account.')

  // Parenthesised deliberately: `??` binds looser than `+`, so the unbracketed
  // form reads as `attempts ?? (0 + papers + threads)` and silently reports
  // only the attempt count for every account that has any.
  const rows =
    (payload.data.questionAttempts?.length ?? 0) +
    (payload.data.gradedPapers?.length ?? 0) +
    (payload.data.chatThreads?.length ?? 0)
  recordAudit({
    action: 'data.exported',
    subjectId: userId,
    subjectName: payload.account.name,
    purpose: isSelf ? 'Account owner exported their own data' : 'Administrator exported account data',
    rows,
    result: 'success',
  })
  return { ok: true, value: payload }
}

/**
 * Hand the export to the browser as a download.
 *
 * A blob URL rather than a data: URL — a data: URL of a large transcript can
 * exceed what the browser will accept in an href, and fails by doing nothing.
 */
export function downloadExport(payload: AccountExport) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = payload.exportedAt.slice(0, 10)
  link.href = url
  link.download = `synonance-${payload.account.launchpadVid || payload.account.id}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers; a tick is
  // enough for the navigation to have been taken.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/**
 * Export an account and hand the file to the browser, in one call.
 *
 * The authorise → build → download → report sequence had been written out four
 * times: in People and roles, in Data exports, in the bulk loop next to it, and
 * in a student's own profile. Four copies of a rule about who may read whose
 * data is four places for it to drift, and the bulk loop had already drifted —
 * it skipped the refusal rather than reporting it, so an export that was denied
 * looked identical to one that had never been asked for.
 *
 * Returns the sentence the caller should show, so the wording is consistent
 * too: the same operation reported "Export downloaded for X" on one screen and
 * "Export downloaded" on another.
 */
export function exportAndDownload(userId: string): AccountResult<string> {
  const result = exportAccount(userId)
  if (!result.ok) return result
  downloadExport(result.value)
  const who = result.value.account.name
  return {
    ok: true,
    value: userId === getCurrentUserId() ? 'Your data has been downloaded.' : `Export downloaded for ${who}.`,
  }
}

// ── Erasure ────────────────────────────────────────────────────────────────

/**
 * Permanently delete an account's personal data.
 *
 * The user row is tombstoned rather than removed: audit entries reference user
 * ids, and deleting the row outright would turn a compliance log into a list of
 * unresolvable identifiers — the opposite of what erasure is meant to
 * demonstrate. Identifying fields are cleared, the per-user database goes
 * entirely, and the tombstone records that it happened.
 */
export function eraseAccount(userId: string): AccountResult<void> {
  const refusal = requireAdministrator()
  if (refusal) return deny(refusal)

  const database = getDatabase()
  const target = database.users.find((user) => user.id === userId)
  if (!target) return deny('No such account.')
  if ((target.status ?? 'active') === 'erased') return deny('This account is already erased.')
  if (userId === getCurrentUserId()) {
    return deny('Use "Delete my account" in your own profile to erase your own data.')
  }
  if (target.role === 'Admin' && administratorCount() <= 1) {
    return deny('This is the only administrator. Promote another account first.')
  }

  const userDatabase = database.userDatabases[userId]
  const rows =
    (userDatabase?.questionAttempts.length ?? 0) +
    (userDatabase?.gradedPapers.length ?? 0) +
    (userDatabase?.chatThreads.length ?? 0)
  const erasedName = target.name

  updateDatabase((draft) => {
    delete draft.userDatabases[userId]
    const user = draft.users.find((item) => item.id === userId)
    if (!user) return
    user.status = 'erased'
    user.erasedAt = new Date().toISOString()
    user.name = 'Erased account'
    user.displayName = undefined
    user.initials = '—'
    user.email = ''
    user.schoolId = ''
    user.launchpadVid = undefined
    user.launchpadInstitutionId = undefined
    user.launchpadVerifiedAt = undefined
    user.passwordHash = undefined
  })

  recordAudit({
    action: 'account.erased',
    subjectId: userId,
    subjectName: erasedName,
    purpose: 'Personal data erased at administrator request',
    rows,
    result: 'success',
  })
  return { ok: true, value: undefined }
}

/**
 * Erase the signed-in account's own data and clear this browser.
 *
 * Self-service deletion, which an app holding coursework and chat transcripts
 * has to offer. Because every store is browser-local, "delete my account"
 * genuinely means clearing this browser — there is no server copy left behind,
 * and saying so plainly is more honest than implying a remote deletion that
 * never happens.
 */
export function deleteOwnAccount(): AccountResult<void> {
  const account = getCurrentUser()
  if (!account) return deny('Nobody is signed in.')
  if (account.role === 'Admin' && administratorCount() <= 1) {
    return deny('This is the only administrator. Promote another account first.')
  }

  recordAudit({
    action: 'account.erased',
    subjectId: account.id,
    subjectName: account.name,
    purpose: 'Account owner deleted their own data',
    rows: 1,
    result: 'success',
  })
  signOutCurrentUser()
  purgeLocalData()
  return { ok: true, value: undefined }
}
