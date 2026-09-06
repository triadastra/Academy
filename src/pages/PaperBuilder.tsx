import { useEffect, useMemo, useState } from 'react'
import { FileStack, Inbox, Sparkles } from 'lucide-react'
import CourseShell from '@/components/CourseShell'
import Page, { PageAction, PageBar, PageBody } from '@/components/Page'
import GenerateSheet, { type SheetMode } from '@/components/GenerateSheet'
import SynthesizedPaper from '@/components/SynthesizedPaper'
import { subscribeDatabase } from '@/database/client'
import { draftsForSession, papersForSession, questionsForPaper, questionsForSession, resolveSession, sessionReady } from '@/database/question-bank'

export default function PaperBuilder() {
  const [revision, setRevision] = useState(0)
  const [mode, setMode] = useState<SheetMode | null>(null)
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => subscribeDatabase(() => setRevision((value) => value + 1)), [])
  const { session, questions, drafts, papers } = useMemo(() => {
    const session = resolveSession()
    return { session, questions: questionsForSession(session), drafts: draftsForSession(session), papers: papersForSession(session).filter((paper) => paper.origin === 'synthesized') }
  // The browser database publishes all changes through this subscription.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])
  const selected = papers.find((paper) => paper.id === selectedId) ?? papers.at(-1)
  const ready = sessionReady(session)

  return (
    <CourseShell role="teacher" active="paper-builder">
      <Page>
        <PageBar context={`${session.label} · Assessment workspace`}>
          {drafts.length > 0 ? <PageAction onClick={() => setMode('review')}><Inbox size={14} /> Review {drafts.length} drafts</PageAction> : null}
          <PageAction onClick={() => setMode('questions')} disabled={!ready.ok}><Sparkles size={14} /> Generate questions</PageAction>
          <PageAction variant="primary" onClick={() => setMode('paper')} disabled={!ready.ok}><FileStack size={14} /> Create test</PageAction>
        </PageBar>
        <PageBody className="space-y-6">
          <section className="rounded-xl border border-rule bg-surface p-5 sm:p-7">
            <p className="font-mono text-[11px] uppercase tracking-wider text-board">From course notes to assessment</p>
            <h1 className="mt-2 font-serif text-[30px] leading-tight">A test built around what you teach.</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-muted">Generate questions from this class’s notes, review their answers and sources, then assemble a balanced test. Saved tests include a printable question paper and mark scheme.</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-rule pt-4">
              {[['Published questions', questions.length], ['Drafts to review', drafts.length], ['Saved tests', papers.length]].map(([label, count]) => <div key={label}><dd className="font-serif text-[28px] text-board">{count}</dd><dt className="text-[11px] text-ink-muted">{label}</dt></div>)}
            </dl>
          </section>
          {!ready.ok ? <p className="rounded-card border border-rule bg-surface p-4 text-[13px] text-ink-muted">{ready.reason}</p> : null}
          {selected ? (
            <section>
              <label className="mb-3 flex flex-wrap items-center gap-3 text-[13px] text-ink-muted">Saved test
                <select aria-label="Saved test" value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 max-w-full rounded-control border border-rule bg-surface px-3 py-2 text-ink">
                  {papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.name} · {paper.questionCount} questions · {paper.timeMinutes} min</option>)}
                </select>
              </label>
              <SynthesizedPaper key={selected.id} paper={selected} questions={questionsForPaper(selected)} />
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-rule p-8 text-center">
              <FileStack size={26} className="mx-auto text-board" />
              <h2 className="mt-3 font-serif text-[24px]">Your first test starts here</h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] text-ink-muted">{questions.length >= 3 ? 'Your bank has enough questions. Choose the topics, length and time for your first test.' : 'Start by generating questions, then accept the drafts you want to use.'}</p>
              <PageAction className="mt-4" variant="primary" disabled={!ready.ok} onClick={() => setMode(questions.length >= 3 ? 'paper' : 'questions')}>{questions.length >= 3 ? 'Configure test' : 'Generate questions'}</PageAction>
            </section>
          )}
        </PageBody>
      </Page>
      {mode ? <GenerateSheet key={session.key} session={session} mode={mode} onClose={() => setMode(null)} onAssembled={setSelectedId} /> : null}
    </CourseShell>
  )
}
