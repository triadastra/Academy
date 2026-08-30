// ContributeNotes.tsx — the "help improve notes for everyone" upload overlay.
//
// A course with no shared notes has nothing for a student to read, and the
// people who can fix that fastest are the students who already took the notes.
// This is the way in: a circle button on the Notes page blurs the page behind a
// drop zone and queues what you drop as a contribution.
//
// PRIVACY — the copy promises the upload is not retained, so the code keeps
// that promise: we read the file's NAME, TYPE and SIZE only. The bytes are
// never read into memory, never written to the database, and never persisted.
// A contribution row records that a file was offered and by whom; the file
// itself would be scoped server-side in a real deployment and discarded.
// If that ever changes, the copy below has to change with it.
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { CheckCircle2, FileUp, Plus, X } from 'lucide-react'
import { getCurrentUserId, recordCourseContribution } from '@/database/client'

const ACCEPTED =
  '.pdf,.png,.jpg,.jpeg,.heic,.ppt,.pptx,.doc,.docx,.txt,.md,application/pdf,image/*'

export function ContributeNotesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Contribute notes for this course"
      title="Contribute notes"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-board bg-surface text-board transition-colors duration-[120ms] ease-out hover:bg-board hover:text-paper"
    >
      <Plus size={16} />
    </button>
  )
}

interface Offered {
  name: string
  sizeMB: string
}

/**
 * Rendered only while open — the caller mounts it conditionally, so per-session
 * state resets on unmount instead of being cleared in an effect.
 */
export default function ContributeNotes({
  onClose,
  courseId,
  courseCode,
}: {
  onClose: () => void
  courseId: string
  courseCode: string
}) {
  const [dragActive, setDragActive] = useState(false)
  const [offered, setOffered] = useState<Offered[]>([])
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function accept(files: FileList | null) {
    if (!files?.length) return
    const taken: Offered[] = []
    for (const file of Array.from(files)) {
      // Metadata only — see the privacy note at the top of this file.
      recordCourseContribution({
        courseId,
        kind: 'note-upload',
        submittedBy: getCurrentUserId(),
        fileName: file.name,
        fileType: file.type || 'unknown',
        fileSize: file.size,
        submittedAt: new Date().toISOString(),
        status: 'awaiting-confirmation',
      })
      taken.push({ name: file.name, sizeMB: (file.size / 1024 / 1024).toFixed(2) })
    }
    setOffered((current) => [...current, ...taken])
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    accept(event.dataTransfer.files)
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/25 p-6 backdrop-blur-md"
      onMouseDown={(event) => {
        if (!dialogRef.current?.contains(event.target as Node)) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Contribute notes"
        className="w-full max-w-[560px] overflow-hidden rounded-card border border-rule bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-board">
              {courseCode}
            </div>
            <h2 className="mt-1 font-serif text-[24px] leading-tight text-ink">
              Help improve notes for everyone
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-paper hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>

        <div className="p-6">
          {offered.length === 0 ? (
            <>
              <label
                onDragEnter={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors duration-[120ms] ease-out ${
                  dragActive ? 'border-board bg-board-tint/60' : 'border-rule bg-paper'
                }`}
              >
                <FileUp size={30} className="text-board" />
                <p className="mt-4 text-[15px] font-medium text-ink">
                  Drag and drop your notes here
                </p>
                <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-ink-muted">
                  Upload any notes for this subject — typed, handwritten, or PowerPoint.
                </p>
                <span className="mt-4 inline-flex items-center rounded-control border border-rule bg-surface px-3.5 py-2 text-[13px] text-ink">
                  Choose files
                </span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="sr-only"
                  onChange={(event) => accept(event.target.files)}
                />
              </label>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
                Your upload is used only to scope the notes and is not retained. Every note is
                published with your confirmation and reviewed before the class sees it.
              </p>
            </>
          ) : (
            <div>
              <div className="rounded-card border border-board/30 bg-board-tint/50 p-5 text-center">
                <CheckCircle2 size={28} className="mx-auto text-board" />
                <p className="mt-3 text-[15px] font-medium text-ink">
                  Thank you — queued for review
                </p>
                <p className="mx-auto mt-1.5 max-w-[44ch] text-[13px] leading-relaxed text-ink-muted">
                  Nothing is published yet. You will be asked to confirm before anything from this
                  appears in {courseCode}’s shared notes.
                </p>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {offered.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between gap-3 rounded-control border border-rule bg-paper px-3 py-2.5"
                  >
                    <span className="truncate text-[13px] text-ink">{file.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                      {file.sizeMB} MB
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOffered([])}
                  className="rounded-control border border-rule bg-surface px-3.5 py-2 text-[13px] text-ink hover:border-board"
                >
                  Add more
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-control bg-board px-3.5 py-2 text-[13px] text-paper hover:bg-board-deep"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
