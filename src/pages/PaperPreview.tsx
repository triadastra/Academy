// PaperPreview.tsx — route /teacher/paper-preview (ref syn_p20.png).
// A4-style exam paper page with serif header, instructions, 4 KaTeX
// questions, END OF PAGE; right export panel with checkboxes, draft status
// card and export-package toast.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Bell,
  ChevronDown,
  Download,
  ArrowLeft,
  Check,
  Inbox,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import type { CourseTab } from '@/components/CourseShell'
import Tex from '@/components/Tex'

const EXPORT_OPTIONS = [
  { key: 'student-paper', title: 'Student paper', sub: 'The exam paper for students' },
  { key: 'mark-scheme', title: 'Mark scheme', sub: 'Worked solutions and marking notes' },
  { key: 'objective-map', title: 'Objective map', sub: 'Assessment objectives coverage' },
  { key: 'provenance', title: 'Item provenance', sub: 'Source and usage information' },
]

const TABS: CourseTab[] = [
  { label: 'Overview', to: '/teacher/class-picture' },
  { label: 'Builder', to: '/teacher/paper-builder' },
  { label: 'Preview & Export', to: '/teacher/paper-preview' },
  { label: 'Responses (0)', to: '/teacher/paper-preview?tab=responses' },
  { label: 'Analytics', to: '/teacher/class-picture' },
]

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper font-mono text-[12px] px-4 py-2 rounded-control flex items-center gap-2">
      <Check size={14} className="text-board-tint" />
      {message}
    </div>
  )
}

export default function PaperPreview() {
  const [searchParams] = useSearchParams()
  const responsesView = searchParams.get('tab') === 'responses'
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(EXPORT_OPTIONS.map((o) => [o.key, true])),
  )
  const [zoom, setZoom] = useState(100)
  const [page, setPage] = useState(1)
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

  // Arriving from "Export PDF" in the builder opens the print dialog straight
  // away, so the export is one click there rather than two. A frame is given
  // first: printing before the sheet — KaTeX included — has laid out produces
  // a blank or half-rendered page.
  const printOnArrival = searchParams.get('print') === '1'
  useEffect(() => {
    if (!printOnArrival) return
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [printOnArrival])

  return (
    <CourseShell
      role="teacher"
      active="paper-builder"
      tabs={TABS}
      activeTab={responsesView ? 'Responses (0)' : 'Preview & Export'}
      header={
        <>
          {/* Top breadcrumb bar */}
      <div className="bg-surface border-b border-rule px-6 py-2.5 flex items-center gap-2 font-mono text-[12px] text-ink-muted">
        {['Curriculum', 'DP', 'Mathematics', 'Analysis and Approaches HL', 'Unit 2', 'Mock Paper'].map(
          (c, i, arr) => (
            <span key={c} className="flex items-center gap-2">
              <span className={i === arr.length - 1 ? 'text-ink' : 'hover:text-ink cursor-pointer transition-colors duration-[120ms] ease-out'}>
                {c}
              </span>
              {i < arr.length - 1 ? <span className="text-rule">›</span> : null}
            </span>
          ),
        )}
        <div className="ml-auto flex items-center gap-3">
          <button type="button" className="relative text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out">
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-mark" />
          </button>
          <span className="w-7 h-7 rounded-full bg-board text-paper font-mono text-[12px] flex items-center justify-center">
            TC
          </span>
          <span className="text-[14px] font-sans text-ink flex items-center gap-1">
            Teacher Chen <ChevronDown size={13} className="text-ink-muted" />
          </span>
        </div>
      </div>

        </>
      }
    >
      <div className="flex">
        {/* Center */}
        <div className="flex-1 min-w-0 px-8 py-6">
          <h1 className="font-serif text-[32px] text-ink leading-tight">Unit 2 Mock Paper</h1>

          {responsesView ? (
            <div className="mt-6 border border-dashed border-rule rounded-card bg-surface px-10 py-16 text-center">
              <Inbox size={28} className="mx-auto text-ink-muted" />
              <h2 className="mt-4 font-serif text-[24px] text-ink">No responses yet</h2>
              <p className="mt-2 text-[14px] text-ink-muted">
                Student responses will appear here once the paper is published and students start
                submitting.
              </p>
            </div>
          ) : (
          <>
          {/* PDF toolbar */}
          <div className="mt-4 flex items-center gap-1 bg-surface border border-rule rounded-control px-2 py-1.5 w-fit">
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(6, p + 1))}
              className="p-1 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              <ChevronDownIcon size={15} />
            </button>
            <span className="font-mono text-[12px] text-ink px-2">{page} / 6</span>
            <span className="w-px h-4 bg-rule mx-1" />
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
              className="p-1 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              <ZoomIn size={15} />
            </button>
            <span className="font-mono text-[12px] text-ink px-2">{zoom}%</span>
            <span className="w-px h-4 bg-rule mx-1" />
            <button
              type="button"
              aria-label="Download as PDF"
              // A real export: the browser's print-to-PDF over the sheet
              // above. This used to raise a toast claiming a download had
              // started and then do nothing at all.
              onClick={() => window.print()}
              className="p-1 text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              <Download size={15} />
            </button>
          </div>

          {/* A4 page */}
          <div
            className="print-sheet mt-4 bg-white border border-rule rounded-card mx-auto"
            style={{
              width: `${(zoom / 100) * 620}px`,
              maxWidth: '100%',
              transition: 'width 120ms ease-out',
            }}
          >
            <div className="px-10 py-8 text-ink">
              <div className="text-center">
                <div className="font-serif text-[13px] tracking-[0.12em]">
                  SHANGHAI HIGH SCHOOL INTERNATIONAL DIVISION
                </div>
                <div className="font-serif text-[16px] font-medium mt-2 tracking-[0.04em]">
                  MATHEMATICS: ANALYSIS AND APPROACHES HL
                </div>
                <div className="font-serif text-[16px] font-medium tracking-[0.04em]">
                  UNIT 2 MOCK PAPER
                </div>
              </div>

              <div className="flex justify-between mt-4 pt-2 border-t border-rule text-[12px] font-serif">
                <span>Time allowed: 75 minutes</span>
                <span>Total marks: 100</span>
              </div>

              <div className="mt-4 pt-3 border-t border-rule">
                <div className="font-serif text-[13px] font-medium italic">
                  Instructions to candidates
                </div>
                <ul className="mt-1.5 flex flex-col gap-0.5 text-[12px] font-serif list-disc pl-5">
                  <li>Do not open this paper until instructed to do so.</li>
                  <li>Answer all questions.</li>
                  <li>
                    Show all necessary working. Answers without working may not gain full credit.
                  </li>
                  <li>Give exact answers where appropriate.</li>
                  <li>The use of a calculator is permitted unless otherwise stated.</li>
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-rule flex flex-col gap-5">
                {/* Q1 */}
                <div className="flex gap-3">
                  <span className="font-serif text-[13px] w-5 shrink-0">1.</span>
                  <div className="flex-1">
                    <p className="font-serif text-[13px] leading-relaxed">
                      Find the derivative of{' '}
                      <Tex>{'y = \\ln(x^2 + 1)'}</Tex> and hence find the equation of the tangent
                      to the curve at the point where <Tex>{'x = 1'}</Tex>.
                    </p>
                    <div className="text-right font-serif text-[12px] text-ink-muted mt-1">
                      [25 marks]
                    </div>
                  </div>
                </div>
                {/* Q2 */}
                <div className="flex gap-3">
                  <span className="font-serif text-[13px] w-5 shrink-0">2.</span>
                  <div className="flex-1">
                    <p className="font-serif text-[13px] leading-relaxed">
                      Evaluate the integral{' '}
                      <Tex>{'\\int \\left( 2x^3 - \\frac{1}{x} + e^{x} \\right) dx'}</Tex>.
                    </p>
                    <div className="text-right font-serif text-[12px] text-ink-muted mt-1">
                      [25 marks]
                    </div>
                  </div>
                </div>
                {/* Q3 */}
                <div className="flex gap-3">
                  <span className="font-serif text-[13px] w-5 shrink-0">3.</span>
                  <div className="flex-1">
                    <p className="font-serif text-[13px] leading-relaxed">
                      The function <Tex>{'f(x) = x^3 - 3x^2 + 2'}</Tex>.
                    </p>
                    <p className="font-serif text-[13px] leading-relaxed mt-1 pl-4">
                      (a)&nbsp;&nbsp;Find the stationary points of <Tex>{'f'}</Tex>.
                    </p>
                    <p className="font-serif text-[13px] leading-relaxed mt-1 pl-4">
                      (b)&nbsp;&nbsp;Determine the nature of each stationary point.
                    </p>
                    <div className="text-right font-serif text-[12px] text-ink-muted mt-1">
                      [25 marks]
                    </div>
                  </div>
                </div>
                {/* Q4 */}
                <div className="flex gap-3">
                  <span className="font-serif text-[13px] w-5 shrink-0">4.</span>
                  <div className="flex-1">
                    <p className="font-serif text-[13px] leading-relaxed">
                      Solve the differential equation{' '}
                      <Tex>{'\\frac{dy}{dx} = 2y + e^{x}'}</Tex>, given that{' '}
                      <Tex>{'y = 0'}</Tex> when <Tex>{'x = 0'}</Tex>.
                    </p>
                    <div className="text-right font-serif text-[12px] text-ink-muted mt-1">
                      [25 marks]
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center font-serif text-[12px] tracking-[0.15em] text-ink mt-8 pb-2">
                END OF PAGE
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Export panel */}
        <aside className="w-[320px] shrink-0 border-l border-rule bg-surface px-5 py-6 self-start sticky top-0">
          <h2 className="text-[18px] font-medium text-ink">Export</h2>
          <p className="text-[12px] text-ink-muted mt-1">
            Select the components to include in your export package.
          </p>

          <div className="mt-4 flex flex-col gap-3.5">
            {EXPORT_OPTIONS.map((o) => (
              <label key={o.key} className="flex items-start gap-2.5 cursor-pointer">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked[o.key]}
                  onClick={() => setChecked((c) => ({ ...c, [o.key]: !c[o.key] }))}
                  className={
                    checked[o.key]
                      ? 'w-4 h-4 mt-0.5 rounded-chip bg-board text-paper flex items-center justify-center shrink-0 transition-colors duration-[120ms] ease-out'
                      : 'w-4 h-4 mt-0.5 rounded-chip bg-surface border border-rule shrink-0 transition-colors duration-[120ms] ease-out'
                  }
                >
                  {checked[o.key] ? <Check size={11} strokeWidth={3} /> : null}
                </button>
                <span>
                  <span className="block text-[14px] font-medium text-ink leading-tight">
                    {o.title}
                  </span>
                  <span className="block text-[12px] text-ink-muted leading-snug mt-0.5">
                    {o.sub}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-5 border-t border-rule pt-4">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-mark mt-1.5 shrink-0" />
              <div>
                <div className="text-[14px] font-medium text-mark leading-tight">
                  Draft – teacher approval required
                </div>
                <div className="text-[12px] text-ink-muted leading-snug mt-1">
                  This assessment is a draft and requires teacher approval before publication.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => showToast('Export package generated — unit2_mock_package.zip.')}
              className="flex items-center justify-center gap-2 bg-board text-paper text-[14px] px-4 py-2.5 rounded-control hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              <Download size={14} /> Export package
            </button>
            <Link
              to="/teacher/paper-builder"
              className="flex items-center justify-center gap-2 border border-rule bg-surface text-ink text-[14px] px-4 py-2.5 rounded-control hover:border-ink-muted transition-colors duration-[120ms] ease-out"
            >
              <ArrowLeft size={14} /> Back to builder
            </Link>
            <p className="text-[12px] text-ink-muted mt-1">
              Exports are generated in PDF format.
            </p>
          </div>
        </aside>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </CourseShell>
  )
}
