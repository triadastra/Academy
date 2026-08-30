// notifications.ts — the real notification feed: administrator messages
// (direct and broadcast) and system events, delivered per account.
//
// /notifications used to render a fixed array out of the seed's sharedTables
// plus a detail map hardcoded into the page, so every account saw the same
// seven invented rows and "mark as read" evaporated on navigation. Rows now
// live in a runtime table on the database (persisted whole in the delta, like
// the generated material), and read state lives with each reader, because a
// broadcast is one row with many readers.
//
// Same boundary note as accounts.ts: the admin checks here are the app
// behaving correctly, not a defence against someone editing their own storage.
import { uuid } from '@/lib/uuid'
import {
  getCurrentUserDatabase,
  getCurrentUserId,
  getDatabase,
  isAuthenticated,
  isCurrentUserAdministrator,
  recordAudit,
  updateDatabase,
} from './client'
import type { AppNotification, NotificationKind } from './types'

export type { AppNotification, NotificationKind }

/** Rows kept in the table. Oldest fall off at send time, newest-last order. */
const NOTIFICATION_LIMIT = 300

/** Recipient id meaning "every account". */
export const EVERYONE = '*'

export type NotificationResult =
  | { ok: true; value: AppNotification }
  | { ok: false; message: string }

/** A notification joined to the current reader's read state. */
export interface DeliveredNotification extends AppNotification {
  unread: boolean
}

function table(): AppNotification[] {
  return getDatabase().notifications ?? []
}

/** Rows addressed to this user: their directs, plus every broadcast. */
function addressedTo(userId: string) {
  return table().filter(
    (row) =>
      (row.recipientId === userId || row.recipientId === EVERYONE) &&
      // The sender does not receive their own broadcast as unread mail;
      // what they sent is reviewed on /admin/notifications instead.
      row.senderId !== userId,
  )
}

function appendRow(row: AppNotification) {
  updateDatabase((database) => {
    database.notifications ??= []
    database.notifications.push(row)
    if (database.notifications.length > NOTIFICATION_LIMIT) {
      database.notifications = database.notifications.slice(-NOTIFICATION_LIMIT)
    }
  })
}

/**
 * Send a message from the signed-in administrator.
 *
 * `to` is a user id, or `EVERYONE` for a broadcast. Refused rather than
 * silently dropped when the caller is not an administrator, the recipient does
 * not exist, or there is nothing to send — the composer shows the reason.
 * Every send is written to the audit log: an administrator messaging a student
 * is exactly the kind of act the log exists to account for.
 */
export function sendAdminNotification(input: {
  to: string
  title: string
  body: string
}): NotificationResult {
  if (!isCurrentUserAdministrator()) {
    return { ok: false, message: 'Only an administrator can send notifications.' }
  }
  const title = input.title.trim()
  const body = input.body.trim()
  if (!title) return { ok: false, message: 'The message needs a title.' }
  if (!body) return { ok: false, message: 'The message needs some content.' }

  const database = getDatabase()
  const sender = database.users.find((user) => user.id === getCurrentUserId())
  if (!sender) return { ok: false, message: 'Nobody is signed in.' }

  const kind: NotificationKind = input.to === EVERYONE ? 'broadcast' : 'direct'
  let recipientName = 'everyone'
  if (kind === 'direct') {
    const recipient = database.users.find((user) => user.id === input.to)
    if (!recipient) return { ok: false, message: 'No such account.' }
    if ((recipient.status ?? 'active') === 'erased') {
      return { ok: false, message: 'This account has been erased.' }
    }
    recipientName = recipient.name
  }

  const row: AppNotification = {
    id: `notification-${uuid()}`,
    kind,
    recipientId: input.to,
    senderId: sender.id,
    senderName: sender.displayName || sender.name,
    title,
    body,
    createdAt: new Date().toISOString(),
  }
  appendRow(row)
  recordAudit({
    action: 'notification.sent',
    subjectId: kind === 'direct' ? input.to : undefined,
    subjectName: recipientName,
    purpose:
      kind === 'direct'
        ? `Direct message sent to ${recipientName}`
        : 'Notification broadcast to every account',
    rows: 1,
    result: 'success',
  })
  return { ok: true, value: row }
}

/**
 * The app reporting an event to the person it affects — a revision decision,
 * a role change. No role check: the caller is the code that performed the
 * event, and the recipient is fixed by it. Never addressed to everyone.
 */
export function pushSystemNotification(input: {
  recipientId: string
  title: string
  body: string
}) {
  if (!input.recipientId || input.recipientId === EVERYONE) return
  appendRow({
    id: `notification-${uuid()}`,
    kind: 'system',
    recipientId: input.recipientId,
    senderId: 'system',
    senderName: 'Synonance',
    title: input.title.trim(),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  })
}

/** The signed-in account's feed, newest first, joined to its read state. */
export function listNotificationsForCurrentUser(): DeliveredNotification[] {
  if (!isAuthenticated()) return []
  const reads = new Set(getCurrentUserDatabase().notificationReads ?? [])
  return addressedTo(getCurrentUserId())
    .map((row) => ({ ...row, unread: !reads.has(row.id) }))
    .reverse()
}

/** Unread rows for the badge on the bell. 0 when nobody is signed in. */
export function unreadNotificationCount(): number {
  if (!isAuthenticated()) return 0
  const reads = new Set(getCurrentUserDatabase().notificationReads ?? [])
  return addressedTo(getCurrentUserId()).filter((row) => !reads.has(row.id)).length
}

/**
 * Record that the current user has read these rows. Read ids for rows that
 * have since fallen off the capped table are pruned in passing, so the list
 * cannot grow past the table it indexes into.
 */
function markRead(ids: string[]) {
  if (!isAuthenticated() || ids.length === 0) return
  const live = new Set(table().map((row) => row.id))
  updateDatabase((database) => {
    const user = database.userDatabases[database.appSettings.currentUserId]
    if (!user) return
    const reads = new Set((user.notificationReads ?? []).filter((id) => live.has(id)))
    for (const id of ids) if (live.has(id)) reads.add(id)
    user.notificationReads = [...reads]
  })
}

export function markNotificationRead(id: string) {
  markRead([id])
}

export function markAllNotificationsRead() {
  if (!isAuthenticated()) return
  markRead(addressedTo(getCurrentUserId()).map((row) => row.id))
}

/**
 * Every row in the table, newest first — the delivery log on
 * /admin/notifications. Administrators only; everyone else gets their own
 * feed from `listNotificationsForCurrentUser` and nothing more.
 */
export function listAllNotifications(): AppNotification[] {
  if (!isCurrentUserAdministrator()) return []
  return [...table()].reverse()
}
