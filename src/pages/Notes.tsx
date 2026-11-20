import { useEffect, useReducer, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BookOpen,
  Search,
  ListOrdered,
  Trophy,
  MessageCircle,
} from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody, SidePanel } from '@/components/Page'
import { isPersonalCourseId } from '@/database/personal'
import NoteDocument from '@/components/NoteDocument'
import MarkdownText from '@/components/MarkdownText'
import AskSelection from '@/components/AskSelection'
import ContributeNotes, {
  ContributeNotesButton,
} from '@/components/ContributeNotes'
import {
  ProcessingQueue,
  ContributionsLeaderboard,
} from '@/components/NoteContributions'
import { subscribeDatabase, ensureCourseNotesLoaded } from '@/database/client'
import {
  noteMarkdown,
  getCourseLevel,
  levelsWithNotes,
  notesForCourse,
} from '@/database/notes-tools'
import {
  ACTIVE_STATUSES,
  contributionSyncError,
  packetsForCourse,
  syncContributions,
} from '@/database/contributions'
import { getActiveCourse } from '@/lib/course-selection'

export default function Notes() {
  const [, refresh] = useReducer((value) => value + 1, 0)
  useEffect(() => subscribeDatabase(refresh), [])
  const activeCourse = getActiveCourse()
  // A personal course's notes are the account's own, written from its files:
  // no shared guide, no contribution queue, no leaderboard.
  const personal = isPersonalCourseId(activeCourse.id)
  const [params, setParams] = useSearchParams()
  const tab = !personal && ['queue', 'contributions'].includes(params.get('tab') ?? '')
    ? params.get('tab')!
    : 'guide'
  const [query, setQuery] = useState('')
  const [contributeOpen, setContributeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    void ensureCourseNotesLoaded(activeCourse.id).finally(() => {
      if (alive) setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [activeCourse.id])
  const notes = notesForCourse(activeCourse.id)
  const selected =
    notes.find(
      (note) =>
        note.id === params.get('note') || note.code === params.get('note'),
    ) ?? notes[0]
  const packets = packetsForCourse(activeCourse.id)
  const queued = packets.filter(
    (packet) =>
      ACTIVE_STATUSES.includes(packet.status) || packet.status === 'ready',
  ).length
  const level = getCourseLevel(activeCourse.id)
  const otherLevels = levelsWithNotes(activeCourse.id).filter(
    (item) => item !== level,
  )
  function switchTab(next: string) {
    setParams((current) => {
      const updated = new URLSearchParams(current)
      updated.set('tab', next)
      return updated
    })
  }
  const queue = () => switchTab('queue')
  return (
    <CourseShell role="student" active="notes">
      <Page>
        <PageBar
          context={`${activeCourse.code}${level ? ` · ${level}` : ''} · Course notes`}
        >
          {personal ? (
            <PageAction href="#/course/sources">Add files</PageAction>
          ) : (
            <ContributeNotesButton onClick={() => setContributeOpen(true)} />
          )}
        </PageBar>
        {personal ? null : <nav
          aria-label="Notes views"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule bg-surface px-4 pt-2 md:px-8"
        >
          {[
            { id: 'guide', title: 'Everyone’s guide', Icon: BookOpen },
            { id: 'queue', title: 'Processing queue', Icon: ListOrdered },
            { id: 'contributions', title: 'Contributions', Icon: Trophy },
          ].map(({ id, title, Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => switchTab(id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-[13px] ${tab === id ? 'border-board font-medium text-board' : 'border-transparent text-ink-muted hover:text-ink'}`}
            >
              <Icon size={15} />
              {title}
              {id === 'queue' && queued > 0 && (
                <span className="rounded-full bg-board-tint px-1.5 py-0.5 font-mono text-[10px] text-board">
                  {queued}
                </span>
              )}
            </button>
          ))}
        </nav>}
        {!personal && contributionSyncError() && (
          <div
            role="alert"
            className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-amber-50 px-5 py-3 text-xs text-amber-900"
          >
            <span>{contributionSyncError()}</span>
            <button
              onClick={() => void syncContributions(activeCourse.id)}
              className="shrink-0 underline"
            >
              Reconnect
            </button>
          </div>
        )}
        {tab === 'queue' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProcessingQueue packets={packets} />
          </div>
        ) : tab === 'contributions' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ContributionsLeaderboard packets={packets} />
          </div>
        ) : selected ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <label className="flex shrink-0 items-center gap-3 border-b border-rule bg-surface px-4 py-3 text-xs text-ink-muted md:hidden">
              Unit
              <select
                aria-label="Select unit"
                value={selected.id}
                onChange={(event) => {
                  setParams((current) => {
                    const next = new URLSearchParams(current)
                    next.set('note', event.target.value)
                    return next
                  })
                  setQuery('')
                }}
                className="min-w-0 flex-1 rounded-control border border-rule bg-paper p-2 text-ink"
              >
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.code} · {note.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden min-h-0 md:flex">
              <SidePanel title="Unit notes" width="index">
                <nav className="p-4" aria-label="Unit notes">
                  <ul className="flex flex-col gap-1">
                    {notes.map((note) => (
                      <li key={note.id}>
                        <button
                          onClick={() => {
                            setParams((current) => {
                              const next = new URLSearchParams(current)
                              next.set('note', note.id)
                              return next
                            })
                            setQuery('')
                          }}
                          className={`w-full rounded-control border px-3 py-2.5 text-left ${note.id === selected.id ? 'border-board/30 bg-board-tint' : 'border-transparent hover:bg-paper'}`}
                        >
                          <span className="block font-mono text-[11px] text-ink-muted">
                            {note.code}
                          </span>
                          <span className="mt-0.5 block text-[13px] font-medium leading-snug">
                            {note.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </SidePanel>
            </div>
            <PageBody measure="reading">
              <AskSelection
                key={`${activeCourse.id}-${selected.id}-${selected.revision}`}
                unit={selected}
                onQueued={queue}
                askOnly={personal}
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-board">
                    {personal ? 'Your notes' : 'Everyone’s guide'} · Revision {selected.revision}
                  </div>
                  <h2 className="mt-3 font-serif text-3xl leading-tight">
                    {selected.code} {selected.title}
                  </h2>
                  <div className="mt-3 text-ink-muted">
                    <MarkdownText>{selected.summary}</MarkdownText>
                  </div>
                  <div className="mt-5 flex items-start gap-2 rounded-control bg-board-tint/40 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
                    <MessageCircle
                      size={14}
                      className="mt-0.5 shrink-0 text-board"
                    />
                    {personal
                      ? 'Highlight a passage to ask the agent about it.'
                      : 'Highlight a passage to ask the agent, report a problem, or suggest an addition.'}
                  </div>
                  <label className="mt-5 flex items-center gap-2 rounded-control border border-rule bg-surface px-3 py-2.5">
                    <Search size={15} className="text-ink-muted" />
                    <input
                      aria-label="Search this guide"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Find a concept in this guide…"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </label>
                  <div className="mt-8">
                    <NoteDocument
                      markdown={noteMarkdown(selected)}
                      query={query}
                    />
                  </div>
                </div>
              </AskSelection>
            </PageBody>
          </div>
        ) : (
          <PageBody measure="reading">
            <div className="rounded-card border border-dashed border-rule bg-surface px-8 py-16 text-center">
              <BookOpen size={28} className="mx-auto text-board" />
              <h2 className="mt-4 font-serif text-2xl">
                {personal
                  ? 'No notes yet'
                  : loading
                  ? 'Loading the course guide…'
                  : level && otherLevels.length
                    ? `No notes at ${level} level yet`
                    : 'Build the first guide together'}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
                {personal
                  ? 'Drop this course’s files into Sources and Syno writes your notes from them.'
                  : 'Contribute your notes to start this course’s shared guide. The agent reviews every packet before it can be published.'}
              </p>
              <div className="mt-5 flex justify-center">
                {personal ? (
                  <PageAction variant="primary" href="#/course/sources">Add files</PageAction>
                ) : (
                  <ContributeNotesButton
                    onClick={() => setContributeOpen(true)}
                  />
                )}
              </div>
            </div>
          </PageBody>
        )}
        <footer className="shrink-0 border-t border-rule bg-surface px-5 py-2 text-[10px] leading-relaxed text-ink-muted">
          {personal
            ? 'Private to you · written by Syno from your own files · stored on this browser'
            : 'Shared across the class · All additions and corrections pass agent review · Contribution scores are recorded by the server'}
        </footer>
      </Page>
      {contributeOpen && (
        <ContributeNotes
          key={activeCourse.id}
          onClose={() => setContributeOpen(false)}
          onQueued={queue}
          courseId={activeCourse.id}
          courseCode={activeCourse.code}
        />
      )}
    </CourseShell>
  )
}
