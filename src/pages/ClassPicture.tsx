// ClassPicture — /teacher/class-picture (ref syn_p15.png).
// CourseShell teacher rail with wired tab nav; coverage table with
// 30-segment per-student strips; misconception cluster table with working
// Generate practice / Add to mock buttons firing toasts.
import { useEffect, useState } from 'react'
import {
  FilePlus2,
  Plus,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import type { CourseTab } from '@/components/CourseShell'
import SegmentBar from '@/components/SegmentBar'
import SectionTag from '@/components/SectionTag'
import { coverageRows, misconceptionClusters } from '@/data/mock'
import {
  cohortDisclosureNote,
  suppressedCohorts,
  visibleCohorts,
} from '@/database/insights'

const TABS: CourseTab[] = [
  { label: 'Curriculum', to: '/teacher/objectives' },
  { label: 'Insights', to: '/teacher/class-picture' },
  { label: 'Assessments', to: '/teacher/paper-builder' },
  { label: 'Settings', to: '/teacher/policies' },
]

// The clusters come from the shared table, not from a copy kept here. This
// page used to declare its own three rows with different titles and different
// sources from the seeded ones, so "the same" misconception read differently
// depending on which screen you were looking at.
//
// They are then filtered through the small-cohort rule, which is the whole
// point: the footnote below has always promised that patterns under five
// students are withheld, and until `insights.ts` existed nothing did the
// withholding.
const clusters = visibleCohorts(misconceptionClusters)
const withheld = suppressedCohorts(misconceptionClusters).length

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 border border-board bg-surface rounded-control px-4 py-2.5 font-mono text-[12px] text-board">
      <CheckCircle2 size={14} />
      {message}
    </div>
  )
}

export default function ClassPicture() {
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <CourseShell
      role="teacher"
      active="insights"
      tabs={TABS}
      activeTab="Insights"
      header={
        <div className="mx-auto w-full max-w-[1100px] px-8 pt-10 pb-6">
          {/* Header */}
          <h1 className="font-serif text-[32px] text-ink">Class picture</h1>
          <div className="mt-2 flex items-center gap-3 font-mono text-[12px] text-ink-muted">
            <span>MATH AA HL</span>
            <span aria-hidden="true">·</span>
            <span>Unit 2</span>
            <span aria-hidden="true">·</span>
            <span>30 students</span>
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[1100px] px-8 pt-8 pb-16">
        {/* Coverage panel */}
        <section className="mt-10">
          <h2 className="font-serif text-[24px] text-ink">Coverage of unit objectives</h2>
          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Objective</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Students (30)</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Taught</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((row, i) => (
                <tr key={row.code} className="border-b border-rule">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[12px] text-ink-muted w-3">{i + 1}</span>
                      <span className="font-mono text-[12px] text-ink-muted w-10">{row.code}</span>
                      <span className="text-[14px] text-ink">{row.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <SegmentBar filled={row.taught} total={row.total} size={9} segmentGap={2} />
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-[12px] text-ink whitespace-nowrap">
                    {row.taught} / {row.total}
                  </td>
                  <td className="py-3.5">
                    {row.status === 'taught' ? (
                      <span className="inline-flex items-center gap-1.5 text-[14px] text-board">
                        <CheckCircle2 size={15} /> Taught
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted">
                        <Clock3 size={15} /> Planned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Misconceptions panel */}
        <section className="mt-12">
          <h2 className="font-serif text-[24px] text-mark">What's going wrong</h2>
          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Misconception</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Students</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Source (where seen)</th>
                <th className="py-2 text-left font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((c, i) => (
                <tr key={c.id} className="border-b border-rule">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-mark text-surface font-mono text-[12px] flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[14px] font-medium text-ink">{c.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-[14px] text-mark">{c.flags}</td>
                  <td className="py-3.5 pr-4 font-mono text-[12px] text-ink">{c.source ?? '—'}</td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setToast('Added to generation queue')}
                        className="inline-flex items-center gap-1.5 border border-rule rounded-control bg-surface px-3 py-1.5 text-[12px] text-ink hover:border-board hover:text-board transition-colors duration-[120ms] ease-out"
                      >
                        <FilePlus2 size={13} /> Generate practice
                      </button>
                      <button
                        type="button"
                        onClick={() => setToast('Added to mock blueprint')}
                        className="inline-flex items-center gap-1.5 border border-mark/50 rounded-control bg-surface px-3 py-1.5 text-[12px] text-mark hover:bg-mark-tint transition-colors duration-[120ms] ease-out"
                      >
                        <Plus size={13} /> Add to mock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[12px] text-ink-muted">
            {cohortDisclosureNote()}
            {withheld > 0 ? (
              <>
                {' '}
                <span className="text-ink">
                  {withheld} pattern{withheld === 1 ? ' is' : 's are'} withheld here for that
                  reason.
                </span>
              </>
            ) : null}
          </p>
        </section>

        <SectionTag className="mt-16">Class picture</SectionTag>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </CourseShell>
  )
}
