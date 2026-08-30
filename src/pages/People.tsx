// People — route /admin/people (ref syn_p30.png).
// The account table, filtered, with the selected account in the right drawer.
//
// Chrome comes from AdminShell and the Page primitives, the same ones every
// other page in the product uses. It used to be hand-built here: a 190px rail
// under a centred roundel with seven nav entries of its own, a "Synonance for
// SHSID" title bar, a 28px serif page title, its own table card, its own
// buttons, its own toast, a "24 / 24" strip along the bottom left over from
// the design deck, and a pager whose arrows were painted on and did nothing.
//
// The table used to render a fixed array from data/mock.ts, so no real account
// ever appeared in it and none of the buttons did anything: "Suspend access"
// flipped a value in component state that vanished on navigation, and "Export
// data" and "Start erasure" only raised a toast. Everything here now goes
// through src/database/accounts.ts, which acts on the real user table, refuses
// what the administrator is not allowed to do, and writes the audit entry.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  BookOpen, ClipboardList, BarChart3, Search, X,
  Download, CircleSlash, Trash2, ShieldCheck, MessageSquare,
} from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import Page, {
  FilterSelect,
  PageAction,
  PageBar,
  PageBody,
  PageNotice,
  TableCard,
  TableEmpty,
  Toast,
} from '@/components/Page'
import { useToast } from '@/hooks/use-toast'
import {
  eraseAccount,
  exportAndDownload,
  listAccounts,
  setAccountRole,
  setAccountSuspended,
  type AccountSummary,
} from '@/database/accounts'
import { subscribeDatabase } from '@/database/client'
import type { UserRole } from '@/database/types'

const ROLES: UserRole[] = ['Student', 'Teacher', 'Admin']
const ROLE_FILTERS = ['All roles', ...ROLES]
const STATUS_FILTERS = ['Active', 'Suspended', 'Erased', 'All']

const STATUS_LABEL: Record<AccountSummary['status'], string> = {
  active: 'Active',
  suspended: 'Suspended',
  erased: 'Erased',
}

/** "Today 09:18" / "12 Aug" / "—", matching the density of the rest of the table. */
function formatLastActive(iso: string | null) {
  if (!iso) return 'Never'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '—'
  const now = new Date()
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sameDay = at.toDateString() === now.toDateString()
  if (sameDay) return `Today ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (at.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
  return at.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export default function People() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All roles')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountSummary[]>(() => listAccounts())
  const { toast, notice, show, fail } = useToast()
  const [confirmEraseId, setConfirmEraseId] = useState<string | null>(null)

  // Re-read after every write, and after a write from another tab, so the
  // table reflects the store rather than a snapshot taken when it mounted.
  useEffect(() => subscribeDatabase(() => setAccounts(listAccounts())), [])

  /** Apply a result: refresh on success, show the refusal on failure. */
  const apply = (result: { ok: true } | { ok: false; message: string }, success: string) => {
    if (!result.ok) {
      fail(result.message)
      return
    }
    setAccounts(listAccounts())
    show(success)
  }

  const rows = useMemo(
    () =>
      accounts.filter((p) => {
        const needle = query.trim().toLowerCase()
        if (
          needle &&
          !p.name.toLowerCase().includes(needle) &&
          !p.launchpadVid.toLowerCase().includes(needle) &&
          !p.email.toLowerCase().includes(needle)
        ) {
          return false
        }
        if (role !== 'All roles' && p.role !== role) return false
        if (statusFilter !== 'All' && STATUS_LABEL[p.status] !== statusFilter) return false
        return true
      }),
    [accounts, query, role, statusFilter],
  )

  const selected = accounts.find((p) => p.id === selectedId) ?? null
  const activeCount = accounts.filter((p) => p.status === 'active').length

  const suspend = (p: AccountSummary) => {
    const next = p.status !== 'suspended'
    apply(
      setAccountSuspended(p.id, next),
      next ? `${p.name} suspended.` : `${p.name} reinstated.`,
    )
  }

  const changeRole = (p: AccountSummary, nextRole: UserRole) => {
    apply(setAccountRole(p.id, nextRole), `${p.name} is now ${nextRole}.`)
  }

  const exportPerson = (p: AccountSummary) => {
    const result = exportAndDownload(p.id)
    if (!result.ok) {
      fail(result.message)
      return
    }
    show(result.value)
  }

  const erase = (p: AccountSummary) => {
    setConfirmEraseId(null)
    apply(eraseAccount(p.id), `${p.name}'s personal data has been erased.`)
  }

  // The selected account, in the shell's 320px right slot — the same drawer
  // every other page in the product opens into. It used to be a 300px <aside>
  // this page appended after </main> and sized itself.
  const drawer = selected ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 justify-end px-4 pt-3">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setSelectedId(null)}
          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-muted transition-colors duration-[120ms] ease-out hover:bg-paper hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-board-tint font-mono text-[18px] text-board">
          {selected.initials}
        </span>
        <h2 className="mt-3 font-serif text-[24px] leading-tight">{selected.name}</h2>
        <div className="font-mono text-[12px] text-ink-muted">
          {selected.launchpadVid || selected.email || selected.id}
        </div>
        {selected.isCurrent ? (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-board">
            <ShieldCheck size={12} /> This is you
          </div>
        ) : null}

        <div className="mt-5 text-[12px] text-ink-muted">Role</div>
        {/* A real control, not a label. Granting and revoking staff access is
            the reason this screen exists; accounts.ts refuses the changes that
            would lock the institution out of it. */}
        <div className="mt-1">
          <FilterSelect
            block
            label={`Role for ${selected.name}`}
            value={selected.role}
            options={ROLES}
            disabled={selected.status === 'erased'}
            onChange={(value) => changeRole(selected, value as UserRole)}
            className="py-2 text-[14px] font-medium"
          />
        </div>

        <div className="mt-4 text-[12px] text-ink-muted">Activity</div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {[
            { label: 'Courses selected', value: selected.courseCount, icon: <BookOpen size={12} /> },
            { label: 'Chat threads', value: selected.chatThreadCount, icon: <ClipboardList size={12} /> },
            { label: 'Question attempts', value: selected.attemptCount, icon: <BarChart3 size={12} /> },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-control border border-rule px-3 py-2">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-control bg-board text-paper">
                  {row.icon}
                </span>
                <span className="text-[13px]">{row.label}</span>
              </span>
              <span className="font-mono text-[12px] text-ink-muted">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[12px] text-ink-muted">Account status</div>
        <div className="mt-1 text-[13px]">
          <span className={`inline-flex items-center gap-1.5 ${selected.status === 'active' ? 'text-board' : 'text-mark'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${selected.status === 'active' ? 'bg-board' : 'bg-mark'}`} />
            {STATUS_LABEL[selected.status]}
          </span>
          <span className="mt-0.5 block text-ink-muted">
            Last active: {formatLastActive(selected.lastActiveAt)}
          </span>
          <span className="block text-ink-muted">
            Account opened: {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {/* Compose lives on /admin/notifications; this arrives there with
              the account already selected. */}
          <PageAction
            className="w-full"
            onClick={() => navigate('/admin/notifications', { state: { to: selected.id } })}
            disabled={selected.status === 'erased' || selected.isCurrent}
          >
            <MessageSquare size={14} /> Send message
          </PageAction>
          <PageAction
            className="w-full"
            onClick={() => exportPerson(selected)}
            disabled={selected.status === 'erased'}
          >
            <Download size={14} /> Export data
          </PageAction>
          <PageAction
            variant="danger"
            className="w-full"
            onClick={() => suspend(selected)}
            disabled={selected.status === 'erased' || selected.isCurrent}
          >
            <CircleSlash size={14} />
            {selected.status === 'suspended' ? 'Reinstate access' : 'Suspend access'}
          </PageAction>

          {/* Two-step, because it is irreversible and the button sits one click
              from a row selection. */}
          {confirmEraseId === selected.id ? (
            <div className="flex gap-2">
              <PageAction className="flex-1" onClick={() => setConfirmEraseId(null)}>
                Cancel
              </PageAction>
              <PageAction variant="destructive" className="flex-1" onClick={() => erase(selected)}>
                <Trash2 size={14} /> Confirm
              </PageAction>
            </div>
          ) : (
            <PageAction
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmEraseId(selected.id)}
              disabled={selected.status === 'erased' || selected.isCurrent}
            >
              <Trash2 size={14} /> Start erasure
            </PageAction>
          )}
          <p className="text-[11px] leading-snug text-mark">
            Erasure permanently deletes this account's profile, coursework, attempts and chat
            threads. The account id is kept as a tombstone so existing audit entries stay
            resolvable; nothing identifying remains on it.
          </p>
        </div>
      </div>
    </div>
  ) : undefined

  return (
    <AdminShell active="people" right={drawer}>
      <Page>
        {/* The rail already says Administration → People and roles, so the bar
            carries what it cannot: the live count, and the filters that scope
            the table under it. The count is counted, not asserted — this read
            "842 active users" on an institution whose user table had three
            rows in it. */}
        <PageBar
          context={`${activeCount} active ${activeCount === 1 ? 'user' : 'users'} · ${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        >
          <label className="flex w-[240px] items-center gap-2 rounded-control border border-rule bg-surface px-3 py-1.5">
            <Search size={14} className="shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="w-full bg-transparent text-[13px] placeholder:text-ink-muted focus:outline-none"
            />
          </label>
          <FilterSelect
            label="Filter by role"
            value={role}
            options={ROLE_FILTERS}
            onChange={setRole}
          />
          <FilterSelect
            label="Filter by status"
            value={statusFilter}
            options={STATUS_FILTERS}
            onChange={setStatusFilter}
          />
        </PageBar>

        <PageBody measure="wide">
          {notice ? <PageNotice className="mb-4">{notice}</PageNotice> : null}

          <TableCard
            columns={['Name', 'Launchpad VID', 'Role', 'Courses', 'Status', 'Last active']}
            footer={
              rows.length === 0
                ? 'No people'
                : `Showing ${rows.length} of ${accounts.length} ${accounts.length === 1 ? 'person' : 'people'}`
            }
          >
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`border-b border-rule last:border-b-0 cursor-pointer transition-colors duration-[120ms] ease-out ${selectedId === p.id ? 'bg-board-tint/50' : 'hover:bg-paper/70'}`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-full font-mono text-[11px] flex items-center justify-center shrink-0 ${selectedId === p.id ? 'bg-board-tint text-board' : 'bg-paper border border-rule text-ink-muted'}`}>
                      {p.initials}
                    </span>
                    <span className="text-[14px]">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">{p.launchpadVid || '—'}</td>
                <td className="px-4 py-2.5 text-[13px]">{p.role}</td>
                <td className="px-4 py-2.5 text-[13px]">{p.courseCount}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 text-[13px] ${p.status === 'active' ? 'text-board' : 'text-mark'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-board' : 'bg-mark'}`} />
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[13px] text-ink-muted">{formatLastActive(p.lastActiveAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <TableEmpty columns={6}>No people match these filters.</TableEmpty>
            ) : null}
          </TableCard>
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </AdminShell>
  )
}
