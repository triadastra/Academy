// Sources — route /course/sources. Personal accounts only.
//
// Drop anything related to the course here — slides exported as PDF, a
// syllabus, your own notes, past papers — and Syno writes study notes from it.
// The files' text stays in this browser (IndexedDB, lib/personal-files.ts);
// the notes go into the account's private workspace, where the Notes page, the
// tutor and the Performance dashboard all pick them up.
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
import { FileText, FolderUp, LoaderCircle, NotebookTabs, Sparkles, Trash2, Upload } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, PageNotice, Toast } from '@/components/Page'
import { getCurrentUserId, isPersonalAccount, subscribeDatabase } from '@/database/client'
import { getActiveCourse } from '@/lib/course-selection'
import {
  addPersonalSource,
  deletePersonalNote,
  getPersonalWorkspace,
  isPersonalCourseId,
  personalNotesFor,
  removePersonalSource,
} from '@/database/personal'
import { deleteSourceText, putSourceText } from '@/lib/personal-files'
import { readNoteUpload } from '@/lib/note-upload'
import { importSourcesAsIs, writeNotesFromSources, type WriteProgress } from '@/lib/personal-notes-agent'
import { coachErrorMessage } from '@/lib/performance-coach'
import { useToast } from '@/hooks/use-toast'

const ACCEPT = '.pdf,.md,.markdown,.txt'
const MAX_FILES = 20

function kb(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Sources() {
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setTick((value) => value + 1)), [])
  const active = getActiveCourse()
  const course = getPersonalWorkspace().courses.find((item) => item.id === active.id) ?? null
  const sources = getPersonalWorkspace().sources.filter((source) => source.courseId === active.id)
  const notes = personalNotesFor(active.id).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  const [dragging, setDragging] = useState(false)
  const [reading, setReading] = useState<string | null>(null)
  const [progress, setProgress] = useState<WriteProgress | null>(null)
  const [focus, setFocus] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileInput = useRef<HTMLInputElement>(null)
  const abort = useRef<AbortController | null>(null)
  const { toast, notice, show, fail } = useToast()
  useEffect(() => () => abort.current?.abort(), [])

  // New files are selected by default: the usual next step is "write notes
  // from what I just dropped".
  const pending = sources.filter((source) => !source.usedAt).map((source) => source.id)
  const chosen = selected.size > 0 ? [...selected] : pending

  if (!isPersonalAccount() || !isPersonalCourseId(active.id) || !course) {
    return (
      <CourseShell role="student" active="sources">
        <Page>
          <PageBody measure="reading">
            <div className="rounded-card border border-rule bg-surface p-8 text-center">
              <h2 className="font-serif text-[22px] text-ink">
                {isPersonalAccount() ? 'Create a course first' : 'Sources are for personal courses'}
              </h2>
              <p className="mx-auto mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-muted">
                {isPersonalAccount()
                  ? 'Files belong to a course. Make one, then drop its material here and Syno writes your notes.'
                  : 'School courses use the notes your teachers publish. Sign in with a personal account to build your own courses from your own files.'}
              </p>
              <PageAction variant="primary" className="mt-5" onClick={() => navigate(isPersonalAccount() ? '/courses' : '/course/notes')}>
                {isPersonalAccount() ? 'Go to my courses' : 'Open notes'}
              </PageAction>
            </div>
          </PageBody>
        </Page>
      </CourseShell>
    )
  }

  async function addFiles(list: FileList | File[]) {
    const files = [...list]
    if (files.length === 0) return
    if (sources.length + files.length > MAX_FILES) return fail(`A course holds up to ${MAX_FILES} files. Remove some first.`)
    const userId = getCurrentUserId()
    const failures: string[] = []
    let added = 0
    let volatile = false
    for (const file of files) {
      setReading(file.name)
      try {
        if (file.type.startsWith('image/')) throw new Error('images are not read yet — export them to PDF')
        if (sources.some((source) => source.name === file.name)) throw new Error('already added')
        // Same validation and PDF text extraction the shared upload uses:
        // rejects active content, caps size, keeps line structure.
        const { source: text } = await readNoteUpload([file])
        const row = addPersonalSource({ courseId: active.id, name: file.name, bytes: file.size, chars: text.length })
        const durable = await putSourceText(userId, row.id, text)
        if (!durable) volatile = true
        added += 1
      } catch (error) {
        failures.push(`${file.name}: ${(error as Error).message}`)
      }
    }
    setReading(null)
    setSelected(new Set())
    if (failures.length) fail(`Not added — ${failures.join(' · ')}`)
    else if (volatile) fail('Files added, but this browser blocks storage: they will be gone after a reload. Write notes now.')
    if (added) show(`${added} file${added === 1 ? '' : 's'} added.`)
  }

  async function removeSource(id: string) {
    removePersonalSource(id)
    await deleteSourceText(getCurrentUserId(), id)
    setSelected((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  async function writeNotes() {
    if (!course || chosen.length === 0) return
    abort.current = new AbortController()
    setProgress({ packet: 1, packets: 1, phase: 'reading', chars: 0 })
    try {
      const written = await writeNotesFromSources(course, chosen, {
        focus,
        signal: abort.current.signal,
        onProgress: setProgress,
      })
      setSelected(new Set())
      show(`Syno wrote ${written.length} note${written.length === 1 ? '' : 's'}.`)
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') show('Stopped. Notes already written were kept.')
      else {
        const name = (error as Error)?.name
        fail(name === 'GatewayUnavailable' || name === 'GatewayError' ? coachErrorMessage(error) : (error as Error).message)
      }
    } finally {
      setProgress(null)
      abort.current = null
    }
  }

  async function importAsIs() {
    if (!course || chosen.length === 0) return
    try {
      const written = await importSourcesAsIs(course, chosen)
      setSelected(new Set())
      show(`${written.length} file${written.length === 1 ? '' : 's'} added as notes.`)
    } catch (error) {
      fail((error as Error).message)
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files?.length) void addFiles(event.dataTransfer.files)
  }

  const busy = progress !== null || reading !== null

  return (
    <CourseShell role="student" active="sources">
      <Page>
        <PageBar context={`${course.title} · ${sources.length} file${sources.length === 1 ? '' : 's'} · ${notes.length} note${notes.length === 1 ? '' : 's'}`}>
          <PageAction onClick={() => navigate('/course/notes')} disabled={notes.length === 0}>
            <NotebookTabs size={14} /> Open notes
          </PageAction>
        </PageBar>
        <PageBody measure="wide">
          {notice ? <PageNotice className="mb-4">{notice}</PageNotice> : null}

          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors duration-[120ms] ${
              dragging ? 'border-board bg-board-tint/50' : 'border-rule bg-surface'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-control bg-board-tint text-board">
              {reading ? <LoaderCircle size={22} className="animate-spin" /> : <FolderUp size={22} />}
            </span>
            <h2 className="mt-3 font-serif text-[22px] text-ink">
              {reading ? `Reading ${reading}…` : 'Drop everything for this course here'}
            </h2>
            <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-muted">
              Slides and handouts as PDF, a syllabus, your own notes in Markdown or text, past papers. It stays private
              to your account on this browser; Syno reads it to write your notes.
            </p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files)
                event.target.value = ''
              }}
            />
            <PageAction variant="primary" className="mt-4" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload size={14} /> Choose files
            </PageAction>
            <p className="mt-2 text-[11px] text-ink-muted">PDF, Markdown or text · up to 10 MB each · {MAX_FILES} files per course</p>
          </div>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-card border border-rule bg-surface">
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">Files</h3>
                <span className="text-[12px] text-ink-muted">
                  {selected.size ? `${selected.size} selected` : pending.length ? `${pending.length} not yet used` : ''}
                </span>
              </div>
              <ul className="divide-y divide-rule">
                {sources.map((source) => {
                  const checked = selected.size ? selected.has(source.id) : !source.usedAt
                  return (
                    <li key={source.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                      <input
                        type="checkbox"
                        aria-label={`Use ${source.name}`}
                        checked={checked}
                        onChange={() =>
                          setSelected(() => {
                            const base = new Set(selected.size ? selected : pending)
                            if (base.has(source.id)) base.delete(source.id)
                            else base.add(source.id)
                            return base
                          })
                        }
                        className="accent-[#2F5D50]"
                      />
                      <FileText size={15} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">{source.name}</span>
                        <span className="text-[11px] text-ink-muted">
                          {kb(source.bytes)} · {source.chars.toLocaleString()} characters ·{' '}
                          {source.usedAt ? `used ${new Date(source.usedAt).toLocaleDateString()}` : 'new'}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${source.name}`}
                        onClick={() => void removeSource(source.id)}
                        className="text-ink-muted hover:text-mark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
                {sources.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-muted">No files yet.</li> : null}
              </ul>
              <div className="grid gap-2 border-t border-rule p-4">
                <label className="grid gap-1 text-[12px] text-ink-muted">
                  Anything Syno should focus on? (optional)
                  <input
                    value={focus}
                    onChange={(event) => setFocus(event.target.value)}
                    placeholder="e.g. definitions for the midterm, worked examples"
                    className="rounded-control border border-rule bg-surface px-2.5 py-1.5 text-[13px] text-ink focus:border-board focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {progress ? (
                    <PageAction variant="danger" onClick={() => abort.current?.abort()}>
                      Stop
                    </PageAction>
                  ) : (
                    <PageAction variant="primary" onClick={writeNotes} disabled={busy || chosen.length === 0}>
                      <Sparkles size={14} /> Write notes from {chosen.length || 'no'} file{chosen.length === 1 ? '' : 's'}
                    </PageAction>
                  )}
                  <PageAction onClick={importAsIs} disabled={busy || chosen.length === 0}>
                    Add as-is, no AI
                  </PageAction>
                </div>
                {progress ? (
                  <p className="flex items-center gap-2 text-[12px] text-ink-muted" role="status">
                    <LoaderCircle size={13} className="animate-spin" />
                    Part {progress.packet} of {progress.packets} ·{' '}
                    {progress.phase === 'reading'
                      ? 'reading your files'
                      : progress.phase === 'thinking'
                        ? 'Syno is planning the notes'
                        : progress.phase === 'writing'
                          ? `writing (${progress.chars.toLocaleString()} characters)`
                          : 'saving'}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-card border border-rule bg-surface">
              <div className="border-b border-rule px-4 py-3">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">Notes Syno wrote</h3>
              </div>
              <ul className="divide-y divide-rule">
                {notes.map((note) => (
                  <li key={note.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-8 shrink-0 font-mono text-[12px] text-ink-muted">{note.code}</span>
                    <button type="button" onClick={() => navigate('/course/notes')} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[14px] font-medium text-ink hover:text-board">{note.title}</span>
                      <span className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{note.summary}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete note ${note.code}`}
                      onClick={() => deletePersonalNote(note.id)}
                      className="mt-0.5 text-ink-muted hover:text-mark"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {notes.length === 0 ? (
                  <li className="px-4 py-6 text-center text-[13px] text-ink-muted">
                    Notes appear here once Syno has read your files. They show up in Notes and Chat too.
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </PageBody>
        {toast ? <Toast>{toast}</Toast> : null}
      </Page>
    </CourseShell>
  )
}
