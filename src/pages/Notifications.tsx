// Notifications.tsx — route /notifications (pages-access.md §notifications, ref syn_p12.png).
// Light rail (logo lockup, nav, institution selector) + master-detail list with
// filter, mark-all-read, unread dots, and an empty-state right pane.
//
// The list is the real feed from src/database/notifications.ts — administrator
// messages and system events addressed to the signed-in account. It used to
// render seven fixed rows out of the seed plus a detail map hardcoded here, so
// every account saw the same invented mail and "read" evaporated on
// navigation. Read state now persists with the account.
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  ChevronDown,
  FileCheck2,
  FileX2,
  Lock,
  Mail,
  Megaphone,
  ShieldCheck,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, SidePanel } from '@/components/Page'
import {
  listNotificationsForCurrentUser,
  markAllNotificationsRead,
  markNotificationRead,
  type DeliveredNotification,
} from '@/database/notifications'
import { subscribeDatabase } from '@/database/client'

function iconFor(n: DeliveredNotification) {
  if (n.kind === 'broadcast') return Megaphone
  if (n.kind === 'direct') return Mail
  const t = n.title.toLowerCase()
  if (t.includes('was applied')) return FileCheck2
  if (t.includes('not applied')) return FileX2
  if (t.includes('role')) return ShieldCheck
  if (t.includes('reinstated')) return Lock
  return Bell
}

const KIND_LABEL: Record<DeliveredNotification['kind'], string> = {
  direct: 'Message',
  broadcast: 'Announcement',
  system: 'System',
}

type Group = 'Today' | 'Yesterday' | 'Earlier'
const GROUPS: Group[] = ['Today', 'Yesterday', 'Earlier']

function groupFor(iso: string): Group {
  const at = new Date(iso)
  const now = new Date()
  if (at.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (at.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return 'Earlier'
}

/** "09:18" today, "12 Aug" before that — the list column is narrow. */
function timeLabel(iso: string) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  if (groupFor(iso) === 'Today') {
    return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return at.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

/** The full stamp for the detail pane, where there is room to be exact. */
function fullStamp(iso: string) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  return at.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Notifications() {
  const [filter, setFilter] = useState<'All' | 'Unread'>('All')
  const [items, setItems] = useState<DeliveredNotification[]>(listNotificationsForCurrentUser)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Re-read after every write — a selection marking itself read, an
  // administrator's send landing from another tab — so the list is always the
  // store, not a snapshot from mount.
  useEffect(() => subscribeDatabase(() => setItems(listNotificationsForCurrentUser())), [])

  const visible = useMemo(
    () => (filter === 'All' ? items : items.filter((n) => n.unread)),
    [filter, items],
  )

  const unreadCount = items.filter((n) => n.unread).length
  const selected = items.find((n) => n.id === selectedId) ?? null

  const select = (n: DeliveredNotification) => {
    setSelectedId(n.id)
    if (n.unread) markNotificationRead(n.id)
  }

  return (
    <CourseShell role="student" active="notifications">
      <Page>
        <PageBar context={`${unreadCount} unread · ${items.length} total`}>
          <PageAction onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
            Mark all as read
          </PageAction>
        </PageBar>

        <div className="flex flex-1 min-h-0 overflow-hidden">
      <SidePanel
        title={filter === 'All' ? 'All notifications' : 'Unread only'}
        width="list"
        actions={
          <div className="relative">
            <select
              aria-label="Filter notifications"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'All' | 'Unread')}
              className="appearance-none bg-surface border border-rule rounded-control pl-2.5 pr-7 py-1 text-[12px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
            >
              <option>All</option>
              <option>Unread</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
          </div>
        }
      >
        <div className="pb-6">
          {GROUPS.map((g) => {
            const groupItems = visible.filter((n) => groupFor(n.createdAt) === g)
            if (groupItems.length === 0) return null
            return (
              <div key={g}>
                <h2 className="px-5 pt-4 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                  {g}
                </h2>
                <ul>
                  {groupItems.map((n) => {
                    const Icon = iconFor(n)
                    const isSelected = n.id === selectedId
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => select(n)}
                          className={
                            isSelected
                              ? 'w-full flex items-start gap-3 px-5 py-3 text-left bg-board-tint border-y border-rule'
                              : 'w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-board-tint/40 transition-colors duration-[120ms] ease-out'
                          }
                        >
                          <span
                            className={
                              n.unread
                                ? 'mt-1.5 w-1.5 h-1.5 rounded-full bg-board shrink-0'
                                : 'mt-1.5 w-1.5 h-1.5 rounded-full bg-transparent shrink-0'
                            }
                            aria-label={n.unread ? 'Unread' : undefined}
                          />
                          <span className="mt-0.5 w-8 h-8 rounded-card border border-rule bg-surface flex items-center justify-center text-ink-muted shrink-0">
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span
                                className={
                                  n.unread
                                    ? 'text-[14px] font-medium text-ink truncate'
                                    : 'text-[14px] text-ink truncate'
                                }
                              >
                                {n.title}
                              </span>
                              <span className="text-[12px] text-ink-muted shrink-0">
                                {timeLabel(n.createdAt)}
                              </span>
                            </span>
                            <span className="block mt-0.5 text-[12px] text-ink-muted truncate">
                              {n.senderName} · {KIND_LABEL[n.kind]}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {visible.length === 0 ? (
            <p className="px-5 pt-8 text-[13px] text-ink-muted">
              {filter === 'Unread'
                ? 'No unread notifications.'
                : 'Nothing yet. Messages from your school and updates on your own work will appear here.'}
            </p>
          ) : null}
        </div>
      </SidePanel>

      {/* Detail pane */}
      <PageBody measure="reading">
        {selected ? (
          <article className="bg-surface border border-rule rounded-card p-8">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-card border border-rule bg-paper flex items-center justify-center text-board">
                {(() => {
                  const Icon = iconFor(selected)
                  return <Icon size={18} />
                })()}
              </span>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                {KIND_LABEL[selected.kind]}
              </div>
            </div>
            <h2 className="mt-5 font-serif text-[24px] text-ink">{selected.title}</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              From {selected.senderName} · {fullStamp(selected.createdAt)}
            </p>
            <div className="my-5 h-px bg-rule" aria-hidden="true" />
            <p className="text-[14px] leading-relaxed text-ink whitespace-pre-wrap">
              {selected.body}
            </p>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mt-6 text-[13px] font-medium text-board hover:underline underline-offset-2"
            >
              Back to list
            </button>
          </article>
        ) : (
          <div className="rounded-card border border-dashed border-rule bg-surface px-8 py-16 text-center">
            <span className="mx-auto w-12 h-12 rounded-full border border-rule bg-paper flex items-center justify-center text-ink-muted">
              <Bell size={20} />
            </span>
            <h2 className="mt-5 font-serif text-[24px] text-ink">Select a notification</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Choose a notification from the list to view its details.
            </p>
          </div>
        )}
      </PageBody>
        </div>
      </Page>
    </CourseShell>
  )
}
