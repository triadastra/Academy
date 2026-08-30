// Audit — route /admin/audit, the first of the three Data-and-compliance
// pages (retention and exports are its siblings, not filters over it).
//
// Chrome comes from AdminShell and the Page primitives, the same ones every
// other page in the product uses. It used to be hand-built here: its own rail
// header, its own eight-item nav, its own page header with a breadcrumb and a
// 32px serif title, its own table card, its own buttons, its own toast, and a
// "23 / 24" strip along the bottom left over from the design deck.
//
// The table used to render four fixed rows from data/mock.ts describing events
// that never happened, on an institution whose real actions were recorded
// nowhere. It now reads the append-only log in the database: sign-ins, refused
// sign-ins, role changes, suspensions, exports, erasures and storage
// compactions, written by whichever code performed them.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  CircleUser, CircleCheck, CircleX, Trash2, TriangleAlert, ShieldAlert,
} from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import Page, {
  FilterSelect,
  PageAction,
  PageBar,
  PageBody,
  TableCard,
  TableEmpty,
} from '@/components/Page'
import { getAuditLog, subscribeDatabase } from '@/database/client'
import { cohortDisclosure } from '@/database/insights'
import { misconceptionClusters } from '@/data/mock'
import type { AuditAction, AuditEntry } from '@/database/types'

/**
 * Event groups, over the real `AuditAction` union.
 *
 * An access review is a search, not a scroll: "every refusal", "every time
 * somebody's data left the building", "who changed a role last term". The
 * groups are the questions; `null` is every event.
 */
const GROUPS: Record<string, AuditAction[] | null> = {
  'All events': null,
  'Sessions': ['session.signin', 'session.signout', 'session.expired', 'session.denied'],
  'Account changes': [
    'account.created',
    'account.role-changed',
    'account.password-changed',
    'account.suspended',
    'account.reinstated',
    'account.erased',
  ],
  'Data access': ['data.exported'],
  'Note revisions': ['note.revision-proposed', 'note.revision-applied', 'note.revision-rejected'],
  'Storage': ['storage.compacted', 'storage.quarantined'],
}

const GROUP_NAMES = Object.keys(GROUPS)
const RESULTS = ['Any result', 'Success', 'Denied', 'Failure'] as const

/** Result chip: success reads green, a refusal has to read as a refusal. */
function ResultChip({ result }: { result: AuditEntry['result'] }) {
  if (result === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-board">
        <CircleCheck size={14} /> Success
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-mark">
      {result === 'denied' ? <ShieldAlert size={14} /> : <CircleX size={14} />}
      {result === 'denied' ? 'Denied' : 'Failure'}
    </span>
  )
}

export default function Audit() {
  const navigate = useNavigate()
  const [group, setGroup] = useState('All events')
  const [result, setResult] = useState<string>('Any result')
  const [entries, setEntries] = useState<AuditEntry[]>(() => getAuditLog())

  useEffect(() => subscribeDatabase(() => setEntries(getAuditLog())), [])

  const rows = useMemo(() => {
    const actions = GROUPS[group]
    return entries.filter((entry) => {
      if (actions && !actions.includes(entry.action)) return false
      if (result !== 'Any result' && entry.result !== result.toLowerCase()) return false
      return true
    })
  }, [entries, group, result])

  const denied = useMemo(() => entries.filter((e) => e.result !== 'success').length, [entries])
  // Measured, not asserted — see the card below.
  const disclosure = useMemo(() => cohortDisclosure(misconceptionClusters), [])

  return (
    <AdminShell active="audit">
      <Page>
        {/* The rail already says Administration → Data and compliance → Data
            access and audit. A breadcrumb and a 32px title restating it were
            130px of chrome; the bar carries what the rail cannot — how much of
            the log is on screen, and the controls that decide which part. */}
        <PageBar
          context={`${rows.length} of ${entries.length} event${entries.length === 1 ? '' : 's'}${denied > 0 ? ` · ${denied} refused` : ''}`}
        >
          <FilterSelect
            label="Filter by event type"
            value={group}
            options={GROUP_NAMES}
            onChange={setGroup}
          />
          <FilterSelect
            label="Filter by result"
            value={result}
            options={RESULTS}
            onChange={setResult}
          />
        </PageBar>

        <PageBody measure="wide">
          <p className="text-[13px] text-ink-muted">
            Access to student data, and every system action that views, exports or erases it.
          </p>

          <TableCard
            className="mt-4"
            columns={['Time', 'Actor', 'Purpose', 'Rows', 'Result']}
            footer={
              rows.length === 0
                ? 'No events'
                : `Showing ${rows.length} of ${entries.length} event${entries.length === 1 ? '' : 's'}, newest first`
            }
          >
            {rows.map((row) => {
              const at = new Date(row.at)
              return (
                <tr key={row.id} className="border-b border-rule last:border-b-0 hover:bg-paper/60 transition-colors duration-[120ms] ease-out">
                  <td className="px-4 py-3.5 font-mono text-[12px] align-top whitespace-nowrap">
                    {at.toLocaleDateString()}
                    <span className="block text-ink-muted">{at.toLocaleTimeString()}</span>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-2">
                      <CircleUser size={16} className="text-ink-muted" />
                      <div>
                        <div className="text-[13px] font-medium">{row.actorName}</div>
                        <div className="font-mono text-[11px] text-ink-muted">{row.actorId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] align-top max-w-[300px]">
                    {row.purpose}
                    {row.subjectName && row.subjectId !== row.actorId ? (
                      <span className="block text-[12px] text-ink-muted">Subject: {row.subjectName}</span>
                    ) : null}
                    <span className="block font-mono text-[11px] text-ink-muted/80">{row.action}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] align-top">{row.rows.toLocaleString()}</td>
                  <td className="px-4 py-3.5 align-top"><ResultChip result={row.result} /></td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <TableEmpty columns={5}>
                {entries.length === 0
                  ? 'No events recorded yet. Sign-ins, role changes, suspensions, exports and erasures appear here as they happen.'
                  : `No ${group === 'All events' ? '' : `${group.toLowerCase()} `}events${result === 'Any result' ? '' : ` with result “${result}”`}. ${entries.length} event${entries.length === 1 ? '' : 's'} in the log.`}
              </TableEmpty>
            ) : null}
          </TableCard>

          {/* Erasure warning.
              The threshold and both counts are read from the rule that
              enforces them. This card used to assert "if erasure drops a
              cluster below 5 students, it disappears from teacher views" while
              no code counted a cohort before showing it — the seeded rows
              simply all happened to sit above five. An administrator would
              have repeated that sentence to a regulator. */}
          <div className="mt-5 flex items-center justify-between gap-6 rounded-card border border-mark bg-mark-tint/60 p-5">
            <div className="flex gap-3">
              <TriangleAlert size={28} className="text-mark shrink-0" />
              <div>
                <div className="text-[14px] font-medium text-mark">Cohort visibility after erasure</div>
                <p className="mt-1 text-[13px] leading-snug text-ink/80">
                  Patterns covering fewer than {disclosure.threshold} students are withheld from
                  teacher views, so erasing an account can remove a pattern from those views as
                  well as from this record. Right now {disclosure.visible} of {disclosure.total}{' '}
                  {disclosure.total === 1 ? 'pattern is' : 'patterns are'} shown
                  {disclosure.suppressed > 0
                    ? ` and ${disclosure.suppressed} withheld`
                    : ', none withheld'}
                  .
                </p>
              </div>
            </div>
            {/* Erasure is per-account and lives where the account does. A
                button here that erased "students" in the abstract could not
                name what it was about to delete, which is precisely what an
                irreversible action must do. */}
            <div className="shrink-0 text-right">
              <PageAction variant="danger" onClick={() => navigate('/admin/people')}>
                <Trash2 size={14} /> Erase an account
              </PageAction>
              <div className="mt-1 text-[11px] text-mark">Choose the account in People and roles.</div>
            </div>
          </div>

          <p className="mt-4 font-mono text-[11px] text-ink-muted">
            Times are shown in this browser's timezone. Identifiers are system-generated. No student
            content is recorded in this log — only who acted, on whom, and how many records were
            touched. Entries are never edited or deleted by the application; the oldest are dropped
            only when browser storage runs out, and that drop is itself recorded. See{' '}
            <Link to="/admin/retention" className="text-board underline underline-offset-2">
              Data retention
            </Link>{' '}
            for the limits in force.
          </p>
        </PageBody>
      </Page>
    </AdminShell>
  )
}
