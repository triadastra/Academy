// PersonalCourses — what /courses shows a personal account.
//
// A personal account has no school catalogue to pick from, so its course list
// is the courses it has made itself, plus the form to make another. Opening a
// course with no notes yet goes to Sources, where its material is dropped in.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, FolderUp, Plus, Trash2 } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, PageNotice } from '@/components/Page'
import { getCurrentUserId, subscribeDatabase } from '@/database/client'
import {
  createPersonalCourse,
  deletePersonalCourse,
  getPersonalWorkspace,
  personalNotesFor,
} from '@/database/personal'
import type { PersonalCourse } from '@/database/types'
import { deleteSourceText } from '@/lib/personal-files'
import { setActiveCourse } from '@/lib/course-selection'

const field =
  'w-full rounded-control border border-rule bg-surface px-3 py-2 text-[14px] text-ink focus:border-board focus:outline-none'

export default function PersonalCourses() {
  const navigate = useNavigate()
  const [, setTick] = useState(0)
  useEffect(() => subscribeDatabase(() => setTick((value) => value + 1)), [])
  const { courses, sources } = getPersonalWorkspace()
  const [creating, setCreating] = useState(courses.length === 0)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', code: '', subject: '', rigor: 'Regular' as PersonalCourse['rigor'], description: '' })
  const [confirming, setConfirming] = useState<string | null>(null)

  function create() {
    if (!form.title.trim()) {
      setError('Give the course a name.')
      return
    }
    setError('')
    const course = createPersonalCourse(form)
    setActiveCourse(course.id)
    setForm({ title: '', code: '', subject: '', rigor: 'Regular', description: '' })
    navigate('/course/sources')
  }

  function open(course: PersonalCourse) {
    setActiveCourse(course.id)
    navigate(personalNotesFor(course.id).length ? '/course/notes' : '/course/sources')
  }

  async function remove(id: string) {
    const ids = deletePersonalCourse(id)
    const userId = getCurrentUserId()
    await Promise.all(ids.map((sourceId) => deleteSourceText(userId, sourceId)))
    setConfirming(null)
  }

  return (
    <CourseShell role="student" active="courses">
      <Page>
        <PageBar context={`${courses.length} personal course${courses.length === 1 ? '' : 's'} · private to you`}>
          {!creating ? (
            <PageAction variant="primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> Create course
            </PageAction>
          ) : null}
        </PageBar>
        <PageBody measure="wide">
          {creating ? (
            <section className="mb-6 rounded-card border border-rule bg-surface p-5" aria-label="Create a course">
              <h2 className="font-serif text-[24px] text-ink">{courses.length ? 'New course' : 'Create your first course'}</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                Anything you are learning — a class, a certification, a skill for work. Next you drop in its files and
                Syno writes the notes.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
                <label className="grid gap-1 text-[12px] text-ink-muted">
                  Course name
                  <input className={field} value={form.title} placeholder="Linear Algebra" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>
                <label className="grid gap-1 text-[12px] text-ink-muted">
                  Short code (optional)
                  <input className={field} value={form.code} placeholder="MATH 221" onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </label>
                <label className="grid gap-1 text-[12px] text-ink-muted">
                  Subject
                  <input className={field} value={form.subject} placeholder="Mathematics" onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </label>
                <label className="grid gap-1 text-[12px] text-ink-muted">
                  Level (sets the GPA boost)
                  <select className={field} value={form.rigor} onChange={(e) => setForm({ ...form, rigor: e.target.value as PersonalCourse['rigor'] })}>
                    <option>Regular</option>
                    <option>Honors</option>
                    <option>AP/IB</option>
                  </select>
                </label>
                <label className="grid gap-1 text-[12px] text-ink-muted sm:col-span-2">
                  What it covers (optional — helps Syno write better notes)
                  <textarea
                    className={`${field} min-h-[72px]`}
                    value={form.description}
                    placeholder="First-year university course: vectors, matrices, eigenvalues. Midterm in March."
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
              </div>
              {error ? <PageNotice className="mt-3">{error}</PageNotice> : null}
              <div className="mt-4 flex gap-2">
                <PageAction variant="primary" onClick={create}>
                  Create and add files <ArrowRight size={14} />
                </PageAction>
                {courses.length ? <PageAction onClick={() => setCreating(false)}>Cancel</PageAction> : null}
              </div>
            </section>
          ) : null}

          <div className="divide-y divide-rule border-y border-rule">
            {courses.map((course) => {
              const noteCount = personalNotesFor(course.id).length
              const fileCount = sources.filter((source) => source.courseId === course.id).length
              return (
                <div key={course.id} className="grid items-center gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <button type="button" onClick={() => open(course)} className="min-w-0 text-left">
                    <span className="block font-serif text-[24px] leading-tight text-ink hover:text-board">{course.title}</span>
                    <span className="mt-1 block font-mono text-[12px] text-ink-muted">
                      {course.code} · {course.subject} · {course.rigor} · {fileCount} file{fileCount === 1 ? '' : 's'} · {noteCount} note{noteCount === 1 ? '' : 's'}
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    {confirming === course.id ? (
                      <>
                        <span className="text-[12px] text-mark">Delete its files and notes too?</span>
                        <PageAction variant="destructive" onClick={() => void remove(course.id)}>
                          Delete
                        </PageAction>
                        <PageAction onClick={() => setConfirming(null)}>Keep</PageAction>
                      </>
                    ) : (
                      <>
                        <PageAction
                          onClick={() => {
                            setActiveCourse(course.id)
                            navigate('/course/sources')
                          }}
                        >
                          <FolderUp size={14} /> Files
                        </PageAction>
                        <PageAction variant="primary" onClick={() => open(course)}>
                          Open <ArrowRight size={14} />
                        </PageAction>
                        <button
                          type="button"
                          aria-label={`Delete ${course.title}`}
                          onClick={() => setConfirming(course.id)}
                          className="p-2 text-ink-muted hover:text-mark"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </PageBody>
      </Page>
    </CourseShell>
  )
}
