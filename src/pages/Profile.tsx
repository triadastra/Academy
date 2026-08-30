// Profile.tsx — route /profile (pages-access.md §profile, ref syn_p13.png).
// Dark-green grouped rail, two-column settings form, preferences rows,
// danger zone, and a saved toast on Save changes.
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Mail,
  Moon,
  Quote,
  Sparkles,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBody } from '@/components/Page'
import {
  getAuthSession,
  getCurrentUser,
  getSettings,
  getUserProfile,
  signOutCurrentUser,
  updateSettings,
  updateUserProfile,
} from '@/database/client'
import { deleteOwnAccount, exportAndDownload } from '@/database/accounts'
import { storageEstimate, storedBytes } from '@/database/storage'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  mono,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <Field label={label}>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-surface border border-rule rounded-control px-3 py-2.5 pr-9 text-[14px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out ${mono ? 'font-mono' : ''}`}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
        />
      </span>
    </Field>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? 'relative w-9 h-5 rounded-full bg-board transition-colors duration-[120ms] ease-out shrink-0'
          : 'relative w-9 h-5 rounded-full bg-surface border border-rule transition-colors duration-[120ms] ease-out shrink-0'
      }
    >
      <span
        className={
          checked
            ? 'absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-surface transition-transform duration-[120ms] ease-out'
            : 'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface border border-rule transition-transform duration-[120ms] ease-out'
        }
      />
    </button>
  )
}

/** "412 KB" / "1.4 MB", for the storage readout. */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatMoment(iso: string | null | undefined) {
  if (!iso) return '—'
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString()
}

export default function Profile() {
  const navigate = useNavigate()
  const profile = getUserProfile()
  // Falling back to the seeded demo student here meant a newly registered
  // account opened this form pre-filled with somebody else's name and school
  // email address, and saving it copied them onto the new account.
  const account = getCurrentUser()
  const session = getAuthSession()
  const [displayName, setDisplayName] = useState(
    profile.displayName || account?.displayName || account?.name || '',
  )
  const [email, setEmail] = useState(profile.email || account?.email || '')
  const [language, setLanguage] = useState(profile.language)
  const [timezone, setTimezone] = useState(profile.timezone)
  const [reducedMotion, setReducedMotion] = useState(profile.reducedMotion)
  const [emailSummaries, setEmailSummaries] = useState(profile.emailSummaries)
  const [citationDisplay, setCitationDisplay] = useState(profile.citationDisplay)
  // Absent reads as on — see DatabaseSettings.autoSynthesis. A student who has
  // never opened this page has it running, which is the point of it.
  const [autoSynthesis, setAutoSynthesis] = useState(getSettings().autoSynthesis !== false)
  const [toast, setToast] = useState<string | null>(null)
  const [dangerError, setDangerError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [usage, setUsage] = useState<{ stored: number; quota: number | null }>({
    stored: storedBytes(),
    quota: null,
  })

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let live = true
    storageEstimate().then((estimate) => {
      if (live) setUsage({ stored: storedBytes(), quota: estimate?.quota ?? null })
    })
    return () => {
      live = false
    }
  }, [])

  function exportMyData() {
    setDangerError('')
    if (!account) return
    const result = exportAndDownload(account.id)
    if (!result.ok) {
      setDangerError(result.message)
      return
    }
    setToast(result.value)
  }

  function deleteMyAccount() {
    setDangerError('')
    const result = deleteOwnAccount()
    if (!result.ok) {
      setDangerError(result.message)
      setConfirmDelete(false)
      return
    }
    // A reload rather than a route change. Storage is cleared, but a
    // client-side navigation leaves every mounted component and every
    // module-scope snapshot still holding the account that has just been
    // erased. Starting the app over is the only way to be certain none of it
    // is still on screen.
    window.location.replace(`${window.location.pathname}#/login`)
    window.location.reload()
  }

  return (
    // The nav rail follows the account's own role. This was pinned to
    // "student", which was harmless while the seeded student was the only way
    // in — but a teacher opening their profile was handed the student rail
    // (Chat, Know, Mock tests) and lost every link back to their own pages.
    <CourseShell role={account?.role === 'Teacher' ? 'teacher' : 'student'} active="profile">
      <Page>
        <PageBody measure="wide">
        <div className="grid grid-cols-2 gap-x-14 gap-y-8">
          {/* Personal information */}
          <section>
            <h2 className="text-[16px] font-medium text-ink pb-3 border-b border-rule">
              Personal information
            </h2>
            <div className="mt-5 flex flex-col gap-5">
              <Field label="Display name">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-surface border border-rule rounded-control px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                />
              </Field>
              <Field label="School email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-rule rounded-control px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                />
              </Field>
              <div>
                <span className="block text-[13px] font-medium text-ink mb-1.5">
                  Launchpad VID
                </span>
                <div className="w-full bg-paper border border-rule rounded-control px-3 py-2.5 font-mono text-[14px] text-ink-muted">
                  {account?.launchpadVid ?? 'Not linked'}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  Synced from your verified Launchpad identity. It cannot be set or changed in Synonance.
                </p>
              </div>
              <div>
                <span className="block text-[13px] font-medium text-ink mb-1.5">Account type</span>
                {/* Read from the account, not hardcoded: a teacher opening this
                    page used to be told they were a Student. */}
                <div className="w-full bg-paper border border-rule rounded-control px-3 py-2.5 text-[14px] text-ink-muted">
                  {account?.role ?? 'Unknown'}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  Only an administrator can change this. Ask your school if it is wrong.
                </p>
              </div>
            </div>
          </section>

          {/* Account settings */}
          <section>
            <h2 className="text-[16px] font-medium text-ink pb-3 border-b border-rule">
              Account settings
            </h2>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <span className="block text-[13px] font-medium text-ink mb-1.5">
                  Grade and courses
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/setup')}
                  className="w-full flex items-center justify-between gap-4 bg-surface border border-rule rounded-control px-3 py-2.5 text-[14px] text-ink hover:border-board hover:text-board transition-colors duration-[120ms] ease-out"
                >
                  <span>Reselect grade and courses</span>
                  <ArrowRight size={15} className="text-ink-muted" />
                </button>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  Return to course setup to update the grade, pathway, or course selection.
                </p>
              </div>
              <SelectField
                label="Language"
                value={language}
                options={['English', '中文（简体）']}
                onChange={setLanguage}
              />
              <SelectField
                label="Timezone"
                value={timezone}
                options={['Asia/Shanghai', 'UTC', 'Asia/Singapore']}
                onChange={setTimezone}
              />
            </div>
          </section>
        </div>

        {/* Preferences */}
        <section className="mt-10">
          <h2 className="text-[16px] font-medium text-ink pb-3 border-b border-rule">
            Preferences
          </h2>
          <div className="flex flex-col">
            <div className="flex items-center gap-6 py-4 border-b border-rule">
              <span className="flex items-center gap-2.5 w-[220px] shrink-0 text-[14px] font-medium text-ink">
                <Moon size={15} className="text-ink-muted" />
                Reduced motion
              </span>
              <p className="flex-1 text-[13px] text-ink-muted">
                Minimize animations and transitions across the platform.
              </p>
              <Toggle checked={reducedMotion} onChange={setReducedMotion} label="Reduced motion" />
            </div>
            <div className="flex items-center gap-6 py-4 border-b border-rule">
              <span className="flex items-center gap-2.5 w-[220px] shrink-0 text-[14px] font-medium text-ink">
                <Sparkles size={15} className="text-ink-muted" />
                Draft questions from notes
              </span>
              <p className="flex-1 text-[13px] text-ink-muted">
                While Syno reads and compares your class notes to answer you, let it draft practice
                questions for the topics it finds nothing to practise on. Drafts are tagged
                Synthesized and wait in the Question Base review queue — nothing is added to your
                practice bank until you accept it.
              </p>
              <Toggle
                checked={autoSynthesis}
                onChange={setAutoSynthesis}
                label="Draft questions from notes"
              />
            </div>
            <div className="flex items-center gap-6 py-4 border-b border-rule">
              <span className="flex items-center gap-2.5 w-[220px] shrink-0 text-[14px] font-medium text-ink">
                <Mail size={15} className="text-ink-muted" />
                Email summaries
              </span>
              <p className="flex-1 text-[13px] text-ink-muted">
                Receive periodic email summaries about your activity.
              </p>
              <span className="relative block w-[220px]">
                <select
                  aria-label="Email summaries"
                  value={emailSummaries}
                  onChange={(e) => setEmailSummaries(e.target.value)}
                  className="w-full appearance-none bg-surface border border-rule rounded-control px-3 py-2 pr-8 text-[13px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                >
                  {['Off', 'Weekly', 'Daily'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
              </span>
            </div>
            <div className="flex items-center gap-6 py-4 border-b border-rule">
              <span className="flex items-center gap-2.5 w-[220px] shrink-0 text-[14px] font-medium text-ink">
                <Quote size={15} className="text-ink-muted" />
                Citation display
              </span>
              <p className="flex-1 text-[13px] text-ink-muted">
                Choose how citations are shown in your work.
              </p>
              <span className="relative block w-[220px]">
                <select
                  aria-label="Citation display"
                  value={citationDisplay}
                  onChange={(e) => setCitationDisplay(e.target.value)}
                  className="w-full appearance-none bg-surface border border-rule rounded-control px-3 py-2 pr-8 text-[13px] text-ink focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
                >
                  {['In-text (author-date)', 'Footnotes', 'Endnotes'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                />
              </span>
            </div>
          </div>
        </section>

        {/* Your data */}
        <section className="mt-10">
          <h2 className="text-[16px] font-medium text-ink pb-3 border-b border-rule">Your data</h2>
          <div className="mt-4 flex items-start justify-between gap-6">
            <div className="max-w-[520px]">
              <h3 className="text-[14px] font-medium text-ink">Download a copy</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                A JSON file containing your profile, course selection, question attempts, graded
                papers and chat threads. Nobody else's data is included, and your sign-in
                credentials are not exported.
              </p>
              <p className="mt-2 font-mono text-[11px] text-ink-muted">
                Using {formatBytes(usage.stored)}
                {usage.quota ? ` of about ${formatBytes(usage.quota)} available in this browser` : ''}
              </p>
            </div>
            <PageAction onClick={exportMyData}>Export my data</PageAction>
          </div>
        </section>

        {/* Sessions */}
        <section className="mt-8 flex items-start justify-between gap-6 py-5 border-t border-rule">
          <div className="max-w-[520px]">
            <h3 className="text-[14px] font-medium text-ink">This session</h3>
            {/* The previous copy claimed to sign the user out "on all devices
                and browsers". Every session lives in its own browser's storage,
                so it could only ever end this one. Saying what actually happens
                is better than a reassurance the app cannot deliver. */}
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Signed in {formatMoment(session.signedInAt)}. This session ends automatically on{' '}
              {formatMoment(session.expiresAt)}, or sooner after a long period of inactivity.
              Signing out ends it on this device; other devices keep their own sessions until they
              expire.
            </p>
          </div>
          <PageAction
            onClick={() => {
              signOutCurrentUser()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </PageAction>
        </section>

        {/* Danger zone */}
        <section className="mt-2 flex items-start justify-between gap-6 py-5 border-t border-rule">
          <div className="max-w-[520px]">
            <h2 className="text-[14px] font-medium text-mark">Delete my account and data</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              Permanently erases your profile, course selection, attempts, graded papers and chat
              threads from this browser, and signs you out. This cannot be undone — export a copy
              first if you want to keep it.
            </p>
            {dangerError ? (
              <p role="alert" className="mt-2 text-[12px] text-mark">
                {dangerError}
              </p>
            ) : null}
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2 shrink-0">
              <PageAction onClick={() => setConfirmDelete(false)}>Cancel</PageAction>
              <PageAction variant="danger" onClick={deleteMyAccount}>
                Yes, delete everything
              </PageAction>
            </div>
          ) : (
            <PageAction variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete my account
            </PageAction>
          )}
        </section>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <PageAction onClick={() => navigate('/courses')}>Cancel</PageAction>
          <PageAction
            variant="primary"
            onClick={() => {
              updateUserProfile({
                displayName,
                email,
                language,
                timezone,
                reducedMotion,
                emailSummaries,
                citationDisplay,
              })
              // A settings field rather than a profile one, but it is a
              // preference row like its neighbours, so it saves with them.
              updateSettings({ autoSynthesis })
              setToast('Changes saved')
            }}
          >
            Save changes
          </PageAction>
        </div>
        </PageBody>
      </Page>

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-board text-surface text-[13px] font-medium rounded-control px-4 py-2.5"
        >
          <CheckCircle2 size={15} />
          {toast}
        </div>
      ) : null}
    </CourseShell>
  )
}
