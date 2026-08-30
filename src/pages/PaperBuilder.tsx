// PaperBuilder.tsx — route /teacher/paper-builder (ref syn_p19.png).
// Mock paper builder: blueprint panel (stat chips, coverage bars, SVG
// difficulty sparkline, signature "Weight to gaps" slider that live-remixes
// the 12-item paper list) + paper table + constraint checks.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  Check,
  Eye,
  Download,
  Save,
  RefreshCw,
  FileText,
  Target,
  Clock,
  Layers,

} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import type { CourseTab } from '@/components/CourseShell'
import SegmentBar from '@/components/SegmentBar'

// ── Data ───────────────────────────────────────────────────────────────────
type Format = 'MCQ' | 'SAQ' | 'FRQ'

interface PaperItem {
  id: number
  title: string
  code: string
  format: Format
  marks: number
  difficulty: number // 0-5
  strand: string // blueprint strand key
}

const BASE_ITEMS: PaperItem[] = [
  { id: 1, title: 'Expand and simplify expressions', code: 'M10-2.1.1', format: 'MCQ', marks: 5, difficulty: 1, strand: '2.1' },
  { id: 2, title: 'Solve linear equation (one step)', code: 'M10-2.1.2', format: 'MCQ', marks: 5, difficulty: 1, strand: '2.1' },
  { id: 3, title: 'Factorise quadratic expressions', code: 'M10-2.1.3', format: 'MCQ', marks: 5, difficulty: 2, strand: '2.1' },
  { id: 4, title: 'Solve simultaneous equations', code: 'M10-2.2.1', format: 'SAQ', marks: 5, difficulty: 3, strand: '2.2' },
  { id: 5, title: 'Solve linear inequalities', code: 'M10-2.2.2', format: 'MCQ', marks: 5, difficulty: 2, strand: '2.2' },
  { id: 6, title: 'Graph linear inequality in two variables', code: 'M10-2.2.3', format: 'SAQ', marks: 5, difficulty: 3, strand: '2.2' },
  { id: 7, title: 'Angle properties in triangles', code: 'M10-2.3.1', format: 'MCQ', marks: 5, difficulty: 3, strand: '2.3' },
  { id: 8, title: 'Solve problems with similarity', code: 'M10-2.3.2', format: 'SAQ', marks: 5, difficulty: 4, strand: '2.3' },
  { id: 9, title: 'Area of composite shapes', code: 'M10-2.3.3', format: 'FRQ', marks: 5, difficulty: 4, strand: '2.3' },
  { id: 10, title: 'Interpret data from tables', code: 'M10-2.4.1', format: 'MCQ', marks: 5, difficulty: 2, strand: '2.4' },
  { id: 11, title: 'Calculate mean and median', code: 'M10-2.4.2', format: 'SAQ', marks: 5, difficulty: 3, strand: '2.4' },
  { id: 12, title: 'Two-way tables and probability', code: 'M10-2.4.3', format: 'FRQ', marks: 5, difficulty: 5, strand: '2.4' },
]

const STRANDS = [
  { key: '2.1', label: '2.1 Algebra and Functions' },
  { key: '2.2', label: '2.2 Equations and Inequalities' },
  { key: '2.3', label: '2.3 Geometry and Measure' },
  { key: '2.4', label: '2.4 Statistics and Probability' },
]

const DIFF_LABELS = ['Very easy', 'Easy', 'Medium', 'Hard', 'Very hard']

// Simulated cohort gap per strand (gap signal the slider weights toward)
const GAP_WEIGHT: Record<string, number> = { '2.1': 0.2, '2.2': 0.5, '2.3': 0.9, '2.4': 0.7 }

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper font-mono text-[12px] px-4 py-2 rounded-control flex items-center gap-2">
      <Check size={14} className="text-board-tint" />
      {message}
    </div>
  )
}

function FormatChip({ format }: { format: Format }) {
  const styles: Record<Format, string> = {
    MCQ: 'bg-board-tint text-board',
    SAQ: 'bg-paper text-ink border border-rule',
    FRQ: 'bg-mark-tint/60 text-mark',
  }
  return (
    <span className={`font-mono text-[12px] px-1.5 py-0.5 rounded-chip ${styles[format]}`}>
      {format}
    </span>
  )
}

export default function PaperBuilder() {
  const [weight, setWeight] = useState(70) // 0 balance → 100 gaps
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Live remix: score each item by difficulty × strand gap weight, then
  // re-sort by the blend of natural order (balance) and gap score (gaps).
  const items = useMemo(() => {
    const t = weight / 100
    return [...BASE_ITEMS]
      .map((it, naturalIdx) => ({
        ...it,
        score: (1 - t) * (BASE_ITEMS.length - naturalIdx) * 0.6 +
          t * (it.difficulty * GAP_WEIGHT[it.strand] * 10 + (BASE_ITEMS.length - naturalIdx) * 0.15),
      }))
      .sort((a, b) => b.score - a.score)
  }, [weight])

  // Coverage: % of marks per strand (remix shifts composition slightly)
  const coverage = useMemo(() => {
    const counts: Record<string, number> = { '2.1': 0, '2.2': 0, '2.3': 0, '2.4': 0 }
    // Keep 12 items but weight coverage display by gap emphasis
    items.forEach((it) => {
      counts[it.strand] += it.marks
    })
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const t = weight / 100
    return STRANDS.map((s) => {
      const base = (counts[s.key] / total) * 100
      const adjusted = base * (1 - t) + base * (1 + (GAP_WEIGHT[s.key] - 0.5) * 0.3) * t
      return { ...s, pct: Math.round(adjusted) }
    })
  }, [items, weight])

  // Difficulty curve: % of marks per difficulty band
  const curve = useMemo(() => {
    const bands = [0, 0, 0, 0, 0]
    items.forEach((it) => {
      bands[it.difficulty - 1] += it.marks
    })
    const total = bands.reduce((a, b) => a + b, 0)
    return bands.map((b) => Math.round((b / total) * 100))
  }, [items])

  // SVG sparkline geometry
  const W = 380
  const H = 150
  const padL = 34
  const padB = 26
  const padT = 18
  const maxPct = 40
  const px = (i: number) => padL + (i * (W - padL - 12)) / 4
  const py = (v: number) => padT + (1 - v / maxPct) * (H - padT - padB)

  const TABS: CourseTab[] = [
    { label: 'Dashboard', to: '/teacher/class-picture' },
    { label: 'Curriculum', to: '/teacher/objectives' },
    { label: 'Item Bank', to: '/teacher/review' },
    { label: 'Paper Builder', to: '/teacher/paper-builder' },
    { label: 'Reports', to: '/teacher/class-picture' },
  ]

  return (
    <CourseShell
      role="teacher"
      active="paper-builder"
      tabs={TABS}
      activeTab="Paper Builder"
      header={
      <div className="px-6 pt-5 pb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-control bg-board-tint text-board flex items-center justify-center">
            <FileText size={17} />
          </span>
          <div>
            <h1 className="font-serif text-[24px] text-ink leading-tight">Mock Paper Builder</h1>
            <p className="font-mono text-[12px] text-ink-muted mt-0.5">
              Curriculum: SHSID Mathematics&nbsp;&nbsp;|&nbsp;&nbsp;Assessment: Mock Exam
              2&nbsp;&nbsp;|&nbsp;&nbsp;Version: <span className="text-board">v3 (Draft)</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => showToast('Draft saved — version v3 (Draft).')}
            className="flex items-center gap-2 border border-rule bg-surface text-ink text-[14px] px-3.5 py-2 rounded-control hover:border-ink-muted transition-colors duration-[120ms] ease-out"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            type="button"
            onClick={() => {
              setWeight((w) => (w >= 50 ? 30 : 70))
              showToast('Paper rebalanced against blueprint.')
            }}
            className="flex items-center gap-2 border border-rule bg-surface text-ink text-[14px] px-3.5 py-2 rounded-control hover:border-ink-muted transition-colors duration-[120ms] ease-out"
          >
            <RefreshCw size={14} /> Rebalance
          </button>
          <button
            type="button"
            onClick={() => showToast('Paper approved. Status set to Approved.')}
            className="flex items-center gap-2 bg-board text-paper text-[14px] px-3.5 py-2 rounded-control hover:bg-board-deep transition-colors duration-[120ms] ease-out"
          >
            <Check size={15} strokeWidth={3} /> Approve Paper
          </button>
        </div>
      </div>

      }
    >
      {/* Panels */}
      <div className="px-6 mt-5 grid grid-cols-[minmax(360px,5fr)_7fr] gap-5 flex-1">
        {/* Blueprint */}
        <section className="bg-surface border border-rule rounded-card p-5 self-start">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-board" />
            <h2 className="text-[18px] font-medium text-ink">Blueprint</h2>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="border border-rule rounded-control p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Target size={12} /> Total marks
              </div>
              <div className="font-serif text-[24px] text-ink leading-tight mt-1">60</div>
            </div>
            <div className="border border-rule rounded-control p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Clock size={12} /> Time estimate
              </div>
              <div className="font-serif text-[24px] text-ink leading-tight mt-1">75 min</div>
            </div>
            <div className="border border-rule rounded-control p-3">
              <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Layers size={12} /> Format mix
              </div>
              <div className="font-mono text-[12px] text-ink mt-1.5">MCQ 50% | SAQ 30% | FRQ 20%</div>
            </div>
          </div>

          {/* Curriculum coverage */}
          <h3 className="text-[14px] font-medium text-ink mt-6">Curriculum coverage</h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {coverage.map((c) => (
              <div key={c.key} className="grid grid-cols-[190px_1fr_36px] items-center gap-3">
                <span className="text-[12px] text-ink">{c.label}</span>
                <span className="relative h-[8px] bg-paper border border-rule rounded-chip overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 bg-board transition-all duration-[120ms] ease-out"
                    style={{ width: `${c.pct}%` }}
                  />
                </span>
                <span className="font-mono text-[12px] text-ink-muted text-right">{c.pct}%</span>
              </div>
            ))}
            <div className="flex justify-between font-mono text-[12px] text-ink-muted pl-[203px]">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Difficulty curve */}
          <h3 className="text-[14px] font-medium text-ink mt-6">
            Difficulty curve{' '}
            <span className="font-mono text-[12px] text-ink-muted font-normal">
              (by % of marks)
            </span>
          </h3>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="mt-2 w-full"
            role="img"
            aria-label="Difficulty distribution"
          >
            {[0, 10, 20, 30, 40].map((v) => (
              <g key={v}>
                <line
                  x1={padL}
                  x2={W - 12}
                  y1={py(v)}
                  y2={py(v)}
                  stroke="#D6DCD9"
                  strokeWidth={v === 0 ? 1.5 : 0.75}
                />
                <text x={padL - 5} y={py(v) + 3.5} textAnchor="end" fontSize={9} fill="#5A6461" fontFamily="'JetBrains Mono', monospace">
                  {v}%
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              stroke="#2F5D50"
              strokeWidth={2}
              points={curve.map((v, i) => `${px(i)},${py(v)}`).join(' ')}
            />
            {curve.map((v, i) => (
              <g key={i}>
                <circle cx={px(i)} cy={py(v)} r={3} fill="#2F5D50" />
                <text
                  x={px(i)}
                  y={py(v) - 7}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#16191A"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {v}%
                </text>
                <text
                  x={px(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#5A6461"
                >
                  {DIFF_LABELS[i]}
                </text>
              </g>
            ))}
          </svg>

          {/* Weight to gaps — signature control */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-ink">Weight to gaps</h3>
              <span className="font-mono text-[12px] text-board border border-rule rounded-chip px-1.5 py-0.5">
                {weight}%
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[12px] text-ink-muted shrink-0">Focus on balance</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                aria-label="Weight to gaps"
                className="flex-1 accent-board h-[6px] cursor-pointer"
              />
              <span className="text-[12px] text-ink shrink-0">Focus on gaps</span>
            </div>
          </div>
        </section>

        {/* Paper */}
        <section className="bg-surface border border-rule rounded-card self-start flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-rule">
            <h2 className="text-[18px] font-medium text-ink">Paper</h2>
            <span className="font-mono text-[12px] text-ink-muted">
              12 items&nbsp;&nbsp;|&nbsp;&nbsp;60 marks&nbsp;&nbsp;|&nbsp;&nbsp;75 min
            </span>
          </div>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-muted border-b border-rule">
                <th className="px-4 py-2 font-normal w-8">#</th>
                <th className="px-2 py-2 font-normal">Item</th>
                <th className="px-2 py-2 font-normal">Objective code</th>
                <th className="px-2 py-2 font-normal">Format</th>
                <th className="px-2 py-2 font-normal">Marks</th>
                <th className="px-4 py-2 font-normal">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr
                  key={it.id}
                  className="border-b border-rule last:border-b-0 transition-all duration-[120ms] ease-out hover:bg-paper/60"
                >
                  <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">{i + 1}</td>
                  <td className="px-2 py-2.5 text-ink">{it.title}</td>
                  <td className="px-2 py-2.5 font-mono text-[12px] text-ink">{it.code}</td>
                  <td className="px-2 py-2.5">
                    <FormatChip format={it.format} />
                  </td>
                  <td className="px-2 py-2.5 font-mono text-[12px] text-ink">{it.marks}</td>
                  <td className="px-4 py-2.5">
                    <SegmentBar filled={it.difficulty} size={8} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Constraint checks + actions */}
      <footer className="mx-6 my-5 bg-surface border border-rule rounded-card px-5 py-3.5 flex items-center gap-8">
        {[
          { title: 'Coverage OK', sub: 'All strands within 20–30%' },
          { title: 'Marks 60/60 OK', sub: 'Total marks match target' },
          { title: 'Difficulty curve OK', sub: 'Distribution within acceptable range' },
        ].map((c) => (
          <div key={c.title} className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-board text-paper flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </span>
            <div>
              <div className="text-[14px] font-medium text-board leading-tight">{c.title}</div>
              <div className="text-[12px] text-ink-muted leading-tight">{c.sub}</div>
            </div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            to="/teacher/paper-preview"
            className="flex items-center gap-2 border border-rule bg-surface text-ink text-[14px] px-3.5 py-2 rounded-control hover:border-ink-muted transition-colors duration-[120ms] ease-out"
          >
            <Eye size={14} /> Preview
          </Link>
          {/* Exporting means rendering the assembled paper and printing it,
              and the preview is where the paper is rendered — so this goes
              there and prints on arrival rather than claiming, as it used to,
              that "mock_paper_v3.pdf will download shortly" and producing
              nothing. */}
          <Link
            to="/teacher/paper-preview?print=1"
            className="flex items-center gap-2 bg-board text-paper text-[14px] px-3.5 py-2 rounded-control hover:bg-board-deep transition-colors duration-[120ms] ease-out"
          >
            <Download size={14} /> Export PDF
          </Link>
        </div>
      </footer>

      {toast ? <Toast message={toast} /> : null}
    </CourseShell>
  )
}
