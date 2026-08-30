// SigninHelp.tsx — route /signin-help (pages-access.md §signin-help, ref syn_p3.png).
// Top-left logo lockup, centered help card, bottom-left status line.
import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, Mail, School, UserRound } from 'lucide-react'
import Crest from '@/components/Crest'

export default function SigninHelp() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="h-[100dvh] overflow-hidden bg-paper flex flex-col px-6 relative">
      {/* Top-left logo lockup */}
      <header className="flex items-center justify-center gap-3 pt-8 pb-6 border-b border-rule">
        <Crest size={40} tone="dark" />
        <div>
          <div className="font-serif text-[32px] leading-none text-board">Synonance</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            Curriculum intelligence
          </div>
        </div>
      </header>

      {/* Centered card */}
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center py-10">
        <div className="w-full max-w-[400px] bg-surface border border-rule rounded-card p-8">
          <h1 className="font-serif text-[32px] text-center text-ink">Sign-in help</h1>

          <div className="mt-6 pt-6 border-t border-rule flex items-center gap-3">
            <span className="w-10 h-10 rounded-card bg-board-tint text-board flex items-center justify-center shrink-0">
              <School size={20} />
            </span>
            <p className="text-[14px] font-medium text-ink leading-snug">
              Your school manages your Synonance account.
            </p>
          </div>

          <label htmlFor="school-email" className="block mt-6 text-[14px] font-medium text-ink mb-2">
            School email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              id="school-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.shsid.org.cn"
              className="w-full bg-surface border border-rule rounded-control pl-9 pr-3 py-2.5 text-[14px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out"
            />
          </div>

          <button
            type="button"
            onClick={() => setSent(true)}
            className="mt-4 w-full bg-board text-surface text-[14px] font-medium rounded-control py-3 flex items-center justify-center gap-2 hover:bg-board-deep transition-colors duration-[120ms] ease-out"
          >
            <UserRound size={16} />
            Find my administrator
          </button>

          {sent ? (
            <p className="mt-3 text-[12px] text-board text-center">
              We sent your request to the SHSID administrator.
            </p>
          ) : null}

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="flex-1 h-px bg-rule" />
            <span className="text-[12px] text-ink-muted">or</span>
            <span className="flex-1 h-px bg-rule" />
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="text-[14px] font-medium text-ink underline underline-offset-4 decoration-ink/40 hover:decoration-ink transition-colors duration-[120ms] ease-out"
            >
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Status line */}
        <p className="mt-8 flex items-center gap-2 text-[14px] text-ink">
          <CheckCircle2 size={16} className="text-board" />
          All systems operational
        </p>
      </main>

      {/* Footer corners */}
      <span className="absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        Sign-in help
      </span>
      <span className="absolute bottom-3 right-4 font-mono text-[10px] text-ink-muted">02 / 24</span>
    </div>
  )
}
