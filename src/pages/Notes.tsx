import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Search } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageBar, PageBody, SidePanel } from '@/components/Page'
import NoteDocument from '@/components/NoteDocument'
import AskSelection from '@/components/AskSelection'
import ContributeNotes, { ContributeNotesButton } from '@/components/ContributeNotes'
import { subscribeDatabase } from '@/database/client'
import {
  noteMarkdown,
  getCourseLevel,
  levelsWithNotes,
  notesForCourse,
} from '@/database/notes-tools'
import { getActiveCourse } from '@/lib/course-selection'

/* Notes live in the shared course database, scoped per course — see notes-tools.ts. */
/*
  {
    code: '2.1',
    title: 'Antiderivatives',
    summary: 'Reverse differentiation, constants of integration, and families of curves.',
    revision: 14,
    updated: 'Today, 14:32',
    sections: [
      {
        id: 'idea',
        title: 'Core idea',
        body: [
          'An antiderivative of a function is another function whose derivative gives the original function.',
          'Indefinite integration describes a family of antiderivatives. The constant of integration accounts for functions that have the same derivative but differ by a vertical translation.',
        ],
      },
      {
        id: 'rules',
        title: 'Rules to remember',
        body: [
          'Apply the power rule term by term when the exponent is not negative one.',
          'Always include the constant of integration for an indefinite integral.',
          'Differentiate the result to check an antiderivative quickly.',
        ],
        callout: 'Recent course improvement: the reverse-check step was added after several students asked how to verify an answer.',
      },
    ],
  },
  {
    code: '2.2',
    title: 'Substitution',
    summary: 'Recognising composite structure and changing variables to simplify an integral.',
    revision: 11,
    updated: 'Yesterday, 18:06',
    sections: [
      {
        id: 'recognise',
        title: 'Recognising substitution',
        body: [
          'Look for an inner expression whose derivative also appears elsewhere in the integrand.',
          'A useful substitution should simplify the entire integral, including the differential.',
        ],
      },
      {
        id: 'workflow',
        title: 'Reliable workflow',
        body: [
          'Choose the inner expression, calculate its differential, rewrite every part of the integral in the new variable, integrate, and substitute back.',
          'For definite integrals, either change the limits immediately or return to the original variable before evaluating.',
        ],
      },
    ],
  },
  {
    code: '2.3',
    title: 'Partial fractions',
    summary: 'Decomposing rational expressions into forms that can be integrated directly.',
    revision: 18,
    updated: '12 minutes ago',
    sections: [
      {
        id: 'conditions',
        title: 'Before decomposing',
        body: [
          'First check that the rational expression is proper. If the numerator degree is at least the denominator degree, perform polynomial division.',
          'Factor the denominator completely and choose a decomposition form that matches its linear, repeated, or irreducible quadratic factors.',
        ],
      },
      {
        id: 'coefficients',
        title: 'Finding coefficients',
        body: [
          'After multiplying through by the common denominator, use convenient substitutions or compare coefficients.',
          'Check the decomposition by recombining its terms before integrating.',
        ],
        callout: 'Clarified from recent course activity: denominator factor count and polynomial degree answer different questions.',
      },
      {
        id: 'mistakes',
        title: 'Common mistakes',
        body: [
          'Skipping polynomial division, omitting terms for repeated factors, and integrating before verifying the decomposition are the most common sources of error.',
        ],
      },
    ],
  },
  {
    code: '2.4',
    title: 'Integration by parts',
    summary: 'Integrating products by reversing the product rule.',
    revision: 16,
    updated: 'Today, 09:48',
    sections: [
      {
        id: 'choice',
        title: 'Choosing the parts',
        body: [
          'Choose the part to differentiate so that it becomes simpler, while the remaining part should be straightforward to integrate.',
          'The LIATE ordering is a guide rather than a rule; always check whether the resulting integral is actually simpler.',
        ],
      },
      {
        id: 'repeat',
        title: 'Repeated application',
        body: [
          'Polynomial factors often require integration by parts more than once. Keep signs visible and simplify only after each application is complete.',
        ],
      },
    ],
  },
*/

export default function Notes() {
  const [activeCourse] = useState(getActiveCourse)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [contributeOpen, setContributeOpen] = useState(false)
  // Bumped whenever the shared database changes, so an applied revision shows
  // up in the document without a reload.
  const [dbTick, setDbTick] = useState(0)

  useEffect(() => subscribeDatabase(() => setDbTick((tick) => tick + 1)), [])

  // Notes are shared per course: everyone enrolled reads the same documents.
  const level = useMemo(
    () => getCourseLevel(activeCourse.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCourse.id, dbTick],
  )
  const unitNotes = useMemo(
    () => notesForCourse(activeCourse.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCourse.id, dbTick],
  )
  const selectedUnit =
    unitNotes.find((unit) => unit.code === selectedCode) ?? unitNotes[0]
  const markdown = selectedUnit ? noteMarkdown(selectedUnit) : ''

  // A course with no authored notes is a normal state, not an error: notes are
  // shared class material, so a course has none until someone publishes them.
  // (Before notes were course-scoped every course showed the same demo unit,
  // which is what made this case invisible.)
  if (!selectedUnit) {
    // Three different reasons the list can be empty, and a student can act on
    // only one of them — so they are not collapsed into one message. Notes are
    // never borrowed from an adjacent level: that would show material the
    // student's own class was not taught.
    const otherLevels = levelsWithNotes(activeCourse.id).filter((item) => item !== level)
    const levelGap = Boolean(level) && otherLevels.length > 0
    return (
      <CourseShell role="student" active="notes">
        <Page>
          <PageBar
            context={
              levelGap
                ? `${activeCourse.code} · no ${level} notes`
                : `${activeCourse.code} · no notes yet`
            }
          >
            <ContributeNotesButton onClick={() => setContributeOpen(true)} />
          </PageBar>
          <PageBody measure="reading">
            <div className="rounded-card border border-dashed border-rule bg-surface px-8 py-16 text-center">
              <BookOpen size={24} className="mx-auto text-ink-muted" />
              <h2 className="mt-4 font-serif text-[24px] text-ink">
                {levelGap ? `No notes at ${level} level` : 'No shared notes yet'}
              </h2>
              <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-ink-muted">
                {levelGap ? (
                  <>
                    {activeCourse.code} has published notes at {otherLevels.join(' and ')} level, but
                    none written for {level}. Each level is taught different material, so notes from
                    another level are not shown here — contributing yours is what starts {level} off.
                  </>
                ) : (
                  <>
                    {activeCourse.code} has no published notes yet. Shared notes appear here once a
                    unit is published — or you can start them off by contributing yours.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setContributeOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-control bg-board px-3.5 py-2 text-[13px] text-paper hover:bg-board-deep"
              >
                <Plus size={15} /> Contribute notes
              </button>
            </div>
          </PageBody>
        </Page>
        {contributeOpen ? (
          <ContributeNotes
            onClose={() => setContributeOpen(false)}
            courseId={activeCourse.id}
            courseCode={activeCourse.code}
          />
        ) : null}
      </CourseShell>
    )
  }

  return (
    <CourseShell role="student" active="notes">
      <Page>
        <PageBar context={`Revision ${selectedUnit.revision} · Updated ${selectedUnit.updated}`}>
          <ContributeNotesButton onClick={() => setContributeOpen(true)} />
        </PageBar>

        <div className="practice-workspace flex flex-1 min-h-0 overflow-hidden">
        <SidePanel title="Unit notes" width="index">
          <nav className="p-4" aria-label="Unit notes">
            <ul className="flex flex-col gap-1">
              {unitNotes.map((unit) => {
                const selected = selectedUnit?.code === unit.code
                return (
                  <li key={unit.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCode(unit.code)
                        setQuery('')
                      }}
                      className={
                        selected
                          ? 'w-full text-left bg-board-tint border border-board/30 rounded-control px-3 py-2.5'
                          : 'w-full text-left border border-transparent rounded-control px-3 py-2.5 hover:bg-paper transition-colors duration-[120ms] ease-out'
                      }
                    >
                      <span className="block font-mono text-[11px] text-ink-muted">{unit.code}</span>
                      <span className="block mt-0.5 text-[13px] font-medium text-ink leading-snug">
                        {unit.title}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </SidePanel>

        <PageBody measure="reading">
          <div>
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-serif text-[24px] text-ink leading-tight">
                  {selectedUnit.code} {selectedUnit.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {selectedUnit.summary}
                </p>
              </div>
              <BookOpen size={24} className="text-board shrink-0 mt-1" />
            </div>

            <label className="mt-5 flex items-center gap-2.5 border border-rule rounded-control bg-surface px-3.5 py-2.5 focus-within:border-board transition-colors duration-[120ms] ease-out">
              <Search size={15} className="text-ink-muted shrink-0" />
              <span className="sr-only">Search this unit</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this unit…"
                className="w-full bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-muted"
              />
            </label>

            <div className="mt-8">
              <AskSelection
                unit={{ code: selectedUnit.code, title: selectedUnit.title, summary: selectedUnit.summary }}
              >
                <NoteDocument markdown={markdown} query={query} />
              </AskSelection>
            </div>
          </div>
        </PageBody>
        </div>
      </Page>

      {contributeOpen ? (
        <ContributeNotes
          onClose={() => setContributeOpen(false)}
          courseId={activeCourse.id}
          courseCode={activeCourse.code}
        />
      ) : null}
    </CourseShell>
  )
}
