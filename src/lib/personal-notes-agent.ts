// personal-notes-agent.ts — turns a personal course's dropped files into notes.
//
// The student drops whatever they have (slides exported to PDF, a syllabus,
// their own notes, a past paper) into /course/sources. This reads the files'
// text back out of IndexedDB, packs it into packets small enough for one model
// call, and asks Moonshot (via `chat()`, so `/__lp_llm_proxy` — no key in the
// browser) to write structured study notes from each packet.
//
// The output lands in the account's private workspace only (database/
// personal.ts). Nothing here can touch the school's shared notes: personal
// course ids never match a shared note, and the store it writes to is per-user.
//
// Each note is Markdown whose first line is `# <code> <title>`, the shape the
// rest of the app already parses (notes-markdown.ts), so the Notes page and
// the tutor's search tools read these exactly like a teacher's notes.
import { chat } from '@/lib/llm'
import { getCurrentUserId } from '@/database/client'
import {
  getPersonalWorkspace,
  markSourcesUsed,
  noteFromMarkdown,
  personalNotesFor,
  upsertPersonalNotes,
} from '@/database/personal'
import type { PersonalCourse, PersonalSource, UnitNote } from '@/database/types'
import { getSourceText } from '@/lib/personal-files'

/** Characters of source per model call. Comfortably inside the context window. */
const PACKET_CHARS = 24_000

export interface WriteProgress {
  packet: number
  packets: number
  phase: 'reading' | 'thinking' | 'writing' | 'saving'
  chars: number
}

const SYSTEM = `You write clear, accurate study notes for one student's own course, from material they uploaded.
Rules:
- Use ONLY the supplied material. Do not add facts it does not contain; if something is unclear, say so in the note.
- Split the material into topics. One note per topic, in teaching order.
- Each note's markdown starts with exactly one H1 line: "# <code> <title>", where code is a number like 3 or 3.2.
- After the H1, one plain sentence summarising the topic.
- Then "## " sections: key ideas, definitions, worked examples, common mistakes. Use bullet points and short paragraphs.
- Mathematics in LaTeX between $ delimiters. No HTML.
- Put one "> " callout per note with the single most important takeaway or exam tip.
Reply with JSON only: {"notes":[{"code":"1","title":"…","markdown":"# 1 …"}]}`

function packets(sources: Array<{ source: PersonalSource; text: string }>): Array<{ ids: string[]; text: string }> {
  const out: Array<{ ids: string[]; text: string }> = []
  let current = { ids: [] as string[], text: '' }
  const flush = () => {
    if (current.text.trim()) out.push(current)
    current = { ids: [], text: '' }
  }
  for (const { source, text } of sources) {
    // A file larger than a packet is split on paragraph boundaries.
    const paragraphs = text.split(/\n{2,}/)
    let header = `\n\n=== FILE: ${source.name} ===\n\n`
    for (const paragraph of paragraphs) {
      const piece = header + paragraph + '\n\n'
      header = ''
      if (current.text.length + piece.length > PACKET_CHARS && current.text) flush()
      if (!current.ids.includes(source.id)) current.ids.push(source.id)
      current.text += piece.length > PACKET_CHARS ? piece.slice(0, PACKET_CHARS) : piece
    }
  }
  flush()
  return out
}

function parseNotes(raw: string): Array<{ code: string; title: string; markdown: string }> {
  const body = raw.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '')
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Syno did not return notes in the expected format. Try again.')
  let parsed: unknown
  try {
    parsed = JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new Error('Syno returned notes that could not be read. Try again, or split the files into smaller drops.')
  }
  const notes = (parsed as { notes?: unknown })?.notes
  if (!Array.isArray(notes)) throw new Error('Syno returned no notes for this material.')
  return notes
    .filter((note): note is Record<string, unknown> => !!note && typeof note === 'object')
    .map((note) => ({
      code: String(note.code ?? '').trim(),
      title: String(note.title ?? '').trim(),
      markdown: String(note.markdown ?? ''),
    }))
    .filter((note) => note.markdown.trim().length > 40)
}

/** Strip anything that is not Markdown before it is stored and rendered. */
function cleanMarkdown(markdown: string) {
  return markdown
    .replace(/<\/?(?:script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|select|option)\b[^>]*>/gi, '')
    .replace(/javascript:|vbscript:|data:text\/html/gi, '')
    .trim()
}

function nextCode(existing: UnitNote[], offset: number) {
  const top = existing.reduce((max, note) => Math.max(max, Math.floor(Number(note.code)) || 0), 0)
  return String(top + offset)
}

/**
 * Write notes for a course from the given sources. Notes are saved packet by
 * packet, so an error part-way keeps what was already written.
 */
export async function writeNotesFromSources(
  course: PersonalCourse,
  sourceIds: string[],
  options: { focus?: string; signal?: AbortSignal; onProgress?: (progress: WriteProgress) => void },
): Promise<UnitNote[]> {
  const userId = getCurrentUserId()
  const chosen = getPersonalWorkspace().sources.filter((source) => source.courseId === course.id && sourceIds.includes(source.id))
  const loaded: Array<{ source: PersonalSource; text: string }> = []
  for (const source of chosen) {
    const text = await getSourceText(userId, source.id)
    if (text?.trim()) loaded.push({ source, text })
  }
  if (loaded.length === 0)
    throw new Error('The text of these files is no longer on this browser. Drop them in again.')

  const work = packets(loaded)
  const written: UnitNote[] = []
  for (let index = 0; index < work.length; index++) {
    const packet = work[index]
    const report = (phase: WriteProgress['phase'], chars = 0) =>
      options.onProgress?.({ packet: index + 1, packets: work.length, phase, chars })
    report('reading')
    const existing = personalNotesFor(course.id)
    const inventory = existing.map((note) => `${note.code} ${note.title}`).join('\n')
    const prompt = [
      `Course: ${course.title} (${course.code}) — ${course.subject}.`,
      course.description ? `About the course: ${course.description}` : '',
      options.focus?.trim() ? `The student asks you to focus on: ${options.focus.trim().slice(0, 400)}` : '',
      inventory
        ? `Notes that already exist (reuse a code ONLY to rewrite that same topic with the new material; otherwise continue numbering from ${nextCode(existing, 1)}):\n${inventory}`
        : 'No notes exist yet; start numbering at 1.',
      `Material (part ${index + 1} of ${work.length}):`,
      packet.text,
    ]
      .filter(Boolean)
      .join('\n\n')

    const reply = await chat({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      // Kimi reasons before answering and the reasoning counts here too.
      maxTokens: 16_000,
      signal: options.signal,
      onReasoning: () => report('thinking'),
      onToken: (_delta, full) => report('writing', full.length),
    })

    report('saving')
    const notes = parseNotes(reply).map((note, offset) => {
      let markdown = cleanMarkdown(note.markdown)
      const code = /^\d+(?:\.\d+)*$/.test(note.code) ? note.code : nextCode(existing, offset + 1)
      if (!/^#\s/.test(markdown)) markdown = `# ${code} ${note.title || 'Untitled'}\n\n${markdown}`
      // Force the H1 to carry the code the store will key on.
      markdown = markdown.replace(/^#\s+.*$/m, `# ${code} ${note.title || markdown.match(/^#\s+(?:[\d.]+\s+)?(.*)$/m)?.[1] || 'Untitled'}`)
      return noteFromMarkdown(course.id, markdown, code)
    })
    upsertPersonalNotes(course.id, notes)
    markSourcesUsed(packet.ids)
    written.push(...notes)
  }
  return written
}

/**
 * No model: one note per file, with the text as it is. For when Syno is not
 * connected, or the student just wants their own notes searchable.
 */
export async function importSourcesAsIs(course: PersonalCourse, sourceIds: string[]): Promise<UnitNote[]> {
  const userId = getCurrentUserId()
  const chosen = getPersonalWorkspace().sources.filter((source) => source.courseId === course.id && sourceIds.includes(source.id))
  const notes: UnitNote[] = []
  let offset = 1
  const existing = personalNotesFor(course.id)
  for (const source of chosen) {
    const text = await getSourceText(userId, source.id)
    if (!text?.trim()) continue
    const code = nextCode(existing, offset++)
    const title = source.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported file'
    const body = cleanMarkdown(text).replace(/^#\s/gm, '## ')
    notes.push(noteFromMarkdown(course.id, `# ${code} ${title}\n\nImported from ${source.name}.\n\n## Content\n\n${body}`, code))
  }
  if (notes.length === 0) throw new Error('The text of these files is no longer on this browser. Drop them in again.')
  upsertPersonalNotes(course.id, notes)
  markSourcesUsed(chosen.map((source) => source.id))
  return notes
}
