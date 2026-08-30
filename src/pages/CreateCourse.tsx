// CreateCourse — route /teacher/create-course (ref syn_p27.png).
// Top bar, Instrument Serif header, 4-step stepper, form with locked fields,
// About-the-objective-graph right panel.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Info, Lock, BookOpen, CircleCheck } from 'lucide-react'
import CourseShell from '@/components/CourseShell'

const STEPS = ['Course details', 'Curriculum', 'Sources', 'Review']

function Field({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid grid-cols-[180px_1fr] items-center gap-4 py-3 border-b border-rule">
      <span className="flex items-center gap-1.5 text-[14px] text-ink">
        {label} <Info size={13} className="text-ink-muted" />
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full border border-rule rounded-control bg-surface px-3 py-2 text-[14px] focus:outline-none focus:border-board transition-colors duration-[120ms] ease-out'
const lockedCls =
  'w-full border border-rule rounded-control bg-paper px-3 py-2 text-[14px] text-ink-muted flex items-center justify-between'

export default function CreateCourse() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('MATH-AA-HL')
  const [title, setTitle] = useState('Mathematics: Analysis and Approaches HL')
  const [term, setTerm] = useState('2026-27 S1')
  const [status, setStatus] = useState('Draft')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <CourseShell role="teacher" active="create-course">
      <div className="flex-1 grid grid-cols-[1fr_320px]">
        {/* Main */}
        <main className="px-10 py-7 border-r border-rule bg-surface">
          <h1 className="font-serif text-[32px] leading-tight">Create course</h1>

          {/* Stepper */}
          <ol className="mt-6 flex items-center">
            {STEPS.map((label, i) => {
              const done = i < step
              const current = i === step
              return (
                <li key={label} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className="flex items-center gap-2.5 shrink-0"
                  >
                    <span
                      className={
                        current
                          ? 'w-8 h-8 rounded-full bg-board text-paper text-[14px] font-medium flex items-center justify-center'
                          : done
                            ? 'w-8 h-8 rounded-full bg-board-tint text-board text-[14px] font-medium flex items-center justify-center'
                            : 'w-8 h-8 rounded-full border border-rule text-ink-muted text-[14px] flex items-center justify-center'
                      }
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[13px] ${current ? 'text-ink font-medium' : 'text-ink-muted'}`}>{label}</span>
                  </button>
                  {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-rule mx-3" /> : null}
                </li>
              )
            })}
          </ol>
          <div className="mt-3 h-0.5 bg-rule rounded-chip overflow-hidden">
            <div className="h-full bg-board transition-all duration-[120ms] ease-out" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>

          {step === 0 ? (
            <div className="mt-6">
              <Field label="Course code">
                <div>
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} />
                  <div className="mt-1 text-[12px] text-ink-muted">Use uppercase letters, numbers and hyphens. No spaces.</div>
                </div>
              </Field>
              <Field label="Course title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Term">
                <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls}>
                  <option>2025-26 S2</option>
                  <option>2026-27 S1</option>
                  <option>2026-27 S2</option>
                </select>
              </Field>
              <Field label="Institution">
                <div className={lockedCls}>
                  <span>SHSID</span>
                  <Lock size={14} />
                </div>
              </Field>
              <Field label="Data region">
                <div className={lockedCls}>
                  <span>China</span>
                  <Lock size={14} />
                </div>
              </Field>
              <Field label="Initial status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option>Draft</option>
                  <option>Active</option>
                  <option>Archived</option>
                </select>
              </Field>
            </div>
          ) : (
            <div className="mt-10 border border-dashed border-rule rounded-card p-10 text-center">
              <div className="font-serif text-[24px]">{STEPS[step]}</div>
              <p className="mt-2 text-[13px] text-ink-muted">
                This step is a placeholder in the demo. Continue to the next step or go back to course details.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate('/teacher/library') : setStep(0))}
              className="border border-rule bg-surface rounded-control px-5 py-2 text-[14px] hover:border-ink-muted transition-colors duration-[120ms] ease-out"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (step < STEPS.length - 1) setStep(step + 1)
                else showToast('Course draft saved for review.')
              }}
              className="bg-board text-paper rounded-control px-6 py-2 text-[14px] font-medium hover:bg-board-deep transition-colors duration-[120ms] ease-out"
            >
              Continue
            </button>
          </div>
        </main>

        {/* Right panel */}
        <aside className="px-6 py-7 bg-paper">
          <div className="flex items-center gap-2.5">
            <BookOpen size={18} className="text-board" />
            <span className="text-[15px] font-medium">About the objective graph</span>
          </div>
          <p className="mt-4 text-[13px] leading-snug">
            In the next steps, Synonance will analyze your selected curriculum and sources to
            propose an objective graph for this course.
          </p>
          <p className="mt-3 text-[13px] leading-snug">
            The objective graph visualizes the key learning objectives and how they relate to
            each other across the course.
          </p>
          <div className="mt-4 flex gap-2.5 items-start">
            <CircleCheck size={18} className="text-board shrink-0 mt-0.5" />
            <p className="text-[13px] leading-snug font-medium">
              The proposed objective graph must be reviewed and approved by you before the course
              can be finalized.
            </p>
          </div>
          <div className="my-4 h-px bg-rule" />
          <p className="text-[12px] text-ink-muted leading-snug">
            You will have the opportunity to review and edit the graph during the review step.
          </p>
        </aside>
      </div>

      <footer className="px-6 py-2.5 flex items-center justify-between font-mono text-[11px] text-ink-muted/60 uppercase tracking-[0.08em] border-t border-rule">
        <span>Create course</span><span>21 / 24</span>
      </footer>

      {toast ? (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-ink text-paper text-[13px] px-4 py-2 rounded-control z-50">
          {toast}
        </div>
      ) : null}
    </CourseShell>
  )
}
