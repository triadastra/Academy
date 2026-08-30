// Upload / ingestion — route /teacher/upload (ref syn_p24.png).
// 7-step ingestion timeline with failed OCR quality step; right OCR quality
// panel with 68% confidence bar, alert card, and low-quality explainer.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  FileText, CircleCheck, TriangleAlert, Clock, ChevronRight,
  FileWarning, Upload as UploadIcon,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Tex from '@/components/Tex'

type StepState = 'complete' | 'attention' | 'waiting'
interface Step {
  title: string
  desc: string
  state: StepState
  time?: string
  statusLabel: string
}
const STEPS: Step[] = [
  { title: 'Upload', desc: 'File uploaded successfully.', state: 'complete', time: '10:42 AM', statusLabel: 'Complete' },
  { title: 'Virus scan', desc: 'File scanned and no threats detected.', state: 'complete', time: '10:42 AM', statusLabel: 'Complete' },
  { title: 'Extract text', desc: 'Text extracted from digital content.', state: 'complete', time: '10:43 AM', statusLabel: 'Complete' },
  { title: 'OCR quality', desc: 'Attention required', state: 'attention', time: '10:45 AM', statusLabel: 'Attention' },
  { title: 'Chunk and index', desc: 'Waiting to start.', state: 'waiting', statusLabel: 'Waiting' },
  { title: 'Objective tags', desc: 'Waiting to start.', state: 'waiting', statusLabel: 'Waiting' },
  { title: 'Teacher review', desc: 'Waiting to start.', state: 'waiting', statusLabel: 'Waiting' },
]

export default function Upload() {
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <CourseShell role="teacher" active="library">
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-8 h-14 border-b border-rule bg-surface">
          <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            Documents <ChevronRight size={13} /> <span className="text-ink">Ingestion</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-board-tint text-board font-mono text-[12px] flex items-center justify-center">TC</span>
            <div className="leading-tight">
              <div className="text-[13px] font-medium">Mr. Chen</div>
              <div className="text-[11px] text-ink-muted">Teacher</div>
            </div>
            <ChevronRight size={14} className="rotate-90 text-ink-muted" />
          </div>
        </header>

        <div className="flex-1 px-8 py-6 grid grid-cols-[1fr_320px] gap-8 items-start">
          {/* Center */}
          <div>
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 border border-rule rounded-control bg-surface flex items-center justify-center shrink-0">
                <FileText size={22} className="text-mark" />
              </span>
              <div>
                <h1 className="font-serif text-[28px] leading-tight">Lecture 8 - Applications.pdf</h1>
                <div className="mt-1 font-mono text-[12px] text-ink-muted">PDF · 12.4 MB · 26 pages</div>
                <div className="mt-0.5 text-[13px] text-ink-muted">Uploaded today, 10:42 AM by Mr. Chen</div>
              </div>
            </div>

            <div className="mt-8 font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">Ingestion progress</div>
            <ol className="mt-4">
              {STEPS.map((s, i) => {
                const failed = s.state === 'attention'
                const done = s.state === 'complete'
                return (
                  <li key={s.title} className="flex gap-4">
                    {/* timeline rail */}
                    <div className="flex flex-col items-center">
                      <span
                        className={
                          failed
                            ? 'w-7 h-7 rounded-full bg-mark text-paper text-[13px] font-medium flex items-center justify-center shrink-0'
                            : done
                              ? 'w-7 h-7 rounded-full bg-board text-paper text-[13px] font-medium flex items-center justify-center shrink-0'
                              : 'w-7 h-7 rounded-full border border-rule bg-surface text-ink-muted text-[13px] flex items-center justify-center shrink-0'
                        }
                      >
                        {i + 1}
                      </span>
                      {i < STEPS.length - 1 ? (
                        <span className={`w-px flex-1 min-h-[28px] ${failed || (done && STEPS[i + 1].state === 'attention') ? 'bg-mark' : done ? 'bg-board/40' : 'bg-rule'}`} />
                      ) : null}
                    </div>
                    <div className="flex-1 flex items-start justify-between pb-7">
                      <div>
                        <div className={`text-[14px] font-medium ${failed ? 'text-mark' : ''}`}>{s.title}</div>
                        <div className={`text-[13px] ${failed ? 'text-mark/80' : 'text-ink-muted'}`}>{s.desc}</div>
                      </div>
                      <div className="text-right shrink-0 pl-4">
                        <div className={`flex items-center justify-end gap-1.5 text-[13px] ${failed ? 'text-mark' : done ? 'text-board' : 'text-ink-muted'}`}>
                          {done ? <CircleCheck size={14} /> : failed ? <TriangleAlert size={14} /> : <Clock size={14} />}
                          {s.statusLabel}
                        </div>
                        {s.time ? <div className={`text-[12px] ${failed ? 'text-mark/70' : 'text-ink-muted'}`}>{s.time}</div> : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="text-[13px] text-ink-muted border-t border-rule pt-4">
              You will be notified when the document is ready for review.
            </p>
          </div>

          {/* Right panel */}
          <aside className="border border-rule rounded-card bg-surface p-5">
            <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">OCR quality</div>
            <div className="mt-3 text-[12px] text-ink-muted">OCR confidence</div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-[40px] leading-none text-board">68</span>
              <span className="text-[16px] text-ink-muted">%</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-rule rounded-chip overflow-hidden">
              <div className="h-full bg-board" style={{ width: '68%' }} />
            </div>

            <div className="mt-4 border border-mark bg-mark-tint/60 rounded-card p-4">
              <div className="flex gap-2">
                <TriangleAlert size={16} className="text-mark shrink-0 mt-0.5" />
                <div>
                  <div className="text-[13px] font-medium text-mark">Pages 4–9 below quality threshold</div>
                  <div className="mt-1 text-[12px] text-ink/80">These pages may contain inaccurate or missing text.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/teacher/tag-review')}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-board text-paper rounded-control px-3 py-2 text-[13px] font-medium hover:bg-board-deep transition-colors duration-[120ms] ease-out"
              >
                <FileWarning size={14} /> Review pages
              </button>
              <button
                type="button"
                onClick={() => showToast('Choose a replacement file to re-upload.')}
                className="mt-2 w-full flex items-center justify-center gap-2 border border-rule bg-surface rounded-control px-3 py-2 text-[13px] hover:border-ink-muted transition-colors duration-[120ms] ease-out"
              >
                <UploadIcon size={14} /> Re-upload
              </button>
            </div>

            <div className="mt-5">
              <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">Why is quality low?</div>
              <p className="mt-2 text-[12px] text-ink-muted leading-snug">
                The document contains low-contrast content that makes text recognition more difficult.
              </p>
              <div className="mt-2 text-[12px] text-ink-muted">Common issues detected:</div>
              <ul className="mt-1 text-[12px] text-ink-muted list-disc pl-4 space-y-0.5">
                <li>Light gray text on a white background</li>
                <li>Faint or thin mathematical symbols</li>
                <li>Low-contrast equations and notation</li>
              </ul>
              <div className="mt-3 text-[12px] text-ink-muted">Impact on equations:</div>
              <div className="mt-1 border border-rule rounded-control bg-paper px-3 py-2 text-[12px] text-ink-muted flex items-center gap-2 flex-wrap">
                <Tex>{"y'' + 2xy' + y = e^{x^2}"}</Tex>
                <span>→</span>
                <Tex>{"y'' + 2xy' + y = e^{x} \\times 2"}</Tex>
              </div>
              <p className="mt-2 text-[12px] text-ink-muted leading-snug">
                Thin symbols, superscripts, and subscripts may be misread or omitted.
              </p>
              <p className="mt-2 text-[12px] text-ink-muted leading-snug">
                Review the flagged pages to confirm accuracy before continuing.
              </p>
            </div>
          </aside>
        </div>

        <footer className="px-8 py-3 flex items-center justify-between font-mono text-[11px] text-ink-muted/60 uppercase tracking-[0.08em]">
          <span>Upload and processing</span><span>19 / 24</span>
        </footer>

        {toast ? (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-paper text-[13px] px-4 py-2 rounded-control z-50">
            {toast}
          </div>
        ) : null}
      </main>
    </CourseShell>
  )
}
