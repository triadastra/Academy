// Calls the chat agent's grade-book tools the way the model would, against
// the real browser-local store (with an in-memory localStorage).
import assert from 'node:assert/strict'
const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index], get length() { return values.size } }
Object.assign(globalThis, { localStorage: storage, sessionStorage: storage, window: Object.assign(new EventTarget(), { location: { origin: 'http://test.local', protocol: 'http:' } }), document: { cookie: '' } })

const { LOCAL_TOOLS } = await import('../src/lib/agent')
const performance = await import('../src/database/performance')
const course = 'course-under-test'
const run = (name: string, args: Record<string, unknown>) => LOCAL_TOOLS.get(name)!.run(args as never, course) as Promise<Record<string, unknown>> | Record<string, unknown>

// Rubric first, the way a student pastes their syllabus into chat.
const rubric = await run('rubric_set', { categories: [{ category: 'Tests', weightPct: 60, count: 3 }, { category: 'quizzes', weightPct: 40 }] })
assert.equal(rubric.ok, true)
assert.equal(rubric.warning, undefined)
assert.deepEqual(performance.rubricFor(course).map((entry) => entry.category), ['Test', 'Quiz'])

// "I got 76 on unit test 1, 9/10 on quiz 1, and unit test 2 is on Dec 4."
const saved = await run('grades_record', {
  assessments: [
    { title: 'Unit test 1', category: 'Test', date: '2026-10-02', score: 76 },
    { title: 'Quiz 1', date: '2026-10-09', score: 9, total: 10 },
    { title: 'Unit test 2', category: 'test', date: '2026-12-04' },
    { title: 'No date', date: 'whenever' },
  ],
  studySessions: [{ date: '2026-11-18', minutes: 50, note: 'past paper' }],
})
assert.equal(saved.ok, true)
assert.equal(saved.added, 4)
assert.equal((saved.problems as string[]).length, 1, 'the dateless one is refused, the rest saved')

const rows = performance.getPerformance().assessments.filter((item) => item.courseId === course)
const byTitle = Object.fromEntries(rows.map((item) => [item.title, item]))
assert.equal(byTitle['Unit test 1'].weight, 20, 'Tests 60% over 3 expected tests')
assert.equal(byTitle['Unit test 2'].weight, 20)
assert.equal(byTitle['Unit test 2'].score, null, 'no score = upcoming')
assert.equal(byTitle['Quiz 1'].weight, 40, 'the only quiz carries the quiz category')
assert.equal(byTitle['Quiz 1'].category, 'Quiz', 'category guessed from the title')

// Saying it again with the real score updates rather than duplicates.
const again = await run('grades_record', { assessments: [{ title: 'unit test 2', date: '2026-12-04', score: 88 }] })
assert.equal(again.updated, 1)
assert.equal(performance.getPerformance().assessments.filter((item) => item.courseId === course).length, 3)

// The agent's read-back reflects it.
const snapshot = performance.courseSnapshot(course, '2026-12-05')
assert.equal(snapshot.rubric.find((entry) => entry.category === 'Test')?.recorded, 2)
// (20*76 + 20*88 + 40*90) / 80 = 86
assert.equal(snapshot.grade.currentPct, 86)

// Bad input is refused, not stored.
const bad = await run('rubric_set', { categories: [{ category: 'Tests', weightPct: 400 }] })
assert.equal(bad.ok, false)
assert.equal(performance.rubricFor(course).length, 2, 'a refused rubric leaves the old one in place')

// Sample data is removable without touching what the student entered.
performance.loadSampleTerm([course], '2026-11-20')
assert.ok(performance.sampleCounts().assessments > 0)
performance.clearSampleData()
assert.deepEqual(performance.sampleCounts(), { assessments: 0, sessions: 0 })
assert.equal(performance.getPerformance().assessments.filter((item) => item.courseId === course).length, 3, 'own grades survive')
assert.equal(performance.getPerformance().sessions.filter((item) => item.courseId === course).length, 1, 'own study survives')

console.log('performance tools: all checks passed')
