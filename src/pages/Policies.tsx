// Policies — route /teacher/policies (ref syn_p28.png).
// Top bar + light rail, course policies card (toggles/selects/date/spend cap)
// and integrations card with per-integration status.
import { useState } from 'react'
import {
  Puzzle, CircleHelp, ChevronRight,
  Lightbulb, Lock, CalendarDays, MessageCircle, DollarSign, ShieldCheck,
  CircleCheck, CircleMinus, TriangleAlert, ExternalLink, Code, Search,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange?: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={
        disabled
          ? 'w-9 h-5 rounded-full bg-rule relative cursor-not-allowed'
          : on
            ? 'w-9 h-5 rounded-full bg-board relative transition-colors duration-[120ms] ease-out'
            : 'w-9 h-5 rounded-full bg-rule relative transition-colors duration-[120ms] ease-out'
      }
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-surface transition-transform duration-[120ms] ease-out"
        style={{ left: 2, transform: on ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

interface Integration {
  name: string
  desc: string
  icon: React.ReactNode
  status: 'Connected' | 'Disabled' | 'Review'
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    name: 'ManageBac',
    desc: 'Scope: read courses and assignments',
    icon: <span className="w-7 h-7 rounded-full bg-[#26348B] text-white font-mono text-[9px] flex items-center justify-center">MB</span>,
    status: 'Connected',
  },
  {
    name: 'Google Drive',
    desc: 'Scope: approved folder',
    icon: (
      <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M17 8h14l14 24-8 14H11L-3 32z" fill="none" />
        <path d="M30.2 5 48 35.5H17.6L0 5z" fill="#3777E3" transform="translate(0 3) scale(0.85)" opacity="0" />
        <path d="M16 6h16l12 21-5.5 9.5H9.5L4 27z" fill="none" />
        <path d="M14.5 5h19L45 32H26z" fill="#4285F4" transform="translate(2 3) scale(0.8)" />
        <path d="M2.5 32 14 12l11.5 20z" fill="#FBBC04" transform="translate(2 3) scale(0.8)" />
        <path d="M14 43h20l11-20H25z" fill="#34A853" transform="translate(2 -1) scale(0.8)" />
      </svg>
    ),
    status: 'Connected',
  },
  {
    name: 'Code sandbox',
    desc: 'Allow execution of code in a sandbox',
    icon: <span className="w-7 h-7 rounded-control border border-rule flex items-center justify-center text-ink-muted"><Code size={15} /></span>,
    status: 'Disabled',
  },
  {
    name: 'Web search',
    desc: 'Allow AI to search the web for answers',
    icon: <span className="w-7 h-7 rounded-control border border-rule flex items-center justify-center text-ink-muted"><Search size={15} /></span>,
    status: 'Review',
  },
]

function IntegrationBadge({ status }: { status: Integration['status'] }) {
  if (status === 'Connected') {
    return (
      <span className="inline-flex items-center gap-1.5 border border-board text-board rounded-chip px-2.5 py-1 text-[12px]">
        <CircleCheck size={13} /> Connected
      </span>
    )
  }
  if (status === 'Disabled') {
    return (
      <span className="inline-flex items-center gap-1.5 border border-rule text-ink-muted rounded-chip px-2.5 py-1 text-[12px]">
        <CircleMinus size={13} /> Disabled
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-[#B07A2A] text-[#B07A2A] rounded-chip px-2.5 py-1 text-[12px]">
      <TriangleAlert size={13} /> Review
    </span>
  )
}

export default function Policies() {
  const [explain, setExplain] = useState(true)
  const [unlock, setUnlock] = useState('2025-10-14T23:59')
  const [mode, setMode] = useState('Socratic only')
  const [cap, setCap] = useState('400')
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  const cycleIntegration = (name: string) => {
    setIntegrations((list) =>
      list.map((it) => {
        if (it.name !== name) return it
        const next = it.status === 'Connected' ? 'Disabled' : it.status === 'Disabled' ? 'Review' : 'Connected'
        showToast(`${it.name}: ${next.toLowerCase()}`)
        return { ...it, status: next }
      }),
    )
  }

  return (
    <CourseShell role="teacher" active="policies">
      <main className="flex-1 min-w-0 px-8 py-6">
          <h1 className="font-serif text-[28px] leading-tight">Policies and integrations</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Configure course-level policies and manage third-party integrations.</p>

          <div className="mt-5 grid grid-cols-2 gap-6 items-start">
            {/* Course policies */}
            <section className="border border-rule rounded-card bg-surface">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-rule">
                <ShieldCheck size={16} className="text-board" />
                <span className="text-[14px] font-medium">Course policies</span>
              </div>
              <ul>
                <li className="flex items-center gap-3 px-5 py-4 border-b border-rule">
                  <Lightbulb size={16} className="text-ink-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px]">Explain concepts</div>
                    <div className="text-[12px] text-ink-muted">Allow explanations for student questions</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 border rounded-chip px-2.5 py-1 text-[12px] ${explain ? 'border-board text-board' : 'border-rule text-ink-muted'}`}>
                    {explain ? <CircleCheck size={13} /> : <CircleMinus size={13} />} {explain ? 'Enabled' : 'Disabled'}
                  </span>
                  <Toggle on={explain} onChange={() => { setExplain(!explain); showToast(`Explain concepts ${!explain ? 'enabled' : 'disabled'}.`) }} />
                </li>
                <li className="flex items-center gap-3 px-5 py-4 border-b border-rule">
                  <Lock size={16} className="text-ink-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px]">Reveal solutions</div>
                    <div className="text-[12px] text-ink-muted">Allow revealing full worked solutions</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 border border-rule text-ink-muted rounded-chip px-2.5 py-1 text-[12px]">
                    <Lock size={13} /> Locked
                  </span>
                  <Toggle on={false} disabled />
                </li>
                <li className="flex items-center gap-3 px-5 py-4 border-b border-rule">
                  <CalendarDays size={16} className="text-ink-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px]">Solution unlock</div>
                    <div className="text-[12px] text-ink-muted">When solutions become available</div>
                  </div>
                  <input
                    type="datetime-local"
                    value={unlock}
                    onChange={(e) => { setUnlock(e.target.value); showToast('Solution unlock time updated.') }}
                    className="border border-rule rounded-control bg-surface px-2.5 py-1.5 text-[13px] font-mono focus:outline-none focus:border-board"
                  />
                </li>
                <li className="flex items-center gap-3 px-5 py-4 border-b border-rule">
                  <MessageCircle size={16} className="text-ink-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px]">Assessment mode</div>
                    <div className="text-[12px] text-ink-muted">Control interaction style during assessments</div>
                  </div>
                  <select
                    value={mode}
                    onChange={(e) => { setMode(e.target.value); showToast(`Assessment mode: ${e.target.value}.`) }}
                    className="border border-rule rounded-control bg-surface px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-board"
                  >
                    <option>Socratic only</option>
                    <option>Hints allowed</option>
                    <option>Full assistance</option>
                  </select>
                </li>
                <li className="flex items-center gap-3 px-5 py-4">
                  <DollarSign size={16} className="text-ink-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px]">Monthly spend cap</div>
                    <div className="text-[12px] text-ink-muted">AI usage spending limit for this course</div>
                  </div>
                  <span className="flex items-center border border-rule rounded-control bg-surface px-2.5 py-1.5">
                    <span className="text-[12px] text-ink-muted mr-1.5">USD</span>
                    <input
                      value={cap}
                      onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => showToast(`Monthly spend cap set to USD ${cap || '0'}.`)}
                      className="w-16 text-[13px] font-mono focus:outline-none bg-transparent"
                    />
                  </span>
                </li>
              </ul>
            </section>

            {/* Integrations */}
            <section className="border border-rule rounded-card bg-surface">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-rule">
                <Puzzle size={16} className="text-board" />
                <span className="text-[14px] font-medium">Integrations</span>
              </div>
              <ul>
                {integrations.map((it) => (
                  <li key={it.name} className="flex items-center gap-3 px-5 py-4 border-b border-rule last:border-b-0">
                    {it.icon}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px]">{it.name}</div>
                      <div className="text-[12px] text-ink-muted">{it.desc}</div>
                    </div>
                    <IntegrationBadge status={it.status} />
                    <button
                      type="button"
                      aria-label={`Manage ${it.name}`}
                      onClick={() => cycleIntegration(it.name)}
                      className="w-7 h-7 border border-rule rounded-control flex items-center justify-center hover:border-ink-muted transition-colors duration-[120ms] ease-out"
                    >
                      <ChevronRight size={13} className="text-ink-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-5 flex items-center gap-2 text-[12px] text-ink-muted">
            <CircleHelp size={13} />
            <span>Policy changes apply to all students in this course. Some changes may take a few minutes to take effect.</span>
            <span className="h-4 w-px bg-rule mx-1" />
            <button type="button" onClick={() => showToast('Policy documentation opens in the help center.')} className="text-board font-medium inline-flex items-center gap-1 hover:underline">
              Learn more about policies and integrations <ExternalLink size={11} />
            </button>
          </div>
      </main>

      <footer className="px-6 py-2.5 flex items-center justify-between font-mono text-[11px] text-ink-muted/60 uppercase tracking-[0.08em] border-t border-rule">
        <span>Policies and integrations</span><span>22 / 24</span>
      </footer>

      {toast ? (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-ink text-paper text-[13px] px-4 py-2 rounded-control z-50">
          {toast}
        </div>
      ) : null}
    </CourseShell>
  )
}
