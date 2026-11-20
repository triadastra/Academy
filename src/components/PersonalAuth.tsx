// PersonalAuth — the sign-in / create-account card for personal accounts.
//
// Personal accounts are private to this browser: a username and a password
// (PBKDF2-verified, see createPersonalAccount / signInPersonal in client.ts).
// No Launchpad, no institution, no shared data.
import { useEffect, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, AtSign, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react'
import { createPersonalAccount, signInLockoutSeconds, signInPersonal } from '@/database/client'

const input =
  'w-full bg-surface border border-rule rounded-control pl-9 pr-3 py-2.5 text-[13px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out'

export default function PersonalAuth({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: () => void }) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(() => signInLockoutSeconds())

  useEffect(() => {
    if (locked <= 0) return
    const timer = window.setInterval(() => setLocked(signInLockoutSeconds()), 1000)
    return () => window.clearInterval(timer)
  }, [locked])

  async function submit() {
    if (busy) return
    setError('')
    if (mode === 'create' && password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'create') {
        const result = await createPersonalAccount({ displayName: name, username, password })
        if (result.ok) return onSignedIn()
        setError(result.message)
      } else {
        const result = await signInPersonal(username, password)
        if (result.ok) return onSignedIn()
        if (result.reason === 'locked') setLocked(result.seconds)
        setError(
          result.reason === 'locked'
            ? `Too many failed attempts. Try again in ${Math.ceil(result.seconds / 60)} minute${result.seconds > 60 ? 's' : ''}.`
            : result.reason === 'suspended'
              ? 'This account is not active.'
              : 'That username or password is incorrect.',
        )
        setLocked(signInLockoutSeconds())
      }
    } finally {
      setBusy(false)
    }
  }

  const onEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') void submit()
  }

  return (
    <div className="mt-8 w-full bg-surface border border-rule rounded-card p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 -mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
      >
        <ArrowLeft size={13} /> Personal account · change
      </button>

      <div className="mb-4 grid grid-cols-2 rounded-control border border-rule p-0.5 text-[13px]" role="tablist">
        {(['signin', 'create'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value)
              setError('')
            }}
            className={
              mode === value
                ? 'rounded-[3px] bg-board py-1.5 text-paper'
                : 'rounded-[3px] py-1.5 text-ink-muted hover:text-ink'
            }
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5">
        {mode === 'create' ? (
          <label className="relative">
            <span className="sr-only">Your name</span>
            <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
          </label>
        ) : null}
        <label className="relative">
          <span className="sr-only">Username</span>
          <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            className={input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onEnter}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        <label className="relative">
          <span className="sr-only">Password</span>
          <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="password"
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={mode === 'signin' ? onEnter : undefined}
            placeholder={mode === 'create' ? 'Create password' : 'Password'}
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          />
        </label>
        {mode === 'create' ? (
          <label className="relative">
            <span className="sr-only">Confirm password</span>
            <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="password"
              className={input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </label>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || (mode === 'signin' && locked > 0)}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-board text-surface text-[14px] font-medium rounded-control py-3 hover:bg-board-deep disabled:opacity-60 transition-colors duration-[120ms] ease-out"
      >
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : null}
        {busy
          ? mode === 'create'
            ? 'Creating…'
            : 'Checking…'
          : mode === 'signin' && locked > 0
            ? `Locked for ${Math.ceil(locked / 60)} min`
            : mode === 'create'
              ? 'Create personal account'
              : 'Sign in'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-mark">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">
        A personal account and everything in it — courses, files, notes, grades — is stored only in this browser and
        never shared with a school. Clearing site data removes it.
      </p>
    </div>
  )
}
