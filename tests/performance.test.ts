// Checks the arithmetic behind /course/performance (src/lib/performance-model.ts).
import assert from 'node:assert/strict'
import {
  computeGpa,
  dateOf,
  dayIndex,
  letterFor,
  planSessions,
  projectKnowledge,
  recentMinutesPerWeek,
  retention,
  summariseGrade,
  type KnowledgeEvent,
} from '../src/lib/performance-model'
import { parseDate, parseImport, parseMinutes, parseRubric, parseScore, parseWeight, rubricWeights } from '../src/lib/performance-import'

const close = (actual: number | null, expected: number, epsilon = 1e-6, message?: string) => {
  assert.ok(actual !== null, message ?? 'expected a number, got null')
  assert.ok(Math.abs(actual! - expected) < epsilon, `${message ?? ''} expected ${expected}, got ${actual}`)
}

// ── grades ────────────────────────────────────────────────────────────────
{
  const items = [
    { weight: 20, score: 80, total: 100, date: '2026-09-01' },
    { weight: 30, score: 45, total: 50, date: '2026-10-01' },
    { weight: 50, score: null, total: 100, date: '2026-12-15' },
  ]
  const summary = summariseGrade(items, 90, () => 70)
  // (20*80 + 30*90) / 50 = 86
  close(summary.current, 86, 1e-9, 'current')
  // (1600 + 2700 + 50*70) / 100 = 78
  close(summary.projected, 78, 1e-9, 'projected')
  // (90*100 - 4300) / 50 = 94
  close(summary.needed, 94, 1e-9, 'needed')
  close(summary.completed, 0.5, 1e-9, 'completed')

  const none = summariseGrade([], 90, () => 70)
  assert.equal(none.current, null)
  assert.equal(none.projected, null)
  assert.equal(none.needed, null)

  // Zero-weight items (mock tests, practice) never move the grade.
  const tracked = summariseGrade([{ weight: 0, score: 10, total: 100, date: '2026-01-01' }, ...items.slice(0, 2)], 90, () => 70)
  close(tracked.current, 86, 1e-9, 'zero weight ignored')

  // With no prediction and nothing graded, projected stays unknown.
  const blind = summariseGrade([{ weight: 100, score: null, total: 100, date: '2027-01-01' }], 90, () => null)
  assert.equal(blind.projected, null)
  close(blind.needed, 90, 1e-9, 'needed with nothing graded')
}

// ── GPA ───────────────────────────────────────────────────────────────────
{
  assert.equal(letterFor(93).letter, 'A')
  assert.equal(letterFor(92.99).letter, 'A−')
  assert.equal(letterFor(59.9).letter, 'F')
  const gpa = computeGpa([
    { pct: 95, credits: 1, boost: 1 }, // A 4.0 → 5.0 weighted
    { pct: 84, credits: 2, boost: 0 }, // B 3.0
    { pct: 50, credits: 1, boost: 0.5 }, // F, boost not applied
    { pct: null, credits: 3, boost: 0 }, // no grade, not counted
  ])
  close(gpa.unweighted, (4 + 6 + 0) / 4, 1e-9, 'unweighted')
  close(gpa.weighted, (5 + 6 + 0) / 4, 1e-9, 'weighted')
  assert.equal(gpa.credits, 4)
  assert.deepEqual(computeGpa([]), { unweighted: null, weighted: null, credits: 0 })
}

// ── forgetting curve ──────────────────────────────────────────────────────
{
  close(retention(0, 5), 1, 1e-12, 'no time, no forgetting')
  close(retention(5, 5), 1 / (1 + 5 / 45), 1e-12)
  close(retention(10, 10), 1 / (1 + 10 / 90), 1e-12, 'R(S) ≈ 0.9')
  assert.ok(retention(30, 10) > retention(30, 3), 'higher stability forgets slower')
  assert.equal(dateOf(dayIndex('2026-11-20')), '2026-11-20')
}

// ── projection ────────────────────────────────────────────────────────────
{
  const today = '2026-11-20'
  const t = dayIndex(today)
  const events: KnowledgeEvent[] = [
    { kind: 'score', date: dateOf(t - 40), pct: 70 },
    { kind: 'study', date: dateOf(t - 30), minutes: 60 },
    { kind: 'study', date: dateOf(t - 20), minutes: 60 },
    { kind: 'score', date: dateOf(t - 10), pct: 85 },
  ]
  const projection = projectKnowledge(events, today, { minutesPerWeek: 180, horizonDays: 60 })
  assert.ok(projection.now !== null)
  assert.equal(projection.daysSinceReview, 10)
  assert.equal(projection.plan.length, 60)
  assert.equal(projection.stop.length, 60)
  const planEnd = projection.plan.at(-1)!.value
  const stopEnd = projection.stop.at(-1)!.value
  assert.ok(planEnd > stopEnd + 5, `studying should beat stopping (${planEnd} vs ${stopEnd})`)
  // Stopping only ever decays.
  for (let i = 1; i < projection.stop.length; i++) assert.ok(projection.stop[i].value <= projection.stop[i - 1].value + 1e-9)
  assert.ok(stopEnd < projection.now!, 'forgetting lowers the estimate')
  assert.ok(stopEnd > 15, 'some knowledge is retained')
  // A score pulls the estimate towards it.
  const before = projectKnowledge(events.slice(0, 3), dateOf(t - 10), { minutesPerWeek: 0 }).now!
  const after = projectKnowledge(events, dateOf(t - 10), { minutesPerWeek: 0 }).now!
  assert.ok(Math.abs(after - 85) < Math.abs(before - 85))
  // Spaced practice: same minutes, but the spaced history should hold up better 30 days later.
  const crammed = projectKnowledge(
    [{ kind: 'score', date: dateOf(t - 60), pct: 60 }, ...[1, 2, 3, 4].map((d): KnowledgeEvent => ({ kind: 'study', date: dateOf(t - d), minutes: 60 }))],
    today,
    { minutesPerWeek: 0, horizonDays: 30 },
  )
  const spaced = projectKnowledge(
    [{ kind: 'score', date: dateOf(t - 60), pct: 60 }, ...[1, 15, 30, 45].map((d): KnowledgeEvent => ({ kind: 'study', date: dateOf(t - d), minutes: 60 }))],
    today,
    { minutesPerWeek: 0, horizonDays: 30 },
  )
  assert.ok(spaced.stability > crammed.stability, 'spacing builds more stability')
  // Nothing logged: nothing to project.
  const empty = projectKnowledge([], today, { minutesPerWeek: 100 })
  assert.equal(empty.now, null)
  assert.equal(empty.history.length, 0)
  // Future events are ignored for history.
  const future = projectKnowledge([{ kind: 'score', date: dateOf(t + 5), pct: 90 }], today, { minutesPerWeek: 0 })
  assert.equal(future.now, null)
}

// ── plan & pace ───────────────────────────────────────────────────────────
{
  const sessions = planSessions(0, 28, 180)
  const total = sessions.reduce((sum, event) => sum + (event.kind === 'study' ? event.minutes : 0), 0)
  close(total, 720, 1e-6, 'four weeks at 180/week')
  assert.equal(planSessions(0, 28, 0).length, 0)
  const today = '2026-11-20'
  const t = dayIndex(today)
  const pace = recentMinutesPerWeek(
    [
      { kind: 'study', date: dateOf(t), minutes: 60 },
      { kind: 'study', date: dateOf(t - 27), minutes: 60 },
      { kind: 'study', date: dateOf(t - 28), minutes: 600 }, // outside the window
      { kind: 'score', date: dateOf(t), pct: 90 },
    ],
    today,
  )
  close(pace, 30, 1e-9, '120 minutes over 4 weeks')
}

// ── paste import ──────────────────────────────────────────────────────────
{
  const today = '2026-11-20'
  assert.equal(parseDate('2026-09-26', today), '2026-09-26')
  assert.equal(parseDate('2026/9/6', today), '2026-09-06')
  assert.equal(parseDate('9/26/2026', today), '2026-09-26')
  assert.equal(parseDate('Sep 26', today), '2026-09-26')
  assert.equal(parseDate('Jan 15', today), '2027-01-15', 'a yearless date takes the nearest year')
  assert.equal(parseDate('26 September 2026', today), '2026-09-26')
  assert.equal(parseDate('Oct 3rd', today), '2026-10-03')
  assert.equal(parseDate('2026-02-30', today), null, 'impossible dates are refused')
  assert.equal(parseDate('soon', today), null)

  assert.deepEqual(parseScore('76/100'), { score: 76, total: 100 })
  assert.deepEqual(parseScore('9 out of 10'), { score: 9, total: 10 })
  assert.deepEqual(parseScore('88%'), { score: 88, total: 100 })
  assert.deepEqual(parseScore(''), { score: null, total: 100 })
  assert.deepEqual(parseScore('upcoming'), { score: null, total: 100 })
  assert.equal(parseScore('abc'), null)
  assert.equal(parseScore('50/0'), null)

  assert.equal(parseWeight('15%'), 15)
  assert.equal(parseWeight('0.15'), 15, 'a bare fraction is a share')
  assert.equal(parseWeight(''), 0)
  assert.equal(parseWeight('150%'), null)

  assert.equal(parseMinutes('45'), 45)
  assert.equal(parseMinutes('45 min'), 45)
  assert.equal(parseMinutes('1h 30m'), 90)
  assert.equal(parseMinutes('1.5h'), 90)
  assert.equal(parseMinutes('0'), null)

  const result = parseImport(
    [
      'Name\tType\tDate\tWeight\tScore',
      'Unit test 1\tTest\t2026-09-26\t15%\t76/100',
      'Quiz 3, Quizzes, Oct 30, 5%, 9/10',
      'Final exam, 2027-01-15, 40%,',
      'study, 2026-11-18, 45 min, past paper, chapter 4',
      'Broken row, Test, someday, 10%, 80',
      '# a comment',
      '',
    ].join('\n'),
    today,
  )
  assert.equal(result.skipped, 1, 'header skipped')
  assert.equal(result.rows.length, 4)
  assert.deepEqual(result.rows[0], { kind: 'assessment', title: 'Unit test 1', category: 'Test', date: '2026-09-26', weight: 15, score: 76, total: 100 })
  assert.equal(result.rows[1].kind === 'assessment' && result.rows[1].category, 'Quiz', 'category names are normalised')
  assert.deepEqual(result.rows[2], { kind: 'assessment', title: 'Final exam', category: 'Final exam', date: '2027-01-15', weight: 40, score: null, total: 100 })
  assert.deepEqual(result.rows[3], { kind: 'study', date: '2026-11-18', minutes: 45, note: 'past paper, chapter 4' })
  assert.equal(result.problems.length, 1)
  assert.equal(result.problems[0].line, 6)
}

// Spreadsheet copies keep empty trailing cells as trailing tabs.
{
  const today = '2026-11-20'
  const sheet = parseImport('Unit test 3\tTest\tDec 4\t\t\nFinal exam\tFinal\t2027-01-15\t\t\nEssay 1\tOct 1\t10%\t17/20', today)
  assert.deepEqual(sheet.problems, [])
  assert.deepEqual(sheet.rows[0], { kind: 'assessment', title: 'Unit test 3', category: 'Test', date: '2026-12-04', weight: 0, score: null, total: 100 })
  assert.deepEqual(sheet.rows[1], { kind: 'assessment', title: 'Final exam', category: 'Final exam', date: '2027-01-15', weight: 0, score: null, total: 100 })
  assert.deepEqual(sheet.rows[2], { kind: 'assessment', title: 'Essay 1', category: 'Essay', date: '2026-10-01', weight: 10, score: 17, total: 20 })
  // Name and date alone is an upcoming item with no weight yet.
  assert.equal(parseImport('Project 2, 2026-12-10', today).rows.length, 1)
  assert.match(parseImport('Field trip\tOther\tsometime\t5%\t10', today).problems[0].reason, /"sometime"/)
}

// ── rubric ────────────────────────────────────────────────────────────────
{
  const { entries, problems } = parseRubric('Tests 50% (4), Quizzes 20%, Homework 15%, Final 15%')
  assert.deepEqual(problems, [])
  assert.deepEqual(entries, [
    { category: 'Test', weight: 50, count: 4 },
    { category: 'Quiz', weight: 20 },
    { category: 'Homework', weight: 15 },
    { category: 'Final exam', weight: 15 },
  ])
  assert.equal(parseRubric('Midterm 20%, Final exam 20%, Tests 60%').entries.length, 3, 'midterm and final stay separate')
  assert.match(parseRubric('Tests 50%, Quizzes 20%').problems[0], /70%/)
  assert.deepEqual(parseRubric('4 tests 40%\nQuiz 60').entries[0], { category: 'Test', weight: 40, count: 4 })

  const items = [
    { id: 't1', category: 'Test', weight: 0 },
    { id: 't2', category: 'tests', weight: 99 },
    { id: 'q1', category: 'Quiz', weight: 0 },
    { id: 'p1', category: 'Project', weight: 12 },
  ]
  const weights = rubricWeights(items, entries)
  assert.equal(weights.get('t1'), 12.5, 'Tests 50% over an expected 4 items, though only 2 are recorded')
  assert.equal(weights.get('t2'), 12.5)
  assert.equal(weights.get('q1'), 20, 'one quiz so far carries the whole category')
  assert.equal(weights.has('p1'), false, 'categories outside the rubric keep their own weight')
}

console.log('performance model: all checks passed')
