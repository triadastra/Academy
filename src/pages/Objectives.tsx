// Objectives — /teacher/objectives (ref syn_p16.png).
// CourseShell teacher rail; unit header with wired tabs + Approve unit button;
// objective table with selectable rows; 320px right drawer with objective
// detail and approve flow that flips state to Approved (toast).
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  CircleSlash,
  Pencil,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import type { CourseTab } from '@/components/CourseShell'

type ApprovalState = 'Approved' | 'Proposed'

interface UnitObjective {
  code: string
  statement: string
  bloom: 'remember' | 'apply' | 'analyze'
  state: ApprovalState
  prerequisite: string | null
  prerequisiteLabel?: string
  sourceCoverage: string
}

const initialObjectives: UnitObjective[] = [
  {
    code: '2.1',
    statement: 'Recognize antiderivatives and use basic integration rules.',
    bloom: 'remember',
    state: 'Approved',
    prerequisite: null,
    sourceCoverage: '6 of 6 sources address this objective',
  },
  {
    code: '2.2',
    statement: 'Use substitution to evaluate definite integrals.',
    bloom: 'apply',
    state: 'Approved',
    prerequisite: '2.1',
    prerequisiteLabel: '2.1 Recognize antiderivatives and use basic integration rules.',
    sourceCoverage: '5 of 6 sources address this objective',
  },
  {
    code: '2.3',
    statement: 'Use trigonometric identities to simplify integrands.',
    bloom: 'apply',
    state: 'Proposed',
    prerequisite: '2.2',
    prerequisiteLabel: '2.2 Use substitution to evaluate definite integrals.',
    sourceCoverage: '3 of 6 sources address this objective',
  },
  {
    code: '2.4',
    statement: 'Integrate by parts where one factor is polynomial.',
    bloom: 'apply',
    state: 'Proposed',
    prerequisite: '2.2',
    prerequisiteLabel: '2.2 Use substitution to evaluate definite integrals.',
    sourceCoverage: '4 of 6 sources address this objective',
  },
  {
    code: '2.5',
    statement: 'Apply integration methods to solve real-world problems.',
    bloom: 'analyze',
    state: 'Proposed',
    prerequisite: '2.3, 2.4',
    prerequisiteLabel: '2.3 Use trigonometric identities to simplify integrands.',
    sourceCoverage: '2 of 6 sources address this objective',
  },
]

const TABS: CourseTab[] = [
  { label: 'Overview', to: '/teacher/class-picture' },
  { label: 'Objectives', to: '/teacher/objectives' },
  { label: 'Content', to: '/teacher/library' },
  { label: 'Assessments', to: '/teacher/paper-builder' },
  { label: 'Resources', to: '/teacher/library' },
]

function DrawerLabel({ children }: { children: string }) {
  return (
    <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
      {children}
    </div>
  )
}

export default function Objectives() {
  const [objectives, setObjectives] = useState<UnitObjective[]>(initialObjectives)
  const [selected, setSelected] = useState('2.4')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const current = objectives.find((o) => o.code === selected) ?? null

  const approve = (code: string) => {
    setObjectives((prev) =>
      prev.map((o) => (o.code === code ? { ...o, state: 'Approved' } : o)),
    )
    setToast(`Objective ${code} approved`)
  }

  const approveUnit = () => {
    setObjectives((prev) => prev.map((o) => ({ ...o, state: 'Approved' })))
    setToast('Unit approved')
  }

  return (
    <CourseShell
      role="teacher"
      active="objectives"
      tabs={TABS}
      activeTab="Objectives"
      header={
        <div className="flex items-start justify-between gap-4 px-8 pt-6 pb-4 max-w-[900px]">
          <h1 className="font-serif text-[32px] text-ink">Unit 2 / Integration</h1>
          <button
            type="button"
            onClick={approveUnit}
            className="rounded-control bg-board px-4 py-2 text-[14px] font-medium text-surface hover:bg-board-deep transition-colors duration-[120ms] ease-out"
          >
            Approve unit
          </button>
        </div>
      }
      right={
        drawerOpen && current ? (
          <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-medium text-ink">Objective {current.code}</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close drawer"
                className="text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6">
              <DrawerLabel>Assessable objective statement</DrawerLabel>
              <p className="mt-2 font-serif text-[24px] leading-snug text-ink">
                {current.statement}
              </p>
            </div>

            <div className="mt-6">
              <DrawerLabel>Bloom level</DrawerLabel>
              <span className="mt-2 inline-block rounded-chip bg-board-tint px-2 py-0.5 font-mono text-[12px] text-board">
                {current.bloom}
              </span>
            </div>

            <div className="mt-6">
              <DrawerLabel>Prerequisite</DrawerLabel>
              <p className="mt-2 text-[14px] text-ink">
                {current.prerequisiteLabel ? (
                  <>
                    <span className="font-mono text-[12px]">{current.prerequisite}</span>{' '}
                    {current.prerequisiteLabel.replace(/^[\d., ]+/, '')}
                  </>
                ) : (
                  '—'
                )}
              </p>
            </div>

            <div className="mt-6">
              <DrawerLabel>Source coverage</DrawerLabel>
              <p className="mt-2 text-[14px] text-ink">{current.sourceCoverage}</p>
              <button
                type="button"
                onClick={() => setToast('Source coverage list opened')}
                className="mt-1 text-[14px] text-board underline underline-offset-2"
              >
                View sources
              </button>
            </div>

            <div className="mt-6">
              <DrawerLabel>Approval state</DrawerLabel>
              {current.state === 'Approved' ? (
                <p className="mt-2 flex items-center gap-1.5 text-[14px] text-board">
                  <CheckCircle2 size={15} /> Approved
                </p>
              ) : (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-[14px] text-mark">
                    <CircleSlash size={15} /> Proposed
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-mark">
                    Proposed objectives require review before they can be approved.
                  </p>
                </>
              )}
            </div>

            <div className="mt-auto pt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setToast(`Objective ${current.code} opened for editing`)}
                className="inline-flex items-center gap-2 border border-rule rounded-control bg-surface px-4 py-2 text-[14px] text-ink hover:border-ink-muted transition-colors duration-[120ms] ease-out"
              >
                <Pencil size={14} /> Edit
              </button>
              {current.state === 'Proposed' ? (
                <button
                  type="button"
                  onClick={() => approve(current.code)}
                  className="inline-flex items-center gap-2 rounded-control bg-board px-4 py-2 text-[14px] font-medium text-surface hover:bg-board-deep transition-colors duration-[120ms] ease-out"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="px-8 pt-4 pb-16 max-w-[900px]">
        {/* Table */}
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-rule">
              <th className="py-2 text-left font-mono text-[12px] text-ink-muted font-normal w-12">#</th>
              <th className="py-2 text-left font-mono text-[12px] text-ink-muted font-normal">Assessable objective statement</th>
              <th className="py-2 text-left font-mono text-[12px] text-ink-muted font-normal w-24">Bloom level</th>
              <th className="py-2 text-left font-mono text-[12px] text-ink-muted font-normal w-28">Approval state</th>
              <th className="py-2 text-left font-mono text-[12px] text-ink-muted font-normal w-24">Prerequisite</th>
            </tr>
          </thead>
          <tbody>
            {objectives.map((o) => {
              const isSelected = o.code === selected && drawerOpen
              return (
                <tr
                  key={o.code}
                  onClick={() => {
                    setSelected(o.code)
                    setDrawerOpen(true)
                  }}
                  className={
                    isSelected
                      ? 'cursor-pointer outline outline-1 outline-board rounded-control bg-surface'
                      : 'cursor-pointer border-b border-rule hover:bg-surface transition-colors duration-[120ms] ease-out'
                  }
                >
                  <td className="py-4 pl-2 font-mono text-[12px] text-ink align-middle">{o.code}</td>
                  <td className="py-4 pr-4 text-[14px] font-medium text-ink">{o.statement}</td>
                  <td className="py-4">
                    <span className="inline-block rounded-chip bg-board-tint px-2 py-0.5 font-mono text-[12px] text-board">
                      {o.bloom}
                    </span>
                  </td>
                  <td className="py-4">
                    {o.state === 'Approved' ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-board">
                        <CheckCircle2 size={14} /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-mark">
                        <CircleSlash size={14} /> Proposed
                      </span>
                    )}
                  </td>
                  <td className="py-4 font-mono text-[12px] text-ink whitespace-nowrap">
                    {o.prerequisite ? (
                      <span className="inline-flex items-center gap-1.5">
                        {o.prerequisite} <ArrowRight size={12} />
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Add objective */}
        <button
          type="button"
          onClick={() => setToast('New objective draft created')}
          className="mt-4 inline-flex items-center gap-2 text-[14px] text-ink-muted hover:text-board transition-colors duration-[120ms] ease-out"
        >
          <Plus size={16} /> Add objective
        </button>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 border border-board bg-surface rounded-control px-4 py-2.5 font-mono text-[12px] text-board">
          <CheckCircle2 size={14} />
          {toast}
        </div>
      ) : null}
    </CourseShell>
  )
}
