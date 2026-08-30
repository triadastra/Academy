// Library — route /teacher/library (ref syn_p23.png).
// Dark-green rail w/ "Synonance for SHSID" + course selector, filter chips,
// documents table with mono objective chips and status chips.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Upload, FileText, ListOrdered, Lock,
  CircleCheck, Clock, ChevronDown,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Crest from '@/components/Crest'
import { libraryDocs } from '@/data/mock'
import type { LibraryDoc } from '@/data/mock'

const FILTERS = ['All', 'Reviewed', 'Needs review', 'Locked'] as const
type Filter = (typeof FILTERS)[number]

function matches(doc: LibraryDoc, f: Filter) {
  if (f === 'All') return true
  if (f === 'Reviewed') return doc.status === 'reviewed'
  if (f === 'Needs review') return doc.status === 'needs_review'
  return doc.status === 'locked'
}

function DocIcon({ doc }: { doc: LibraryDoc }) {
  const cls = 'text-ink-muted'
  if (doc.status === 'locked') return <Lock size={18} className={cls} />
  if (doc.kind === 'problem_set') return <ListOrdered size={18} className={cls} />
  return <FileText size={18} className={cls} />
}

function StatusChip({ doc }: { doc: LibraryDoc }) {
  if (doc.status === 'reviewed') {
    return (
      <span className="inline-flex items-center gap-1.5 border border-board text-board rounded-chip px-2.5 py-1 text-[12px]">
        <CircleCheck size={13} /> Reviewed
      </span>
    )
  }
  if (doc.status === 'locked') {
    return (
      <span className="inline-flex items-center gap-1.5 border border-mark text-mark rounded-chip px-2.5 py-1 text-[12px]">
        <Lock size={13} /> Locked until 14 Oct
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-[#B07A2A] text-[#B07A2A] rounded-chip px-2.5 py-1 text-[12px]">
      <Clock size={13} /> Needs review
    </span>
  )
}

export default function Library() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('All')
  const rows = libraryDocs.filter((d) => matches(d, filter))

  return (
    <CourseShell role="teacher" active="library">
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 h-14 border-b border-rule bg-surface">
          <button type="button" className="flex items-center gap-1.5 font-mono text-[13px] text-ink">
            MATH AA HL <ChevronDown size={14} className="text-ink-muted" />
          </button>
          <div className="flex items-center gap-2.5">
            <Crest size={28} tone="dark" />
            <div className="text-right leading-tight">
              <div className="text-[12px] font-medium">Shanghai High School</div>
              <div className="text-[12px] text-ink-muted">International Division</div>
            </div>
          </div>
        </header>

        <div className="px-8 py-6 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[32px] leading-tight">Library</h1>
              <div className="mt-3 flex items-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={
                      f === filter
                        ? 'px-3 py-1 rounded-chip text-[12px] bg-board text-paper border border-board'
                        : 'px-3 py-1 rounded-chip text-[12px] bg-surface text-ink-muted border border-rule hover:border-ink-muted transition-colors duration-[120ms] ease-out'
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/teacher/upload')}
              className="flex items-center gap-2 bg-board text-paper rounded-control px-4 py-2 text-[14px] font-medium hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              <Upload size={15} /> Upload
            </button>
          </div>

          {/* Table */}
          <div className="mt-6 border border-rule rounded-card bg-surface overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[12px] text-ink-muted">
                  <th className="font-normal px-4 py-2.5">Name</th>
                  <th className="font-normal px-4 py-2.5">Kind</th>
                  <th className="font-normal px-4 py-2.5">Pages</th>
                  <th className="font-normal px-4 py-2.5">Objectives</th>
                  <th className="font-normal px-4 py-2.5">Tags</th>
                  <th className="font-normal px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => doc.status === 'needs_review' && navigate('/teacher/tag-review')}
                    className={`border-b border-rule last:border-b-0 ${doc.status === 'needs_review' ? 'cursor-pointer hover:bg-board-tint/40' : ''} transition-colors duration-[120ms] ease-out`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <DocIcon doc={doc} />
                        <span className="text-[14px]">{doc.title.replace(' — ', ' - ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-muted">{doc.kind}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px]">{doc.pages}</td>
                    <td className="px-4 py-3.5">
                      {doc.status === 'locked' || doc.objectives.length === 0 ? (
                        <span className="text-ink-muted text-[13px]">—</span>
                      ) : (
                        <span className="flex gap-1.5">
                          {doc.objectives.map((o) => (
                            <span key={o} className="font-mono text-[12px] border border-rule rounded-chip px-1.5 py-0.5">{o}</span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {doc.status === 'needs_review' ? (
                        <span className="font-mono text-[12px] border border-rule rounded-chip px-1.5 py-0.5">6 tags</span>
                      ) : (
                        <span className="text-ink-muted text-[13px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><StatusChip doc={doc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <footer className="px-8 py-3 flex items-center justify-between font-mono text-[11px] text-ink-muted/60 uppercase tracking-[0.08em]">
          <span>Library</span><span>18 / 24</span>
        </footer>
      </main>
    </CourseShell>
  )
}
