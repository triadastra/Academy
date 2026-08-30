// Security — route /admin/security.
//
// Two administrator functions existed in the data layer with nothing anywhere
// that could call them:
//
//   `setAdministratorPassword` — so the credential the installation ships with
//   could never be changed from inside the product. The only way to rotate it
//   was to edit the seed and redeploy, which means every deployment of this app
//   shares one password until somebody rebuilds it.
//
//   `readQuarantine` / `clearQuarantine` — when a stored database cannot be
//   read by the running build, it is parked rather than deleted, precisely so
//   it can be recovered. Nothing offered to recover it, so "quarantined" was
//   indistinguishable from "lost" to the only person who could act on it.
//
// Both are here, doing the real thing, on the same shell and primitives as the
// rest of the administrator area.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Archive, Download, KeyRound, ShieldAlert, Trash2 } from 'lucide-react'
import AdminShell from '@/components/AdminShell'
import Page, {
  PageAction,
  PageBar,
  PageBody,
  PageNotice,
  Toast,
} from '@/components/Page'
import { useToast } from '@/hooks/use-toast'
import {
  getCurrentUser,
  setAdministratorPassword,
  signInLockoutSeconds,
} from '@/database/client'
import { clearQuarantine, readQuarantine } from '@/database/storage'
import { passwordProblem } from '@/lib/password'

const FIELD =
  'w-full rounded-control border border-rule bg-surface px-3 py-2.5 text-[14px] text-ink focus:border-board focus:outline-none disabled:opacity-60'

export default function Security() {
  const account = getCurrentUser()
  const { toast, notice, show, fail } = useToast()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const [quarantine, setQuarantine] = useState(() => readQuarantine())
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [lockout, setLockout] = useState(() => signInLockoutSeconds())

  // The lockout counts down while the page is open, so an administrator
  // watching it can see when the sign-in form frees up rather than guessing.
  useEffect(() => {
    if (lockout <= 0) return
    const timer = window.setInterval(() => setLockout(signInLockoutSeconds()), 1_000)
    return () => window.clearInterval(timer)
  }, [lockout])

  const hasCredential = Boolean(account?.passwordHash)
  // Checked as the field is typed rather than only on submit: deriving the key
  // takes the best part of a second on the plain-http build, and making
  // somebody wait that long to be told their password is too short is a poor
  // trade when the answer is knowable immediately.
  const strength = next ? passwordProblem(next) : null
  const mismatch = confirm.length > 0 && next !== confirm

  async function changePassword() {
    if (!account || busy) return
    if (next !== confirm) {
      fail('The two new passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const result = await setAdministratorPassword(account.id, next, current || undefined)
      if (!result.ok) {
        fail(result.message)
        return
      }
      setCurrent('')
      setNext('')
      setConfirm('')
      show('Password changed. It takes effect at the next sign-in.')
    } finally {
      setBusy(false)
    }
  }

  /** Hand the quarantined document back as a file before anyone discards it. */
  function downloadQuarantine() {
    if (!quarantine) return
    const blob = new Blob([quarantine.document], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `synonance-quarantine-${quarantine.quarantinedAt.slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    show('Quarantined data downloaded.')
  }

  function discardQuarantine() {
    clearQuarantine()
    setQuarantine(null)
    setConfirmDiscard(false)
    show('Quarantined copy discarded.')
  }

  return (
    <AdminShell active="security">
      <Page>
        <PageBar
          context={`${hasCredential ? 'Password set' : 'No password set'}${quarantine ? ' · 1 quarantined copy' : ''}${lockout > 0 ? ` · sign-in locked ${Math.ceil(lockout / 60)} min` : ''}`}
        />

        <PageBody measure="wide">
          <p className="text-[13px] text-ink-muted">
            The administrator credential for this installation, and any stored data a previous
            build left behind.
          </p>

          {notice ? <PageNotice className="mt-4">{notice}</PageNotice> : null}

          {/* Honesty first. An administrator changing a password on this screen
              should not come away believing it protects the application. */}
          <div className="mt-4 flex gap-3 rounded-card border border-rule bg-paper p-4">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-ink-muted" />
            <p className="text-[13px] leading-snug text-ink-muted">
              This password is verified in the browser, so it protects the{' '}
              <span className="text-ink">credential</span> — it stops the password being readable
              in the shipped files — and not the{' '}
              <span className="text-ink">application</span>: anyone able to edit this browser's
              stored data can grant themselves the administrator role regardless. A password is
              still worth setting and worth rotating, because people reuse them elsewhere. The
              enforceable check has to live on a server.
            </p>
          </div>

          {/* ── Credential ────────────────────────────────────────────────── */}
          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Administrator password
          </h2>

          {account?.role !== 'Admin' ? (
            <p className="mt-2 text-[13px] text-ink-muted">
              Only an administrator account has a password to change.
            </p>
          ) : (
            <div className="mt-2 rounded-card border border-rule bg-surface p-5">
              <div className="flex items-start gap-3">
                <KeyRound size={18} className="mt-0.5 shrink-0 text-ink-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">
                    {account.displayName || account.name}
                  </div>
                  <div className="font-mono text-[12px] text-ink-muted">{account.email}</div>

                  <div className="mt-4 grid max-w-[460px] gap-3">
                    {hasCredential ? (
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] font-medium">
                          Current password
                        </span>
                        <input
                          type="password"
                          autoComplete="current-password"
                          value={current}
                          onChange={(e) => setCurrent(e.target.value)}
                          disabled={busy}
                          className={FIELD}
                        />
                      </label>
                    ) : (
                      <p className="text-[13px] text-ink-muted">
                        This account has no password yet, so none is required to set one.
                      </p>
                    )}

                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium">New password</span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        disabled={busy}
                        className={FIELD}
                      />
                      {strength ? (
                        <span className="mt-1.5 block text-[12px] text-mark">{strength}</span>
                      ) : next ? (
                        <span className="mt-1.5 block text-[12px] text-board">
                          Long enough. Length is what resists an offline attack.
                        </span>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium">
                        Confirm new password
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={busy}
                        className={FIELD}
                      />
                      {mismatch ? (
                        <span className="mt-1.5 block text-[12px] text-mark">
                          These do not match.
                        </span>
                      ) : null}
                    </label>

                    <div className="flex items-center gap-3">
                      <PageAction
                        variant="primary"
                        onClick={changePassword}
                        disabled={busy || !next || Boolean(strength) || mismatch || !confirm}
                      >
                        {busy ? 'Changing…' : 'Change password'}
                      </PageAction>
                      {busy ? (
                        <span className="text-[12px] text-ink-muted">
                          Deriving the key — deliberately slow.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {lockout > 0 ? (
            <p className="mt-2 text-[13px] text-mark">
              Administrator sign-in is locked for another {Math.ceil(lockout / 60)} minute
              {Math.ceil(lockout / 60) === 1 ? '' : 's'} after repeated failed attempts. Changing
              the password here does not lift the lock.
            </p>
          ) : null}

          {/* ── Quarantine ───────────────────────────────────────────────── */}
          <h2 className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
            Quarantined data
          </h2>
          <p className="mt-2 text-[13px] text-ink-muted">
            When a saved database cannot be read by the running build — after a rollback, or a
            deploy that only half landed — it is set aside instead of deleted, and the app starts
            fresh alongside it. Download it before discarding: it is the only copy.
          </p>

          {quarantine ? (
            <div className="mt-3 rounded-card border border-mark bg-mark-tint/50 p-5">
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-3">
                  <Archive size={18} className="mt-0.5 shrink-0 text-mark" />
                  <div>
                    <div className="text-[14px] font-medium text-mark">
                      One quarantined copy is being held
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink/80">
                      Set aside {new Date(quarantine.quarantinedAt).toLocaleString()} because{' '}
                      {quarantine.reason}. It holds{' '}
                      {Math.max(1, Math.round(quarantine.document.length / 1024))} KB of data that
                      this build cannot open.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <PageAction onClick={downloadQuarantine}>
                    <Download size={13} /> Download copy
                  </PageAction>
                  {confirmDiscard ? (
                    <div className="flex gap-2">
                      <PageAction onClick={() => setConfirmDiscard(false)}>Cancel</PageAction>
                      <PageAction variant="destructive" onClick={discardQuarantine}>
                        <Trash2 size={13} /> Confirm discard
                      </PageAction>
                    </div>
                  ) : (
                    <PageAction variant="danger" onClick={() => setConfirmDiscard(true)}>
                      <Trash2 size={13} /> Discard
                    </PageAction>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-card border border-rule bg-surface px-5 py-6 text-center text-[13px] text-ink-muted">
              Nothing is quarantined. Every stored copy on this browser is readable by this build.
            </div>
          )}

          <p className="mt-6 font-mono text-[11px] text-ink-muted">
            Password changes are recorded in{' '}
            <Link to="/admin/audit" className="text-board underline underline-offset-2">
              Data access and audit
            </Link>
            . What this installation keeps, and what it drops under pressure, is set out in{' '}
            <Link to="/admin/retention" className="text-board underline underline-offset-2">
              Data retention
            </Link>
            .
          </p>
        </PageBody>

        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </AdminShell>
  )
}
