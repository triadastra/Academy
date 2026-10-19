import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index], get length() { return values.size } }
Object.assign(globalThis, { localStorage: storage, sessionStorage: storage, window: Object.assign(new EventTarget(), { location: { origin: 'http://test.local' } }) })

let releaseManifest!: () => void
const loading = new Promise<void>(resolve => { releaseManifest = resolve })
const incoming = [{ id: 'retrieval-fixture', courseId: 'math-aa-hl', code: '9.9', title: 'Orchid theorem',
  summary: 'The classroom orchid marker is violet.', revision: 1, updated: 'Today', sections: [],
  markdown: '# 9.9 Orchid theorem\n\nThe classroom orchid marker is violet.\n\n## Proof\nThe orchid theorem uses a violet marker.\n' }]
let modelRequests = 0
let round = 0
const bodies: Array<{ messages: Array<{role: string; content: string; reasoning_content?: string}>; tools: Array<{function: {name: string}}> }> = []
globalThis.fetch = async (url, init) => {
  const path = String(url)
  if (path.includes('manifest.json')) { await loading; return Response.json([{ courseId: 'math-aa-hl' }, { courseId: 'ap-calculus-ab' }]) }
  if (path.endsWith('math-aa-hl.json.gz')) return Response.json(incoming, { headers: { 'Content-Encoding': 'gzip' } }) // Browser has already decoded it.
  if (path.endsWith('ap-calculus-ab.json.gz')) return new Response(gzipSync(JSON.stringify(incoming.map(note => ({ ...note, id: 'raw-gzip-fixture', courseId: 'ap-calculus-ab' })))))
  if (path.endsWith('.json')) throw new Error('Valid gzipped or browser-decoded notes must not need a plain-file fallback')
  assert.equal(path, '/__lp_llm_proxy')
  modelRequests++
  const body = JSON.parse(String(init?.body))
  bodies.push(body)
  const payload = round++ === 0
    ? { choices: [{ delta: { reasoning_content: 'Read the source.', tool_calls: [{ index: 0, id: 'call1', type: 'function', function: { name: 'notes_read', arguments: '{"code":"9.9"}' } }] }, finish_reason: 'stop' }] }
    : { choices: [{ delta: { content: 'The orchid marker is violet [9.9 · Proof].' }, finish_reason: 'stop' }] }
  // CRLF, split in the middle of the delimiter, and no final blank line.
  const wire = `data: ${JSON.stringify(payload)}\r\n\r\ndata: [DONE]`
  const bytes = new TextEncoder().encode(wire)
  return new Response(new ReadableStream({ start(controller) {
    controller.enqueue(bytes.slice(0, bytes.length - 14)); controller.enqueue(bytes.slice(bytes.length - 14)); controller.close()
  } }), { headers: { 'Content-Type': 'text/event-stream' } })
}

const { searchNote } = await import('../src/database/notes-markdown')
const { searchNotes, citePassage } = await import('../src/database/notes-tools')
const { runAgent, LOCAL_TOOLS, serializeToolResult } = await import('../src/lib/agent')
const { updateSettings } = await import('../src/database/client')
updateSettings({ autoSynthesis: false })

assert.ok(searchNote(incoming[0].markdown, 'Can you explain the orchid theorem?').length)
assert.ok(searchNote('# 标题\n\n关于细胞的摘要\n\n## 细胞呼吸\n细胞呼吸释放能量。', '请解释细胞呼吸').length)
assert.ok(searchNote('# Heading only\n\nA summary with zirconium.', 'zirconium').length, 'Summary-only material is searchable')
assert.equal(searchNote(incoming[0].markdown, 'banana').length, 0)

const running = runAgent({ messages: [{ role: 'user', content: 'Explain the orchid theorem' }], readOnly: true })
await new Promise(resolve => setTimeout(resolve, 10))
assert.equal(modelRequests, 0, 'Tutor must await the note corpus before calling the model')
releaseManifest()
const result = await running
assert.equal(modelRequests, 2)
assert.match(bodies[0].messages[0].content, /violet/)
assert.ok(bodies[0].tools.some(tool => tool.function.name === 'database_grep'))
assert.ok(!bodies[0].tools.some(tool => tool.function.name === 'memory_update'))
assert.ok(bodies[1].messages.some(message => message.reasoning_content === 'Read the source.'))
assert.ok(bodies[1].messages.some(message => message.role === 'tool' && JSON.parse(message.content).markdown.includes('violet')))
assert.match(result.answer, /violet/)
assert.ok(result.activity.some(entry => entry.name === 'notes_read' && entry.ok))
const hits = searchNotes('math-aa-hl', 'What color is the orchid marker?', 4)
assert.ok(hits.ok && hits.hits[0].code === '9.9')
assert.ok(citePassage('math-aa-hl', '9.9', '').ok)
const rawGzipHits = searchNotes('ap-calculus-ab', 'orchid', 4)
assert.ok(rawGzipHits.ok && rawGzipHits.hits.length, 'Raw gzip notes load alongside HTTP-decoded notes')
const page = await LOCAL_TOOLS.get('notes_read')!.run({ code: '9.9', limit: 12 } as never, 'math-aa-hl') as { markdown: string; nextOffset: number }
assert.equal(page.markdown.length, 12)
assert.equal(page.nextOffset, 12)
const next = await LOCAL_TOOLS.get('notes_read')!.run({ code: '9.9', offset: page.nextOffset, limit: 12 } as never, 'math-aa-hl') as { markdown: string }
assert.equal(page.markdown + next.markdown, incoming[0].markdown.slice(0, 24))
assert.equal(JSON.parse(serializeToolResult({ text: 'x'.repeat(50000) })).truncated, true)
console.log('PASS: cold-load readiness, natural questions, Chinese search, heading/summary search, missing terms, grounded first request, grep tool availability, read-only tool scope, streamed tool execution, reasoning retention, citation, note pagination, and valid bounded JSON')
const { updateDatabase } = await import('../src/database/client')
updateDatabase(database => {
  database.notes.push(
    { ...incoming[0], id: 'scope-standard', courseId: 'hs-biology-9', level: 'S', code: '8.1', markdown: '# 8.1 Scope\n\nStandard-only orchid evidence.\n\n## Scope\nStandard-only orchid evidence.' },
    { ...incoming[0], id: 'scope-honors', courseId: 'hs-biology-9', level: 'H', code: '8.1', markdown: '# 8.1 Scope\n\nHonors-only orchid evidence.\n\n## Scope\nHonors-only orchid evidence.' },
  )
})
updateSettings({ courseLevels: { 'hs-biology-9': 'S' } })
const scopedHits = searchNotes('hs-biology-9', 'orchid', 20)
assert.ok(scopedHits.ok && scopedHits.hits.length > 0 && scopedHits.hits.every(hit => !hit.snippet.includes('Honors-only') && !hit.snippet.includes('violet')))
const beforeSwitch = modelRequests
const changing = runAgent({ messages: [{ role: 'user', content: 'Orchid' }], readOnly: true })
updateSettings({ selectedCourseIds: ['hs-biology-9'], activeCourseId: 'hs-biology-9' })
await assert.rejects(changing, error => (error as Error).name === 'AbortError')
assert.equal(modelRequests, beforeSwitch, 'Changing course while notes load must not send mixed-course context')
console.log('PASS: course/level isolation and abort on course changes during retrieval')
