// Exports — route /admin/exports.
//
// This was the audit log with `where action = 'data.exported'` applied: a
// record of exports with no way to make one. The page an administrator needs
// when a student asks for their data, or a regulator asks what left the
// building, does both — it lists every account with what its export would
// contain, produces the file, and shows the history underneath.
//
// Nothing here invents a number. Row counts come from the same fields
// `exportAccount` counts when it writes the audit entry, so the figure shown
// before the click is the figure recorded after it.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Download, FileJson, ShieldCheck } from 'lucide-react'
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
  exportAndDownload,
  listAccounts,
  type AccountSummary,
} from '@/database/accounts'
import { getAuditLog, subscribeDatabase } from '@/database/client'

const SCOPES = ['Active accounts', 'All accounts'] as const

/** What one account's export file will contain, counted the way accounts.ts counts it. */
function rowsIn(account: AccountSummary) {
  return account.attemptCount + account.paperCount + account.chatThreadCount
}

export default function Exports() {
  const [accounts, setAccounts] = useState<AccountSummary[]>(() => listAccounts())
  const [history, setHistory] = useState(() =>
    getAuditLog().filter((entry) => entry.action === 'data.exported'),
  )
  const [scope, setScope] = useState<string>('Active accounts')
  const { toast, notice, show, fail } = useToast()

  useEffect(
    () =>
      subscribeDatabase(() => {
        setAccounts(listAccounts())
        setHistory(getAuditLog().filter((entry) => entry.action === 'data.exported'))
      }),
    [],
  )

  // An erased account has nothing left to export — its tombstone carries an id
  // and nothing else — so it is excluded unless explicitly asked for.
  const rows = useMemo(
    () => (scope === 'All accounts' ? accounts : accounts.filter((a) => a.status !== 'erased')),
    [accounts, scope],
  )

  const exportable = rows.filter((account) => account.status !== 'erased')

  const exportOne = (account: AccountSummary) => {
    const result = exportAndDownload(account.id)
    if (!result.ok) {
      fail(result.message)
      return
    }
    show(result.value)
  }

  /**
   * Export every listed account, one file each.
   *
   * One file per account rather than one combined archive: the exports are
   * handed to different people, and a single file containing three students'
   * transcripts is a disclosure, not a subject-access response. Each account's
   * export writes its own audit entry, which is the point of routing this
   * through accounts.ts rather than reading the store directly.
   */
  const exportAll = () => {
    if (exportable.length === 0) {
      fail('There are no accounts to export.')
      return
    }
    let exported = 0
    const refused: string[] = []
    for (const account of exportable) {
      const result = exportAndDownload(account.id)
      if (result.ok) exported += 1
      // A refusal used to be skipped silently, so a bulk export that was
      // denied for some accounts reported the same success as one that had
      // nothing to refuse. Whoever is answering for this needs to know which
      // accounts did not leave the building.
      else refused.push(account.name)
    }
    if (exported === 0) {
      fail(`No account could be exported. ${refused.length > 0 ? `Refused: ${refused.join(', ')}.` : ''}`.trim())
      return
    }
    const summary = `Exported ${exported} account${exported === 1 ? '' : 's'} as ${exported} file${exported === 1 ? '' : 's'}.`
    if (refused.length > 0) fail(`${summary} Refused for ${refused.join(', ')}.`)
    else show(summary)
  }

  return (
    <AdminShell active="exports">
      <Page>
        <PageBar
          context={`${exportable.length} exportable · ${history.length} export${history.length === 1 ? '' : 's'} on record`}
        >
          <FilterSelect label="Accounts to list" value={scope} options={SCOPES} onChange={setScope} />
          <PageAction variant="primary" onClick={exportAll} disabled={exportable.length === 0}>
            <Download size={14} /> Export all listed
          </PageAction>
        </PageBar>

        <PageBody measure="wide">
          <p className="text-[13px] text-ink-muted">
            One JSON file per account, containing that account's profile, settings, question
            attempts, graded papers and chat threads. Password verifiers are stripped — a
            credential is not the account holder's data, and an export is a file that gets emailed
            around.
          </p>

          {notice ? <PageNotice className="mt-4">{notice}</PageNotice> : null}

          <TableCard
            className="mt-4"
            columns={['Account', 'Role', 'Attempts', 'Papers', 'Threads', 'Rows in export', '']}
            footer={`${rows.length} account${rows.length === 1 ? '' : 's'} listed`}
          >
            {rows.map((account) => {
              const erased = account.status === 'erased'
              return (
                <tr key={account.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule bg-paper font-mono text-[11px] text-ink-muted">
                        {account.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px]">{account.name}</div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          {account.launchpadVid || account.email || account.id}
                        </div>
                      </div>
                      {account.isCurrent ? (
                        <ShieldCheck size={12} className="shrink-0 text-board" aria-label="This is you" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">{erased ? 'Erased' : account.role}</td>
                  <td className="px-4 py-2.5 font-mono text-[13px]">{account.attemptCount}</td>
                  <td className="px-4 py-2.5 font-mono text-[13px]">{account.paperCount}</td>
                  <td className="px-4 py-2.5 font-mono text-[13px]">{account.chatThreadCount}</td>
                  <td className="px-4 py-2.5 font-mono text-[13px] font-medium">
                    {erased ? '—' : rowsIn(account).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <PageAction
                      onClick={() => exportOne(account)}
                      disabled={erased}
                      label={`Export ${account.name}'s data`}
                    >
                      <Download size={13} /> Export
                    </PageAction>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <TableEmpty columns={7}>No accounts to list.</TableEmpty>
            ) : null}
          </TableCard>

          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Export history
          </h2>
          <p className="mt-2 text-[13px] text-ink-muted">
            Every export ever produced by this installation, from the audit log. An account owner
            exporting their own data appears here too — the log records who read what, not only
            what an administrator did.
          </p>

          <TableCard
            className="mt-3"
            columns={['Time', 'Exported by', 'Subject', 'Rows']}
            footer={
              history.length === 0
                ? undefined
                : `${history.length} export${history.length === 1 ? '' : 's'}, newest first`
            }
          >
            {history.map((entry) => (
              <tr key={entry.id} className="border-b border-rule last:border-b-0">
                <td className="px-4 py-3 font-mono text-[12px] align-top whitespace-nowrap">
                  {new Date(entry.at).toLocaleDateString()}
                  <span className="block text-ink-muted">
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-[13px]">{entry.actorName}</div>
                  <div className="font-mono text-[11px] text-ink-muted">{entry.actorId}</div>
                </td>
                <td className="px-4 py-3 text-[13px] align-top">
                  <span className="inline-flex items-center gap-1.5">
                    <FileJson size={13} className="text-ink-muted" />
                    {entry.subjectName ?? entry.subjectId ?? '—'}
                  </span>
                  <span className="block text-[12px] text-ink-muted">{entry.purpose}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[13px] align-top">
                  {entry.rows.toLocaleString()}
                </td>
              </tr>
            ))}
            {history.length === 0 ? (
              <TableEmpty columns={4}>
                No data has been exported yet. Exports made here, and by account owners from their
                own profile, appear in this list.
              </TableEmpty>
            ) : null}
          </TableCard>

          <p className="mt-4 font-mono text-[11px] text-ink-muted">
            Files are produced in this browser and never sent anywhere. Exporting somebody else's
            account requires the administrator role and is recorded against the administrator, not
            the account holder — see{' '}
            <Link to="/admin/audit" className="text-board underline underline-offset-2">
              Data access and audit
            </Link>
            .
          </p>
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </AdminShell>
  )
}
