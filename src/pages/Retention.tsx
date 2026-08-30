// Retention — route /admin/retention.
//
// This was a rail item that re-rendered the audit log, above a chip reading
// "Retention 1095 days". No code anywhere honoured 1095 days, or any number of
// days: retention in this system is not time-based. A fixed number of the most
// recent records is kept per kind, and history is shed in a defined order when
// the browser's storage quota comes under pressure.
//
// So the page states that policy, with the figures read from the constants
// that enforce it and the counts read from what is actually stored. An
// administrator who has to answer "how long do you keep chat transcripts" can
// answer it from this screen, and the answer will be true.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, CircleCheck, Database, HardDrive, Info } from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import Page, { PageBar, PageBody, TableCard, TableEmpty } from '@/components/Page'
import { subscribeDatabase } from '@/database/client'
import { formatBytes, retentionReport, type RetentionLine } from '@/database/retention'
import { storageEstimate } from '@/database/storage'

/** Fullness of one record kind against its ceiling, 0–1. Unbounded reads 0. */
function fill(line: RetentionLine) {
  if (line.limit <= 0) return 0
  return Math.min(1, line.peak / line.limit)
}

function Meter({ value, tone }: { value: number; tone: 'board' | 'mark' }) {
  return (
    <span
      className="inline-block h-1.5 w-full overflow-hidden rounded-chip bg-rule"
      role="presentation"
    >
      <span
        className={`block h-full ${tone === 'mark' ? 'bg-mark' : 'bg-board'}`}
        style={{ width: `${Math.max(value * 100, value > 0 ? 3 : 0)}%` }}
      />
    </span>
  )
}

/** "3 days ago" / "today" — the age of the oldest thing in the log. */
function ageSince(iso: string | null) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function Retention() {
  const [report, setReport] = useState(retentionReport)
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null)

  useEffect(() => subscribeDatabase(() => setReport(retentionReport())), [])

  // Origin quota, when the browser will say. Safari will not, so every figure
  // that depends on it is rendered only when it arrives.
  useEffect(() => {
    let live = true
    storageEstimate().then((value) => {
      if (live) setEstimate(value)
    })
    return () => {
      live = false
    }
  }, [])

  const used = report.storedBytes / report.softLimitBytes
  const underPressure = used >= 0.8
  const lastWrite = report.lastWrite

  return (
    <AdminShell active="retention">
      <Page>
        {/* No actions: retention is enforced by the writer, not set from a
            screen, and a page that offered a knob it does not have would be
            the same lie as the "1095 days" chip this replaced. */}
        <PageBar
          context={`${formatBytes(report.storedBytes)} stored · ${report.accountCount} account${report.accountCount === 1 ? '' : 's'}${report.erasedCount > 0 ? ` · ${report.erasedCount} erased` : ''}`}
        />

        <PageBody measure="wide">
          <p className="text-[13px] text-ink-muted">
            What this installation keeps, and what it drops when it runs out of room. Retention
            here is bounded by record count and storage pressure, not by age — nothing is deleted
            on a schedule.
          </p>

          {/* Storage headroom — the thing every limit below is really about. */}
          <section className="mt-5 rounded-card border border-rule bg-surface p-5">
            <div className="flex items-start justify-between gap-6">
              <div className="flex gap-3">
                <HardDrive size={20} className="mt-0.5 shrink-0 text-ink-muted" />
                <div>
                  <h2 className="text-[14px] font-medium">Storage in use</h2>
                  <p className="mt-1 text-[13px] leading-snug text-ink-muted">
                    Saved data is compacted before a write that would pass{' '}
                    {formatBytes(report.softLimitBytes)}, which is roughly half of a typical
                    browser's allowance for one site.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[24px] leading-none">
                  {formatBytes(report.storedBytes)}
                </div>
                <div className="mt-1 text-[12px] text-ink-muted">
                  of {formatBytes(report.softLimitBytes)} before compaction
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Meter value={Math.min(used, 1)} tone={underPressure ? 'mark' : 'board'} />
            </div>
            {estimate ? (
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                Browser reports {formatBytes(estimate.usage)} used of{' '}
                {formatBytes(estimate.quota)} granted to this origin.
              </p>
            ) : (
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                This browser does not report an origin quota.
              </p>
            )}
          </section>

          {/* What the last write actually cost. */}
          <section
            className={`mt-4 flex items-start gap-3 rounded-card border p-4 ${
              lastWrite.status === 'failed'
                ? 'border-mark bg-mark-tint/60'
                : lastWrite.status === 'compacted'
                  ? 'border-rule bg-paper'
                  : 'border-rule bg-surface'
            }`}
          >
            {lastWrite.status === 'ok' ? (
              <CircleCheck size={16} className="mt-0.5 shrink-0 text-board" />
            ) : lastWrite.status === 'compacted' ? (
              <Info size={16} className="mt-0.5 shrink-0 text-ink-muted" />
            ) : (
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-mark" />
            )}
            <div className="min-w-0 text-[13px]">
              <div className="font-medium">Last write</div>
              {lastWrite.status === 'ok' ? (
                <p className="text-ink-muted">
                  Saved in full — {formatBytes(lastWrite.bytes)}, nothing dropped.
                </p>
              ) : lastWrite.status === 'compacted' ? (
                <p className="text-ink-muted">
                  Saved at {formatBytes(lastWrite.bytes)} after dropping{' '}
                  {lastWrite.dropped.join('; ')}.
                </p>
              ) : (
                <p className="text-mark">Not saved. {lastWrite.message}</p>
              )}
            </div>
          </section>

          {/* The ceilings, measured. */}
          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Limits in force
          </h2>
          <TableCard
            className="mt-2"
            columns={['Record', 'Scope', 'Largest held', 'Kept', 'Total', 'What happens at the limit']}
          >
            {report.lines.map((line) => {
              const value = fill(line)
              return (
                <tr key={line.key} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3 text-[13px] font-medium align-top">{line.label}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-muted align-top whitespace-nowrap">
                    {line.scope}
                  </td>
                  <td className="px-4 py-3 align-top w-[130px]">
                    <div className="font-mono text-[13px]">{line.peak.toLocaleString()}</div>
                    {line.limit > 0 ? (
                      <div className="mt-1.5">
                        <Meter value={value} tone={value >= 0.8 ? 'mark' : 'board'} />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] align-top whitespace-nowrap">
                    {line.limit > 0 ? line.limit.toLocaleString() : 'No limit'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink-muted align-top">
                    {line.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-muted align-top max-w-[280px]">
                    {line.rule}
                  </td>
                </tr>
              )
            })}
          </TableCard>
          <p className="mt-2 font-mono text-[11px] text-ink-muted">
            "Largest held" is the biggest count on any single account or thread — the figure the
            ceiling is measured against. "Total" is the sum across the institution.
          </p>

          {/* The order things are dropped in. */}
          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            What is dropped first
          </h2>
          <p className="mt-2 text-[13px] text-ink-muted">
            When a save will not fit, these run in order and stop as soon as it does. Every step
            taken is named in the banner the user sees, and recorded in the audit log.
          </p>
          <ol className="mt-3 flex flex-col gap-px overflow-hidden rounded-card border border-rule bg-rule">
            {report.ladder.map((rung) => (
              <li key={rung.step} className="flex items-start gap-3 bg-surface px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-chip bg-board font-mono text-[11px] text-paper">
                  {rung.step}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{rung.label}</div>
                  <div className="text-[12px] leading-snug text-ink-muted">{rung.detail}</div>
                </div>
              </li>
            ))}
          </ol>

          {/* The log's own extent, and any compaction that has happened. */}
          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Audit log extent
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {[
              { label: 'Entries held', value: report.auditCount.toLocaleString() },
              {
                label: 'Oldest entry',
                value: report.auditOldestAt
                  ? new Date(report.auditOldestAt).toLocaleDateString()
                  : '—',
                sub: ageSince(report.auditOldestAt),
              },
              {
                label: 'Newest entry',
                value: report.auditNewestAt
                  ? new Date(report.auditNewestAt).toLocaleDateString()
                  : '—',
                sub: ageSince(report.auditNewestAt),
              },
            ].map((cell) => (
              <div key={cell.label} className="rounded-card border border-rule bg-surface px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {cell.label}
                </div>
                <div className="mt-1 font-mono text-[18px] leading-tight">{cell.value}</div>
                {cell.sub ? <div className="text-[12px] text-ink-muted">{cell.sub}</div> : null}
              </div>
            ))}
          </div>

          <TableCard
            className="mt-3"
            columns={['Time', 'Event', 'What was dropped', 'Rows']}
            footer={
              report.storageEvents.length === 0
                ? undefined
                : `${report.storageEvents.length} storage event${report.storageEvents.length === 1 ? '' : 's'}, newest first`
            }
          >
            {report.storageEvents.map((event) => (
              <tr key={event.id} className="border-b border-rule last:border-b-0">
                <td className="px-4 py-3 font-mono text-[12px] align-top whitespace-nowrap">
                  {new Date(event.at).toLocaleDateString()}
                  <span className="block text-ink-muted">
                    {new Date(event.at).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <Database size={14} className="text-ink-muted" />
                    {event.action === 'storage.compacted' ? 'Compacted' : 'Quarantined'}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] align-top">
                  {event.purpose}
                  {event.detail ? (
                    <span className="block text-[12px] text-ink-muted">{event.detail}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-[13px] align-top">
                  {event.rows.toLocaleString()}
                </td>
              </tr>
            ))}
            {report.storageEvents.length === 0 ? (
              <TableEmpty columns={4}>
                Nothing has been dropped. No save has needed compacting on this browser.
              </TableEmpty>
            ) : null}
          </TableCard>

          <p className="mt-4 font-mono text-[11px] text-ink-muted">
            These figures describe this browser's copy of the data, which is where Synonance
            stores it. Erasing an account removes its records immediately and permanently — see{' '}
            <Link to="/admin/people" className="text-board underline underline-offset-2">
              People and roles
            </Link>
            . Every erasure is recorded in{' '}
            <Link to="/admin/audit" className="text-board underline underline-offset-2">
              Data access and audit
            </Link>
            .
          </p>
        </PageBody>
      </Page>
    </AdminShell>
  )
}
