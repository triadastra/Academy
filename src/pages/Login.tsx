// Login.tsx — route /login.
// Launchpad is the way in: one button to sign in, one to create an account.
// Both run the same OIDC + PKCE flow, because the platform has already decided
// who the person is — a separate registration form could only ask for things
// it already knows. The administrator form below is the local escape hatch.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Globe, LoaderCircle, LockKeyhole, Mail, UserPlus } from 'lucide-react'
import {
  getSignedInHomeRoute,
  signInAdministrator,
  signInLockoutSeconds,
  signInWithLaunchpad,
} from '@/database/client'
import {
  currentLaunchpadUser,
  isAvailable as launchpadAvailable,
  isSecureEnough,
  startLaunchpadSignIn,
} from '@/lib/launchpad-auth'

/** Which button was pressed, kept across the redirect so the copy can match. */
const INTENT_KEY = 'synonance:launchpad-intent'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  // Deriving the PBKDF2 key takes close to a second on the pure-JS path the
  // plain-http deployment falls back to, so the form has to say it is working.
  const [adminBusy, setAdminBusy] = useState(false)
  // null while we are still finding out whether this origin can run the flow.
  const [launchpadReady, setLaunchpadReady] = useState<boolean | null>(null)
  const [launchpadBusy, setLaunchpadBusy] = useState<'signin' | 'signup' | null>(null)
  const [launchpadError, setLaunchpadError] = useState('')

  // Two jobs on mount: find out whether the Launchpad SDK is reachable at all
  // (it only exists on a Launchpad-hosted origin), and finish a sign-in that
  // is mid-flight — the platform redirects back here with a code, which the
  // SDK exchanges before it can tell us who the user is.
  useEffect(() => {
    let live = true
    ;(async () => {
      const available = await launchpadAvailable()
      if (!live) return
      setLaunchpadReady(available)
      if (!available) return
      const user = await currentLaunchpadUser()
      if (!live || !user) return
      const result = signInWithLaunchpad(user)
      sessionStorage.removeItem(INTENT_KEY)
      if (!result.ok) {
        const message =
          result.reason === 'blocked'
            ? result.blocked === 'erased'
              ? 'This account has been erased and cannot be used to sign in. Contact your school administrator.'
              : 'This account has been suspended. Contact your school administrator to have access restored.'
            : result.reason === 'unverified'
              ? 'Your Launchpad account is not verified. Complete verification in Launchpad before opening SHSID courses.'
              : result.reason === 'wrong-institution'
                ? `These courses are restricted to verified ${result.expectedInstitution} members. Launchpad${result.receivedInstitution ? ` reports your institution as ${result.receivedInstitution}` : ' did not report an institution'}.`
                : result.reason === 'missing-vid'
                  ? 'Launchpad did not provide a valid VID for this account. Synonance cannot create an unlinked account.'
                  : result.reason === 'identity-conflict'
                    ? 'This Launchpad identity or VID is already linked to a different Synonance account. Contact your school administrator.'
                    : result.reason === 'missing-subject'
                      ? 'Launchpad did not return a stable account identifier.'
                      : 'Launchpad did not return an email address, so no account could be opened.'
        setLaunchpadError(message)
        return
      }
      // A new account has no courses yet, so getSignedInHomeRoute sends them
      // to setup on its own — first sign-in and first sign-up both land
      // correctly without this page having to know which happened.
      navigate(getSignedInHomeRoute(), { replace: true })
    })()
    return () => {
      live = false
    }
  }, [navigate])

  async function continueWithLaunchpad(intent: 'signin' | 'signup') {
    setLaunchpadError('')
    setLaunchpadBusy(intent)
    sessionStorage.setItem(INTENT_KEY, intent)
    const blocker = await startLaunchpadSignIn()
    // A resolved call means no redirect happened: on success the consent
    // screen has already replaced this page.
    if (blocker) {
      setLaunchpadBusy(null)
      sessionStorage.removeItem(INTENT_KEY)
      setLaunchpadError(
        blocker === 'insecure-context'
          ? 'Sign-in needs a secure (HTTPS) address. This page is served over plain HTTP, which stops the browser providing the cryptography the sign-in requires.'
          : blocker === 'sdk-unavailable'
            ? 'Launchpad sign-in is not available on this address.'
            : 'Launchpad could not start the sign-in. Please try again.',
      )
    }
  }

  async function signInAsAdministrator() {
    if (adminBusy) return
    setAdminError('')
    setAdminBusy(true)
    try {
      const result = await signInAdministrator(email, password)
      if (result.ok) {
        navigate('/admin/audit', { replace: true })
        return
      }
      setAdminError(
        result.reason === 'locked'
          ? `Too many failed attempts. Try again in ${Math.ceil(result.seconds / 60)} minute${result.seconds > 60 ? 's' : ''}.`
          : result.reason === 'suspended'
            ? 'This administrator account has been suspended.'
            : result.reason === 'no-credential'
              ? 'This administrator account has no password set yet. It must be provisioned before it can be used.'
              : // Deliberately does not distinguish an unknown address from a
                // wrong password: separate messages turn the form into an
                // account-enumeration tool.
                'That administrator email or password is incorrect.',
      )
    } finally {
      setAdminBusy(false)
    }
  }

  // A lockout outlives the page, so it is re-read on mount and ticked down
  // while the form is open — otherwise reopening /login looked like a fresh
  // start and the first attempt failed for an unexplained reason.
  const [lockedSeconds, setLockedSeconds] = useState(() => signInLockoutSeconds())
  useEffect(() => {
    if (!adminOpen) return
    setLockedSeconds(signInLockoutSeconds())
    const timer = window.setInterval(() => setLockedSeconds(signInLockoutSeconds()), 1_000)
    return () => window.clearInterval(timer)
  }, [adminOpen, adminError])

  const pending = launchpadReady === null || launchpadBusy !== null
  // Shown before anything is clicked: over plain HTTP the browser withholds
  // crypto.subtle, so the flow cannot start however well everything else is
  // configured.
  const insecure = launchpadReady === true && !isSecureEnough()

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-paper flex flex-col items-center justify-center px-4 py-8 relative">
      <div className="w-full max-w-[380px] flex flex-col items-center">
        <h1 className="font-serif text-[56px] leading-none text-ink">Synonance</h1>
        <p className="mt-3 font-serif text-[18px] text-center text-ink-muted">
          Learn from the course your teacher actually teaches.
        </p>

        <div className="mt-8 w-full bg-surface border border-rule rounded-card p-6">
          {launchpadReady === false ? (
            <div className="rounded-control border border-rule bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
              Launchpad sign-in is unavailable on this address. Open Synonance at
              its published URL to sign in.
            </div>
          ) : (
            <>
              {insecure ? (
                <div className="mb-4 rounded-control border border-mark/40 bg-mark-tint px-4 py-3 text-[12px] leading-relaxed text-mark">
                  This address is served over plain <span className="font-mono">http</span>, and
                  sign-in needs <span className="font-mono">https</span> — browsers withhold the
                  cryptography the flow depends on outside a secure context.
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => continueWithLaunchpad('signin')}
                disabled={pending}
                className="w-full flex items-center justify-center gap-2 bg-board text-surface text-[14px] font-medium rounded-control py-3 hover:bg-board-deep disabled:opacity-60 transition-colors duration-[120ms] ease-out"
              >
                {launchpadBusy === 'signin' || launchpadReady === null ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <LockKeyhole size={15} />
                )}
                {launchpadBusy === 'signin' ? 'Redirecting…' : 'Sign in with Launchpad'}
              </button>

              <button
                type="button"
                onClick={() => continueWithLaunchpad('signup')}
                disabled={pending}
                className="mt-2.5 w-full flex items-center justify-center gap-2 border border-board text-board text-[14px] font-medium rounded-control py-3 hover:bg-board-tint disabled:opacity-60 transition-colors duration-[120ms] ease-out"
              >
                {launchpadBusy === 'signup' ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <UserPlus size={15} />
                )}
                {launchpadBusy === 'signup' ? 'Redirecting…' : 'Create an account'}
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                Both buttons use your Launchpad account, and Launchpad decides
                which applies — signing in creates an account if you do not have
                one yet. You will be asked to approve access first, and Synonance
                never sees your password.
              </p>

              {launchpadError ? (
                <p role="alert" className="mt-2 text-[12px] text-mark">{launchpadError}</p>
              ) : null}
            </>
          )}

          <div className="mt-5 pt-4 border-t border-rule">
            {adminOpen ? (
              <>
                <div className="grid gap-2.5">
                  <label className="relative">
                    <span className="sr-only">Administrator email</span>
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Administrator email"
                      autoComplete="username"
                      className="w-full bg-surface border border-rule rounded-control pl-9 pr-3 py-2.5 text-[13px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                    />
                  </label>
                  <label className="relative">
                    <span className="sr-only">Administrator password</span>
                    <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') signInAsAdministrator()
                      }}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full bg-surface border border-rule rounded-control pl-9 pr-3 py-2.5 text-[13px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={signInAsAdministrator}
                  disabled={adminBusy || lockedSeconds > 0}
                  className="mt-3 w-full flex items-center justify-center gap-2 border border-rule text-ink text-[14px] font-medium rounded-control py-2.5 hover:bg-paper disabled:opacity-60 disabled:hover:bg-transparent transition-colors duration-[120ms] ease-out"
                >
                  {adminBusy ? <LoaderCircle size={15} className="animate-spin" /> : null}
                  {adminBusy
                    ? 'Checking…'
                    : lockedSeconds > 0
                      ? `Locked for ${Math.ceil(lockedSeconds / 60)} min`
                      : 'Sign in as administrator'}
                </button>

                {adminError ? <p role="alert" className="mt-2 text-[12px] text-mark">{adminError}</p> : null}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="w-full text-[12px] text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
              >
                Administrator sign-in
              </button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-rule flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] text-ink">
              <Globe size={15} className="text-ink-muted" />
              Data region: <span className="font-medium">China</span>
            </span>
            <span className="w-px h-4 bg-rule" aria-hidden="true" />
            <span className="flex items-center gap-2 text-[12px] text-ink">
              <Building2 size={15} className="text-ink-muted" />
              Session: <span className="font-medium">Launchpad</span>
            </span>
          </div>
        </div>
      </div>

      <span className="fixed bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        Sign in
      </span>
      <span className="fixed bottom-3 right-4 font-mono text-[10px] text-ink-muted">01 / 24</span>
    </div>
  )
}
