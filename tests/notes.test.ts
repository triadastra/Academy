import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { NotesService } from '../server/notes-service'
import { NotesStore } from '../server/notes-store'
import {
  combineParts,
  reconcileAssessments,
  reviewContribution,
  ReviewTimeoutError,
  type ReviewCheckpoint,
} from '../server/review'
import {
  applyGuideEdits,
  GuideEditError,
  splitSource,
} from '../server/guide-edits'
import { createMoonshotCall } from '../server/moonshot'
import { diffMarkdown } from '../src/database/notes-markdown'
import {
  safeImageSource,
  imageSources,
} from '../src/database/note-image-markdown'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import MarkdownText, { InlineMarkdown } from '../src/components/MarkdownText'
import NoteDocument from '../src/components/NoteDocument'
import { notesRequest, requestNoteImage } from '../src/lib/notes-api'
import type { AgentAssessment } from '../src/database/contribution-types'
import type { ModelCall } from '../server/review'

const root = process.cwd()
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-notes-test-'))
const seed = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src/database/synonance.database.json'),
    'utf8',
  ),
)
const courseId = 'math-aa-hl'
const before =
  '# Limits\n\nA guide to limits.\n\n## Definition\nA limit describes nearby behavior.'
const after = `${before}\n\n## Worked example\nFor f(x) = x + 1, the limit as x tends to 2 is 3.`
const assessment: AgentAssessment = {
  decision: 'approve',
  rationale: 'Adds a correct worked example to a missing section.',
  evidence: 'Substituting x = 2 into x + 1 gives 3 by continuity.',
  completeness: 25,
  incorrect: false,
  penalty: 0,
  penalties: [],
}
let responses: unknown[] = []
let slow: ((signal: AbortSignal) => Promise<string>) | null = null
const model: ModelCall = async (_messages, signal) => {
  if (slow) return await slow(signal)
  assert.ok(responses.length, 'Test must provide a model response')
  return JSON.stringify(responses.shift())
}
const options = {
  root,
  dataDirectory: path.join(temporary, 'data'),
  institution: seed.institution.id,
  model: 'test-agent',
  authenticate: async (bearer: string) =>
    bearer === 'Bearer invalid'
      ? null
      : {
          sub: bearer.slice(7),
          name: bearer.slice(7),
          org:
            bearer === 'Bearer outsider' ? 'other-school' : seed.institution.id,
          verified: true,
        },
  modelCall: model,
}
const service = new NotesService(options)
service.store.write((state) =>
  state.notes.push({
    id: 'fixture',
    courseId,
    code: '1',
    title: 'Limits',
    summary: 'A guide to limits.',
    sections: [],
    revision: 1,
    updated: 'now',
    markdown: before,
  }),
)
const server = createServer((req, res) => {
  void service.handle(req, res)
})
// Match the deployed Launchpad boundary: platform credentials never reach apps.
const proxy = createServer((req, res) => {
  delete req.headers.authorization
  void service.handle(req, res)
})
await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
const proxyPort = (proxy.address() as { port: number }).port
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = (server.address() as { port: number }).port
async function api(
  route: string,
  data?: unknown,
  who = 'alice',
  method = data === undefined ? 'GET' : 'POST',
) {
  const response = await fetch(
    `http://127.0.0.1:${port}/__academy/notes${route}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${who}`,
        'Content-Type': 'application/json',
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    },
  )
  return { status: response.status, data: await response.json() }
}
const input = {
  courseId,
  noteId: 'fixture',
  title: 'Limits',
  source: 'For f(x) = x + 1, the limit as x tends to 2 is 3.',
  fileName: 'limits.md',
  mode: 'upload',
}
function row(id: string) {
  return service.store.read().packets.find((packet) => packet.id === id)!
}
async function settled(id: string) {
  for (let i = 0; i < 300; i++) {
    const packet = row(id)
    if (!['queued', 'indexing', 'reviewing'].includes(packet.status))
      return packet
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`Packet ${id} did not settle`)
}
try {
  const nativeFetch = globalThis.fetch
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { LaunchpadAuth: { state: { accessToken: 'alice' } } },
  })
  globalThis.fetch = (input, init) =>
    nativeFetch(
      typeof input === 'string' && input.startsWith('/__academy/notes')
        ? `http://127.0.0.1:${proxyPort}${input}`
        : input,
      init,
    )
  try {
    const state = await notesRequest<{ notes: Array<{ id: string }> }>(
      `/state?courseId=${courseId}`,
    )
    assert.ok(state.notes.some((note) => note.id === 'fixture'))
    window.LaunchpadAuth!.state!.accessToken = 'invalid'
    await assert.rejects(notesRequest(`/state?courseId=${courseId}`), /expired/)
    window.LaunchpadAuth!.state!.accessToken = 'outsider'
    await assert.rejects(notesRequest(`/state?courseId=${courseId}`), /membership/)
    window.LaunchpadAuth!.state!.accessToken = 'alice'
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1kAAAAASUVORK5CYII='
    const uploaded = await notesRequest<{ source: string }>('/images', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'image/png', 'X-File-Name': 'proxy-test.png' }),
      body: new Blob([Buffer.from(png, 'base64')], { type: 'image/png' }),
    })
    const image = await requestNoteImage(uploaded.source)
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(png, 'base64'))
    const stripped = await nativeFetch(
      `http://127.0.0.1:${proxyPort}/__academy/notes/state?courseId=${courseId}`,
      { headers: { Authorization: 'Bearer alice' } },
    )
    assert.equal(stripped.status, 401)
    console.log('PASS: browser notes and images authenticate through the Launchpad stripping proxy')
  } finally {
    globalThis.fetch = nativeFetch
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
    await new Promise<void>((resolve) => proxy.close(() => resolve()))
  }
  assert.equal(
    (await api('/state?courseId=math-aa-hl', undefined, 'invalid')).status,
    401,
  )
  assert.equal(
    (await api('/state?courseId=math-aa-hl', undefined, 'outsider')).status,
    403,
  )
  assert.equal(
    (
      await api('/packets', {
        ...input,
        submittedBy: 'admin',
        ledger: [{ points: 100 }],
      })
    ).status,
    400,
  )
  assert.equal(
    (await api('/packets', { ...input, source: '![bad](javascript:alert)' }))
      .status,
    400,
  )
  assert.equal(
    (
      await api('/packets', {
        ...input,
        source: '![unreviewed](https://example.com/image.png)',
      })
    ).status,
    400,
  )
  assert.equal(
    (await api('/packets', { ...input, courseId: '../secret' })).status,
    400,
  )
  console.log(
    'PASS: session, institution, ownership inputs, path and image validation',
  )

  responses = [
    {
      ...assessment,
      edits: [
        {
          action: 'insert',
          markdown:
            '## Worked example\nFor f(x) = x + 1, the limit as x tends to 2 is 3.',
        },
      ],
    },
    assessment,
  ]
  const uploaded = await api('/packets', input)
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data))
  const id = uploaded.data.id
  const ready = await settled(id)
  assert.equal(ready.status, 'ready')
  assert.equal(ready.ledger.length, 0)
  assert.equal(
    service.store.read().notes.find((note) => note.id === 'fixture')!.markdown,
    before,
  )
  assert.equal((await api(`/packets/${id}/publish`, {}, 'bob')).status, 403)
  const bobBefore = await api(`/state?courseId=${courseId}`, undefined, 'bob')
  assert.equal(bobBefore.data.packets.length, 0, 'Pending sources stay private')
  assert.equal((await api(`/packets/${id}/publish`, {})).status, 200)
  assert.equal(row(id).ledger[0].points, 25)
  assert.equal((await api(`/packets/${id}/publish`, {})).status, 200)
  assert.equal(row(id).ledger.length, 1, 'Retries cannot double-credit')
  assert.equal(
    (await api('/packets', input)).status,
    409,
    'Duplicate submissions refused',
  )
  const shared = await api(`/state?courseId=${courseId}`, undefined, 'bob')
  assert.equal(
    shared.data.notes.find((note: { id: string }) => note.id === 'fixture')
      .markdown,
    after,
  )
  assert.equal(shared.data.packets[0].submittedBy, 'launchpad-alice')
  assert.equal(shared.data.contributors[0].name, 'alice')
  console.log(
    'PASS: two agent passes, staged diff, publication, shared visibility and idempotent credit',
  )

  // A late model response must never resurrect cancelled work.
  let release!: (value: string) => void
  slow = () =>
    new Promise((resolve) => {
      release = resolve
    })
  const cancelled = await api(
    '/packets',
    { ...input, source: 'A second, cancellable packet.' },
    'cancel-user',
  )
  assert.equal(
    (await api(`/packets/${cancelled.data.id}/cancel`, {}, 'bob')).status,
    403,
  )
  assert.equal(
    (await api(`/packets/${cancelled.data.id}/cancel`, {}, 'cancel-user'))
      .status,
    200,
  )
  release(
    JSON.stringify({
      ...assessment,
      edits: [{ action: 'insert', markdown: '## Cancelled\nCancelled content.' }],
    }),
  )
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(row(cancelled.data.id).status, 'cancelled')
  assert.equal(row(cancelled.data.id).ledger.length, 0)
  slow = null
  console.log('PASS: cancellation aborts late publication and scoring')

  responses = [
    {
      ...assessment,
      edits: [{ action: 'insert', markdown: '## Stale\nStale proposal.' }],
    },
    assessment,
  ]
  const stale = await api(
    '/packets',
    { ...input, source: 'A useful extra continuity explanation.' },
    'stale-user',
  )
  await settled(stale.data.id)
  service.store.write((state) => {
    const note = state.notes.find((note) => note.id === 'fixture')!
    note.revision++
    note.markdown += '\nTeacher added a clarification.'
  })
  slow = (signal) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('Stopped'))),
    )
  assert.equal(
    (await api(`/packets/${stale.data.id}/publish`, {}, 'stale-user')).status,
    200,
  )
  assert.ok(['queued', 'indexing'].includes(row(stale.data.id).status))
  assert.equal(row(stale.data.id).ledger.length, 0)
  await api(`/packets/${stale.data.id}/cancel`, {}, 'stale-user')
  slow = null
  // release an abort-aware test call so subsequent jobs can drain.
  await new Promise((resolve) => setTimeout(resolve, 30))
  console.log('PASS: stale revision cannot overwrite intervening changes')
  // Confirmed errors are attributed to a published packet and capped at its
  // remaining credit; publication applies the correction and penalty together.
  const badLine = 'The derivative of x squared is x.'
  const badGuide = before + '\n\n## Derivative\n' + badLine
  service.store.write((state) => {
    const target = state.packets.find((packet) => packet.id === id)!
    target.before = before
    target.after = badGuide
    const note = state.notes.find((note) => note.id === 'fixture')!
    note.markdown = badGuide
    note.revision++
  })
  const reportAssessment = {
    ...assessment,
    completeness: 8,
    penalties: [
      {
        packetId: id,
        points: 80,
        evidence: `${badLine} This is incorrect: the power rule gives 2x.`,
      },
    ],
  }
  responses = [
    {
      ...reportAssessment,
      edits: [
        {
          action: 'replace',
          section: 'Derivative',
          markdown: '## Derivative\nThe derivative of x squared is 2x.',
        },
      ],
    },
    reportAssessment,
  ]
  const report = await api(
    '/packets',
    {
      ...input,
      mode: 'report',
      source: 'The derivative of x squared is 2x, by the power rule.',
      quote: badLine,
    },
    'reporter',
  )
  assert.equal(report.status, 201, JSON.stringify(report.data))
  await settled(report.data.id)
  assert.equal(row(id).ledger.length, 1, 'Reports alone never deduct points')
  assert.equal(
    (await api(`/packets/${report.data.id}/publish`, {}, 'reporter')).status,
    200,
  )
  assert.equal(row(id).ledger.length, 2)
  assert.equal(
    row(id).ledger[1].points,
    -25,
    'Penalty cannot exceed remaining awarded points',
  )
  await api(`/packets/${report.data.id}/publish`, {}, 'reporter')
  assert.equal(
    row(id).ledger.length,
    2,
    'A published report cannot deduct twice',
  )
  assert.match(
    service.store.read().notes.find((note) => note.id === 'fixture')!.markdown!,
    /is 2x/,
  )
  console.log(
    'PASS: evidence-attributed correction, capped penalty and idempotent report publication',
  )

  const rejectedAssessment = {
    ...assessment,
    decision: 'reject',
    incorrect: true,
    penalty: 9,
    completeness: 0,
    rationale: 'The proposed derivative is demonstrably incorrect.',
    evidence: 'The power rule gives d(x squared)/dx = 2x, rather than 17.',
  }
  responses = [
    { ...rejectedAssessment, edits: [] },
    rejectedAssessment,
  ]
  const rejected = await api(
    '/packets',
    { ...input, source: 'The derivative of x squared is 17.' },
    'incorrect-author',
  )
  assert.equal((await settled(rejected.data.id)).status, 'rejected')
  assert.equal(row(rejected.data.id).ledger[0].points, -9)
  assert.equal(
    (await api(`/packets/${rejected.data.id}/publish`, {}, 'incorrect-author'))
      .status,
    409,
  )
  responses = [
    {
      ...assessment,
      edits: [
        { action: 'insert', markdown: '## Conjecture\nMaybe this conjecture is true.' },
      ],
    },
    { ...assessment, decision: 'uncertain', completeness: 0 },
    // One revision round, still unconvincing: the verdict stands.
    {
      ...assessment,
      edits: [
        { action: 'insert', markdown: '## Conjecture\nThis conjecture may be true.' },
      ],
    },
    { ...assessment, decision: 'uncertain', completeness: 0 },
  ]
  const uncertain = await api(
    '/packets',
    { ...input, source: 'A conjecture that needs more evidence.' },
    'uncertain-author',
  )
  assert.equal((await settled(uncertain.data.id)).status, 'needs-review')
  assert.equal(row(uncertain.data.id).ledger.length, 0)
  assert.equal(
    (await api(`/packets/${uncertain.data.id}/publish`, {}, 'uncertain-author'))
      .status,
    409,
  )
  responses = [{ ...assessment, completeness: 1000, edits: [] }]
  const malformed = await api(
    '/packets',
    { ...input, source: 'An agent response with an invalid score.' },
    'malformed-author',
  )
  assert.equal((await settled(malformed.data.id)).status, 'failed')
  assert.equal(row(malformed.data.id).ledger.length, 0)
  console.log(
    'PASS: incorrect-source penalty, uncertain review quarantine and malformed model response refusal',
  )

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKs8AAAAASUVORK5CYII=',
    'base64',
  )
  const uploadImage = await fetch(
    `http://127.0.0.1:${port}/__academy/notes/images`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer image-author',
        'Content-Type': 'image/png',
      },
      body: png,
    },
  )
  assert.equal(uploadImage.status, 201)
  const image = (await uploadImage.json()) as { source: string }
  const imageId = image.source.replace('note-asset:', '')
  assert.equal(
    (
      await fetch(
        `http://127.0.0.1:${port}/__academy/notes/images/${imageId}`,
        { headers: { Authorization: 'Bearer bob' } },
      )
    ).status,
    404,
  )
  responses = [
    {
      ...assessment,
      edits: [
        {
          action: 'insert',
          markdown: `## Diagram\n![Reviewed diagram on [0, 2]](${image.source})`,
        },
      ],
    },
    assessment,
  ]
  const imagePacket = await api(
    '/packets',
    {
      ...input,
      source: `A diagram for the limit explanation.\n\n![Reviewed diagram](${image.source})`,
    },
    'image-author',
  )
  assert.equal((await settled(imagePacket.data.id)).status, 'ready')
  await api(`/packets/${imagePacket.data.id}/publish`, {}, 'image-author')
  const retrieved = await fetch(
    `http://127.0.0.1:${port}/__academy/notes/images/${imageId}`,
    { headers: { Authorization: 'Bearer bob' } },
  )
  assert.equal(retrieved.status, 200)
  assert.deepEqual(Buffer.from(await retrieved.arrayBuffer()), png)
  assert.equal(
    (
      await fetch(`http://127.0.0.1:${port}/__academy/notes/images`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer image-author',
          'Content-Type': 'image/png',
        },
        body: '<script>invalid</script>',
      })
    ).status,
    400,
  )
  console.log(
    'PASS: durable image bytes, private pending attachments, shared published images and MIME validation',
  )
  responses = [
    {
      ...assessment,
      title: 'Sequences',
      summary: 'Arithmetic sequences use a common difference.',
      edits: [
        {
          action: 'insert',
          markdown: '## Example\nThe sequence 2, 5, 8 has common difference 3.',
        },
      ],
    },
    assessment,
  ]
  const firstGuide = await api(
    '/packets',
    {
      courseId,
      title: 'Sequences',
      fileName: 'sequences.md',
      source: 'The sequence 2, 5, 8 has common difference 3.',
    },
    'new-guide-author',
  )
  assert.equal(firstGuide.status, 201, JSON.stringify(firstGuide.data))
  await settled(firstGuide.data.id)
  assert.equal(row(firstGuide.data.id).before, '')
  await api(`/packets/${firstGuide.data.id}/publish`, {}, 'new-guide-author')
  const newGuide = service.store
    .read()
    .notes.find((note) => note.id === row(firstGuide.data.id).noteId)!
  assert.equal(newGuide.revision, 1)
  assert.equal(newGuide.code, 'C1')
  assert.equal(newGuide.title, 'Sequences')
  service.store.write((state) =>
    state.notes.push(
      { ...newGuide, id: 'scope-standard', level: 'S' },
      { ...newGuide, id: 'scope-honors', level: 'H' },
    ),
  )
  assert.equal(
    (
      await api(
        '/packets',
        { ...input, noteId: 'scope-standard', level: 'H' },
        'scope-author',
      )
    ).status,
    404,
  )
  const honors = await api(
    `/state?courseId=${courseId}&level=H`,
    undefined,
    'scope-author',
  )
  assert.ok(
    honors.data.notes.some(
      (note: { id: string }) => note.id === 'scope-honors',
    ),
  )
  assert.ok(
    !honors.data.notes.some(
      (note: { id: string }) => note.id === 'scope-standard',
    ),
  )
  console.log(
    'PASS: first guide publication, readable community codes and level isolation',
  )
  // Only HS courses are streamed: an AP upload tagged with a level is shared.
  slow = (signal) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('Stopped'))),
    )
  const apPacket = await api(
    '/packets',
    {
      courseId: 'ap-calculus-ab',
      level: 'S',
      title: 'Review',
      fileName: 'review.md',
      source: 'Limits, derivatives and the Mean Value Theorem.',
    },
    'ap-author',
  )
  assert.equal(apPacket.status, 201, JSON.stringify(apPacket.data))
  assert.equal(row(apPacket.data.id).level, undefined)
  await api(`/packets/${apPacket.data.id}/cancel`, {}, 'ap-author')
  // A packet created before that rule keeps its level until review drops it.
  service.store.write((state) => {
    const legacy = state.packets.find((packet) => packet.id === apPacket.data.id)!
    legacy.level = 'S'
    legacy.status = 'failed'
  })
  assert.equal((await api(`/packets/${apPacket.data.id}/retry`, {}, 'ap-author')).status, 200)
  for (let i = 0; i < 100 && row(apPacket.data.id).level; i++)
    await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(row(apPacket.data.id).level, undefined)
  await api(`/packets/${apPacket.data.id}/cancel`, {}, 'ap-author')
  slow = null
  await new Promise((resolve) => setTimeout(resolve, 30))
  console.log('PASS: unstreamed (AP) uploads are shared across levels')
} finally {
  service.close()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

// Store survives process restart and rejects competing writers.
const persisted = new NotesStore(options.dataDirectory)
assert.ok(
  persisted.read().packets.some((packet) => packet.status === 'published'),
)
assert.throws(() => new NotesStore(options.dataDirectory), /running writer/)
const saved = persisted.read()
const rename = fs.renameSync
fs.renameSync = () => {
  throw new Error('disk failure')
}
assert.throws(
  () =>
    persisted.write((state) => {
      state.packets = []
    }),
  /disk failure/,
)
fs.renameSync = rename
assert.deepEqual(
  persisted.read(),
  saved,
  'Failed writes cannot mutate committed state',
)
persisted.close()
console.log(
  'PASS: durable restart, exclusive writer and atomic storage failure',
)

const disagreed = reconcileAssessments(
  { ...assessment, incorrect: true, penalty: 40 },
  { ...assessment, decision: 'uncertain', incorrect: false, penalty: 0 },
)
assert.equal(disagreed.decision, 'uncertain')
assert.equal(disagreed.completeness, 0)
assert.equal(disagreed.penalty, 0)
const conservative = reconcileAssessments(
  { ...assessment, completeness: 90 },
  assessment,
)
assert.equal(conservative.completeness, 25)
assert.equal(
  reconcileAssessments(
    {
      ...assessment,
      penalties: [
        { packetId: 'p', points: 80, evidence: 'Clear factual evidence.' },
      ],
    },
    {
      ...assessment,
      penalties: [
        { packetId: 'p', points: 10, evidence: 'Clear factual evidence.' },
        { packetId: 'q', points: 20, evidence: 'Different factual evidence.' },
      ],
    },
  ).penalties.length,
  1,
)
assert.deepEqual(diffMarkdown('same\nsame', 'same'), [
  { kind: 'removed', text: 'same' },
])
assert.ok(
  diffMarkdown('one\ntwo', 'two\none').some((line) => line.kind === 'removed'),
)
assert.equal(safeImageSource('javascript:alert(1)'), false)
assert.equal(safeImageSource('data:image/svg+xml;base64,evil'), false)
assert.equal(safeImageSource('//evil.test/tracker'), false)
assert.deepEqual(imageSources('![Diagram](note-asset:123 "Caption")'), [
  'note-asset:123',
])
const rendered = renderToStaticMarkup(
  createElement(MarkdownText, {
    children: '![Diagram](/diagrams/plot.png) and **bold**',
  }),
)
assert.match(rendered, /<img/)
assert.match(rendered, /alt="Diagram"/)
assert.match(rendered, /<strong/)
assert.ok(
  !renderToStaticMarkup(
    createElement(MarkdownText, { children: '[bad](javascript:alert)' }),
  ).includes('href='),
)
const note = renderToStaticMarkup(
  createElement(NoteDocument, {
    markdown: '# Image\n\nSummary\n\n## Figure\n![Diagram](/diagrams/plot.png)',
  }),
)
assert.match(note, /<img/)
assert.match(
  renderToStaticMarkup(
    createElement(NoteDocument, {
      markdown: '# Image\n\nSummary\n\n## Figure\n![Graph of f on [0, 2]](/diagrams/plot.png)',
    }),
  ),
  /alt="Graph of f on \[0, 2\]"/,
)
assert.deepEqual(imageSources('![Graph on [0, 2]](note-asset:abc)'), ['note-asset:abc'])
console.log(
  'PASS: conservative review agreement, ordered repeated-line diffs and safe Markdown images',
)

// Edits are applied deterministically; untouched sections are kept verbatim.
const guide =
  '# 1 Limits\n\nA guide.\n\n## Definition\nA limit  describes nearby behavior.\n\n```python\n## not a heading\n```\n\n## Laws\nSum law.'
const edited = applyGuideEdits(guide, {
  code: '1',
  title: 'Limits',
  edits: [
    { action: 'replace', section: 'laws', markdown: '## Laws\nSum and product laws.' },
    { action: 'insert', after: 'Definition', markdown: '## Example\nx + 1 tends to 3.\n# Stray title' },
    { action: 'insert', after: '', markdown: '## Overview\nWhat follows.' },
    { action: 'insert', markdown: '## Practice\n- **1.** Try one.' },
  ],
})
assert.equal(
  edited,
  '# 1 Limits\n\nA guide.\n\n## Overview\nWhat follows.\n\n## Definition\nA limit  describes nearby behavior.\n\n```python\n## not a heading\n```\n\n## Example\nx + 1 tends to 3.\nStray title\n\n## Laws\nSum and product laws.\n\n## Practice\n- **1.** Try one.',
)
assert.equal(
  applyGuideEdits(edited, { code: '1', title: 'Limits', edits: [{ action: 'remove', section: 'Overview' }] }).includes('Overview'),
  false,
)
assert.throws(
  () => applyGuideEdits(guide, { code: '1', title: 'Limits', edits: [{ action: 'replace', section: 'Missing', markdown: '## Missing\nx' }] }),
  GuideEditError,
)
assert.throws(
  () => applyGuideEdits(guide, { code: '1', title: 'Limits', edits: [{ action: 'insert', markdown: 'No heading.' }] }),
  GuideEditError,
)
const longSource = [
  'Page one prose. '.repeat(30).trim(),
  '$$\n\\lim_{x\\to 0}\n\n\\frac{\\sin x}{x} = 1\n$$',
  'Page three prose. '.repeat(40).trim(),
].join('\n\n')
const pieces = splitSource(longSource, 300)
assert.ok(pieces.length > 2 && pieces.every((piece) => piece.length <= 300))
assert.ok(pieces.some((piece) => piece.includes('\\lim_{x\\to 0}\n\n\\frac')), 'display math stays whole')
assert.equal(pieces.join(' ').replace(/\s+/g, ' '), longSource.replace(/\s+/g, ' '))
console.log('PASS: section edits keep untouched text, refuse unknown headings, and sources split on safe boundaries')

// A long source is reviewed part by part: each draft call writes edits with
// reasoning off, each verifier reasons, and later parts see earlier edits.
{
  const calls: Array<{ text: string; reasoning: boolean; maxTokens: number }> = []
  const script: unknown[] = [
    { ...assessment, completeness: 30, title: 'Calculus review', summary: 'Chapters 1 to 4.', edits: [{ action: 'insert', markdown: '## Part A\nAlpha content.' }] },
    { ...assessment, completeness: 30 },
    { ...assessment, decision: 'reject', completeness: 0, rationale: 'Duplicates Part A entirely.', edits: [] },
    { ...assessment, decision: 'reject', completeness: 0, rationale: 'Duplicates Part A entirely.' },
    { ...assessment, completeness: 60, edits: [{ action: 'insert', after: 'Part A', markdown: '## Part C\nGamma content.' }] },
    { ...assessment, completeness: 60 },
  ]
  const call: ModelCall = async (messages, _signal, options) => {
    const user = messages[1].content
    calls.push({
      text: typeof user === 'string' ? user : (user[0] as { text: string }).text,
      ...options,
    })
    return JSON.stringify(script.shift())
  }
  const parts = ['Alpha '.repeat(10).trim(), 'Beta '.repeat(10).trim(), 'Gamma '.repeat(10).trim()]
  const stages: string[] = []
  const result = await reviewContribution(
    { course: 'AP Calculus AB', title: 'Review', code: 'C1', mode: 'upload', source: parts.join('\n\n'), before: '', prior: [] },
    [],
    call,
    new AbortController().signal,
    () => {},
    (stage) => stages.push(stage),
    { partChars: 70 },
  )
  assert.equal(result.parts, 3)
  assert.deepEqual(calls.map((item) => item.reasoning), [false, true, false, true, false, true])
  assert.ok(calls[4].text.includes('## Part A'), 'later parts draft against earlier edits')
  assert.equal(result.markdown, '# C1 Calculus review\n\nChapters 1 to 4.\n\n## Part A\nAlpha content.\n\n## Part C\nGamma content.')
  assert.equal(result.assessment.decision, 'approve')
  const weights = parts.map((part) => part.length)
  assert.equal(result.assessment.completeness, Math.round((30 * weights[0] + 60 * weights[2]) / (weights[0] + weights[1] + weights[2])))
  assert.match(result.assessment.rationale, /Part 2 of 3 \(reject\)/)
  assert.ok(stages.includes('Drafting guide edits · part 3 of 3'))
}
const part = (decision: AgentAssessment['decision'], extra: Partial<AgentAssessment> = {}) => ({
  assessment: { ...assessment, decision, ...extra },
  weight: 1,
  label: 'part',
})
assert.equal(combineParts([part('approve'), part('uncertain')]).decision, 'uncertain')
assert.equal(combineParts([part('approve'), part('reject', { incorrect: true, penalty: 5 })]).decision, 'uncertain')
const allRejected = combineParts([part('reject'), part('reject', { incorrect: true, penalty: 7 })])
assert.equal(allRejected.decision, 'reject')
assert.equal(allRejected.penalty, 7)
// Every model call has its own deadline; cancelling is not reported as a timeout.
const stuck: ModelCall = () => new Promise(() => {})
await assert.rejects(
  reviewContribution(
    { course: 'c', title: 't', code: 'C1', mode: 'upload', source: 'One.\n\nTwo.', before: '', prior: [] },
    [], stuck, new AbortController().signal, () => {}, () => {}, { partChars: 5, callTimeoutMs: 20 },
  ),
  (error) => error instanceof ReviewTimeoutError && /part 1 of 2/.test(error.message),
)
const stop = new AbortController()
const stopped = reviewContribution(
  { course: 'c', title: 't', code: 'C1', mode: 'upload', source: 'One.', before: '', prior: [] },
  [], stuck, stop.signal, () => {}, () => {}, { callTimeoutMs: 60_000 },
)
stop.abort()
await assert.rejects(stopped, (error) => !(error instanceof ReviewTimeoutError))
console.log('PASS: long sources are reviewed in parts with per-call deadlines and combined scores')

// A failed part keeps the parts before it: a retry resumes, it does not restart.
{
  const context = { course: 'c', title: 'Review', code: 'C1', mode: 'upload', source: 'First part text.\n\nSecond part text.', before: '', prior: [] }
  let checkpoint: ReviewCheckpoint | undefined
  const first: unknown[] = [
    { ...assessment, title: 'Review', edits: [{ action: 'insert', markdown: '## First\nOne.' }] },
    assessment,
    { ...assessment, edits: [{ action: 'insert', markdown: '## Second\nTwo.' }] },
  ]
  const failing: ModelCall = async () => {
    if (!first.length) throw new Error('The review model returned 429.')
    return JSON.stringify(first.shift())
  }
  await assert.rejects(
    reviewContribution(context, [], failing, new AbortController().signal, () => {}, () => {}, {
      partChars: 20,
      onCheckpoint: (saved) => (checkpoint = saved),
    }),
    /429/,
  )
  assert.equal(checkpoint?.results.length, 1)
  let calls = 0
  const second: unknown[] = [
    { ...assessment, edits: [{ action: 'insert', markdown: '## Second\nTwo.' }] },
    assessment,
  ]
  const resumed = await reviewContribution(
    context,
    [],
    async () => {
      calls++
      return JSON.stringify(second.shift())
    },
    new AbortController().signal,
    () => {},
    () => {},
    { partChars: 20, resume: checkpoint },
  )
  assert.equal(calls, 2, 'only the unfinished part is reviewed again')
  assert.equal(resumed.markdown, '# C1 Review\n\n## First\nOne.\n\n## Second\nTwo.')
  assert.equal(resumed.assessment.decision, 'approve')
}
console.log('PASS: an interrupted multi-part review resumes from its last finished part')

// A verifier objection (or an unappliable edit) earns one revision round with
// reasoning on, carrying the objection; a fixed draft is then approved.
{
  const seen: Array<{ reasoning: boolean; text: string }> = []
  const script: unknown[] = [
    { ...assessment, title: 'Inverse functions', edits: [{ action: 'insert', markdown: '## Example\n$f(x) = x^2 + 2x$, so $(f^{-1})\'(3) = 1/5$.' }] },
    { ...assessment, decision: 'reject', completeness: 0, rationale: 'The function should be x^3 + 2x; with x^2 the answer would be 1/4.' },
    { ...assessment, title: 'Inverse functions', edits: [{ action: 'insert', markdown: '## Example\n$f(x) = x^3 + 2x$, so $(f^{-1})\'(3) = 1/5$.' }] },
    assessment,
  ]
  const result = await reviewContribution(
    { course: 'c', title: 'Review', code: 'C1', mode: 'upload', source: 'f ( x ) = x + 3 2 x ... 1 5', before: '', prior: [] },
    [],
    async (messages, _signal, options) => {
      const user = messages[1].content
      seen.push({ reasoning: options.reasoning, text: typeof user === 'string' ? user : (user[0] as { text: string }).text })
      return JSON.stringify(script.shift())
    },
    new AbortController().signal,
    () => {},
    () => {},
  )
  assert.deepEqual(seen.map((item) => item.reasoning), [false, true, true, true])
  assert.match(seen[2].text, /verifierObjection/)
  assert.match(seen[2].text, /should be x\^3/)
  assert.equal(result.assessment.decision, 'approve')
  assert.match(result.markdown, /x\^3 \+ 2x/)
}
// Headings quoted with their markers still match; an unknown insert anchor appends.
assert.match(
  applyGuideEdits('# 1 T\n\n## A\na', { code: '1', title: 'T', edits: [
    { action: 'replace', section: '## A', markdown: '## A\nb' },
    { action: 'insert', after: '### Missing', markdown: '## C\nc' },
  ] }),
  /## A\nb\n\n## C\nc$/,
)
console.log('PASS: rejected drafts get one reasoning revision with the verifier objection')

// The model call streams, so a long-reasoning verifier is not cut off by
// fetch's 300 s header timeout. Events may split anywhere across chunks.
{
  const sent: Array<Record<string, unknown>> = []
  const streamed = (events: string[], chunkSize = 7) => {
    const text = events.map((event) => `data: ${event}\n\n`).join('')
    const bytes = new TextEncoder().encode(text)
    return new Response(
      new ReadableStream({
        start(controller) {
          for (let at = 0; at < bytes.length; at += chunkSize)
            controller.enqueue(bytes.slice(at, at + chunkSize))
          controller.close()
        },
      }),
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    )
  }
  const delta = (content: string | null, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ choices: [{ delta: { content, ...extra }, finish_reason: null }] })
  let reply: Response
  const moonshot = createMoonshotCall({ MOONSHOT_API_KEY: 'key', MOONSHOT_BASE_URL: 'https://example.test/v1/' }, (async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://example.test/v1/chat/completions')
    sent.push(JSON.parse(String(init.body)))
    return reply
  }) as typeof fetch)
  reply = streamed([
    delta(null, { reasoning_content: 'Thinking about it…' }),
    delta('{"decision":'),
    delta('"approve"}'),
    JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
    '[DONE]',
  ])
  assert.equal(await moonshot([{ role: 'user', content: 'x' }], new AbortController().signal, { maxTokens: 100, reasoning: false }), '{"decision":"approve"}')
  assert.equal(sent[0].stream, true)
  assert.deepEqual(sent[0].thinking, { type: 'disabled' })
  assert.equal(sent[0].temperature, 0.6)
  reply = streamed([delta('{}'), JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })])
  await moonshot([{ role: 'user', content: 'x' }], new AbortController().signal, { maxTokens: 100, reasoning: true })
  assert.equal(sent[1].thinking, undefined)
  assert.equal(sent[1].temperature, 1)
  reply = streamed([delta('{"partial'), JSON.stringify({ choices: [{ delta: {}, finish_reason: 'length' }] })])
  await assert.rejects(moonshot([], new AbortController().signal, { maxTokens: 1, reasoning: true }), /ran out of room/)
  reply = streamed([delta('{"cut off')])
  await assert.rejects(moonshot([], new AbortController().signal, { maxTokens: 1, reasoning: true }), /stopped mid-answer/)
  reply = streamed([JSON.stringify({ error: { message: 'engine is currently overloaded' } })])
  await assert.rejects(moonshot([], new AbortController().signal, { maxTokens: 1, reasoning: true }), /overloaded/)
}
console.log('PASS: the model call streams and reports truncated or failed answers')
// Synthesized question stems and options carry inline LaTeX.
for (const text of [
  'Which of the following statements about $\\lim_{x\\to 0} \\dfrac{x}{|x|}$ is correct?',
  'The limit does not exist, because $\\lim_{x\\to 0^-}\\dfrac{x}{|x|}=-1$ while $\\lim_{x\\to 0^+}\\dfrac{x}{|x|}=1$.',
]) {
  const html = renderToStaticMarkup(createElement(InlineMarkdown, { children: text }))
  assert.match(html, /class="katex"/)
  assert.ok(!html.includes('$'), `raw math delimiter left in: ${html.slice(0, 120)}`)
}
console.log('PASS: question stems and options render their inline math')
fs.rmSync(temporary, { recursive: true, force: true })
console.log('All notes tests passed.')
