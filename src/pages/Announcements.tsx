// Announcements — route /admin/notifications.
// The administrator's composer: a direct message to one account, or a
// broadcast to every account, plus the delivery log of everything the
// institution has sent. Sends go through src/database/notifications.ts, which
// refuses what the caller may not do and writes the audit entry; recipients
// see the result in /notifications and as an in-app push if they are looking
// at the app when it lands.
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { ChevronDown, Send } from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import Page, {
  PageAction,
  PageBar,
  PageBody,
  PageNotice,
  TableCard,
  TableEmpty,
  Toast,
} from '@/components/Page'
import { useToast } from '@/hooks/use-toast'
import { listAccounts } from '@/database/accounts'
import {
  EVERYONE,
  listAllNotifications,
  sendAdminNotification,
  type AppNotification,
} from '@/database/notifications'
import { subscribeDatabase } from '@/database/client'

const KIND_LABEL: Record<AppNotification['kind'], string> = {
  direct: 'Direct',
  broadcast: 'Broadcast',
  system: 'System',
}

function stamp(iso: string) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '—'
  const now = new Date()
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (at.toDateString() === now.toDateString()) return `Today ${time}`
  return `${at.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`
}

export default function Announcements() {
  // People's "Send message" arrives here with the account preselected.
  const location = useLocation()
  const preselected = (location.state as { to?: string } | null)?.to
  const [to, setTo] = useState(preselected ?? EVERYONE)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState<AppNotification[]>(listAllNotifications)
  const { toast, notice, show, fail } = useToast()

  useEffect(() => subscribeDatabase(() => setSent(listAllNotifications())), [])

  // Erased accounts cannot receive mail and suspended ones will read it on
  // reinstatement, so only erasure disqualifies a recipient.
  const recipients = useMemo(
    () => listAccounts().filter((account) => account.status !== 'erased'),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-listed via the subscription below
    [sent],
  )
  const nameFor = (id: string) =>
    id === EVERYONE ? 'Everyone' : (recipients.find((r) => r.id === id)?.name ?? 'Erased account')

  const send = () => {
    const result = sendAdminNotification({ to, title, body })
    if (!result.ok) {
      fail(result.message)
      return
    }
    setTitle('')
    setBody('')
    show(
      result.value.kind === 'broadcast'
        ? 'Notification sent to everyone.'
        : `Message sent to ${nameFor(result.value.recipientId)}.`,
    )
  }

  return (
    <AdminShell active="messages">
      <Page>
        <PageBar context={`${sent.length} notification${sent.length === 1 ? '' : 's'} delivered`} />
        <PageBody measure="wide">
          {notice ? <PageNotice className="mb-4">{notice}</PageNotice> : null}

          {/* Composer */}
          <div className="rounded-card border border-rule bg-surface p-6">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="announce-to"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted"
              >
                To
              </label>
              <div className="relative">
                <select
                  id="announce-to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="appearance-none rounded-control border border-rule bg-surface py-1.5 pl-3 pr-8 text-[13px] focus:border-board focus:outline-none"
                >
                  <option value={EVERYONE}>Everyone at SHSID</option>
                  {recipients.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.role}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
              </div>
              <span className="text-[12px] text-ink-muted">
                {to === EVERYONE
                  ? 'Delivered to every account, and recorded in the audit log.'
                  : 'Delivered to this account only, and recorded in the audit log.'}
              </span>
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              aria-label="Notification title"
              className="mt-4 w-full rounded-control border border-rule bg-paper px-3 py-2 text-[14px] placeholder:text-ink-muted focus:border-board focus:outline-none"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write the message…"
              aria-label="Notification message"
              rows={4}
              className="mt-2 w-full resize-y rounded-control border border-rule bg-paper px-3 py-2 text-[14px] leading-relaxed placeholder:text-ink-muted focus:border-board focus:outline-none"
            />
            <div className="mt-3 flex justify-end">
              <PageAction variant="primary" onClick={send}>
                <Send size={14} />
                {to === EVERYONE ? 'Send to everyone' : `Send to ${nameFor(to)}`}
              </PageAction>
            </div>
          </div>

          {/* Delivery log */}
          <TableCard
            className="mt-6"
            columns={['Sent', 'To', 'From', 'Title', 'Kind']}
            footer={sent.length === 0 ? undefined : `Showing all ${sent.length}`}
          >
            {sent.map((row) => (
              <tr key={row.id} className="border-b border-rule last:border-b-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-ink-muted">
                  {stamp(row.createdAt)}
                </td>
                <td className="px-4 py-2.5 text-[13px]">{nameFor(row.recipientId)}</td>
                <td className="px-4 py-2.5 text-[13px]">{row.senderName}</td>
                <td className="max-w-[320px] truncate px-4 py-2.5 text-[14px]">{row.title}</td>
                <td className="px-4 py-2.5 text-[13px] text-ink-muted">{KIND_LABEL[row.kind]}</td>
              </tr>
            ))}
            {sent.length === 0 ? (
              <TableEmpty columns={5}>
                Nothing sent yet. Messages and broadcasts you send appear here.
              </TableEmpty>
            ) : null}
          </TableCard>
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </AdminShell>
  )
}
